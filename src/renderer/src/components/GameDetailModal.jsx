import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import coverImages from '../utils/coverImages'

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

// Format download count
const formatDownloadCount = (count) => {
  if (!count || count === 0) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

// Helper function to get Quest model info
const getQuestInfo = (questKey) => {
  const questMap = {
    supportMetaQuest1: { label: 'Q1', fullName: 'Meta Quest 1' },
    supportMetaQuest2: { label: 'Q2', fullName: 'Meta Quest 2' },
    supportMetaQuest3: { label: 'Q3', fullName: 'Meta Quest 3' },
    supportMetaQuest3S: { label: 'Q3S', fullName: 'Meta Quest 3S' },
    supportMetaQuestPro: { label: 'QP', fullName: 'Meta Quest Pro' }
  }
  return (
    questMap[questKey] || {
      label: questKey.replace('supportMetaQuest', 'Q'),
      fullName: 'Meta ' + questKey.replace('supportMetaQuest', 'Quest ')
    }
  )
}

export default function GameDetailModal({ isOpen, onClose, game, selectedDevice }) {
  const { t } = useLanguage()
  const { user, accessTypes } = useAuth()
  const isEligible = accessTypes.includes('standalone')

  const [coverUrl, setCoverUrl] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState(0)
  const [showVersionSelector, setShowVersionSelector] = useState(false)
  const [showDownloadParts, setShowDownloadParts] = useState(false)

  // Safely extract game properties with fallbacks
  const gameTitle = game?.gameTitle || game?.name || game?.id?.replace(/!/g, '') || 'Unknown Game'
  const gameStatus = game?.gameStatus || ''
  const isSupportedV76 = game?.isSupportedV76 || false
  const versions = Array.isArray(game?.versions) ? game.versions.filter((v) => v !== null) : []
  const gameVersion = game?.version || game?.gameVersion || 'v1.0'

  // Fetch cover image
  useEffect(() => {
    if (!isOpen || !game || !gameTitle) return
    let mounted = true

    const fetchCover = async () => {
      setLoadingImage(true)
      try {
        const url = await coverImages.getCoverUrl(gameTitle)
        if (mounted && url) {
          setCoverUrl(url)
        }
      } catch (err) {
        console.warn('Cover fetch failed:', err)
      }
      if (mounted) setLoadingImage(false)
    }
    fetchCover()
    return () => {
      mounted = false
    }
  }, [isOpen, game, gameTitle])

  // Reset state when game changes
  useEffect(() => {
    if (!game) return
    if (versions.length > 0) {
      // Sort versions and select the newest one
      const sortedVersionsWithIndex = versions
        .map((version, originalIndex) => ({ ...version, originalIndex }))
        .sort((a, b) => compareVersions(a.version, b.version))
      setSelectedVersion(sortedVersionsWithIndex[0]?.originalIndex || 0)
    } else {
      setSelectedVersion(0)
    }
    // Reset other states when game changes
    setCoverUrl(null)
    setLoadingImage(true)
    setShowVersionSelector(false)
    setShowDownloadParts(false)
  }, [game])

  // Close version selector on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVersionSelector && !event.target.closest('.version-selector')) {
        setShowVersionSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVersionSelector])

  // Early return AFTER all hooks
  if (!game) return null


  // Get current version data
  const getCurrentVersion = () => {
    if (versions.length > 0) {
      return versions[selectedVersion] || versions[0]
    }
    return {
      version: gameVersion,
      downloadLinks: game.linkDownload ? [game.linkDownload] : [],
      isSupportedV76: isSupportedV76,
      downloadCount: game.downloadCount || 0
    }
  }

  // Get total download count
  const getTotalDownloadCount = () => {
    if (versions.length > 0) {
      return versions.reduce((total, version) => total + (version?.downloadCount || 0), 0)
    }
    return game.downloadCount || 0
  }

  // Get supported Quest devices
  const getSupportedDevices = () => {
    return Object.entries(game).filter(([k, v]) => k.startsWith('supportMetaQuest') && v)
  }

  // Handle download
  const handleDownload = async () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    if (downloadLinks.length === 0) {
      return
    }

    if (downloadLinks.length > 1) {
      setShowDownloadParts(true)
    } else {
      // Single link - open directly
      if (window.api?.openExternal) {
        await window.api.openExternal(downloadLinks[0])
      } else {
        window.open(downloadLinks[0], '_blank')
      }
    }
  }

  // Open single download link
  const openDownloadLink = async (link) => {
    if (window.api?.openExternal) {
      await window.api.openExternal(link)
    } else {
      window.open(link, '_blank')
    }
  }

  const currentVersion = getCurrentVersion()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl bg-[#111] rounded-2xl shadow-2xl border border-white/10"
            >
              {/* Header / Image Area */}
              <div className="relative h-56 md:h-72 w-full overflow-hidden rounded-t-2xl">
                {/* Loading spinner */}
                {loadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                    <div className="w-10 h-10 border-3 border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
                  </div>
                )}

                {/* Placeholder */}
                {!loadingImage && !coverUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
                    <Icon icon="mdi:image-off" className="w-16 h-16 text-white/20" />
                    <span className="text-white/30 text-sm mt-2">No Cover Image</span>
                  </div>
                )}

                {/* Cover image */}
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt={gameTitle}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>

                {/* Title & badges */}
                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
                    {gameTitle}
                  </h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Device badges with user preference highlight */}
                    {(() => {
                      // Map selectedDevice to supportMetaQuest key
                      const deviceToKeyMap = {
                        quest1: 'supportMetaQuest1',
                        quest2: 'supportMetaQuest2',
                        quest3: 'supportMetaQuest3',
                        quest3s: 'supportMetaQuest3S',
                        questPro: 'supportMetaQuestPro'
                      }
                      const selectedKey = selectedDevice ? deviceToKeyMap[selectedDevice] : null

                      return getSupportedDevices().map(([quest]) => {
                        const questInfo = getQuestInfo(quest)
                        const isSelected = quest === selectedKey
                        return (
                          <span
                            key={quest}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white/20 text-white border-white/10'
                            }`}
                            title={questInfo.fullName}
                          >
                            {questInfo.fullName}
                          </span>
                        )
                      })
                    })()}

                    {/* v76 badge */}
                    {currentVersion.isSupportedV76 && (
                      <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm">
                        v76+
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6">
                {/* Stats row */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-2 rounded-lg text-sm font-medium">
                    <Icon icon="mdi:download" className="w-4 h-4" />
                    {formatDownloadCount(getTotalDownloadCount())}
                  </div>
                  {versions.length > 1 && (
                    <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-2 rounded-lg text-sm font-medium">
                      <Icon icon="mdi:layers-outline" className="w-4 h-4 text-[#0081FB]" />
                      {versions.length} {t('versions') || 'versions'}
                    </div>
                  )}
                </div>

                {/* Main actions area */}
                {user && isEligible ? (
                  <div className="space-y-4">
                    {/* Version selector */}
                    {(versions.length > 0 || gameVersion) && (
                      <div className="relative version-selector">
                        <label className="block text-sm font-medium text-white/50 mb-2">
                          {t('select_version') || 'Select Version'}
                        </label>
                        <button
                          onClick={() => setShowVersionSelector(!showVersionSelector)}
                          className="w-full h-12 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between px-4 rounded-xl border border-white/10"
                        >
                          <span className="font-semibold text-white">
                            {currentVersion.version || gameVersion}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 font-medium flex items-center gap-1">
                              <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                              {formatDownloadCount(currentVersion.downloadCount || 0)}
                            </span>
                            {currentVersion.isSupportedV76 && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                v76+
                              </span>
                            )}
                            {currentVersion.mixedReality === 'yes' && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">
                                MR
                              </span>
                            )}
                            <Icon
                              icon="heroicons:chevron-down"
                              className={`w-5 h-5 text-white/50 transition-transform ${showVersionSelector ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {/* Version dropdown */}
                        <AnimatePresence>
                          {showVersionSelector && versions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
                            >
                              {[...versions]
                                .map((version, originalIndex) => ({ ...version, originalIndex }))
                                .sort((a, b) => compareVersions(a.version, b.version))
                                .map((version) => (
                                  <button
                                    key={version.originalIndex}
                                    onClick={() => {
                                      setSelectedVersion(version.originalIndex)
                                      setShowVersionSelector(false)
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex justify-between items-center ${
                                      version.originalIndex === selectedVersion ? 'bg-[#0081FB]/10' : ''
                                    }`}
                                  >
                                    <span
                                      className={`font-medium ${version.originalIndex === selectedVersion ? 'text-[#0081FB]' : 'text-white'}`}
                                    >
                                      {version.version}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-white/40 font-medium flex items-center gap-1">
                                        <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                                        {formatDownloadCount(version.downloadCount || 0)}
                                      </span>
                                      {version.isSupportedV76 && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                          v76+
                                        </span>
                                      )}
                                      {version.originalIndex === selectedVersion && (
                                        <Icon icon="mdi:check" className="w-4 h-4 text-[#0081FB]" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Download button */}
                    <div className="flex gap-3 mt-4">
                      {gameStatus !== 'coming_soon' ? (
                        <button
                          onClick={handleDownload}
                          disabled={!currentVersion.downloadLinks?.length}
                          className="flex-1 h-14 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-white/10 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-[#0081FB]/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:download" className="w-5 h-5" />
                          {t('download') || 'Download'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex-1 h-14 bg-white/10 text-white/50 rounded-xl font-bold text-lg cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:clock-outline" className="w-5 h-5" />
                          {t('coming_soon') || 'Coming Soon'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl text-center text-white/50 text-sm">
                    {!user
                      ? t('login_required') || 'Please login to download'
                      : t('not_eligible') || 'You are not eligible to access downloads'}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Download Parts Modal */}
            <AnimatePresence>
              {showDownloadParts && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                >
                  <div
                    className="fixed inset-0 bg-black/60"
                    onClick={() => setShowDownloadParts(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
                  >
                    <div className="flex justify-between items-center p-4 border-b border-white/10">
                      <h3 className="font-bold text-lg text-white">
                        {t('download_parts') || 'Download Parts'}
                      </h3>
                      <button
                        onClick={() => setShowDownloadParts(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Icon icon="mdi:close" className="w-5 h-5 text-white/60" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-red-400 mb-3">
                        {t('download_all_parts_warning') ||
                          'You must download all parts for the game to work!'}
                      </p>
                      {(currentVersion.downloadLinks || [])
                        .filter((l) => l && l.trim())
                        .map((link, idx) => (
                          <button
                            key={idx}
                            onClick={() => openDownloadLink(link)}
                            className="w-full flex items-center justify-between p-3 border border-white/10 rounded-xl hover:bg-[#0081FB]/10 hover:border-[#0081FB]/30 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#0081FB]/20 text-[#0081FB] flex items-center justify-center font-bold text-sm group-hover:bg-[#0081FB] group-hover:text-white transition-colors">
                                {idx + 1}
                              </div>
                              <span className="font-medium text-white">Part {idx + 1}</span>
                            </div>
                            <Icon
                              icon="mdi:download"
                              className="w-5 h-5 text-white/40 group-hover:text-[#0081FB]"
                            />
                          </button>
                        ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

GameDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  game: PropTypes.object,
  selectedDevice: PropTypes.string
}
