import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * UpdateNotification Component
 * Shows update status: available, downloading, ready to install
 */
export default function UpdateNotification({ className = '' }) {
  const { t } = useLanguage()
  const [updateState, setUpdateState] = useState('idle') // idle, available, downloading, ready
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Listen for update events from main process
    const unsubAvailable = window.api.onUpdateAvailable((info) => {
      console.log('[Update] Available:', info)
      setUpdateInfo(info)
      setUpdateState('available')
      setDismissed(false)
    })

    const unsubProgress = window.api.onUpdateDownloadProgress((progress) => {
      console.log('[Update] Progress:', progress.percent?.toFixed(1) + '%')
      setDownloadProgress(progress.percent || 0)
      setUpdateState('downloading')
    })

    const unsubDownloaded = window.api.onUpdateDownloaded((info) => {
      console.log('[Update] Downloaded:', info)
      setUpdateInfo(info)
      setUpdateState('ready')
      setDownloadProgress(100)
    })

    return () => {
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
    }
  }, [])

  const handleInstall = () => {
    window.api.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't show if dismissed or idle
  if (dismissed || updateState === 'idle') {
    return null
  }

  return (
    <AnimatePresence>
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
                      ? t('update_downloading') || 'Downloading Update...'
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

          {/* Action button (ready state) */}
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
    </AnimatePresence>
  )
}

UpdateNotification.propTypes = {
  className: PropTypes.string
}
