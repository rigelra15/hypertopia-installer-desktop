import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { OBBManager } from './OBBManager'
import { AppsManager } from './AppsManager'
import LocalDownloads from './LocalDownloads'

/**
 * DeviceManager Component
 * Combined manager for OBB and Apps with internal sub-tabs
 */
export function DeviceManager({ selectedDevice, initialSubTab }) {
  const { t } = useLanguage()
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab || 'obb') // 'obb' | 'apps' | 'downloads'

  // Sync when parent requests a specific sub-tab (e.g. navigation from Download Activity modal)
  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab)
  }, [initialSubTab])
  const [downloadCount, setDownloadCount] = useState(null)
  const [obbCount, setObbCount] = useState(null)
  const [appsCount, setAppsCount] = useState(null)

  // Eagerly fetch download count so badge shows before visiting the tab
  useEffect(() => {
    window.api.listDownloadedFiles().then((result) => {
      if (result.success) setDownloadCount(result.files.length)
    }).catch(() => {})
  }, [])

  // Eagerly fetch OBB + Apps counts when device changes
  useEffect(() => {
    if (!selectedDevice) {
      setObbCount(null)
      setAppsCount(null)
      return
    }
    window.api.listObb(selectedDevice).then((result) => {
      setObbCount(Array.isArray(result) ? result.length : null)
    }).catch(() => {})
    window.api.listApps(selectedDevice).then((result) => {
      setAppsCount(Array.isArray(result) ? result.length : null)
    }).catch(() => {})
  }, [selectedDevice])

  const subTabs = [
    { id: 'obb', icon: 'line-md:folder-filled', label: t('tab_obb') || 'OBB Manager', count: obbCount },
    { id: 'apps', icon: 'mdi:application', label: t('tab_apps') || 'Apps Manager', count: appsCount },
    { id: 'downloads', icon: 'mdi:folder-download-outline', label: t('tab_downloads') || 'Manajer Unduhan', count: downloadCount }
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a0a0a] px-4 py-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/70'
            }`}
          >
            <Icon icon={tab.icon} className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                activeSubTab === tab.id
                  ? 'bg-[#0081FB] text-white'
                  : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-white/70'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'obb' ? (
          <OBBManager selectedDevice={selectedDevice} onCountChange={setObbCount} />
        ) : activeSubTab === 'apps' ? (
          <AppsManager selectedDevice={selectedDevice} onCountChange={setAppsCount} />
        ) : (
          <LocalDownloads selectedDevice={selectedDevice} onFileCountChange={setDownloadCount} />
        )}
      </div>
    </div>
  )
}

DeviceManager.propTypes = {
  selectedDevice: PropTypes.string
}

export default DeviceManager
