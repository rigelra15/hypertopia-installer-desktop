import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import PropTypes from 'prop-types'
import { Modal } from './ui/Modal'

export function SetupModal({ isOpen, onComplete }) {
  const { t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [extractPath, setExtractPath] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [diskSpace, setDiskSpace] = useState(null)
  const [isLoadingSpace, setIsLoadingSpace] = useState(false)
  const autoUpdate = true

  const handleSelectFolder = async () => {
    setIsSelecting(true)
    try {
      const path = await window.api.selectExtractFolder()
      if (path) {
        setExtractPath(path)
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

  const handleComplete = async () => {
    if (extractPath) {
      try {
        const result = await window.api.ensureExtractFolder(extractPath)
        if (!result.success) {
          console.error('Failed to create extract folder:', result.error)
          return
        }
      } catch (err) {
        console.error('Error creating extract folder:', err)
        return
      }

      localStorage.setItem('extractPath', extractPath)
      localStorage.setItem('autoUpdate', autoUpdate.toString())
      window.api.setAutoDownload?.(autoUpdate)
      window.api.storeRead?.('hypertopia-config.json').then((existing) => {
        window.api.storeWrite?.('hypertopia-config.json', {
          ...(existing || {}),
          extractPath,
          autoUpdate
        })
      })
      onComplete(extractPath)
    }
  }

  const footer = (
    <button
      onClick={handleComplete}
      disabled={!extractPath}
      className="w-full rounded-xl bg-gradient-to-r from-[#0081FB] to-[#00C2FF] py-3 text-sm font-semibold text-white shadow-lg shadow-[#0081FB]/25 transition-all hover:scale-[1.02] hover:shadow-[#0081FB]/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
    >
      {t('setup_continue')}
    </button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={t('setup_title') || 'Welcome to HyperTopia'}
      subtitle={t('setup_desc') || "Let's set up your installation"}
      icon="line-md:cog-filled"
      iconColor="#0081FB"
      size="md"
      footer={footer}
      closeOnBackdrop={false}
    >
      <div className="p-6 space-y-6">
        {/* Info Box about folder usage */}
        <div className="rounded-lg border border-[#0081FB]/30 bg-[#0081FB]/10 p-3">
          <div className="flex gap-2">
            <Icon icon="mdi:information" className="h-5 w-5 shrink-0 text-[#0081FB]" />
            <div className="text-xs text-gray-700 dark:text-white/80">
              <p className="font-medium text-[#0081FB] mb-1">
                {t('setup_folder_usage_title') || 'This folder will be used for:'}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600 dark:text-white/70">
                <li>
                  {t('setup_folder_usage_1') || 'Temporary file extraction during installation'}
                </li>
                <li>{t('setup_folder_usage_2') || 'Standalone Games downloads'}</li>
                <li>{t('setup_folder_usage_3') || 'QGO (Quest Games Optimizer) downloads'}</li>
              </ul>
              <p className="mt-2 text-gray-400 dark:text-white/50">
                {t('setup_folder_usage_note') ||
                  'No need to select separate folders for downloads!'}
              </p>
            </div>
          </div>
        </div>

        {/* Folder Selection */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
            {t('setup_extract_folder')}
          </label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2">
              {extractPath ? (
                <p className="truncate text-xs text-gray-900 dark:text-white" title={extractPath}>
                  {extractPath}
                </p>
              ) : (
                <p className="text-xs text-gray-400 dark:text-white/30">{t('setup_no_folder')}</p>
              )}
            </div>
            <button
              onClick={handleSelectFolder}
              disabled={isSelecting}
              className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/10 px-4 py-2 text-xs font-medium text-gray-700 dark:text-white transition-all hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50"
            >
              {isSelecting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
              ) : (
                <Icon icon="mdi:folder-open" className="h-4 w-4" />
              )}
              {t('setup_browse')}
            </button>
          </div>

          <div
            className={`mt-3 rounded-lg border p-3 ${
              extractPath && extractPath.endsWith('HyperTopiaExtraction')
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-[#0081FB]/20 bg-[#0081FB]/5'
            }`}
          >
            <div className="flex gap-2">
              <Icon
                icon={
                  extractPath && extractPath.endsWith('HyperTopiaExtraction')
                    ? 'mdi:check-circle'
                    : 'mdi:information-outline'
                }
                className={`h-4 w-4 shrink-0 ${
                  extractPath && extractPath.endsWith('HyperTopiaExtraction')
                    ? 'text-green-500'
                    : 'text-[#0081FB]'
                }`}
              />
              <p className="text-xs text-gray-600 dark:text-white/70">
                {extractPath && extractPath.endsWith('HyperTopiaExtraction')
                  ? t('setup_folder_already_correct') ||
                    'Folder yang dipilih sudah benar dan akan digunakan langsung.'
                  : t('setup_folder_auto_create')}
              </p>
            </div>
          </div>
        </div>

        {/* Storage Info */}
        {extractPath && diskSpace && (
          <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
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
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${getStorageColor(diskSpace.percent)}`}
                style={{ width: `${diskSpace.percent}%` }}
              ></div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
              <span>
                {diskSpace.percent}% {t('storage_used')}
              </span>
              <span>{diskSpace.used} used</span>
            </div>
          </div>
        )}

        {/* Theme Preference */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-white/50">
            {t('settings_theme')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'light', icon: 'ph:sun-bold', label: t('settings_theme_light') || 'Light' },
              { value: 'dark', icon: 'ph:moon-bold', label: t('settings_theme_dark') || 'Dark' },
              {
                value: 'system',
                icon: 'ph:monitor-bold',
                label: t('settings_theme_system') || 'System'
              }
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-all ${
                  theme === value
                    ? 'border-[#0081FB] bg-[#0081FB]/10 text-[#0081FB]'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <Icon icon={icon} className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

SetupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired
}
