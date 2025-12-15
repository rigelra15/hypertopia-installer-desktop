import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function AppsManager({ selectedDevice }) {
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
    <div className="flex flex-1 flex-col bg-[#111] p-6 font-['Poppins'] text-white overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Apps <span className="text-[#0081FB]">Manager</span>
          </h2>
          <p className="mt-1 text-xs font-mono text-white/40">{t('apps_manager_subtitle')}</p>
        </div>

        <button
          onClick={fetchApps}
          disabled={isLoading || !selectedDevice}
          className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon
            icon="mdi:refresh"
            className={`h-4 w-4 text-white/70 transition-transform group-hover:text-white ${
              isLoading ? 'animate-spin' : ''
            }`}
          />
          <span className="text-sm font-medium text-white/70 group-hover:text-white">
            {t('refresh_btn')}
          </span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
        <Icon icon="mdi:alert-circle-outline" className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
        <p className="text-[11px] text-white/70 leading-relaxed">
          {t('apps_info_desc')}
        </p>
      </div>

      {/* Search Box */}
      {selectedDevice && apps.length > 0 && (
        <div className="mb-4 relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder') || 'Cari aplikasi...'}
            className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#0081FB]/50 focus:outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              <Icon icon="mdi:close" className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="custom-scrollbar flex-1 overflow-y-auto pr-2 pb-4">
        {!selectedDevice ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/30">
            <div className="rounded-full bg-white/5 p-4">
              <Icon icon="bi:headset-vr" className="h-8 w-8" />
            </div>
            <p className="text-sm">{t('apps_no_device')}</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#0081FB]"></div>
            <p className="animate-pulse text-sm">{t('apps_scanning')}</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-red-500/50">
            <Icon icon="line-md:alert-circle-twotone" className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-white/30">
            <p className="text-sm">{t('apps_empty')}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-white/30">
            <Icon icon="mdi:application-outline" className="h-8 w-8 mb-2" />
            <p className="text-sm">{t('search_no_results') || 'Tidak ada hasil ditemukan'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredApps.map((app) => (
              <div
                key={app.package}
                className="group relative cursor-default rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-[#0081FB]/50 hover:bg-[#0081FB]/5"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-[#0081FB]/20 p-2 text-[#0081FB]">
                    <Icon icon="mdi:application" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-medium text-white group-hover:text-[#0081FB]"
                      title={app.name}
                    >
                      {app.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] text-white/40" title={app.package}>
                      {app.package}
                    </p>
                    <p className="mt-1 text-[10px] text-white/50">v{app.version}</p>
                  </div>
                </div>

                {/* Uninstall Button */}
                <button
                  onClick={() => handleUninstall(app)}
                  disabled={uninstallingApp === app.package}
                  className="mt-3 w-full rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uninstallingApp === app.package ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border border-red-400/30 border-t-red-400"></div>
                      {t('apps_uninstalling')}
                    </span>
                  ) : (
                    t('apps_uninstall')
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

AppsManager.propTypes = {
  selectedDevice: PropTypes.string
}
