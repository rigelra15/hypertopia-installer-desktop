import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

const API_BASE_URL = 'https://api.hypertopia.web.id'

// Cache TTL - 5 minutes (matches server-side cache)
const CACHE_TTL_MS = 5 * 60 * 1000

const GamesContext = createContext(null)

export function GamesProvider({ children }) {
  // Games data cache - keyed by query params hash
  const [gamesCache, setGamesCache] = useState({})
  const [paginationCache, setPaginationCache] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // QGO data cache
  const [qgoLinks, setQgoLinks] = useState([])
  const [qgoDownloadStats, setQgoDownloadStats] = useState({ total: 0, byVersion: {} })
  const [qgoLoading, setQgoLoading] = useState(false)
  const [qgoLastFetch, setQgoLastFetch] = useState(0)

  // Total games count (updated from any fetchGames call)
  const [gamesTotalCount, setGamesTotalCount] = useState(null)

  // Track last fetch time per cache key
  const lastFetchTimeRef = useRef({})
  const hasPreloaded = useRef(false)

  /**
   * Generate a cache key from query parameters
   */
  const getCacheKey = useCallback((params) => {
    const { page, limit, sortBy, sortOrder, search, device } = params
    return `${page}-${limit}-${sortBy}-${sortOrder}-${search || ''}-${device || ''}`
  }, [])

  /**
   * Check if cache is still valid
   */
  const isCacheValid = useCallback((cacheKey) => {
    const lastFetch = lastFetchTimeRef.current[cacheKey]
    if (!lastFetch) return false
    return Date.now() - lastFetch < CACHE_TTL_MS
  }, [])

  /**
   * Fetch games with caching
   * Returns cached data if available and still valid
   */
  const fetchGames = useCallback(
    async (params, forceRefresh = false) => {
      const cacheKey = getCacheKey(params)

      // Return cached data if valid and not forcing refresh
      if (!forceRefresh && isCacheValid(cacheKey) && gamesCache[cacheKey]) {
        return {
          games: gamesCache[cacheKey],
          pagination: paginationCache[cacheKey],
          fromCache: true
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams({
          page: params.page?.toString() || '1',
          limit: params.limit?.toString() || '24',
          sortBy: params.sortBy || 'added',
          sortOrder: params.sortOrder || 'asc',
          search: params.search || ''
        })

        if (params.device) {
          queryParams.set('device', params.device)
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/standalone-games-paginated?${queryParams}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch games')
        }

        const result = await response.json()

        // Convert object to array with keys
        const gamesArray = Object.entries(result.data || {}).map(([key, game]) => ({
          id: key,
          ...game
        }))

        // Update cache
        setGamesCache((prev) => ({
          ...prev,
          [cacheKey]: gamesArray
        }))

        if (result.pagination) {
          setPaginationCache((prev) => ({
            ...prev,
            [cacheKey]: result.pagination
          }))
          if (result.pagination.totalItems != null) {
            setGamesTotalCount(result.pagination.totalItems)
          }
        }

        // Record fetch time
        lastFetchTimeRef.current[cacheKey] = Date.now()

        return {
          games: gamesArray,
          pagination: result.pagination,
          fromCache: false
        }
      } catch (err) {
        console.error('Error fetching games:', err)
        setError(err.message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getCacheKey, isCacheValid, gamesCache, paginationCache]
  )

  /**
   * Clear all cache (useful for manual refresh)
   */
  const clearCache = useCallback(() => {
    setGamesCache({})
    setPaginationCache({})
    lastFetchTimeRef.current = {}
  }, [])

  /**
   * Get cached games without fetching
   */
  const getCachedGames = useCallback(
    (params) => {
      const cacheKey = getCacheKey(params)
      if (isCacheValid(cacheKey) && gamesCache[cacheKey]) {
        return {
          games: gamesCache[cacheKey],
          pagination: paginationCache[cacheKey]
        }
      }
      return null
    },
    [getCacheKey, isCacheValid, gamesCache, paginationCache]
  )

  /**
   * Fetch QGO links from API
   */
  const fetchQgoLinks = useCallback(
    async (forceRefresh = false) => {
      // Return cached data if valid
      if (!forceRefresh && qgoLinks.length > 0 && Date.now() - qgoLastFetch < CACHE_TTL_MS) {
        return { links: qgoLinks, stats: qgoDownloadStats, fromCache: true }
      }

      setQgoLoading(true)

      try {
        const [linksResponse, statsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/qgo`),
          fetch(`${API_BASE_URL}/api/v1/qgo/download-stats`)
        ])

        // Parse QGO links
        let links = []
        if (linksResponse.ok) {
          const data = await linksResponse.json()
          if (Array.isArray(data)) {
            links = data
          } else if (Array.isArray(data.linkDownload)) {
            links = data.linkDownload
          } else if (Array.isArray(data.downloads)) {
            links = data.downloads
          }
        }

        // Parse download stats
        let stats = { total: 0, byVersion: {} }
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData.success) {
            stats = {
              total: statsData.total || 0,
              byVersion: statsData.byVersion || {}
            }
          }
        }

        setQgoLinks(links)
        setQgoDownloadStats(stats)
        setQgoLastFetch(Date.now())

        return { links, stats, fromCache: false }
      } catch (err) {
        console.error('Error fetching QGO:', err)
        throw err
      } finally {
        setQgoLoading(false)
      }
    },
    [qgoLinks, qgoDownloadStats, qgoLastFetch]
  )

  /**
   * Preload all data in background when app starts
   */
  const preloadData = useCallback(async () => {
    if (hasPreloaded.current) return
    hasPreloaded.current = true

    console.log('[GamesContext] Preloading data in background...')

    try {
      // Fetch first page of games (default params)
      const gamesPromise = fetchGames({
        page: 1,
        limit: 24,
        sortBy: 'added',
        sortOrder: 'asc',
        search: ''
      }).catch((err) => console.warn('[Preload] Games fetch failed:', err))

      // Fetch QGO links
      const qgoPromise = fetchQgoLinks().catch((err) =>
        console.warn('[Preload] QGO fetch failed:', err)
      )

      await Promise.all([gamesPromise, qgoPromise])

      console.log('[GamesContext] Preload complete!')
    } catch (err) {
      console.warn('[GamesContext] Preload error:', err)
    }
  }, [fetchGames, fetchQgoLinks])

  // Preload data when provider mounts
  useEffect(() => {
    // Small delay to not block initial render
    const timer = setTimeout(() => {
      preloadData()
    }, 500)

    return () => clearTimeout(timer)
  }, [preloadData])

  const value = {
    // Games
    fetchGames,
    clearCache,
    getCachedGames,
    isLoading,
    error,
    cacheSize: Object.keys(gamesCache).length,

    // QGO
    qgoLinks,
    qgoDownloadStats,
    qgoLoading,
    fetchQgoLinks,

    // Counts
    gamesTotalCount,

    // Preload
    preloadData
  }

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
}

GamesProvider.propTypes = {
  children: PropTypes.node.isRequired
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGames() {
  const context = useContext(GamesContext)
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider')
  }
  return context
}

export default GamesContext
