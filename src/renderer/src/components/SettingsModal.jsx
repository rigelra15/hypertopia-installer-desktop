import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import ChangelogModal from './ChangelogModal'
import PropTypes from 'prop-types'

export function SettingsModal({
  isOpen,
  onClose,
  currentPath,
  appVersion,
  updateAvailable,
  updateInfo,
  onUpdateNow
}) {
  const { t, language } = useLanguage()
  const [extractPath, setExtractPath] = useState(currentPath || '')
  const [diskSpace, setDiskSpace] = useState(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const { theme, setTheme } = useTheme()
  const [showChangelog, setShowChangelog] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(() => {
    return localStorage.getItem('autoUpdate') !== 'false'
  })

  // Sync auto-update setting with main process
  useEffect(() => {
    window.api.setAutoDownload?.(autoUpdate)
  }, [autoUpdate])

  const handleAutoUpdateToggle = () => {
    const newValue = !autoUpdate
    setAutoUpdate(newValue)
    localStorage.setItem('autoUpdate', newValue.toString())
    window.api.setAutoDownload?.(newValue)
  }

  // Load disk space immediately on component mount (not just when modal opens)
  useEffect(() => {
    const loadDiskSpace = async () => {
      if (currentPath) {
        setIsLoadingSpace(true)
        try {
          const space = await window.api.getDiskSpace(currentPath)
          setDiskSpace(space)
        } catch (error) {
          console.error('Failed to get disk space:', error)
        } finally {
          setIsLoadingSpace(false)
        }
      }
    }
    loadDiskSpace()
  }, [currentPath])

  // Update disk space when path changes
  useEffect(() => {
    if (extractPath && extractPath !== currentPath) {
      setExtractPath(currentPath)
    }
  }, [currentPath, extractPath])

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
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl custom-scrollbar"
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
                <Icon icon="line-md:cog-filled" className="h-10 w-10 text-[#0081FB]" />
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

                {/* Change Folder Button */}
                <button
                  onClick={handleChangeFolder}
                  disabled={isChanging}
                  className="mt-3 w-full rounded-lg bg-[#0081FB] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0081FB]/90 disabled:opacity-50"
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
                <p className="mt-2 text-center text-xs text-white/40">{t('settings_info')}</p>
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

              {/* Theme Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50">
                    {t('settings_theme')}
                  </label>
                  <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500">
                    {language === 'id' ? 'Segera Hadir' : 'Coming Soon'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Dark Mode */}
                  <button
                    onClick={() => setTheme('dark')}
                    disabled
                    className={`flex flex-1 cursor-not-allowed flex-col items-center gap-2 rounded-lg border p-3 transition-all opacity-50 ${
                      theme === 'dark'
                        ? 'border-[#0081FB]/50 bg-[#0081FB]/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Icon icon="line-md:moon-filled-alt-loop" className="h-5 w-5 text-white/70" />
                    <span className="text-xs text-white/70">{t('settings_theme_dark')}</span>
                  </button>

                  {/* Light Mode */}
                  <button
                    onClick={() => setTheme('light')}
                    disabled
                    className={`flex flex-1 cursor-not-allowed flex-col items-center gap-2 rounded-lg border p-3 transition-all opacity-50 ${
                      theme === 'light'
                        ? 'border-[#0081FB]/50 bg-[#0081FB]/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Icon icon="line-md:sunny-loop" className="h-5 w-5 text-white/70" />
                    <span className="text-xs text-white/70">{t('settings_theme_light')}</span>
                  </button>

                  {/* System Mode */}
                  <button
                    onClick={() => setTheme('system')}
                    disabled
                    className={`flex flex-1 cursor-not-allowed flex-col items-center gap-2 rounded-lg border p-3 transition-all opacity-50 ${
                      theme === 'system'
                        ? 'border-[#0081FB]/50 bg-[#0081FB]/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <Icon icon="line-md:monitor-twotone" className="h-5 w-5 text-white/70" />
                    <span className="text-xs text-white/70">{t('settings_theme_system')}</span>
                  </button>
                </div>
              </div>

              {/* Auto-Update Section */}
              <div className="border-t border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                  {t('settings_auto_update') || 'Auto-update'}
                </label>
                <div className="space-y-3">
                  {/* Toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <Icon icon="line-md:download-loop" className="h-5 w-5 text-[#0081FB]" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {t('settings_auto_update') || 'Auto-update'}
                        </p>
                        <p className="text-xs text-white/50">
                          {t('settings_auto_update_desc') || 'Automatically download updates'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAutoUpdateToggle}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        autoUpdate ? 'bg-[#0081FB]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                          autoUpdate ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Update Now button (when update available) */}
                  {updateAvailable && updateInfo && (
                    <button
                      onClick={onUpdateNow}
                      className="w-full flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-3 transition-all hover:bg-green-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="line-md:arrow-up-circle" className="h-5 w-5 text-green-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">
                            {t('update_new_version') || 'New Version Available!'}
                          </p>
                          <p className="text-xs text-green-400">v{updateInfo.version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        {t('update_now') || 'Update Now'}
                        <Icon icon="line-md:chevron-right" className="h-4 w-4" />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* About Section */}
              <div className="border-t border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                  {t('settings_about')}
                </label>
                <button
                  onClick={() => setShowChangelog(true)}
                  className="w-full flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-[#0081FB]/50"
                >
                  <div className="flex items-center gap-3">
                    <Icon icon="line-md:clipboard-list" className="h-5 w-5 text-[#0081FB]" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">{t('settings_whats_new')}</p>
                      <p className="text-xs text-white/50">{t('settings_changelog_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/40">
                      v{appVersion ? appVersion.version : '...'}
                    </span>
                    <Icon icon="line-md:chevron-right" className="h-4 w-4 text-white/30" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
    </AnimatePresence>
  )
}

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
  appVersion: PropTypes.shape({
    version: PropTypes.string,
    build: PropTypes.string
  }),
  updateAvailable: PropTypes.bool,
  updateInfo: PropTypes.shape({
    version: PropTypes.string
  }),
  onUpdateNow: PropTypes.func
}
