import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function AppsManager({ selectedDevice, onCountChange }) {
  const { t } = useLanguage()
  const [apps, setApps] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uninstallingApp, setUninstallingApp] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchApps = useCallback(async () => {
    if (!selectedDevice) {
      setApps([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.listApps(selectedDevice)
      setApps(result)
      onCountChange?.(result.length)
    } catch (err) {
      console.error(err)
      setError(t('apps_error'))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDevice, t])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const handleUninstall = async (app) => {
    const confirmed = window.confirm(
      `${t('apps_confirm_uninstall')}\n\n${app.name}\n(${app.package})`
    )

    if (!confirmed) return

    setUninstallingApp(app.package)
    try {
      const result = await window.api.uninstallApp(selectedDevice, app.package)

      if (result.success) {
        // Remove from list
        setApps((prev) => prev.filter((a) => a.package !== app.package))
        alert(t('apps_uninstall_success'))
      } else {
        alert(`${t('apps_uninstall_failed')}: ${result.message}`)
      }
    } catch (err) {
      console.error(err)
      alert(`${t('apps_uninstall_failed')}: ${err.message}`)
    } finally {
      setUninstallingApp(null)
    }
  }

  // Filter apps based on search query
  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#111]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#191919] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0081FB] to-[#00C2FF] shadow-lg shadow-[#0081FB]/20">
              <Icon icon="mdi:apps" className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('tab_apps') || 'Apps Manager'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {isLoading
                  ? t('standalone_games_loading') || 'Loading...'
                  : selectedDevice
                    ? `${apps.length} ${t('apps_found') || 'apps found'}`
                    : t('apps_manager_subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={fetchApps}
            disabled={isLoading || !selectedDevice}
            className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 text-sm text-gray-500 dark:text-white/70 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">{t('refresh_btn')}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Info Banner */}
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
          <Icon icon="mdi:alert-circle-outline" className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
          <p className="text-[11px] text-gray-600 dark:text-white/70 leading-relaxed">{t('apps_info_desc')}</p>
        </div>

        {/* Search Box */}
        {selectedDevice && apps.length > 0 && (
          <div className="mb-4 relative">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder') || 'Cari aplikasi...'}
              className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-[#0081FB]/50 focus:outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Icon icon="mdi:close" className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* States */}
        {!selectedDevice ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon icon="bi:headset-vr" className="h-8 w-8 text-gray-300 dark:text-white/30" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">{t('apps_no_device')}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
            <p className="mt-4 animate-pulse text-sm text-gray-500 dark:text-white/50">{t('apps_scanning')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">{t('standalone_games_error') || 'Error'}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{error}</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon icon="mdi:application-outline" className="h-8 w-8 text-gray-300 dark:text-white/30" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">{t('apps_empty')}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon icon="mdi:application-outline" className="h-8 w-8 text-gray-300 dark:text-white/30" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">{t('search_no_results') || 'Tidak ada hasil ditemukan'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredApps.map((app) => (
              <div
                key={app.package}
                className="group flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hover:border-[#0081FB]/50 hover:shadow-lg hover:shadow-[#0081FB]/10"
              >
                {/* Visual Header */}
                <div className="flex items-center justify-center h-20 bg-gray-100 dark:bg-[#0a0a0a]">
                  <Icon icon="mdi:application" className="h-10 w-10 text-[#0081FB]/50" />
                </div>

                {/* Content */}
                <div className="flex flex-col p-3 flex-1">
                  <h3
                    className="text-gray-900 dark:text-white font-medium text-sm truncate mb-0.5"
                    title={app.name}
                  >
                    {app.name}
                  </h3>
                  <p
                    className="truncate text-[10px] text-gray-400 dark:text-white/40 mb-1 font-mono"
                    title={app.package}
                  >
                    {app.package}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-white/50 mb-3">v{app.version}</p>

                  {/* Uninstall Button */}
                  <button
                    onClick={() => handleUninstall(app)}
                    disabled={uninstallingApp === app.package}
                    className="mt-auto flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uninstallingApp === app.package ? (
                      <>
                        <Icon icon="mdi:loading" className="w-3.5 h-3.5 animate-spin" />
                        {t('apps_uninstalling')}
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:trash-can-outline" className="w-3.5 h-3.5" />
                        {t('apps_uninstall')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

AppsManager.propTypes = {
  selectedDevice: PropTypes.string,
  onCountChange: PropTypes.func
}
