import { useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { OBBManager } from './OBBManager'
import { AppsManager } from './AppsManager'

/**
 * DeviceManager Component
 * Combined manager for OBB and Apps with internal sub-tabs
 */
export function DeviceManager({ selectedDevice }) {
  const { t } = useLanguage()
  const [activeSubTab, setActiveSubTab] = useState('obb') // 'obb' | 'apps'

  const subTabs = [
    { id: 'obb', icon: 'line-md:folder-filled', label: t('tab_obb') || 'OBB Manager' },
    { id: 'apps', icon: 'mdi:application', label: t('tab_apps') || 'Apps Manager' }
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-1 border-b border-white/10 bg-[#0a0a0a] px-4 py-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeSubTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <Icon icon={tab.icon} className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'obb' ? (
          <OBBManager selectedDevice={selectedDevice} />
        ) : (
          <AppsManager selectedDevice={selectedDevice} />
        )}
      </div>
    </div>
  )
}

DeviceManager.propTypes = {
  selectedDevice: PropTypes.string
}

export default DeviceManager
