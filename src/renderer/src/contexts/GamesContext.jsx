import { createContext, useContext, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'

const API_BASE_URL = 'https://api.hypertopia.store'

// Cache TTL - 5 minutes (matches server-side cache)
const CACHE_TTL_MS = 5 * 60 * 1000

const GamesContext = createContext(null)

export function GamesProvider({ children }) {
  // Games data cache - keyed by query params hash
  const [gamesCache, setGamesCache] = useState({})
  const [paginationCache, setPaginationCache] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Track last fetch time per cache key
  const lastFetchTimeRef = useRef({})

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
    return (Date.now() - lastFetch) < CACHE_TTL_MS
  }, [])

  /**
   * Fetch games with caching
   * Returns cached data if available and still valid
   */
  const fetchGames = useCallback(async (params, forceRefresh = false) => {
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

      const response = await fetch(`${API_BASE_URL}/api/v1/standalone-games-paginated?${queryParams}`)
      
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
      setGamesCache(prev => ({
        ...prev,
        [cacheKey]: gamesArray
      }))

      if (result.pagination) {
        setPaginationCache(prev => ({
          ...prev,
          [cacheKey]: result.pagination
        }))
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
  }, [getCacheKey, isCacheValid, gamesCache, paginationCache])

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
  const getCachedGames = useCallback((params) => {
    const cacheKey = getCacheKey(params)
    if (isCacheValid(cacheKey) && gamesCache[cacheKey]) {
      return {
        games: gamesCache[cacheKey],
        pagination: paginationCache[cacheKey]
      }
    }
    return null
  }, [getCacheKey, isCacheValid, gamesCache, paginationCache])

  const value = {
    fetchGames,
    clearCache,
    getCachedGames,
    isLoading,
    error,
    // Expose cache stats for debugging
    cacheSize: Object.keys(gamesCache).length
  }

  return (
    <GamesContext.Provider value={value}>
      {children}
    </GamesContext.Provider>
  )
}

GamesProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useGames() {
  const context = useContext(GamesContext)
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider')
  }
  return context
}

export default GamesContext
