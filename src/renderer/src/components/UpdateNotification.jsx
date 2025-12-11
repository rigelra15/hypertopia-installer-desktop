import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import UpdateModal from './UpdateModal'
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
  const [dismissed, setDismissed] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')
  const [autoUpdate] = useState(() => {
    return localStorage.getItem('autoUpdate') !== 'false'
  })

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

      // If auto-update is ON, start download immediately
      if (autoUpdate) {
        window.api.downloadUpdate()
      } else {
        // Show modal to ask user
        setShowModal(true)
      }
    })

    const unsubProgress = window.api.onUpdateDownloadProgress((progress) => {
      console.log('[Update] Progress:', progress.percent?.toFixed(1) + '%', 'Speed:', progress.bytesPerSecond)
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
      setShowModal(true)
    })

    return () => {
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
    }
  }, [autoUpdate, onUpdateAvailable])

  const handleDownload = () => {
    window.api.downloadUpdate()
    setUpdateState('downloading')
  }

  const handleInstall = () => {
    window.api.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowModal(false)
  }

  const handleLater = () => {
    setShowModal(false)
    // Keep the badge visible
  }

  // Don't show inline notification if dismissed or idle
  const showInline = !dismissed && updateState !== 'idle'

  return (
    <>
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

      {/* Inline Notification */}
      <AnimatePresence>
        {showInline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`rounded-xl border overflow-hidden ${className} ${
              updateState === 'ready'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-[#0081FB]/10 border-[#0081FB]/30'
            }`}
          >
            <div className="p-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-lg p-1.5 ${
                      updateState === 'ready' ? 'bg-green-500/20' : 'bg-[#0081FB]/20'
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
                    <p className="text-xs font-medium text-white">
                      {updateState === 'ready'
                        ? t('update_ready') || 'Update Ready!'
                        : updateState === 'downloading'
                          ? t('update_downloading') || 'Downloading...'
                          : t('update_available') || 'Update Available'}
                    </p>
                    {updateInfo?.version && (
                      <p className="text-[10px] text-white/50">v{updateInfo.version}</p>
                    )}
                  </div>
                </div>

                {/* Dismiss button (only when not downloading) */}
                {updateState !== 'downloading' && (
                  <button
                    onClick={handleDismiss}
                    className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
                  >
                    <Icon icon="mdi:close" className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress bar (downloading state) */}
              {updateState === 'downloading' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#0081FB] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 text-right">
                    {downloadProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {updateState === 'available' && !showModal && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-[#0081FB]/20 hover:bg-[#0081FB]/30 border border-[#0081FB]/30 text-[#0081FB] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon icon="line-md:download-loop" className="h-3.5 w-3.5" />
                  {t('update_download_now') || 'Download Now'}
                </button>
              )}

              {updateState === 'ready' && (
                <button
                  onClick={handleInstall}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
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
