import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import UpdateModal from './UpdateModal'
import DownloadProgressWidget from './DownloadProgressWidget'
import PropTypes from 'prop-types'

/**
 * UpdateNotification Component
 * Manages update state and shows notification/modal
 */
export default function UpdateNotification({ className = '', onUpdateAvailable }) {
  const { t } = useLanguage()
  const [updateState, setUpdateState] = useState('idle') // idle, available, downloading, ready
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showWidget, setShowWidget] = useState(false) // NEW: floating widget visibility
  const [dismissed, setDismissed] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')
  const [macUpdateInfo, setMacUpdateInfo] = useState(null) // Mac manual update info
  const autoUpdate = true // Forced to true

  // Fetch current app version on mount
  useEffect(() => {
    window.api.getAppVersion?.().then((ver) => {
      setCurrentVersion(ver?.version || '')
    })
  }, [])

  useEffect(() => {
    // Apply auto-download setting on mount
    window.api.setAutoDownload?.(autoUpdate)
  }, [autoUpdate])

  useEffect(() => {
    // Listen for update events from main process
    const unsubAvailable = window.api.onUpdateAvailable((info) => {
      console.log('[Update] Available:', info)
      setUpdateInfo(info)
      setUpdateState('available')
      setDismissed(false)
      onUpdateAvailable?.(true, info)

      // Mandatory update: Show modal and start download immediately
      setShowModal(true)
      window.api.downloadUpdate()
      setShowWidget(true)
    })

    // Mac: manual update notification (no auto-install, open browser instead)
    const unsubMacAvailable = window.api.onUpdateAvailableMac?.((info) => {
      console.log('[Update] Mac update available:', info)
      setMacUpdateInfo(info)
      onUpdateAvailable?.(true, info)
    })

    const unsubProgress = window.api.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress.percent || 0)
      setDownloadSpeed(progress.bytesPerSecond || 0)
      setDownloadedBytes(progress.transferred || 0)
      setTotalBytes(progress.total || 0)
      setUpdateState('downloading')
    })

    const unsubDownloaded = window.api.onUpdateDownloaded((info) => {
      console.log('[Update] Downloaded:', info)
      setUpdateInfo(info)
      setUpdateState('ready')
      setDownloadProgress(100)
      // Show modal when ready to install (user needs to click restart)
      setShowModal(true)
      // Keep widget visible too
    })

    return () => {
      unsubAvailable?.()
      unsubMacAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
    }
  }, [autoUpdate, onUpdateAvailable])

  const handleDownload = () => {
    window.api.downloadUpdate()
    setUpdateState('downloading')
    // Close modal and show floating widget instead
    setShowModal(false)
    setShowWidget(true)
  }

  const handleInstall = () => {
    window.api.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowModal(false)
  }

  const handleLater = () => {
    // No longer allowed to dismiss
  }

  // Don't show inline notification if dismissed or idle
  const showInline = !dismissed && updateState !== 'idle'

  return (
    <>
      {/* Mac Manual Update Banner */}
      <AnimatePresence>
        {macUpdateInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-3 mb-2 rounded-xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-[#1a1200] overflow-hidden"
          >
            <div className="p-3 flex items-center gap-3">
              <div className="rounded-lg p-1.5 bg-orange-100 dark:bg-orange-900/30 shrink-0">
                <Icon icon="mdi:apple" className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {t('update_available') || 'Update Available'} — v{macUpdateInfo.version}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-white/50 mt-0.5">
                  {t('update_mac_manual') || 'Download manual diperlukan di macOS'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => window.api.openExternal?.(macUpdateInfo.releaseUrl)}
                  className="py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Icon icon="mdi:download" className="h-3.5 w-3.5" />
                  {t('update_download_now') || 'Download'}
                </button>
                <button
                  onClick={() => setMacUpdateInfo(null)}
                  className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                >
                  <Icon icon="mdi:close" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Modal */}
      <UpdateModal
        isOpen={showModal}
        onClose={handleLater}
        updateInfo={updateInfo}
        currentVersion={currentVersion}
        onDownload={handleDownload}
        isDownloading={updateState === 'downloading'}
        downloadProgress={downloadProgress}
        downloadSpeed={downloadSpeed}
        downloadedBytes={downloadedBytes}
        totalBytes={totalBytes}
        onInstall={handleInstall}
        isReady={updateState === 'ready'}
      />

      {/* Floating Download Progress Widget */}
      <DownloadProgressWidget
        isVisible={showWidget && (updateState === 'downloading' || updateState === 'ready')}
        updateInfo={updateInfo}
        downloadProgress={downloadProgress}
        downloadSpeed={downloadSpeed}
        downloadedBytes={downloadedBytes}
        totalBytes={totalBytes}
        isReady={updateState === 'ready'}
        onInstall={handleInstall}
      />

      {/* Inline Notification */}
      <AnimatePresence>
        {showInline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`rounded-xl border overflow-hidden ${className} ${
              updateState === 'ready'
                ? 'bg-green-50 dark:bg-[#0d2818] border-green-300 dark:border-green-700'
                : 'bg-blue-50 dark:bg-[#0a1929] border-blue-300 dark:border-[#0066cc]'
            }`}
          >
            <div className="p-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-lg p-1.5 ${
                      updateState === 'ready'
                        ? 'bg-green-100 dark:bg-[#1a4028]'
                        : 'bg-blue-100 dark:bg-[#0a2840]'
                    }`}
                  >
                    {updateState === 'downloading' ? (
                      <Icon icon="line-md:downloading-loop" className="h-4 w-4 text-[#0081FB]" />
                    ) : updateState === 'ready' ? (
                      <Icon icon="line-md:confirm-circle" className="h-4 w-4 text-green-400" />
                    ) : (
                      <Icon icon="line-md:arrow-up-circle" className="h-4 w-4 text-[#0081FB]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {updateState === 'ready'
                        ? t('update_ready') || 'Update Ready!'
                        : updateState === 'downloading'
                          ? t('update_downloading') || 'Downloading...'
                          : t('update_available') || 'Update Available'}
                    </p>
                    {updateInfo?.version && (
                      <p className="text-[10px] text-gray-500 dark:text-white/50">
                        v{updateInfo.version}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dismiss button (only when not downloading) */}
                {updateState !== 'downloading' && (
                  <button
                    onClick={handleDismiss}
                    className="rounded p-1 text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  >
                    <Icon icon="mdi:close" className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress bar (downloading state) */}
              {updateState === 'downloading' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#0081FB] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1 text-right">
                    {downloadProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {updateState === 'available' && !showModal && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-blue-100 dark:bg-[#0a2840] hover:bg-blue-200 dark:hover:bg-[#0d3355] border border-blue-300 dark:border-[#0066cc] text-[#0081FB] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon icon="line-md:download-loop" className="h-3.5 w-3.5" />
                  {t('update_download_now') || 'Download Now'}
                </button>
              )}

              {updateState === 'ready' && (
                <button
                  onClick={handleInstall}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-green-100 dark:bg-[#1a4028] hover:bg-green-200 dark:hover:bg-[#225030] border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon icon="line-md:rotate-270" className="h-3.5 w-3.5" />
                  {t('update_restart') || 'Restart to Update'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

UpdateNotification.propTypes = {
  className: PropTypes.string,
  onUpdateAvailable: PropTypes.func
}
