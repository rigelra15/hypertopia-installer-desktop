import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * DownloadProgressWidget Component
 * Floating widget in bottom-right corner showing download progress
 * Can be expanded/collapsed but not closed until download completes
 */
export default function DownloadProgressWidget({
  isVisible,
  updateInfo,
  downloadProgress,
  downloadSpeed,
  downloadedBytes,
  totalBytes,
  isReady,
  onInstall
}) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(1) + ' MB'
  }

  // Format download speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '-'
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

  const speedDisplay = formatSpeed(downloadSpeed)
  const etaDisplay = calculateETA(downloadSpeed, downloadedBytes, totalBytes)
  const progressPercent = downloadProgress || 0

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="download-progress-widget"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-40"
        >
          <div className="rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-[0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden min-w-[280px] max-w-[320px]">
            {/* Header - Always visible, clickable to expand/collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full ${isReady ? 'bg-green-50 dark:bg-[#0d2818] border border-green-300 dark:border-green-700/50' : 'bg-blue-50 dark:bg-[#0a1929] border border-blue-300 dark:border-[#0066cc]/50'}`}
                >
                  {isReady ? (
                    <Icon
                      icon="mdi:check-circle-outline"
                      className="h-[20px] w-[20px] text-green-500"
                    />
                  ) : (
                    <Icon
                      icon="mdi:arrow-down-circle-outline"
                      className="h-[20px] w-[20px] text-[#0081FB]"
                    />
                  )}
                </div>
                <div className="flex flex-col justify-center text-left">
                  <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight mb-0.5">
                    {isReady
                      ? t('update_ready_title') || 'Pembaruan Siap Diinstal'
                      : t('update_downloading') || 'Mengunduh Pembaruan...'}
                  </p>
                  <p className="text-[12px] font-medium text-gray-500 dark:text-white/50">
                    {isReady
                      ? `v${updateInfo?.version || 'Unknown'}`
                      : `${progressPercent.toFixed(0)}% • ${speedDisplay}`}
                  </p>
                </div>
              </div>
              <Icon
                icon="mdi:chevron-down"
                className={`h-5 w-5 text-gray-400 dark:text-white/50 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
              />
            </button>

            {/* Progress bar - Always visible in collapsed state too */}
            {!isReady && (
              <div className="h-1 bg-gray-200 dark:bg-white/5 shadow-inner">
                <motion.div
                  className="h-full bg-[#0081FB]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3.5 pt-0">
                    {/* Download details */}
                    {!isReady && (
                      <div className="space-y-2 mb-3 mt-3 border-t border-gray-200 dark:border-white/5 pt-3">
                        {/* Size progress */}
                        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-white/40">
                          <span>
                            {formatSize(downloadedBytes)} / {formatSize(totalBytes)}
                          </span>
                          {etaDisplay && (
                            <span className="flex items-center gap-1.5 font-mono">
                              <Icon icon="mdi:clock-outline" className="h-3.5 w-3.5" />
                              {etaDisplay}
                            </span>
                          )}
                        </div>

                        {/* Info text when downloading */}
                        <p className="text-[11px] font-medium text-gray-400 dark:text-white/30 text-center mt-2.5">
                          {t('update_background_info') || 'Pembaruan diunduh di latar belakang'}
                        </p>
                      </div>
                    )}

                    {/* Install button when ready */}
                    {isReady && (
                      <button
                        onClick={onInstall}
                        className="mt-1 w-full py-3 rounded-xl bg-[#00d050] hover:bg-[#00e058] hover:scale-[1.02] active:scale-[0.98] text-white text-[14px] font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,208,80,0.2)]"
                      >
                        <Icon icon="mdi:reload" className="text-lg shrink-0" />
                        {t('update_restart_now') || 'Mulai Ulang Aplikasi'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

DownloadProgressWidget.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  updateInfo: PropTypes.object,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  isReady: PropTypes.bool,
  onInstall: PropTypes.func
}
