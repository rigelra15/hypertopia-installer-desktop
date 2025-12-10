import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from './contexts/LanguageContext'
import { useToast } from './hooks/useToast'
import { InstallerSidebar } from './components/InstallerSidebar'
import { OBBManager } from './components/OBBManager'
import { AppsManager } from './components/AppsManager'
import { HypertopiaStore } from './components/HypertopiaStore'
import { Tutorials } from './components/Tutorials'
import { SetupModal } from './components/SetupModal'

function App() {
  const { t } = useLanguage()
  const toast = useToast()
  const hasCheckedUpdates = useRef(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [activeTab, setActiveTab] = useState('tutorials') // 'obb' | 'apps' | 'store' | 'tutorials'
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [storeUrl, setStoreUrl] = useState(null)
  const [isResizing, setIsResizing] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(() => {
    // Check if extract path is configured
    const extractPath = localStorage.getItem('extractPath')
    return !extractPath
  })

  // Deep Link Handler (from Tutorials)
  const handleNavigate = (url) => {
    setStoreUrl(url)
    setActiveTab('store')
  }

  // Resize Handlers
  const startResizing = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  // Add global event listeners for resize
  useEffect(() => {
    if (!isResizing) return

    const resize = (e) => {
      let newWidth = e.clientX
      if (newWidth < 400) newWidth = 400
      if (newWidth > 600) newWidth = 600
      setSidebarWidth(newWidth)
    }

    const stopResizing = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)

    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing])

  const handleSetupComplete = (path) => {
    setShowSetupModal(false)
    console.log('Extract path set to:', path)
  }

  useEffect(() => {
    const removeListener = window.api.onUpdateNotAvailable(() => {
      toast.success(t('update_not_available') || 'App is up to date')
    })

    // Check on launch
    const checkOnLaunch = async () => {
      toast.info(t('update_checking') || 'Checking for updates...')
      try {
        await window.api.checkForUpdates()
      } catch (err) {
        console.error('Failed to check for updates:', err)
      }
    }

    if (!hasCheckedUpdates.current) {
      hasCheckedUpdates.current = true
      checkOnLaunch()
    }

    return () => {
      removeListener()
    }
  }, [t, toast])

  return (
    <>
      <SetupModal isOpen={showSetupModal} onComplete={handleSetupComplete} />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#0081FB]/30 md:flex-row">
        {/* Sidebar */}
        <div
          className="flex flex-none flex-col border-b border-white/10 md:h-full md:border-b-0 md:border-r relative"
          style={{ width: window.innerWidth >= 768 ? sidebarWidth : '100%' }}
        >
          <InstallerSidebar selectedDevice={selectedDevice} onDeviceSelect={setSelectedDevice} />

          {/* Resize Handle (Desktop Only) */}
          <div
            className={`absolute right-0 top-0 hidden h-full w-1 cursor-col-resize hover:bg-[#0081FB] md:block ${
              isResizing ? 'bg-[#0081FB]' : 'bg-transparent'
            }`}
            style={{ right: '-2px', zIndex: 10 }}
            onMouseDown={startResizing}
            onDoubleClick={() => setSidebarWidth(400)} // Reset width
            title="Double-click to reset width"
          />
        </div>

        {/* Content */}
        <div className="flex w-full flex-1 flex-col md:h-full min-w-0">
          {/* Tab Switcher */}
          <div className="flex border-b border-white/10 bg-[#111] p-2">
            <button
              onClick={() => setActiveTab('tutorials')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'tutorials'
                  ? 'bg-[#0081FB]/10 text-[#0081FB]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon icon="mdi:book-open-page-variant" className="h-4 w-4" />
              <span>{t('tab_tutorials')}</span>
            </button>
            <button
              onClick={() => setActiveTab('obb')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'obb'
                  ? 'bg-[#0081FB]/10 text-[#0081FB]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon icon="line-md:folder-filled" className="h-4 w-4" />
              <span>{t('tab_obb')}</span>
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
              <span>{t('tab_apps')}</span>
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'store'
                  ? 'bg-[#0081FB]/10 text-[#0081FB]'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon icon="mdi:store" className="h-4 w-4" />
              <span>{t('tab_store')}</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'obb' ? (
            <OBBManager selectedDevice={selectedDevice} />
          ) : activeTab === 'apps' ? (
            <AppsManager selectedDevice={selectedDevice} />
          ) : activeTab === 'store' ? (
            <HypertopiaStore initialUrl={storeUrl} />
          ) : (
            <Tutorials onNavigate={handleNavigate} />
          )}
        </div>
      </div>
    </>
  )
}

export default App
