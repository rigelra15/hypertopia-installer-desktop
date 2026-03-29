import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * GameDownloadWidget Component
 * Floating widget in bottom-right corner showing game download progress.
 * Has a compact mode (default when minimized) and an expanded mode
 * which mimics the old central Download Progress modal.
 */
export default function GameDownloadWidget({
  isVisible,
  fileName,
  gameTitle,
  downloadProgress,
  downloadSpeed,
  downloadedBytes,
  totalBytes,
  status,
  isComplete,
  onClose,
  onCancel
}) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(true)
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // Store onClose in ref to avoid dependency issues
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Auto-close after 5 seconds when download completes
  useEffect(() => {
    let timeoutId
    let intervalId

    if (isComplete && isVisible) {
      // Start countdown (deferred to avoid synchronous setState cascading render warning)
      timeoutId = setTimeout(() => {
        setAutoCloseCountdown(5)

        intervalId = setInterval(() => {
          setAutoCloseCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(intervalId)
              onCloseRef.current?.()
              return null
            }
            return prev - 1
          })
        }, 1000)
      }, 0)
    } else {
      timeoutId = setTimeout(() => {
        setAutoCloseCountdown(null)
      }, 0)
    }

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [isComplete, isVisible])

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
  const calculateETA = (speed, remaining) => {
    if (!speed || speed <= 0 || !remaining || remaining <= 0) return null
    const seconds = Math.ceil(remaining / speed)

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

  const speedDisplay = formatSpeed(downloadSpeed)
  const remainingBytes = totalBytes - downloadedBytes
  const etaDisplay = calculateETA(downloadSpeed, remainingBytes)
  const progressPercent = downloadProgress || 0

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="download-widget"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <motion.div
            layout
            className={`rounded-2xl bg-white dark:bg-[#111] shadow-2xl overflow-hidden min-w-[300px] ${isExpanded ? 'max-w-[450px] w-[400px]' : 'max-w-[360px]'}`}
          >
            {isExpanded ? (
              /* --- EXPANDED MODE --- (Mimics the old central modal) */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-5 flex flex-col gap-4 relative"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isComplete
                      ? t('download_complete') || 'Download Complete'
                      : t('qgo_downloading') || 'Downloading...'}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsExpanded(false)
                      setShowCancelConfirm(false)
                    }}
                    className="rounded-lg p-1.5 text-gray-400 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors absolute top-4 right-4"
                    title={t('minimize_to_background') || 'Minimize to background'}
                  >
                    <Icon icon="octicon:minimize-16" className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-1 flex items-center gap-2 pr-8">
                  <p className="text-sm text-gray-500 dark:text-white/60 truncate flex-1">{fileName || gameTitle}</p>
                  {fileName && !isComplete && (
                    <span
                      className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        fileName.toLowerCase().endsWith('.rar')
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : fileName.toLowerCase().endsWith('.7z')
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {fileName.split('.').pop()?.toUpperCase() || 'ZIP'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {status === 'downloading' && totalBytes > 0 && !isComplete ? (
                  <div className="mt-2">
                    <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
                      <span>
                        {formatSize(downloadedBytes)} / {formatSize(totalBytes)}
                      </span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Speed and ETA */}
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
                      <span className="flex items-center gap-1.5">
                        <Icon icon="mdi:speedometer" className="h-3.5 w-3.5" />
                        {speedDisplay}
                      </span>
                      {etaDisplay && (
                        <span className="flex items-center gap-1.5">
                          <Icon icon="mdi:clock-outline" className="h-3.5 w-3.5" />
                          {t('qgo_eta') || 'ETA'}: {etaDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                ) : isComplete ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-white/40">
                    <Icon icon="mdi:harddisk" className="h-4 w-4" />
                    <span>{formatSize(totalBytes)}</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center py-4">
                    <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-[#0081FB]" />
                  </div>
                )}

                {/* Action Buttons */}
                {!isComplete && status === 'downloading' && onCancel && (
                  <>
                    {showCancelConfirm ? (
                      <div className="mt-2 w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3">
                        <p className="text-sm font-medium text-red-400 text-center">
                          {t('confirm_cancel_download_msg') ||
                            'Are you sure you want to cancel this download?'}
                        </p>
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowCancelConfirm(false)
                            }}
                            className="flex-1 py-2 px-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-white/10"
                          >
                            {t('no_back') || 'No, Back'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowCancelConfirm(false)
                              onCancel?.()
                            }}
                            className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
                          >
                            {t('yes_cancel') || 'Yes, Cancel'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowCancelConfirm(true)
                        }}
                        className="mt-2 w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Icon icon="mdi:close-circle" className="w-4 h-4" />
                        {t('cancel_download') || 'Cancel Download'}
                      </button>
                    )}
                  </>
                )}

                {isComplete && (
                  <button
                    onClick={() => onClose?.()}
                    className="w-full py-2.5 mt-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/70 text-sm font-medium transition-colors"
                  >
                    {autoCloseCountdown
                      ? `${t('close') || 'Tutup'} (${autoCloseCountdown})`
                      : t('close') || 'Tutup'}
                  </button>
                )}
              </motion.div>
            ) : (
              /* --- COMPACT MODE --- */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExpanded(true)}
                className="w-full flex flex-col hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative"
              >
                <div className="flex items-center justify-between p-3 pb-2.5">
                  <div className="flex items-center gap-3 w-full pr-10">
                    <div
                      className={`shrink-0 rounded-full p-2 ${isComplete ? 'bg-green-500/20' : 'bg-[#0081FB]/20'}`}
                    >
                      {isComplete ? (
                        <Icon icon="line-md:confirm-circle" className="h-5 w-5 text-green-500" />
                      ) : status === 'preparing' ? (
                        <Icon icon="mdi:loading" className="h-5 w-5 text-[#0081FB] animate-spin" />
                      ) : (
                        <Icon icon="line-md:downloading-loop" className="h-5 w-5 text-[#0081FB]" />
                      )}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {isComplete
                          ? t('download_complete') || 'Download Complete'
                          : status === 'preparing'
                            ? t('qgo_preparing') || 'Preparing...'
                            : t('downloading') || 'Downloading...'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-gray-500 dark:text-white/50 truncate">
                          {isComplete
                            ? gameTitle || fileName
                            : status === 'preparing'
                              ? gameTitle || fileName
                              : status === 'downloading' && totalBytes > 0
                                ? `${Math.round(progressPercent)}% • ${speedDisplay}`
                                : gameTitle || fileName}
                        </p>
                        {fileName && !isComplete && status !== 'downloading' && (
                          <span
                            className={`shrink-0 px-1 py-0 text-[9px] font-bold rounded ${fileName.toLowerCase().endsWith('.rar') ? 'bg-purple-500/20 text-purple-400' : fileName.toLowerCase().endsWith('.7z') ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}
                          >
                            {fileName.split('.').pop()?.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {/* Cancel button - show when downloading */}
                    {!isComplete && status === 'downloading' && onCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsExpanded(true)
                          setShowCancelConfirm(true)
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 hover:text-red-400 transition-colors"
                        title={t('cancel_download') || 'Cancel download'}
                      >
                        <Icon icon="mdi:close-circle" className="h-4 w-4" />
                      </button>
                    )}
                    {isComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onClose?.()
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <Icon icon="mdi:close" className="h-4 w-4" />
                      </button>
                    )}
                    {/* Arrow to expand */}
                    {!isComplete && (
                      <button className="p-1 text-gray-400 dark:text-white/50" title={t('expand') || 'Expand'}>
                        <Icon icon="mdi:chevron-up" className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar and details in compact mode */}
                {!isComplete && status === 'downloading' && (
                  <div className="px-3 pb-3">
                    <div className="h-1 bg-gray-200 dark:bg-white/10 w-full mb-2">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
                      <span>
                        {formatSize(downloadedBytes)} / {formatSize(totalBytes)}
                      </span>
                      {etaDisplay && (
                        <span>
                          {t('qgo_eta') || 'ETA'}: {etaDisplay}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

GameDownloadWidget.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  fileName: PropTypes.string,
  gameTitle: PropTypes.string,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  status: PropTypes.string,
  isComplete: PropTypes.bool,
  onClose: PropTypes.func,
  onCancel: PropTypes.func
}
