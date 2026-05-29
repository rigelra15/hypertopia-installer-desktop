import { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useGames } from '../contexts/GamesContext'
import { useDownload } from '../contexts/DownloadContext'
import DevicePreferenceModal from './DevicePreferenceModal'
import GameDetailModal from './GameDetailModal'
import RequestGameModal from './RequestGameModal'
import RequestGameList from './RequestGameList'
import coverImages from '../utils/coverImages'

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96]

// Helper function to compare versions (from highest to lowest)
const compareVersions = (versionA, versionB) => {
  const parseVersion = (version) => {
    if (!version) return { major: 0, minor: 0, patch: 0, build: 0 }
    const cleaned = version.replace(/^v/, '')
    const [versionPart, buildPart] = cleaned.split('_')
    const versionNumbers = versionPart.split('.').map((num) => parseInt(num) || 0)
    const buildNumber = parseInt(buildPart) || 0
    return {
      major: versionNumbers[0] || 0,
      minor: versionNumbers[1] || 0,
      patch: versionNumbers[2] || 0,
      build: buildNumber
    }
  }

  const a = parseVersion(versionA)
  const b = parseVersion(versionB)

  if (a.major !== b.major) return b.major - a.major
  if (a.minor !== b.minor) return b.minor - a.minor
  if (a.patch !== b.patch) return b.patch - a.patch
  return b.build - a.build
}

export function StandaloneGames({
  selectedDevice: connectedDevice,
  pendingDeepLinkDownload,
  onDeepLinkProcessed,
  onGameCountChange
}) {
  const { t } = useLanguage()
  const { user, accessTypes } = useAuth()
  const { fetchGames: fetchGamesFromContext, getCachedGames } = useGames()
  const isEligible = accessTypes.some((t) => t.toLowerCase() === 'standalone')

  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortBy, setSortBy] = useState('added') // 'updated' | 'added' | 'name' | 'downloads' | 'size' | 'rating'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'
  const searchTimeoutRef = useRef(null)

  // Device preference state
  const [devicePreference, setDevicePreference] = useState(null) // null = all, or 'quest1', 'quest2', etc.
  const [devicePreferenceLoading, setDevicePreferenceLoading] = useState(true)
  const [showDeviceModal, setShowDeviceModal] = useState(false)

  // Pagination state from API
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Report filtered count up to parent for tab badge
  useEffect(() => {
    if (totalItems > 0) onGameCountChange?.(totalItems)
  }, [totalItems, onGameCountChange])

  // Game detail modal state
  const [selectedGame, setSelectedGame] = useState(null)
  const [showGameDetail, setShowGameDetail] = useState(false)

  // Request game modal state
  const [showRequestModal, setShowRequestModal] = useState(false)

  // View mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState('grid')

  // Sub-tab: 'games' | 'requests'
  const [activeSubTab, setActiveSubTab] = useState('games')

  const subTabs = [
    {
      id: 'games',
      icon: 'mdi:gamepad-variant',
      label: t('tab_games_list') || 'Daftar Game',
      count: totalItems || null
    },
    {
      id: 'requests',
      icon: 'mdi:clipboard-list-outline',
      label: t('tab_games_requests') || 'Requested Games'
    }
  ]

  const FIREBASE_DB_URL =
    'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

  // Load device preference from Firebase
  useEffect(() => {
    const loadDevicePreference = async () => {
      setDevicePreferenceLoading(true)
      try {
        // Check if user is logged in and has uid
        if (user?.uid) {
          // Fetch from Firebase
          const response = await fetch(
            `${FIREBASE_DB_URL}/usersData/preferences/${user.uid}/device.json`
          )
          const dbPref = await response.json()

          if (dbPref) {
            setDevicePreference(dbPref)
            setDevicePreferenceLoading(false)
            return
          }
        }

        // No preference found - show all games
        setDevicePreference(null)
      } catch (err) {
        console.error('Error loading device preference:', err)
        setDevicePreference(null)
      } finally {
        setDevicePreferenceLoading(false)
      }
    }

    loadDevicePreference()
  }, [user])

  // Build params object for fetching
  const getQueryParams = useCallback(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortOrder,
      search: debouncedSearch,
      device: devicePreference
    }),
    [currentPage, itemsPerPage, sortBy, sortOrder, debouncedSearch, devicePreference]
  )

  // Fetch games with caching from context
  const loadGames = useCallback(
    async (forceRefresh = false) => {
      const params = getQueryParams()

      // Try to get from cache first (instant load when switching tabs)
      if (!forceRefresh) {
        const cached = getCachedGames(params)
        if (cached) {
          setGames(cached.games)
          if (cached.pagination) {
            setTotalItems(cached.pagination.totalItems)
            setTotalPages(cached.pagination.totalPages)
          }
          setIsLoading(false)
          return
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchGamesFromContext(params, forceRefresh)
        setGames(result.games)

        if (result.pagination) {
          setTotalItems(result.pagination.totalItems)
          setTotalPages(result.pagination.totalPages)
        }
      } catch (err) {
        console.error('Error fetching games:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    },
    [getQueryParams, getCachedGames, fetchGamesFromContext]
  )

  // Initial load and when params change
  useEffect(() => {
    if (!devicePreferenceLoading) {
      loadGames(false) // Use cache if available
    }
  }, [loadGames, devicePreferenceLoading])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, sortBy, sortOrder, itemsPerPage, devicePreference])

  // Handle deep link download from website
  useEffect(() => {
    if (pendingDeepLinkDownload && pendingDeepLinkDownload.game && games.length > 0) {
      // Find the game that matches the name
      const matchingGame = games.find((game) => {
        const gameTitle = game.gameTitle || game.name || ''
        return gameTitle.toLowerCase() === pendingDeepLinkDownload.game.toLowerCase()
      })

      if (matchingGame) {
        setSelectedGame(matchingGame)
        setShowGameDetail(true)
        // Clear the pending download
        if (onDeepLinkProcessed) {
          onDeepLinkProcessed()
        }
      } else {
        // Set search query to find the game
        setSearchQuery(pendingDeepLinkDownload.game)
        setDebouncedSearch(pendingDeepLinkDownload.game)
      }
    }
  }, [pendingDeepLinkDownload, games, onDeepLinkProcessed])

  const handleRefresh = () => {
    loadGames(true) // Force refresh, bypass cache
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    // Scroll to top of content
    document.querySelector('.games-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0 bg-white dark:bg-[#111]">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            <Icon icon={tab.icon} className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                  activeSubTab === tab.id
                    ? 'bg-[#0081FB] text-white'
                    : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-white/70'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeSubTab === 'games' ? (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#191919] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
                  <Icon icon="mdi:gamepad-variant" className="h-5 w-5 text-[#0081FB]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('standalone_games_title')}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-white/50">
                    {isLoading
                      ? t('standalone_games_loading')
                      : `${totalItems} ${t('standalone_games_count')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-[#0081FB] hover:bg-[#006fd6] px-4 py-2 text-sm text-white font-medium transition-all"
                  >
                    <Icon icon="mdi:gamepad-square" className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t('request_new_game') || 'Request Game'}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-gray-200 dark:bg-white/5 px-3 py-2 text-sm text-gray-500 dark:text-white/70 transition-all hover:bg-gray-300 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                >
                  <Icon
                    icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
                    className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  <span className="hidden sm:inline">{t('refresh_btn')}</span>
                </button>
              </div>
            </div>

            {/* Search and Sort Controls */}
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative flex-1">
                <Icon
                  icon="mdi:magnify"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // Debounce search to reduce API calls
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current)
                    }
                    searchTimeoutRef.current = setTimeout(() => {
                      setDebouncedSearch(e.target.value)
                    }, 300)
                  }}
                  placeholder={t('search_placeholder')}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none focus:border-[#0081FB]/50 transition-colors"
                />
              </div>

              {/* Items Per Page - hidden */}
              {/* <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] px-2 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#0081FB]/50 transition-colors cursor-pointer"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select> */}

              {/* Sort By Dropdown - hidden */}
              {/* <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#0081FB]/50 transition-colors cursor-pointer"
              >
                <option value="updated">{t('sort_by_updated') || 'Terakhir Diupdate'}</option>
                <option value="added">{t('sort_by_added') || 'Terbaru Ditambahkan'}</option>
                <option value="name">{t('sort_by_name') || 'Nama'}</option>
                <option value="downloads">{t('sort_by_downloads') || 'Download'}</option>
                <option value="size">{t('sort_by_size') || 'Ukuran'}</option>
                <option value="rating">{t('sort_by_rating') || 'Rating'}</option>
              </select> */}

              {/* Device Preference Button */}
              <button
                onClick={() => setShowDeviceModal(true)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  devicePreference
                    ? 'border-[#0081FB] bg-[#0081FB] text-white hover:bg-[#0070e0]'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] text-gray-500 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={t('device_preference_title') || 'Select Device'}
              >
                <Icon icon="bi:headset-vr" className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {devicePreference
                    ? devicePreference
                        .replace('quest', 'Quest ')
                        .replace('Pro', ' Pro')
                        .replace('3s', '3S')
                    : t('all_devices') || 'All'}
                </span>
              </button>

              {/* Sort Order Toggle - hidden */}
              {/* <button
                onClick={toggleSortOrder}
                className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-2 text-gray-500 dark:text-white/70 transition-colors hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <Icon
                  icon={sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'}
                  className="h-5 w-5"
                />
              </button> */}

              {/* View Mode Toggle - hidden */}
              {/* <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center justify-center p-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#0081FB] text-white'
                      : 'bg-white dark:bg-[#0a0a0a] text-gray-500 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={t('view_grid') || 'Grid View'}
                >
                  <Icon icon="mdi:view-grid" className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center p-2 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#0081FB] text-white'
                      : 'bg-white dark:bg-[#0a0a0a] text-gray-500 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={t('view_list') || 'List View'}
                >
                  <Icon icon="mdi:view-list" className="h-4 w-4" />
                </button>
              </div> */}
            </div>
          </div>

          {/* Content */}
          <div className="games-content flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
                <p className="mt-4 text-sm text-gray-500 dark:text-white/50">
                  {t('standalone_games_loading')}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                  <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
                  {t('standalone_games_error')}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-[#0081FB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0081FB]/80"
                >
                  <Icon icon="mdi:refresh" className="h-4 w-4" />
                  {t('standalone_games_retry')}
                </button>
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
                  <Icon
                    icon="mdi:gamepad-variant-outline"
                    className="h-8 w-8 text-gray-300 dark:text-white/30"
                  />
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
                  {searchQuery ? t('search_no_results') : t('standalone_games_empty')}
                </p>
              </div>
            ) : (
              <>
                {/* Games Grid / List */}
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                      : 'flex flex-col gap-2'
                  }
                >
                  {games.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      isEligible={isEligible}
                      selectedDevice={devicePreference}
                      viewMode={viewMode}
                      onClick={() => {
                        setSelectedGame(game)
                        setShowGameDetail(true)
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col items-center gap-3">
                    {/* Page Info */}
                    <p className="text-xs text-gray-400 dark:text-white/40">
                      {t('showing') || 'Showing'} {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, totalItems)} {t('of') || 'of'}{' '}
                      {totalItems} {t('standalone_games_count')}
                    </p>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/70 transition-colors hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Icon icon="mdi:chevron-left" className="h-5 w-5" />
                      </button>

                      {/* Page Numbers */}
                      {getPageNumbers().map((page, index) =>
                        page === '...' ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-gray-400 dark:text-white/30"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-[#0081FB] text-white'
                                : 'border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}

                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/70 transition-colors hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Icon icon="mdi:chevron-right" className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
                <Icon icon="mdi:gamepad-square" className="h-5 w-5 text-[#0081FB]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('request_game_title') || 'Request Game'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-white/50">
                  {t('request_game_subtitle') || 'Submit a new game request or report an issue'}
                </p>
              </div>
            </div>
            {user && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="flex items-center gap-2 rounded-lg bg-[#0081FB] hover:bg-[#006fd6] px-4 py-2 text-sm text-white font-medium transition-all"
              >
                <Icon icon="mdi:plus" className="h-4 w-4" />
                <span className="hidden sm:inline">{t('request_new_game') || 'New Request'}</span>
              </button>
            )}
          </div>
          <RequestGameList />
        </>
      )}

      {/* Device Preference Modal */}
      <DevicePreferenceModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        onSave={(device) => {
          setDevicePreference(device)
          setShowDeviceModal(false)
        }}
        currentDevice={devicePreference}
        totalGames={totalItems}
      />

      {/* Game Detail Modal */}
      <GameDetailModal
        isOpen={showGameDetail}
        onClose={() => {
          setShowGameDetail(false)
          setSelectedGame(null)
        }}
        game={selectedGame}
        selectedDevice={devicePreference}
        connectedDevice={connectedDevice}
      />

      {/* Request Game Modal */}
      <RequestGameModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => setShowRequestModal(false)}
      />
    </div>
  )
}

// Helper function to get Quest model info
const getQuestInfo = (questKey) => {
  const questMap = {
    supportMetaQuest1: { label: 'Q1', fullName: 'Quest 1' },
    supportMetaQuest2: { label: 'Q2', fullName: 'Quest 2' },
    supportMetaQuest3: { label: 'Q3', fullName: 'Quest 3' },
    supportMetaQuest3S: { label: 'Q3S', fullName: 'Quest 3S' },
    supportMetaQuestPro: { label: 'QP', fullName: 'Quest Pro' }
  }
  return (
    questMap[questKey] || {
      label: questKey.replace('supportMetaQuest', 'Q'),
      fullName: questKey.replace('supportMetaQuest', 'Quest ')
    }
  )
}

// Format download count
const formatDownloadCount = (count) => {
  if (!count || count === 0) return '0'
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

// Deterministic gradient based on game title — used as cover placeholder
const PLACEHOLDER_GRADIENTS = [
  ['#1a237e', '#4527a0'],
  ['#4a148c', '#7b1fa2'],
  ['#880e4f', '#c2185b'],
  ['#bf360c', '#e64a19'],
  ['#1b5e20', '#388e3c'],
  ['#006064', '#0097a7'],
  ['#0d47a1', '#1976d2'],
  ['#37474f', '#546e7a'],
  ['#4e342e', '#6d4c41'],
  ['#212121', '#455a64']
]
function StatusBadge({ game, t }) {
  const [now] = useState(() => Date.now())
  const gameStatus = game?.gameStatus || ''
  const timeAdded = game?.timeAdded || game?.createdAt || game?.updatedAt
  const isRecent = timeAdded && now - new Date(timeAdded).getTime() <= 7 * 24 * 60 * 60 * 1000

  if (gameStatus === 'new' && isRecent)
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-md shadow-sm flex items-center gap-1 w-fit">
        <Icon icon="streamline-flex:new-badge-highlight-solid" className="w-3 h-3" />
        {t('badge_new') || 'NEW'}
      </span>
    )
  if (gameStatus === 'update' && isRecent)
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-yellow-500 rounded-md shadow-sm flex items-center gap-1 w-fit">
        <Icon icon="mdi:update" className="w-3 h-3" />
        {t('badge_update') || 'UPDATE'}
      </span>
    )
  if (gameStatus === 'coming_soon')
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#0081FB] rounded-md shadow-sm flex items-center gap-1 w-fit">
        <Icon icon="mdi:clock-outline" className="w-3 h-3" />
        {t('badge_coming_soon') || 'SOON'}
      </span>
    )
  return null
}

StatusBadge.propTypes = {
  game: PropTypes.object,
  t: PropTypes.func.isRequired
}

function V76Badge({ hasV76, tooltipDir = 'right', t }) {
  if (!hasV76) return null
  return (
    <div className="relative group/v76 shrink-0">
      <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-500 rounded-md shadow-sm flex items-center gap-1 cursor-help">
        <Icon icon="mdi:alert-circle" className="w-3 h-3" />
        v76+
      </span>
      <div
        className={`absolute ${tooltipDir === 'left' ? 'left-0' : 'right-0'} top-full mt-1.5 w-48 px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/15 rounded-lg shadow-xl opacity-0 invisible group-hover/v76:opacity-100 group-hover/v76:visible transition-all duration-200 pointer-events-none z-30`}
      >
        <p className="text-[10px] text-gray-800 dark:text-white/90 font-semibold mb-0.5">
          {t('v76_tooltip_title') || 'Firmware v76+ Required'}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-white/50 leading-relaxed">
          {t('v76_tooltip_desc') ||
            'Game ini membutuhkan Quest firmware versi 76 ke atas untuk bisa dimainkan.'}
        </p>
        <div
          className={`absolute -top-1 ${tooltipDir === 'left' ? 'left-3' : 'right-3'} w-2 h-2 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-white/15 rotate-45`}
        />
      </div>
    </div>
  )
}

V76Badge.propTypes = {
  hasV76: PropTypes.bool,
  tooltipDir: PropTypes.string,
  t: PropTypes.func.isRequired
}

function DeviceBadges({ compact = false, supportedEntries, selectedKey, t }) {
  if (supportedEntries.length === 0)
    return (
      <span
        className={`${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'} rounded bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/40 font-medium`}
      >
        {t('not_supported') || 'Unknown'}
      </span>
    )
  return supportedEntries.map(([quest]) => {
    const questInfo = getQuestInfo(quest)
    const isSelected = quest === selectedKey
    return (
      <span
        key={quest}
        className={`${compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'} rounded font-semibold flex items-center gap-1 border ${
          isSelected
            ? 'bg-blue-500 text-white border-blue-500'
            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 border-gray-200 dark:border-white/10'
        }`}
        title={questInfo.fullName}
      >
        <Icon icon="tabler:device-vision-pro" className="w-3 h-3" />
        {questInfo.label}
      </span>
    )
  })
}

DeviceBadges.propTypes = {
  compact: PropTypes.bool,
  supportedEntries: PropTypes.array.isRequired,
  selectedKey: PropTypes.string,
  t: PropTypes.func.isRequired
}

function getPlaceholderStyle(title) {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) & 0xffffffff
  }
  const [from, to] = PLACEHOLDER_GRADIENTS[Math.abs(hash) % PLACEHOLDER_GRADIENTS.length]
  return { background: `linear-gradient(145deg, ${from} 0%, ${to} 100%)` }
}

function GameCard({ game, selectedDevice, viewMode, onClick }) {
  const { t } = useLanguage()
  const { downloadInfo } = useDownload()
  const [coverUrl, setCoverUrl] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)

  const gameTitle = game.gameTitle || game.name || game.id?.replace(/!/g, '') || 'Unknown Game'
  const downloadCount = game.downloadCount || 0
  const isSupportedV76 = game.isSupportedV76 || false
  const versions = Array.isArray(game.versions) ? game.versions.filter((v) => v !== null) : []
  const gameVersion = game.version || game.gameVersion || ''

  const isActiveDownload =
    downloadInfo?.gameTitle === gameTitle &&
    (downloadInfo?.status === 'downloading' || downloadInfo?.status === 'preparing')

  // Get supported Quest models
  const supportedEntries = Object.entries(game).filter(
    ([k, v]) => k.startsWith('supportMetaQuest') && v
  )

  // Map selectedDevice to supportMetaQuest key
  const deviceToKeyMap = {
    quest1: 'supportMetaQuest1',
    quest2: 'supportMetaQuest2',
    quest3: 'supportMetaQuest3',
    quest3s: 'supportMetaQuest3S',
    questPro: 'supportMetaQuestPro'
  }
  const selectedKey = selectedDevice ? deviceToKeyMap[selectedDevice] : null
  const hasV76 = isSupportedV76 || versions.some((v) => v?.isSupportedV76)

  // Fetch cover image from Firebase Storage only
  useEffect(() => {
    let mounted = true
    const fetchCover = async () => {
      setLoadingImage(true)
      try {
        const url = await coverImages.getCoverUrl(gameTitle)
        if (mounted && url) {
          setCoverUrl(url)
        }
      } catch (err) {
        console.warn('Firebase Storage failed:', err)
      }
      if (mounted) setLoadingImage(false)
    }
    fetchCover()
    return () => {
      mounted = false
    }
  }, [gameTitle])

  // Get version display text - sorted from highest to lowest
  const getVersionDisplay = () => {
    if (versions.length > 0) {
      const sortedVersions = [...versions].sort((a, b) =>
        compareVersions(a?.version || '', b?.version || '')
      )
      const highestVersion = sortedVersions[0]?.version || ''
      if (versions.length > 1) {
        const lowestVersion = sortedVersions[sortedVersions.length - 1]?.version || ''
        if (highestVersion && lowestVersion && highestVersion !== lowestVersion) {
          return `${highestVersion} - ${lowestVersion}`
        }
      }
      return highestVersion || gameVersion || 'v1.0'
    }
    return gameVersion || 'v1.0'
  }

  // Get total download count from all versions - with null safety
  const getTotalDownloadCount = () => {
    if (versions.length > 0) {
      return versions.reduce((total, version) => {
        if (version && typeof version.downloadCount === 'number') {
          return total + version.downloadCount
        }
        return total
      }, 0)
    }
    return downloadCount || 0
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LIST MODE
  // ────────────────────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="group flex flex-row w-full rounded-xl bg-white dark:bg-[#1a1a1a] cursor-pointer hover:shadow-lg hover:shadow-[#0081FB]/10 transition-all duration-200 overflow-hidden border border-gray-100 dark:border-white/5 hover:border-[#0081FB]/20"
      >
        {/* Cover thumbnail */}
        <div className="relative w-[120px] shrink-0 bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden">
          {loadingImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#111]">
              <div className="w-6 h-6 border-2 border-gray-200 dark:border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
            </div>
          )}
          {!loadingImage && !coverUrl && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
              style={getPlaceholderStyle(gameTitle)}
            >
              {/* Giant initial as texture */}
              <span className="absolute text-[90px] font-black text-white/6 select-none leading-none">
                {gameTitle.charAt(0).toUpperCase()}
              </span>
              <Icon
                icon="tabler:device-vision-pro"
                className="w-8 h-8 text-white/50 relative z-10"
              />
            </div>
          )}
          {coverUrl && (
            <img
              src={coverUrl}
              alt={gameTitle}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {/* subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />

          {/* Downloading overlay */}
          {isActiveDownload && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
              <Icon icon="mdi:cloud-download" className="w-7 h-7 text-[#0081FB] animate-bounce" />
              {downloadInfo.status === 'downloading' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                    style={{ width: `${downloadInfo.progress || 0}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 px-3 py-2.5 gap-1.5 min-w-0 justify-between">
          {/* Row 1: title + badges */}
          <div className="flex items-start gap-2">
            <h3
              className="flex-1 font-bold text-sm text-gray-900 dark:text-white leading-tight line-clamp-1 min-w-0"
              title={gameTitle}
            >
              {gameTitle}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <StatusBadge game={game} t={t} />
              <V76Badge hasV76={hasV76} tooltipDir="left" t={t} />
            </div>
          </div>

          {/* Row 2: device badges */}
          <div className="flex flex-wrap gap-1">
            <DeviceBadges
              compact
              supportedEntries={supportedEntries}
              selectedKey={selectedKey}
              t={t}
            />
          </div>

          {/* Row 3: version + downloads */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-1 text-gray-500 dark:text-white/50 text-xs">
              <Icon icon="mdi:download" className="w-3 h-3" />
              <span>{formatDownloadCount(getTotalDownloadCount())}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-white/40 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
              {versions.length > 1 && (
                <Icon icon="mdi:layers-outline" className="w-3 h-3 text-[#0081FB]" />
              )}
              <span>{getVersionDisplay()}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GRID MODE (default)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={onClick}
      className="group flex flex-col w-full h-full rounded-2xl bg-white dark:bg-[#1a1a1a] cursor-pointer hover:shadow-xl hover:shadow-[#0081FB]/10 transition-all duration-300 overflow-hidden"
    >
      {/* Image Header Container */}
      <div className="relative w-full h-48 sm:h-56 bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden">
        {/* Spinner while loading */}
        {loadingImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#111]">
            <div className="w-8 h-8 border-3 border-gray-200 dark:border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
          </div>
        )}

        {/* Placeholder when no image available */}
        {!loadingImage && !coverUrl && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={getPlaceholderStyle(gameTitle)}
          >
            {/* Giant initial as background texture */}
            <span className="absolute text-[180px] font-black text-white/5 select-none leading-none tracking-tight">
              {gameTitle.charAt(0).toUpperCase()}
            </span>
            {/* Centered icon + label */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
                <Icon icon="tabler:device-vision-pro" className="w-9 h-9 text-white/75" />
              </div>
              <span className="text-white/40 text-[10px] font-medium px-4 text-center line-clamp-2 max-w-[140px] leading-tight">
                {gameTitle}
              </span>
            </div>
          </div>
        )}

        {/* Actual image when URL present */}
        {coverUrl && (
          <img
            src={coverUrl}
            alt={gameTitle}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {/* Downloading Overlay */}
        {isActiveDownload && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <Icon
              icon="mdi:cloud-download"
              className="w-10 h-10 text-[#0081FB] mb-2 animate-bounce"
            />
            <div className="flex flex-col items-center">
              <span className="text-white text-[11px] font-bold px-3 py-1 bg-[#0081FB]/20 border border-[#0081FB]/50 rounded-full shadow-lg">
                {t('qgo_downloading') || 'Mengunduh...'}{' '}
                {downloadInfo.status === 'downloading'
                  ? `${Math.round(downloadInfo.progress || 0)}%`
                  : ''}
              </span>
            </div>
            {downloadInfo.status === 'downloading' && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                <div
                  className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                  style={{ width: `${downloadInfo.progress || 0}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Top Left: Status Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          <StatusBadge game={game} t={t} />
        </div>

        {/* Top Right: v76+ Badge */}
        <div className="absolute top-3 right-3 z-20">
          <V76Badge hasV76={hasV76} tooltipDir="right" t={t} />
        </div>

        {/* Bottom Content: Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <h3
            className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2 drop-shadow-md"
            title={gameTitle}
          >
            {gameTitle}
          </h3>
        </div>
      </div>

      {/* Footer Content */}
      <div className="flex flex-col p-3 gap-2 bg-gray-50 dark:bg-[#151515] grow justify-between">
        {/* Device Support Badges */}
        <div className="flex flex-wrap gap-1.5">
          <DeviceBadges supportedEntries={supportedEntries} selectedKey={selectedKey} t={t} />
        </div>

        {/* Download Count & Version */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10 mt-auto">
          <div
            className="flex items-center gap-1 text-gray-500 dark:text-white/50 text-xs font-medium"
            title={t('downloaded') || 'Downloads'}
          >
            <Icon icon="mdi:download" className="w-3.5 h-3.5" />
            <span>{formatDownloadCount(getTotalDownloadCount())}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-white/40 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
            {versions.length > 1 && (
              <Icon icon="mdi:layers-outline" className="w-3.5 h-3.5 text-[#0081FB]" />
            )}
            <span>{getVersionDisplay()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

GameCard.propTypes = {
  game: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    gameTitle: PropTypes.string,
    version: PropTypes.string,
    gameVersion: PropTypes.string,
    gameStatus: PropTypes.string,
    photoUrl: PropTypes.string,
    downloadCount: PropTypes.number,
    isSupportedV76: PropTypes.bool,
    versions: PropTypes.array,
    linkDownload: PropTypes.string,
    supportMetaQuest1: PropTypes.bool,
    supportMetaQuest2: PropTypes.bool,
    supportMetaQuest3: PropTypes.bool,
    supportMetaQuest3S: PropTypes.bool,
    supportMetaQuestPro: PropTypes.bool
  }).isRequired,
  isEligible: PropTypes.bool,
  selectedDevice: PropTypes.string,
  viewMode: PropTypes.string,
  onClick: PropTypes.func
}

GameCard.defaultProps = {
  isEligible: false,
  selectedDevice: null,
  viewMode: 'grid',
  onClick: () => {}
}

StandaloneGames.propTypes = {
  selectedDevice: PropTypes.string,
  pendingDeepLinkDownload: PropTypes.shape({
    game: PropTypes.string,
    version: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string
  }),
  onDeepLinkProcessed: PropTypes.func,
  onGameCountChange: PropTypes.func
}

StandaloneGames.defaultProps = {
  selectedDevice: null,
  pendingDeepLinkDownload: null,
  onDeepLinkProcessed: null,
  onGameCountChange: null
}

export default StandaloneGames
