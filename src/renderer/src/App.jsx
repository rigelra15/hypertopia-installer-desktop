import { useState } from 'react'
import { Icon } from '@iconify/react'
import { InstallerSidebar } from './components/InstallerSidebar'
import { OBBManager } from './components/OBBManager'
import { AppsManager } from './components/AppsManager'
import { SetupModal } from './components/SetupModal'

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [activeTab, setActiveTab] = useState('obb') // 'obb' | 'apps'
  const [showSetupModal, setShowSetupModal] = useState(() => {
    // Check if extract path is configured
    const extractPath = localStorage.getItem('extractPath')
    return !extractPath
  })

  const handleSetupComplete = (path) => {
    setShowSetupModal(false)
    console.log('Extract path set to:', path)
  }

  return (
    <>
      <SetupModal isOpen={showSetupModal} onComplete={handleSetupComplete} />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#0081FB]/30 md:flex-row">
        {/* Sidebar: 25% on desktop, full on mobile, scrollable on mobile if needed */}
        <div className="flex w-full flex-none flex-col border-b border-white/10 md:h-full md:w-1/4 md:min-w-[300px] md:border-b-0 md:border-r">
          <InstallerSidebar selectedDevice={selectedDevice} onDeviceSelect={setSelectedDevice} />
        </div>

        {/* Content: 75% on desktop, full on mobile */}
        <div className="flex w-full flex-1 flex-col md:h-full md:w-3/4">
          {/* Tab Switcher */}
          <div className="flex border-b border-white/10 bg-[#111] p-2">
            <button
              onClick={() => setActiveTab('obb')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'obb'
                  ? 'bg-[#0081FB]/10 text-[#0081FB]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon icon="line-md:folder-filled" className="h-4 w-4" />
              <span>OBB Manager</span>
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'apps'
                  ? 'bg-[#0081FB]/10 text-[#0081FB]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon icon="mdi:application" className="h-4 w-4" />
              <span>Apps Manager</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'obb' ? (
            <OBBManager selectedDevice={selectedDevice} />
          ) : (
            <AppsManager selectedDevice={selectedDevice} />
          )}
        </div>
      </div>
    </>
  )
}

export default App
