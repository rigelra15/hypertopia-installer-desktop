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

  if (!isVisible) return null

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl overflow-hidden min-w-[280px] max-w-[320px]">
          {/* Header - Always visible, clickable to expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 rounded-full p-2 ${isReady ? 'bg-green-500/20' : 'bg-[#0081FB]/20'}`}>
                {isReady ? (
                  <Icon icon="line-md:confirm-circle" className="h-5 w-5 text-green-500" />
                ) : (
                  <Icon icon="line-md:downloading-loop" className="h-5 w-5 text-[#0081FB]" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  {isReady
                    ? t('update_ready_title') || 'Update Ready'
                    : t('update_downloading') || 'Downloading Update...'}
                </p>
                <p className="text-xs text-white/50">
                  {isReady
                    ? `v${updateInfo?.version || 'Unknown'}`
                    : `${progressPercent.toFixed(0)}% • ${speedDisplay}`}
                </p>
              </div>
            </div>
            <Icon
              icon="mdi:chevron-down"
              className={`h-5 w-5 text-white/50 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
            />
          </button>

          {/* Progress bar - Always visible in collapsed state too */}
          {!isReady && (
            <div className="h-1 bg-white/10">
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
                <div className="p-3 pt-2 border-t border-white/5">
                  {/* Download details */}
                  {!isReady && (
                    <div className="space-y-2 mb-3">
                      {/* Size progress */}
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{formatSize(downloadedBytes)} / {formatSize(totalBytes)}</span>
                        {etaDisplay && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:clock-outline" className="h-3 w-3" />
                            {etaDisplay}
                          </span>
                        )}
                      </div>

                      {/* Version info */}
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Icon icon="mdi:package-variant" className="h-3.5 w-3.5" />
                        <span>v{updateInfo?.version || 'Unknown'}</span>
                      </div>
                    </div>
                  )}

                  {/* Install button when ready */}
                  {isReady && (
                    <button
                      onClick={onInstall}
                      className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                    >
                      <Icon icon="line-md:rotate-270" className="h-4 w-4" />
                      {t('update_restart_now') || 'Restart & Install'}
                    </button>
                  )}

                  {/* Info text when downloading */}
                  {!isReady && (
                    <p className="text-xs text-white/40 text-center">
                      {t('update_background_info') || 'Download running in background'}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
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
