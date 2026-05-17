import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function OBBManager({ selectedDevice, onCountChange }) {
  const { t } = useLanguage()
  const [folders, setFolders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOBB = useCallback(async () => {
    // If no device selected, clear list (or show waiting)
    if (!selectedDevice) {
      setFolders([])
      // setError('No device selected.')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.listObb(selectedDevice)
      setFolders(result)
      onCountChange?.(result.length)
    } catch (err) {
      console.error(err)
      setError(t('obb_error'))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDevice, t, onCountChange])

  useEffect(() => {
    fetchOBB()
  }, [fetchOBB])

  // Filter folders based on search query
  const filteredFolders = folders.filter((folder) =>
    folder.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#111]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#191919] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
              <Icon icon="mdi:folder-multiple" className="h-5 w-5 text-[#0081FB]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('tab_obb') || 'OBB Manager'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {isLoading
                  ? t('standalone_games_loading') || 'Loading...'
                  : selectedDevice
                    ? `${folders.length} ${t('folders_found') || 'folders found'}`
                    : '/sdcard/Android/obb/'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchOBB}
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
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#0081FB]/20 bg-[#0081FB]/5 px-3 py-2">
          <Icon icon="mdi:information-outline" className="h-4 w-4 shrink-0 text-[#0081FB] mt-0.5" />
          <p className="text-[11px] text-gray-600 dark:text-white/70 leading-relaxed">
            {t('obb_info_desc')}
          </p>
        </div>

        {/* Search Box */}
        {selectedDevice && folders.length > 0 && (
          <div className="mb-4 relative">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder') || 'Cari folder...'}
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
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('obb_no_device_msg')}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
            <p className="mt-4 animate-pulse text-sm text-gray-500 dark:text-white/50">
              {t('obb_scanning')}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('standalone_games_error') || 'Error'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{error}</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon
                icon="mdi:folder-off-outline"
                className="h-8 w-8 text-gray-300 dark:text-white/30"
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">{t('obb_empty')}</p>
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon icon="mdi:folder-search" className="h-8 w-8 text-gray-300 dark:text-white/30" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('search_no_results') || 'Tidak ada hasil ditemukan'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFolders.map((folder, index) => (
              <div
                key={index}
                className="group flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hover:border-[#0081FB]/50 hover:shadow-lg hover:shadow-[#0081FB]/10"
              >
                {/* Visual Header */}
                <div className="flex items-center justify-center h-20 bg-gray-100 dark:bg-[#0a0a0a]">
                  <Icon icon="line-md:folder-filled" className="h-10 w-10 text-[#0081FB]/50" />
                </div>
                {/* Content */}
                <div className="p-3">
                  <h3
                    className="truncate text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#0081FB] transition-colors"
                    title={folder}
                  >
                    {folder}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-gray-400 dark:text-white/40">
                    {t('obb_folder_label')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

OBBManager.propTypes = {
  selectedDevice: PropTypes.string,
  onCountChange: PropTypes.func
}
