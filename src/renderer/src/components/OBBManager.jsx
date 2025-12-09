import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function OBBManager({ selectedDevice }) {
  const { t } = useLanguage()
  const [folders, setFolders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

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
      if (result.length === 0) {
        // Could be empty or error
      }
    } catch (err) {
      console.error(err)
      setError(t('obb_error'))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDevice, t])

  useEffect(() => {
    fetchOBB()
  }, [fetchOBB])

  return (
    <div className="flex h-full w-full flex-col bg-[#111] p-6 font-['Poppins'] text-white">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            OBB <span className="text-[#0081FB]">Manager</span>
          </h2>
          <p className="mt-1 text-xs font-mono text-white/40">/sdcard/Android/obb/</p>
        </div>

        <button
          onClick={fetchOBB}
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

      {/* Content Area */}
      <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
        {!selectedDevice ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/30">
            <div className="rounded-full bg-white/5 p-4">
              <Icon icon="bi:headset-vr" className="h-8 w-8" />
            </div>
            <p className="text-sm">{t('obb_no_device_msg')}</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/30">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#0081FB]"></div>
            <p className="animate-pulse text-sm">{t('obb_scanning')}</p>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-red-500/50">
            <Icon icon="line-md:alert-circle-twotone" className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-white/30">
            <p className="text-sm">{t('obb_empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {folders.map((folder, index) => (
              <div
                key={index}
                className="group relative cursor-default rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-[#0081FB]/50 hover:bg-[#0081FB]/5"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-lg bg-[#0081FB]/20 p-2 text-[#0081FB]">
                    <Icon icon="line-md:folder-filled" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-medium text-white group-hover:text-[#0081FB]"
                      title={folder}
                    >
                      {folder}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-white/40">{t('obb_folder_label')}</p>
                  </div>
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
  selectedDevice: PropTypes.string
}
