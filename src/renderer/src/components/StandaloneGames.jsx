import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import DevicePreferenceModal from './DevicePreferenceModal'
import coverImages from '../utils/coverImages'

const API_BASE_URL = 'https://api.hypertopia.store'
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96]

export function StandaloneGames() {
  const { t } = useLanguage()
  const { user, accessTypes } = useAuth()
  const isEligible = accessTypes.includes('standalone')
  
  const [games, setGames] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('added') // 'added' | 'name' | 'downloads' | 'size' | 'rating'
  const [sortOrder, setSortOrder] = useState('asc') // 'asc' | 'desc'

  // Device preference state
  const [devicePreference, setDevicePreference] = useState(null) // null = all, or 'quest1', 'quest2', etc.
  const [devicePreferenceLoading, setDevicePreferenceLoading] = useState(true)
  const [showDeviceModal, setShowDeviceModal] = useState(false)

  // Pagination state from API
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

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

  // Fetch games from paginated API
  const fetchGames = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
        search: searchQuery
      })
      
      // Add device filter if preference is set
      if (devicePreference) {
        params.set('device', devicePreference)
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/standalone-games-paginated?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }
      const result = await response.json()
      
      // Convert object to array with keys
      const gamesArray = Object.entries(result.data || {}).map(([key, game]) => ({
        id: key,
        ...game
      }))
      setGames(gamesArray)
      
      // Update pagination info from API
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
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchQuery, devicePreference])

  // Fetch when params change
  useEffect(() => {
    if (!devicePreferenceLoading) {
      fetchGames()
    }
  }, [fetchGames, devicePreferenceLoading])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, sortOrder, itemsPerPage, devicePreference])

  const handleRefresh = () => {
    fetchGames()
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
    <div className="flex flex-1 flex-col overflow-hidden bg-[#111]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#191919] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0081FB] to-[#00C2FF] shadow-lg shadow-[#0081FB]/20">
              <Icon icon="mdi:gamepad-variant" className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('standalone_games_title')}</h2>
              <p className="text-xs text-white/50">
                {isLoading
                  ? t('standalone_games_loading')
                  : `${totalItems} ${t('standalone_games_count')}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <Icon
              icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">{t('refresh_btn')}</span>
          </button>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#0081FB]/50 transition-colors"
            />
          </div>

          {/* Items Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-[#0a0a0a] px-2 py-2 text-sm text-white outline-none focus:border-[#0081FB]/50 transition-colors cursor-pointer"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#0081FB]/50 transition-colors cursor-pointer"
          >
            <option value="added">{t('sort_by_added') || 'Terbaru'}</option>
            <option value="name">{t('sort_by_name') || 'Nama'}</option>
            <option value="downloads">{t('sort_by_downloads') || 'Download'}</option>
            <option value="size">{t('sort_by_size') || 'Ukuran'}</option>
            <option value="rating">{t('sort_by_rating') || 'Rating'}</option>
          </select>

          {/* Device Preference Button */}
          <button
            onClick={() => setShowDeviceModal(true)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              devicePreference
                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                : 'border-white/10 bg-[#0a0a0a] text-white/70 hover:bg-white/5 hover:text-white'
            }`}
            title={t('device_preference_title') || 'Select Device'}
          >
            <Icon icon="bi:headset-vr" className="h-4 w-4" />
            <span className="hidden sm:inline">
              {devicePreference
                ? devicePreference.replace('quest', 'Quest ').replace('Pro', ' Pro').replace('3s', '3S')
                : t('all_devices') || 'All'}
            </span>
          </button>

          {/* Sort Order Toggle */}
          <button
            onClick={toggleSortOrder}
            className="flex items-center justify-center rounded-lg border border-white/10 bg-[#0a0a0a] p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <Icon
              icon={sortOrder === 'asc' ? 'mdi:sort-ascending' : 'mdi:sort-descending'}
              className="h-5 w-5"
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="games-content flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
            <p className="mt-4 text-sm text-white/50">{t('standalone_games_loading')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-white/70">{t('standalone_games_error')}</p>
            <p className="mt-1 text-xs text-white/40">{error}</p>
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
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Icon icon="mdi:gamepad-variant-outline" className="h-8 w-8 text-white/30" />
            </div>
            <p className="mt-4 text-sm text-white/70">
              {searchQuery ? t('search_no_results') : t('standalone_games_empty')}
            </p>
          </div>
        ) : (
          <>
            {/* Games Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {games.map((game) => (
                <GameCard key={game.id} game={game} isEligible={isEligible} selectedDevice={devicePreference} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3">
                {/* Page Info */}
                <p className="text-xs text-white/40">
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Icon icon="mdi:chevron-left" className="h-5 w-5" />
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-white/30">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-[#0081FB] text-white'
                            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Icon icon="mdi:chevron-right" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

function GameCard({ game, isEligible, selectedDevice }) {
  const { t } = useLanguage()
  const [coverUrl, setCoverUrl] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)

  const gameTitle = game.gameTitle || game.name || game.id?.replace(/!/g, '') || 'Unknown Game'
  const gameStatus = game.gameStatus || ''
  const downloadCount = game.downloadCount || 0
  const isSupportedV76 = game.isSupportedV76 || false

  // Fetch cover image from Firebase Storage (same as website), fallback to API photoUrl
  useEffect(() => {
    let mounted = true
    const fetchCover = async () => {
      setLoadingImage(true)
      try {
        // Try Firebase Storage first (same as website)
        const url = await coverImages.getCoverUrl(gameTitle)
        if (mounted && url) {
          setCoverUrl(url)
          return
        }
      } catch (err) {
        console.warn('Firebase Storage failed, trying API photoUrl:', err)
      }
      
      // Fallback to API photoUrl
      if (mounted && game.photoUrl) {
        setCoverUrl(game.photoUrl)
      }
      
      if (mounted) setLoadingImage(false)
    }
    fetchCover()
    return () => {
      mounted = false
    }
  }, [gameTitle, game.photoUrl])

  // Get versions info - with null safety
  const versions = Array.isArray(game.versions) ? game.versions.filter((v) => v !== null) : []
  const gameVersion = game.version || game.gameVersion || ''

  // Get download link - get first version's download link or game's direct link
  const getDownloadLink = () => {
    if (versions.length > 0 && versions[0]?.downloadLinks?.length > 0) {
      return versions[0].downloadLinks[0]
    }
    return game.linkDownload || null
  }

  // Get version display text
  const getVersionDisplay = () => {
    if (versions.length > 1) {
      const lastVersion = versions[versions.length - 1]?.version || ''
      const firstVersion = versions[0]?.version || ''
      if (lastVersion && firstVersion) {
        return `${lastVersion} - ${firstVersion}`
      }
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

  // Get supported Quest models
  const getSupportedDevices = () => {
    return Object.entries(game).filter(([k, v]) => k.startsWith('supportMetaQuest') && v)
  }

  // Handle download click
  const handleDownload = (e) => {
    e.stopPropagation()
    const link = getDownloadLink()
    if (link) {
      window.open(link, '_blank')
    }
  }

  return (
    <div className="group flex flex-col w-full h-full rounded-2xl border-2 border-white/10 bg-[#1a1a1a] cursor-pointer hover:border-[#0081FB]/50 hover:shadow-xl hover:shadow-[#0081FB]/10 transition-all duration-300 overflow-hidden">
      {/* Image Header Container */}
      <div className="relative w-full h-48 sm:h-56 bg-[#0a0a0a] overflow-hidden">
        {/* Spinner while loading */}
        {loadingImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
            <div className="w-8 h-8 border-3 border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
          </div>
        )}

        {/* Placeholder when no image available */}
        {!loadingImage && !coverUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
            <Icon icon="mdi:image-off" className="w-14 h-14 text-white/20" />
            <span className="text-white/30 text-xs mt-2">No Image Cover</span>
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

        {/* Top Left: Status Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          {/* New Badge */}
          {gameStatus === 'new' && (
            <span className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 rounded-md shadow-sm w-fit flex items-center gap-1">
              <Icon icon="streamline-flex:new-badge-highlight-solid" className="w-3 h-3" />
              {t('badge_new') || 'NEW'}
            </span>
          )}

          {/* Update Badge */}
          {gameStatus === 'update' && (
            <span className="px-2 py-1 text-[10px] font-bold text-white bg-yellow-500 rounded-md shadow-sm w-fit flex items-center gap-1">
              <Icon icon="mdi:update" className="w-3 h-3" />
              {t('badge_update') || 'UPDATE'}
            </span>
          )}

          {/* Coming Soon Badge */}
          {gameStatus === 'coming_soon' && (
            <span className="px-2 py-1 text-[10px] font-bold text-white bg-purple-600 rounded-md shadow-sm w-fit flex items-center gap-1">
              <Icon icon="mdi:clock-outline" className="w-3 h-3" />
              {t('badge_coming_soon') || 'SOON'}
            </span>
          )}
        </div>

        {/* Top Right: Download Button for Eligible Users */}
        {isEligible && getDownloadLink() && (
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={handleDownload}
              className="p-2 rounded-full bg-[#0081FB] text-white hover:bg-[#0081FB]/80 transition-all duration-300 shadow-lg"
              title={t('download') || 'Download'}
            >
              <Icon icon="mdi:download" className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Bottom Content: Title & v76 Warning */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          {/* Title */}
          <h3
            className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2 drop-shadow-md"
            title={gameTitle}
          >
            {gameTitle}
          </h3>

          {/* v76+ Badge (if applicable) */}
          {isSupportedV76 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/80 text-white text-[10px] font-bold">
              <span>v76+ Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Content */}
      <div className="flex flex-col p-3 gap-2 bg-[#151515] flex-grow justify-between">
        {/* Device Support Badges */}
        <div className="flex flex-wrap gap-1.5">
          {(() => {
            const supportedEntries = getSupportedDevices()

            if (supportedEntries.length === 0) {
              return (
                <span className="text-[10px] px-2 py-1 rounded bg-white/5 text-white/40 font-medium">
                  {t('not_supported') || 'Unknown'}
                </span>
              )
            }

            // Map selectedDevice to supportMetaQuest key
            const deviceToKeyMap = {
              quest1: 'supportMetaQuest1',
              quest2: 'supportMetaQuest2',
              quest3: 'supportMetaQuest3',
              quest3s: 'supportMetaQuest3S',
              questPro: 'supportMetaQuestPro'
            }
            const selectedKey = selectedDevice ? deviceToKeyMap[selectedDevice] : null

            return supportedEntries.map(([quest]) => {
              const questInfo = getQuestInfo(quest)
              const isSelected = quest === selectedKey
              return (
                <span
                  key={quest}
                  className={`text-[10px] px-2 py-1 rounded font-semibold flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white/5 text-white/60 border-white/10'
                  }`}
                  title={questInfo.fullName}
                >
                  <Icon icon="tabler:device-vision-pro" className="w-3 h-3" />
                  {questInfo.label}
                </span>
              )
            })
          })()}
        </div>

        {/* Download Count & Version */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-auto">
          <div
            className="flex items-center gap-1 text-white/50 text-xs font-medium"
            title={t('downloaded') || 'Downloads'}
          >
            <Icon icon="mdi:download" className="w-3.5 h-3.5" />
            <span>{formatDownloadCount(getTotalDownloadCount())}</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-white/40 bg-white/5 px-2 py-0.5 rounded">
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
  selectedDevice: PropTypes.string
}

GameCard.defaultProps = {
  isEligible: false,
  selectedDevice: null
}

export default StandaloneGames

