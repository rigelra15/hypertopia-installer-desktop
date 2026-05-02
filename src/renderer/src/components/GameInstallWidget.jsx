import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * GameInstallWidget Component
 * Floating widget in bottom-right corner showing game installation progress
 * Supports multi-step process: DOWNLOADING, EXTRACTING, INSTALLING, PUSHING_OBB
 */
export default function GameInstallWidget({
  isVisible,
  gameTitle,
  step,
  percent,
  detail,
  downloadedBytes,
  totalBytes,
  speed,
  isComplete,
  onClose
}) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)

  if (!isVisible) return null

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format download speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calculate ETA
  const calculateETA = (spd, remaining) => {
    if (!spd || spd <= 0 || !remaining || remaining <= 0) return null
    const seconds = Math.ceil(remaining / spd)

    const isIndonesian = t('language_code') === 'id' || t('download') === 'Unduh'
    const hLabel = isIndonesian ? 'j' : 'h'
    const mLabel = isIndonesian ? 'm' : 'm'
    const sLabel = isIndonesian ? 'd' : 's'

    if (seconds < 60) {
      return `${seconds}${sLabel}`
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}${mLabel} ${secs}${sLabel}`
    } else {
      const hours = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      return `${hours}${hLabel} ${mins}${mLabel}`
    }
  }

  // Get step icon
  const getStepIcon = () => {
    if (isComplete) {
      return <Icon icon="line-md:confirm-circle" className="h-5 w-5 text-green-500" />
    }
    switch (step) {
      case 'DOWNLOADING':
        return <Icon icon="line-md:downloading-loop" className="h-5 w-5 text-[#0081FB]" />
      case 'EXTRACTING':
        return <Icon icon="mdi:folder-zip" className="h-5 w-5 text-orange-400 animate-pulse" />
      case 'INSTALLING':
        return <Icon icon="mdi:package-down" className="h-5 w-5 text-purple-400 animate-pulse" />
      case 'PUSHING_OBB':
        return <Icon icon="mdi:file-send" className="h-5 w-5 text-cyan-400 animate-pulse" />
      case 'ERROR':
        return <Icon icon="mdi:alert-circle" className="h-5 w-5 text-red-500" />
      default:
        return <Icon icon="mdi:loading" className="h-5 w-5 text-[#0081FB] animate-spin" />
    }
  }

  // Get step label
  const getStepLabel = () => {
    if (isComplete) {
      return t('installation_complete') || 'Installation Complete'
    }
    switch (step) {
      case 'DOWNLOADING':
        return t('downloading') || 'Downloading...'
      case 'EXTRACTING':
        return t('extracting') || 'Extracting...'
      case 'INSTALLING':
        return t('installing') || 'Installing...'
      case 'PUSHING_OBB':
        return t('pushing_obb') || 'Pushing OBB...'
      case 'ERROR':
        return t('error') || 'Error'
      default:
        return t('qgo_preparing') || 'Preparing...'
    }
  }

  // Get step color for progress bar
  const getProgressColor = () => {
    switch (step) {
      case 'DOWNLOADING':
        return 'from-[#0081FB] to-[#00C2FF]'
      case 'EXTRACTING':
        return 'from-orange-500 to-yellow-400'
      case 'INSTALLING':
        return 'from-purple-500 to-pink-400'
      case 'PUSHING_OBB':
        return 'from-cyan-500 to-teal-400'
      default:
        return 'from-[#0081FB] to-[#00C2FF]'
    }
  }

  // Get step background color
  const getStepBgColor = () => {
    if (isComplete) return 'bg-green-500/20'
    switch (step) {
      case 'DOWNLOADING':
        return 'bg-[#0081FB]/20'
      case 'EXTRACTING':
        return 'bg-orange-500/20'
      case 'INSTALLING':
        return 'bg-purple-500/20'
      case 'PUSHING_OBB':
        return 'bg-cyan-500/20'
      case 'ERROR':
        return 'bg-red-500/20'
      default:
        return 'bg-[#0081FB]/20'
    }
  }

  const speedDisplay = formatSpeed(speed)
  const remainingBytes = totalBytes - downloadedBytes
  const etaDisplay = calculateETA(speed, remainingBytes)
  const progressPercent = percent || 0
  const isError = step === 'ERROR'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="rounded-2xl bg-white dark:bg-[#111] shadow-2xl overflow-hidden min-w-[300px] max-w-[360px]">
          {/* Header - Always visible, clickable to expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 rounded-full p-2 ${getStepBgColor()}`}>{getStepIcon()}</div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {getStepLabel()}
                </p>
                <p className="text-xs text-gray-500 dark:text-white/50 truncate">
                  {isComplete
                    ? gameTitle
                    : isError
                      ? detail
                      : step === 'DOWNLOADING' && totalBytes > 0
                        ? `${progressPercent.toFixed(0)}% • ${speedDisplay}`
                        : detail || gameTitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(isComplete || isError) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose?.()
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Icon icon="mdi:close" className="h-4 w-4" />
                </button>
              )}
              <Icon
                icon="mdi:chevron-down"
                className={`h-5 w-5 text-gray-400 dark:text-white/50 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
              />
            </div>
          </button>

          {/* Progress bar - Always visible in collapsed state too */}
          {!isComplete && !isError && (
            <div className="h-1 bg-gray-200 dark:bg-white/10">
              <motion.div
                className={`h-full bg-gradient-to-r ${getProgressColor()}`}
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
                <div className="p-3 pt-2 border-t border-gray-100 dark:border-white/5">
                  {/* Game title - only show when in progress, not when complete */}
                  {!isComplete && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/60 mb-2">
                      <Icon icon="mdi:gamepad-variant" className="h-3.5 w-3.5" />
                      <span className="truncate">{gameTitle}</span>
                    </div>
                  )}

                  {/* Download step details */}
                  {!isComplete && !isError && step === 'DOWNLOADING' && totalBytes > 0 && (
                    <div className="space-y-2 mb-3">
                      {/* Size progress */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/60">
                        <span>
                          {formatSize(downloadedBytes)} / {formatSize(totalBytes)}
                        </span>
                        {etaDisplay && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:clock-outline" className="h-3 w-3" />
                            {t('qgo_eta') || 'ETA'}: {etaDisplay}
                          </span>
                        )}
                      </div>

                      {/* Speed info */}
                      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-white/40">
                        <Icon icon="mdi:speedometer" className="h-3.5 w-3.5" />
                        <span>{speedDisplay}</span>
                      </div>
                    </div>
                  )}

                  {/* Steps indicator */}
                  {!isComplete && !isError && (
                    <div className="flex items-center justify-between gap-1 mb-3">
                      {['DOWNLOADING', 'EXTRACTING', 'INSTALLING'].map((s, idx) => {
                        const steps = ['DOWNLOADING', 'EXTRACTING', 'INSTALLING', 'PUSHING_OBB']
                        const currentIdx = steps.indexOf(step)
                        const thisIdx = steps.indexOf(s)
                        const isActive = s === step
                        const isDone = thisIdx < currentIdx

                        return (
                          <div key={s} className="flex items-center flex-1">
                            <div
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                isDone
                                  ? 'bg-green-500'
                                  : isActive
                                    ? `bg-gradient-to-r ${getProgressColor()}`
                                    : 'bg-gray-200 dark:bg-white/10'
                              }`}
                            />
                            {idx < 2 && <div className="w-1" />}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Other step details */}
                  {!isComplete && !isError && step !== 'DOWNLOADING' && (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-500 dark:text-white/60">
                      <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      <span>{detail || getStepLabel()}</span>
                    </div>
                  )}

                  {/* Error state */}
                  {isError && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <Icon icon="mdi:alert-circle" className="h-4 w-4" />
                        <span>{detail || t('installation_failed') || 'Installation failed'}</span>
                      </div>
                      <button
                        onClick={() => onClose?.()}
                        className="w-full py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/70 text-sm font-medium transition-colors"
                      >
                        {t('close') || 'Close'}
                      </button>
                    </div>
                  )}

                  {/* Complete state */}
                  {isComplete && (
                    <div className="space-y-2">
                      {totalBytes > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-white/40">
                          <Icon icon="mdi:harddisk" className="h-3.5 w-3.5" />
                          <span>{formatSize(totalBytes)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => onClose?.()}
                        className="w-full py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/70 text-sm font-medium transition-colors"
                      >
                        {t('close') || 'Close'}
                      </button>
                    </div>
                  )}

                  {/* Info text when not complete/error */}
                  {!isComplete && !isError && (
                    <p className="text-xs text-gray-400 dark:text-white/40 text-center">
                      {t('install_background_info') || 'Installation running in background'}
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

GameInstallWidget.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  gameTitle: PropTypes.string,
  step: PropTypes.string,
  percent: PropTypes.number,
  detail: PropTypes.string,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  speed: PropTypes.number,
  isComplete: PropTypes.bool,
  onClose: PropTypes.func
}
