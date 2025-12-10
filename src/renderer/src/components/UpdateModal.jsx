import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * UpdateModal Component
 * Shows when update is available - asks user to download now or later
 */
export default function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onDownload,
  isDownloading,
  downloadProgress,
  downloadSpeed,
  downloadedBytes,
  totalBytes,
  onInstall,
  isReady
}) {
  const { t } = useLanguage()

  if (!updateInfo) return null

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return null
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(1) + ' MB'
  }

  // Format download speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return null
    const mbps = bytesPerSecond / (1024 * 1024)
    if (mbps >= 1) {
      return mbps.toFixed(1) + ' MB/s'
    }
    const kbps = bytesPerSecond / 1024
    return kbps.toFixed(0) + ' KB/s'
  }

  // Calculate ETA
  const calculateETA = (speed, downloaded, total) => {
    if (!speed || !total || speed <= 0) return null
    const remaining = total - (downloaded || 0)
    if (remaining <= 0) return null
    const seconds = remaining / speed
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.ceil(seconds % 60)
      return `${mins}m ${secs}s`
    }
    return null
  }

  const fileSize = updateInfo.files?.[0]?.size ? formatSize(updateInfo.files[0].size) : null
  const speedDisplay = formatSpeed(downloadSpeed)
  const etaDisplay = calculateETA(downloadSpeed, downloadedBytes, totalBytes)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className={`shrink-0 rounded-full p-3 ${isReady ? 'bg-green-500/20' : 'bg-[#0081FB]/20'}`}
              >
                {isReady ? (
                  <Icon icon="line-md:confirm-circle" className="h-6 w-6 shrink-0 text-green-500" />
                ) : (
                  <Icon
                    icon="line-md:arrow-up-circle"
                    className="h-6 w-6 shrink-0 text-[#0081FB]"
                  />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isReady
                    ? t('update_ready_title') || 'Update Ready to Install'
                    : t('update_new_version') || 'New Version Available!'}
                </h2>
                <p className="text-sm text-white/50">
                  {t('update_current') || 'Current'}: v{window.__APP_VERSION__ || '1.0.0'}
                </p>
              </div>
            </div>

            {/* Version info */}
            <div className="mb-4 rounded-xl bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">
                    {t('update_new_version_label') || 'New Version'}
                  </p>
                  <p className="text-xl font-bold text-[#0081FB]">v{updateInfo.version}</p>
                </div>
                {fileSize && (
                  <div className="text-right">
                    <p className="text-sm text-white/50">{t('update_size') || 'Size'}</p>
                    <p className="text-lg font-semibold text-white">{fileSize}</p>
                  </div>
                )}
              </div>

              {/* Release date */}
              {updateInfo.releaseDate && (
                <p className="mt-2 text-xs text-white/40">
                  {new Date(updateInfo.releaseDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Progress bar (when downloading) */}
            {isDownloading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                  <span>{t('update_downloading') || 'Downloading...'}</span>
                  <span>{downloadProgress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0081FB] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {/* Speed and ETA info */}
                {(speedDisplay || etaDisplay) && (
                  <div className="flex items-center justify-between text-xs text-white/40 mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <Icon icon="mdi:speedometer" className="h-3 w-3 shrink-0" />
                      {speedDisplay || '-'}
                    </span>
                    {etaDisplay && (
                      <span className="flex items-center gap-1.5">
                        <Icon icon="mdi:clock-outline" className="h-3 w-3 shrink-0" />
                        {etaDisplay} {t('update_remaining') || 'remaining'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isDownloading && !isReady}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('update_later') || 'Later'}
              </button>

              {isReady ? (
                <button
                  onClick={onInstall}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  <Icon icon="line-md:rotate-270" className="h-4 w-4 shrink-0" />
                  {t('update_restart_now') || 'Restart App'}
                </button>
              ) : (
                <button
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0081FB] hover:bg-[#0081FB]/80 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0081FB]/20"
                >
                  {isDownloading ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="h-4 w-4 shrink-0" />
                      {t('update_downloading') || 'Downloading...'}
                    </>
                  ) : (
                    <>
                      <Icon icon="line-md:download-loop" className="h-4 w-4 shrink-0" />
                      {t('update_download_now') || 'Download Now'}
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

UpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  updateInfo: PropTypes.object,
  onDownload: PropTypes.func.isRequired,
  isDownloading: PropTypes.bool,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  onInstall: PropTypes.func,
  isReady: PropTypes.bool
}
