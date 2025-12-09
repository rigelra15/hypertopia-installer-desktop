import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

export function SetupModal({ isOpen, onComplete }) {
  const { t } = useLanguage()
  const [extractPath, setExtractPath] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [diskSpace, setDiskSpace] = useState(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(false)

  const handleSelectFolder = async () => {
    setIsSelecting(true)
    try {
      const path = await window.api.selectExtractFolder()
      if (path) {
        setExtractPath(path)
        // Get disk space for selected folder
        setIsLoadingSpace(true)
        try {
          const space = await window.api.getDiskSpace(path)
          setDiskSpace(space)
        } catch (spaceErr) {
          console.error('Error getting disk space:', spaceErr)
          setDiskSpace(null)
        } finally {
          setIsLoadingSpace(false)
        }
      }
    } catch (err) {
      console.error('Error selecting folder:', err)
    } finally {
      setIsSelecting(false)
    }
  }

  // Get color based on used percentage
  const getStorageColor = (percent) => {
    if (percent >= 90) return 'bg-red-500' // Critical
    if (percent >= 75) return 'bg-orange-500' // Warning
    if (percent >= 50) return 'bg-yellow-500' // Moderate
    return 'bg-green-500' // Good
  }

  const getStorageTextColor = (percent) => {
    if (percent >= 90) return 'text-red-400'
    if (percent >= 75) return 'text-orange-400'
    if (percent >= 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  const handleComplete = () => {
    if (extractPath) {
      localStorage.setItem('extractPath', extractPath)
      onComplete(extractPath)
    }
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
            <h2 className="mb-2 text-center text-xl font-bold text-white">{t('setup_title')}</h2>
            <p className="mb-6 text-center text-sm text-white/60">{t('setup_desc')}</p>

            {/* Folder Selection */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                {t('setup_extract_folder')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  {extractPath ? (
                    <p className="truncate text-xs text-white" title={extractPath}>
                      {extractPath}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30">{t('setup_no_folder')}</p>
                  )}
                </div>
                <button
                  onClick={handleSelectFolder}
                  disabled={isSelecting}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/20 disabled:opacity-50"
                >
                  {isSelecting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                  )}
                  {t('setup_browse')}
                </button>
              </div>

              {/* Info about HyperTopiaExtraction folder */}
              <div className="mt-3 rounded-lg border border-[#0081FB]/20 bg-[#0081FB]/5 p-3">
                <div className="flex gap-2">
                  <svg
                    className="h-4 w-4 shrink-0 text-[#0081FB]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-white/70">{t('setup_folder_auto_create')}</p>
                </div>
              </div>
            </div>

            {/* Storage Info */}
            {extractPath && diskSpace && (
              <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                    {t('storage_label')}
                  </span>
                  {isLoadingSpace ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <span className={`text-xs font-bold ${getStorageTextColor(diskSpace.percent)}`}>
                      {diskSpace.free} {t('storage_free_of')} {diskSpace.total}
                    </span>
                  )}
                </div>

                {/* Storage Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${getStorageColor(diskSpace.percent)}`}
                    style={{ width: `${diskSpace.percent}%` }}
                  ></div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                  <span>
                    {diskSpace.percent}% {t('storage_used')}
                  </span>
                  <span>{diskSpace.used} used</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <button
              onClick={handleComplete}
              disabled={!extractPath}
              className="w-full rounded-xl bg-linear-to-r from-[#0081FB] to-[#00C2FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0081FB]/25 transition-all hover:scale-[1.02] hover:shadow-[#0081FB]/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {t('setup_continue')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

SetupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired
}
