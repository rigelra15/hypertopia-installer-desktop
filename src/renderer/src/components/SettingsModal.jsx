import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import ChangelogModal from './ChangelogModal'
import { useToast } from '../hooks/useToast'
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
  const { t, language, setLanguage } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [extractPath, setExtractPath] = useState(currentPath || '')
  const [diskSpace, setDiskSpace] = useState(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const toast = useToast()
  const [latestRelease, setLatestRelease] = useState(null)
  const [isCheckingLatest, setIsCheckingLatest] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(() => {
    return localStorage.getItem('autoUpdate') !== 'false'
  })

  // On mount: sync autoUpdate from config file (file = source of truth)
  useEffect(() => {
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      if (config && typeof config.autoUpdate === 'boolean') {
        setAutoUpdate(config.autoUpdate)
        localStorage.setItem('autoUpdate', config.autoUpdate.toString())
        window.api.setAutoDownload?.(config.autoUpdate)
      } else {
        // No file yet — sync current localStorage value to main process
        window.api.setAutoDownload?.(localStorage.getItem('autoUpdate') !== 'false')
      }
    })
  }, [])

  // Fetch latest release from GitHub when modal opens
  useEffect(() => {
    if (isOpen && !latestRelease) {
      setIsCheckingLatest(true)
      window.api
        .getLatestRelease?.()
        .then((result) => {
          setLatestRelease(result)
        })
        .catch((err) => {
          console.error('Failed to fetch latest release:', err)
          setLatestRelease({ version: null, error: err.message })
        })
        .finally(() => {
          setIsCheckingLatest(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleAutoUpdateToggle = () => {
    const newValue = !autoUpdate
    setAutoUpdate(newValue)
    localStorage.setItem('autoUpdate', newValue.toString())
    window.api.setAutoDownload?.(newValue)
    // Persist to config file
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      window.api.storeWrite?.('hypertopia-config.json', { ...(config || {}), autoUpdate: newValue })
    })
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

  const handleCheckForUpdates = async () => {
    toast.info(t('settings_checking_update') || 'Checking for updates...')
    try {
      await window.api.checkForUpdates()
    } catch (error) {
      console.error('Error checking for updates:', error)
      toast.error('Error checking for updates')
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
        // Persist to config file
        window.api.storeRead?.('hypertopia-config.json').then((config) => {
          window.api.storeWrite?.('hypertopia-config.json', {
            ...(config || {}),
            extractPath: newPath
          })
        })

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

  // Get gradient background based on used percentage (light to dark of same color)
  const getStorageGradient = (percent) => {
    if (percent >= 90) {
      // Red gradient: red-400 → red-600
      return 'linear-gradient(90deg, #f87171 0%, #dc2626 100%)'
    }
    if (percent >= 75) {
      // Orange gradient: orange-400 → orange-600
      return 'linear-gradient(90deg, #fb923c 0%, #ea580c 100%)'
    }
    if (percent >= 50) {
      // Yellow gradient: yellow-400 → yellow-600
      return 'linear-gradient(90deg, #facc15 0%, #ca8a04 100%)'
    }
    // Green gradient: green-400 → green-600
    return 'linear-gradient(90deg, #4ade80 0%, #16a34a 100%)'
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
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0a0a0a] p-6 shadow-2xl custom-scrollbar"
          >
            {/* Close Button */}
            <button
              onClick={() => onClose()}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 dark:text-white/50 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
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
              <div className="rounded-full bg-blue-100 dark:bg-[#0081FB]/20 p-4">
                <Icon icon="line-md:cog-filled" className="h-10 w-10 text-[#0081FB]" />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
              {t('settings_title')}
            </h2>
            <p className="mb-6 text-center text-sm text-gray-600 dark:text-white/60">
              {t('settings_desc')}
            </p>

            {/* Current Configuration */}
            <div className="mb-6 space-y-4">
              {/* Default Folder */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                  {t('settings_default_folder')}
                </label>
                <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2">
                  <p className="truncate text-xs text-gray-900 dark:text-white" title={extractPath}>
                    {extractPath || t('setup_no_folder')}
                  </p>
                </div>

                {/* Info about folder usage */}
                <div className="mt-2 rounded-lg border border-[#0081FB]/20 bg-[#0081FB]/5 p-2">
                  <div className="flex gap-2">
                    <Icon
                      icon="mdi:folder-information"
                      className="h-4 w-4 shrink-0 text-[#0081FB]"
                    />
                    <div className="text-[10px] text-gray-600 dark:text-white/60">
                      <span className="text-[#0081FB] font-medium">
                        {t('settings_folder_usage_label') || 'Used for:'}
                      </span>{' '}
                      {t('settings_folder_usage_items') ||
                        'Extraction, Standalone Games, QGO downloads'}
                    </div>
                  </div>
                </div>

                {/* Change Folder Button */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleChangeFolder}
                    disabled={isChanging}
                    className="flex-1 rounded-lg bg-[#0081FB] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0081FB]/90 disabled:opacity-50"
                  >
                    {isChanging ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                        {t('settings_changing')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Icon icon="mdi:folder-edit-outline" className="h-4 w-4" />
                        {t('settings_change_folder')}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => window.api.openDownloadsFolder?.()}
                    className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-white transition-all hover:bg-gray-100 dark:hover:bg-white/10"
                    title={t('settings_open_downloads') || 'Open Downloads Folder'}
                  >
                    <Icon icon="mdi:folder-open-outline" className="h-4 w-4" />
                  </button>
                </div>

                {/* Info Text */}
                <p className="mt-2 text-center text-xs text-gray-400 dark:text-white/40">
                  {t('settings_info')}
                </p>
              </div>

              {/* Storage Info */}
              {diskSpace && !isLoadingSpace && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                    {t('storage_label')}
                  </label>
                  <div className="space-y-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                    {/* Storage Bar */}
                    <div className="relative h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <div
                        className="h-full transition-all relative overflow-hidden"
                        style={{
                          width: `${diskSpace.percent}%`,
                          background: getStorageGradient(diskSpace.percent)
                        }}
                      >
                        {/* Shimmer Effect */}
                        <div
                          className="absolute inset-0 animate-shimmer"
                          style={{
                            background:
                              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                            backgroundSize: '200% 100%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Storage Text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-white/60">
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
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 dark:border-white/30 border-t-[#0081FB] dark:border-t-white"></div>
                </div>
              )}

              {/* Auto-Update Section */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                  {t('settings_auto_update') || 'Auto-update'}
                </label>
                <div className="space-y-3">
                  {/* Toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                      <Icon icon="line-md:download-loop" className="h-5 w-5 text-[#0081FB]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('settings_auto_update') || 'Auto-update'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-white/50">
                          {t('settings_auto_update_desc') || 'Automatically download updates'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleAutoUpdateToggle}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        autoUpdate ? 'bg-[#0081FB]' : 'bg-gray-300 dark:bg-white/20'
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
                      onClick={() => {
                        onClose() // Close settings modal first
                        onUpdateNow?.() // Then show update modal
                      }}
                      className="w-full flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 p-3 transition-all hover:bg-green-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          icon="line-md:arrow-up-circle"
                          className="h-5 w-5 shrink-0 text-green-400"
                        />
                        <div className="text-left">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('update_new_version') || 'New Version Available!'}
                          </p>
                          <p className="text-xs text-green-400">v{updateInfo.version}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        {t('update_now') || 'Update Now'}
                        <Icon icon="line-md:chevron-right" className="h-4 w-4 shrink-0" />
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Language Section */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                  {t('settings_language') || 'Language'}
                </label>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:translate" className="h-5 w-5 text-[#0081FB]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('settings_language_select') || 'Select Language'}
                      </p>
                    </div>
                  </div>
                  <div className="relative group w-[152px]">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white uppercase cursor-pointer outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all w-full"
                    >
                      <option
                        value="en"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        English (EN)
                      </option>
                      <option
                        value="id"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        Indonesia (ID)
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/70">
                      <Icon icon="mdi:chevron-down" className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Section */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                  {t('settings_theme') || 'Theme'}
                </label>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <Icon icon="mdi:palette" className="h-5 w-5 text-[#0081FB]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('settings_theme_select') || 'Select Theme'}
                      </p>
                    </div>
                  </div>
                  <div className="relative group w-[152px]">
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white uppercase cursor-pointer outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all w-full"
                    >
                      <option
                        value="dark"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        {t('settings_theme_dark') || 'Dark'}
                      </option>
                      <option
                        value="light"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        {t('settings_theme_light') || 'Light'}
                      </option>
                      <option
                        value="system"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        {t('settings_theme_system') || 'System'}
                      </option>
                      <option
                        value="auto"
                        className="bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white"
                      >
                        {t('settings_theme_auto') || 'Auto (Time)'}
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/70">
                      <Icon icon="mdi:chevron-down" className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="border-t border-gray-200 dark:border-white/10 pt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
                  {t('settings_about')}
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowChangelog(true)}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 transition-all hover:bg-gray-100 dark:hover:bg-white/10 hover:border-[#0081FB]/50"
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="line-md:clipboard-list" className="h-5 w-5 text-[#0081FB]" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('settings_whats_new')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-white/50">
                          {t('settings_changelog_desc')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 dark:text-white/40">
                        v{appVersion ? appVersion.version : '...'}
                      </span>
                      <Icon
                        icon="line-md:chevron-right"
                        className="h-4 w-4 text-gray-300 dark:text-white/30"
                      />
                    </div>
                  </button>

                  {/* Version Info Card */}
                  <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon
                          icon="mdi:cellphone-arrow-down"
                          className="h-4 w-4 text-gray-400 dark:text-white/40"
                        />
                        <span className="text-xs text-gray-500 dark:text-white/50">
                          {t('settings_installed_version') || 'Installed Version'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        v{appVersion ? appVersion.version : '...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon
                          icon="mdi:cloud-check-outline"
                          className="h-4 w-4 text-gray-400 dark:text-white/40"
                        />
                        <span className="text-xs text-gray-500 dark:text-white/50">
                          {t('settings_latest_version') || 'Latest Version'}
                        </span>
                      </div>
                      {isCheckingLatest ? (
                        <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-[#0081FB]" />
                      ) : latestRelease?.version ? (
                        <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                          v{latestRelease.version}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-white/30">—</span>
                      )}
                    </div>

                    {/* Status indicator */}
                    {!isCheckingLatest && latestRelease?.version && appVersion?.version && (
                      <div
                        className={`mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5 ${
                          latestRelease.version === appVersion.version
                            ? 'bg-green-500/10 border border-green-500/20'
                            : 'bg-amber-500/10 border border-amber-500/20'
                        }`}
                      >
                        <Icon
                          icon={
                            latestRelease.version === appVersion.version
                              ? 'mdi:check-circle'
                              : 'mdi:alert-circle'
                          }
                          className={`h-4 w-4 shrink-0 ${
                            latestRelease.version === appVersion.version
                              ? 'text-green-500'
                              : 'text-amber-500'
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            latestRelease.version === appVersion.version
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {latestRelease.version === appVersion.version
                            ? t('settings_version_up_to_date') || 'Your app is up to date!'
                            : t('settings_version_outdated') ||
                              `Update available: v${latestRelease.version}`}
                        </span>
                      </div>
                    )}

                    {/* Manual download hint if outdated */}
                    {!isCheckingLatest &&
                      latestRelease?.version &&
                      appVersion?.version &&
                      latestRelease.version !== appVersion.version && (
                        <div className="mt-1 rounded-md border border-[#0081FB]/20 bg-[#0081FB]/5 p-2.5">
                          <div className="flex gap-2">
                            <Icon
                              icon="mdi:information-outline"
                              className="h-4 w-4 shrink-0 text-[#0081FB] mt-0.5"
                            />
                            <div className="text-[11px] text-gray-600 dark:text-white/60 leading-relaxed">
                              <p>
                                {t('settings_manual_update_hint') ||
                                  "If auto-update doesn't detect this version, you can download it manually:"}
                              </p>
                              <button
                                onClick={() =>
                                  window.api.openExternal?.(
                                    'https://hypertopia.web.id/software-pembantu'
                                  )
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[#0081FB] font-medium hover:underline"
                              >
                                <Icon icon="mdi:open-in-new" className="h-3 w-3" />
                                HyperTopia → Software Pembantu → HyperTopia Installer → Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                  <button
                    onClick={handleCheckForUpdates}
                    className="w-full rounded-lg bg-[#0081FB] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0081FB]/90 flex items-center justify-center gap-2"
                  >
                    <Icon icon="line-md:rotate-right" className="h-4 w-4" />
                    {t('settings_check_update') || 'Check for Updates'}
                  </button>
                </div>
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
