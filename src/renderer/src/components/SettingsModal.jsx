import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

export function SettingsModal({ isOpen, onClose, currentPath }) {
  const { t } = useLanguage()
  const [extractPath, setExtractPath] = useState(currentPath || '')
  const [diskSpace, setDiskSpace] = useState(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(false)
  const [isChanging, setIsChanging] = useState(false)

  // Load current path disk space when modal opens
  useEffect(() => {
    if (isOpen && currentPath) {
      setExtractPath(currentPath)
      loadDiskSpace(currentPath)
    }
  }, [isOpen, currentPath])

  const loadDiskSpace = async (path) => {
    if (!path) return

    setIsLoadingSpace(true)
    try {
      const space = await window.api.getDiskSpace(path)
      setDiskSpace(space)
    } catch (err) {
      console.error('Error getting disk space:', err)
      setDiskSpace(null)
    } finally {
      setIsLoadingSpace(false)
    }
  }

  const handleChangeFolder = async () => {
    setIsChanging(true)
    try {
      const newPath = await window.api.selectExtractFolder()
      if (newPath && newPath !== currentPath) {
        // Cleanup old folder and move to new one
        await window.api.moveExtractFolder(currentPath)

        // Update localStorage and state
        localStorage.setItem('extractPath', newPath)
        setExtractPath(newPath)

        // Load new disk space
        await loadDiskSpace(newPath)

        // Notify parent component
        onClose(newPath)
      }
    } catch (err) {
      console.error('Error changing folder:', err)
    } finally {
      setIsChanging(false)
    }
  }

  // Get color based on used percentage
  const getStorageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 75) return 'bg-orange-500'
    if (percent >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStorageTextColor = (percent) => {
    if (percent >= 90) return 'text-red-400'
    if (percent >= 75) return 'text-orange-400'
    if (percent >= 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={() => onClose()}
              className="absolute right-4 top-4 rounded-lg p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-[#0081FB]/20 p-4">
                <svg
                  className="h-12 w-12 text-[#0081FB]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-xl font-bold text-white">{t('settings_title')}</h2>
            <p className="mb-6 text-center text-sm text-white/60">{t('settings_desc')}</p>

            {/* Current Configuration */}
            <div className="mb-6 space-y-4">
              {/* Default Folder */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                  {t('settings_default_folder')}
                </label>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="truncate text-xs text-white" title={extractPath}>
                    {extractPath || t('setup_no_folder')}
                  </p>
                </div>
              </div>

              {/* Storage Info */}
              {diskSpace && !isLoadingSpace && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                    {t('storage_label')}
                  </label>
                  <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                    {/* Storage Bar */}
                    <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full transition-all ${getStorageColor(diskSpace.percent)}`}
                        style={{ width: `${diskSpace.percent}%` }}
                      ></div>
                    </div>

                    {/* Storage Text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/60">
                        {diskSpace.free} {t('storage_free_of')} {diskSpace.total}
                      </span>
                      <span className={`font-bold ${getStorageTextColor(diskSpace.percent)}`}>
                        {diskSpace.percent}% {t('storage_used')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingSpace && (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                </div>
              )}
            </div>

            {/* Change Folder Button */}
            <button
              onClick={handleChangeFolder}
              disabled={isChanging}
              className="w-full rounded-lg bg-[#0081FB] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#0081FB]/90 disabled:opacity-50"
            >
              {isChanging ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  {t('settings_changing')}
                </div>
              ) : (
                t('settings_change_folder')
              )}
            </button>

            {/* Info Text */}
            <p className="mt-3 text-center text-xs text-white/40">{t('settings_info')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentPath: PropTypes.string
}
