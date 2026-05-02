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
  updateInfo,
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
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
                <p className="text-[13px] font-medium text-[#0081FB] dark:text-[#0081FB] animate-pulse">
                  {isReady
                    ? t('update_restarting') || 'Aplikasi akan segera dimulai ulang...'
                    : t('update_mandatory') || 'Pembaruan Wajib: Harap tunggu hingga selesai.'}
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
              {isReady ? (
                <button
                  onClick={onInstall}
                  className="flex-1 py-4 px-4 rounded-xl bg-[#00d050] hover:bg-[#00e058] text-white text-[16px] font-bold transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,208,80,0.3)]"
                >
                  <Icon icon="line-md:loading-loop" className="text-xl shrink-0" />
                  <span className="leading-tight text-center">
                    {t('update_ready_restart') || 'Memulai Ulang Otomatis...'}
                  </span>
                </button>
              ) : (
                <button
                  disabled={true}
                  className="flex-1 py-4 px-4 rounded-xl bg-[#0081FB] text-white text-[16px] font-bold transition-all flex items-center justify-center gap-2.5 opacity-80 shadow-[0_0_20px_rgba(0,129,251,0.2)]"
                >
                  <Icon icon="line-md:loading-loop" className="text-xl shrink-0" />
                  <span className="leading-tight text-center">
                    {t('update_downloading_mandatory') || `Mengunduh v${updateInfo.version}...`}
                  </span>
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
  updateInfo: PropTypes.object,
  isDownloading: PropTypes.bool,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  onInstall: PropTypes.func,
  isReady: PropTypes.bool
}
