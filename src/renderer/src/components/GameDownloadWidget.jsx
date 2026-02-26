import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * GameDownloadWidget Component
 * Floating widget in bottom-right corner showing game download progress
 * Similar to DownloadProgressWidget but for game downloads
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
  
  // Store onClose in ref to avoid dependency issues
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Auto-close after 5 seconds when download completes
  useEffect(() => {
    if (isComplete && isVisible) {
      // Start countdown
      setAutoCloseCountdown(5)
      
      const interval = setInterval(() => {
        setAutoCloseCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            onCloseRef.current?.()
            return null
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    } else {
      setAutoCloseCountdown(null)
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
        <div className="rounded-2xl border border-white/20 bg-[#111] shadow-2xl overflow-hidden min-w-[300px] max-w-[360px]">
          {/* Header - Always visible, clickable to expand/collapse */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`shrink-0 rounded-full p-2 ${isComplete ? 'bg-green-500/20' : 'bg-[#0081FB]/20'}`}>
                {isComplete ? (
                  <Icon icon="line-md:confirm-circle" className="h-5 w-5 text-green-500" />
                ) : status === 'preparing' ? (
                  <Icon icon="mdi:loading" className="h-5 w-5 text-[#0081FB] animate-spin" />
                ) : (
                  <Icon icon="line-md:downloading-loop" className="h-5 w-5 text-[#0081FB]" />
                )}
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">
                  {isComplete
                    ? t('download_complete') || 'Download Complete'
                    : status === 'preparing'
                      ? t('qgo_preparing') || 'Preparing...'
                      : t('downloading') || 'Downloading...'}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-white/50 truncate">
                    {isComplete
                      ? gameTitle || fileName
                      : status === 'preparing'
                        ? gameTitle || fileName
                        : status === 'downloading' && totalBytes > 0
                          ? `${progressPercent.toFixed(0)}% • ${speedDisplay}`
                          : gameTitle || fileName}
                  </p>
                  {fileName && !isComplete && status !== 'downloading' && (
                    <span className={`shrink-0 px-1 py-0 text-[9px] font-bold rounded ${fileName.toLowerCase().endsWith('.rar') ? 'bg-purple-500/20 text-purple-400' : fileName.toLowerCase().endsWith('.7z') ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {fileName.split('.').pop()?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Cancel button - show when downloading */}
              {!isComplete && status === 'downloading' && onCancel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancel?.()
                  }}
                  className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  title={t('cancel_download') || 'Cancel download'}
                >
                  <Icon icon="mdi:close-circle" className="h-5 w-5" />
                </button>
              )}
              {isComplete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose?.()
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <Icon icon="mdi:close" className="h-4 w-4" />
                </button>
              )}
              {/* Only show chevron when not complete */}
              {!isComplete && (
                <Icon
                  icon="mdi:chevron-down"
                  className={`h-5 w-5 text-white/50 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                />
              )}
            </div>
          </div>

          {/* Progress bar - Always visible in collapsed state too */}
          {!isComplete && status === 'downloading' && (
            <div className="h-1 bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF]"
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
                  {!isComplete && status === 'downloading' && totalBytes > 0 && (
                    <div className="space-y-2 mb-3">
                      {/* Size progress */}
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{formatSize(downloadedBytes)} / {formatSize(totalBytes)}</span>
                        {etaDisplay && (
                          <span className="flex items-center gap-1">
                            <Icon icon="mdi:clock-outline" className="h-3 w-3" />
                            {t('qgo_eta') || 'ETA'}: {etaDisplay}
                          </span>
                        )}
                      </div>

                      {/* Speed info */}
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Icon icon="mdi:speedometer" className="h-3.5 w-3.5" />
                        <span>{speedDisplay}</span>
                      </div>
                    </div>
                  )}

                  {/* Preparing state - show filename with extension badge */}
                  {!isComplete && status === 'preparing' && (
                    <div className="flex items-center gap-2 py-2 text-xs text-white/50">
                      <Icon icon="mdi:file-download-outline" className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{fileName}</span>
                      {fileName && (
                        <span className={`shrink-0 px-1 py-0 text-[9px] font-bold rounded ${fileName.toLowerCase().endsWith('.rar') ? 'bg-purple-500/20 text-purple-400' : fileName.toLowerCase().endsWith('.7z') ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {fileName.split('.').pop()?.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Complete state */}
                  {isComplete && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Icon icon="mdi:file" className="h-4 w-4" />
                        <span className="truncate flex-1">{fileName}</span>
                        {fileName && (
                          <span className={`shrink-0 px-1 py-0 text-[9px] font-bold rounded ${fileName.toLowerCase().endsWith('.rar') ? 'bg-purple-500/20 text-purple-400' : fileName.toLowerCase().endsWith('.7z') ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {fileName.split('.').pop()?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {totalBytes > 0 && (
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Icon icon="mdi:harddisk" className="h-3.5 w-3.5" />
                          <span>{formatSize(totalBytes)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => onClose?.()}
                        className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors"
                      >
                        {autoCloseCountdown
                          ? `${t('close') || 'Tutup'} (${autoCloseCountdown})`
                          : t('close') || 'Tutup'}
                      </button>
                    </div>
                  )}

                  {/* Info text when downloading */}
                  {!isComplete && status === 'downloading' && (
                    <p className="text-xs text-white/40 text-center">
                      {t('download_background_info') || 'Download running in background'}
                    </p>
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
