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
  currentVersion,
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

  // File size: Only show actual download size from progress (not the misleading full installer size)
  // The full installer size from updateInfo.files is NOT the delta update size
  const getDisplaySize = () => {
    // Only show size when we have actual download size (from progress)
    if (totalBytes && totalBytes > 0) {
      return formatSize(totalBytes)
    }
    // Don't show the full installer size - it's misleading for delta updates
    return null
  }

  const fileSize = getDisplaySize()
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
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111] p-6 shadow-2xl custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <div
                className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full ${isReady ? 'bg-green-50 dark:bg-[#0d2818] border border-green-300 dark:border-green-700/50' : 'bg-blue-50 dark:bg-[#0a1929] border border-blue-300 dark:border-[#0066cc]/50'}`}
              >
                {isReady ? (
                  <Icon
                    icon="mdi:check-circle-outline"
                    className="h-[26px] w-[26px] text-green-500"
                  />
                ) : (
                  <Icon
                    icon="mdi:arrow-up-circle-outline"
                    className="h-[26px] w-[26px] text-[#0081FB]"
                  />
                )}
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-0.5">
                  {isReady
                    ? t('update_ready_title') || 'Pembaruan Siap Diinstal'
                    : t('update_new_version') || 'New Version Available!'}
                </h2>
                <p className="text-[13px] font-medium text-gray-500 dark:text-white/50">
                  {t('update_current') || 'Saat ini'}: v{currentVersion || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Version info */}
            <div className="mb-6 flex flex-col justify-between rounded-2xl bg-gray-50 dark:bg-[#1e1e1e] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
                    {t('update_new_version_label') || 'Versi Baru'}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-[#0081FB]">
                    v{updateInfo.version}
                  </p>
                </div>
                {fileSize && (
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
                      {t('update_size') || 'Ukuran'}
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                      {fileSize}
                    </p>
                  </div>
                )}
              </div>

              {/* Release date */}
              <p className="mt-6 text-[13px] font-medium text-gray-500 dark:text-white/40">
                {updateInfo.releaseDate
                  ? new Date(updateInfo.releaseDate).toLocaleDateString()
                  : new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Progress bar (when downloading) */}
            {isDownloading && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-white/50 mb-2">
                  <span>{t('update_downloading') || 'Downloading...'}</span>
                  <span className="font-mono">{downloadProgress.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full bg-[#0081FB] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${downloadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {/* Speed and ETA info */}
                {(speedDisplay || etaDisplay) && (
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-white/40 mt-2">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Icon icon="mdi:speedometer" className="h-3.5 w-3.5" />
                      {speedDisplay || '-'}
                    </span>
                    {etaDisplay && (
                      <span className="flex items-center gap-1.5 font-mono">
                        <Icon icon="mdi:clock-outline" className="h-3.5 w-3.5" />
                        {etaDisplay} {t('update_remaining') || 'remaining'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isDownloading && !isReady}
                className="flex-[1] py-3.5 px-4 rounded-xl bg-transparent border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white text-[15px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('update_later') || 'Nanti'}
              </button>

              {isReady ? (
                <button
                  onClick={onInstall}
                  className="flex-[1.5] py-3.5 px-4 rounded-xl bg-[#00d050] hover:bg-[#00e058] hover:scale-[1.02] active:scale-[0.98] text-white text-[15px] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,208,80,0.2)]"
                >
                  <Icon icon="mdi:reload" className="text-lg shrink-0" />
                  <span className="max-w-[100px] leading-[1.15] text-center whitespace-normal">
                    {t('update_restart_now') || 'Mulai Ulang Aplikasi'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="flex-[1.5] py-3.5 px-4 rounded-xl bg-[#0081FB] hover:bg-[#1a90ff] hover:scale-[1.02] active:scale-[0.98] text-white text-[15px] font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,129,251,0.2)]"
                >
                  {isDownloading ? (
                    <>
                      <Icon icon="line-md:loading-loop" className="text-lg shrink-0" />
                      <span className="max-w-[100px] leading-[1.15] text-center whitespace-normal">
                        Mengunduh {downloadProgress.toFixed(0)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon icon="line-md:download-loop" className="text-lg shrink-0" />
                      <span className="max-w-[100px] leading-[1.15] text-center whitespace-normal">
                        {t('update_download_now') || 'Unduh Sekarang'}
                      </span>
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
  currentVersion: PropTypes.string,
  onDownload: PropTypes.func.isRequired,
  isDownloading: PropTypes.bool,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  onInstall: PropTypes.func,
  isReady: PropTypes.bool
}
