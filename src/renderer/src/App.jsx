import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from './contexts/LanguageContext'
import { useToast } from './hooks/useToast'
import { useDownload } from './contexts/DownloadContext'
import { useNetwork } from './contexts/NetworkContext'
import { InstallerSidebar } from './components/InstallerSidebar'
import { DeviceManager } from './components/DeviceManager'
import { StandaloneGames } from './components/StandaloneGames'
import { Tutorials } from './components/Tutorials'
import { LiveAssist } from './components/LiveAssist'
import { QuestGamesOptimizer } from './components/QuestGamesOptimizer'
import { SetupModal } from './components/SetupModal'
import { UserMenu } from './components/UserMenu'
import LiveAssistNotification from './components/LiveAssistNotification'
import GameDownloadWidget from './components/GameDownloadWidget'
import GameInstallWidget from './components/GameInstallWidget'
import NetworkStatusWidget from './components/NetworkStatusWidget'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()
  const {
    showWidget,
    downloadInfo,
    isDownloading,
    downloadComplete,
    closeWidget,
    cancelDownload,
    // Install states
    isInstalling,
    installComplete,
    installInfo,
    closeInstallWidget
  } = useDownload()
  const hasCheckedUpdates = useRef(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [activeTab, setActiveTab] = useState('tutorials') // 'obb' | 'apps' | 'games' | 'tutorials' | 'liveassist' | 'qgo'
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [extractPath, setExtractPath] = useState(() => localStorage.getItem('extractPath') || '')
  const [showSetupModal, setShowSetupModal] = useState(() => {
    // Check if extract path is configured
    const savedPath = localStorage.getItem('extractPath')
    return !savedPath
  })
  const [tabScrollIndex, setTabScrollIndex] = useState(0)

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
    setExtractPath(path)
    console.log('Extract path set to:', path)
  }

  // Tab configuration
  const tabs = [
    { id: 'tutorials', icon: 'mdi:book-open-page-variant', label: t('tab_tutorials') },
    { id: 'games', icon: 'mdi:gamepad-variant', label: t('tab_games') },
    { id: 'qgo', icon: 'mdi:tune-variant', label: t('tab_qgo') || 'QGO' },
    { id: 'manager', icon: 'mdi:folder-cog', label: t('tab_manager') || 'Manager' },
    { id: 'liveassist', icon: 'mdi:headset', label: t('tab_live_assist') || 'Live Assist' }
  ]

  const visibleTabsCount = 4 // Show 4 tabs at a time
  const maxScrollIndex = Math.max(0, tabs.length - visibleTabsCount)
  const needsScrolling = tabs.length > visibleTabsCount // Only show nav buttons if more than 4 tabs

  const scrollTabs = (direction) => {
    setTabScrollIndex((prev) => {
      if (direction === 'left') {
        return Math.max(0, prev - 1)
      } else {
        return Math.min(maxScrollIndex, prev + 1)
      }
    })
  }

  const visibleTabs = tabs.slice(tabScrollIndex, tabScrollIndex + visibleTabsCount)

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

      {/* Live Assist Notification - Shows from any tab except Live Assist */}
      <LiveAssistNotification
        userEmail={user?.email}
        isOnLiveAssistTab={activeTab === 'liveassist'}
        onNavigateToLiveAssist={() => setActiveTab('liveassist')}
      />
      <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#0081FB]/30 md:flex-row">
        {/* Sidebar */}
        <div
          className="flex flex-none flex-col border-b border-white/10 md:h-full md:border-b-0 md:border-r relative transition-all duration-300"
          style={{
            width: window.innerWidth >= 768 ? (isSidebarCollapsed ? 64 : sidebarWidth) : '100%'
          }}
        >
          <InstallerSidebar
            selectedDevice={selectedDevice}
            onDeviceSelect={setSelectedDevice}
            extractPath={extractPath}
            onExtractPathChange={setExtractPath}
            onCollapsedChange={setIsSidebarCollapsed}
          />

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
          <div className="flex items-center border-b border-white/10 bg-[#111] p-2 gap-2">
            {/* Left Navigation Button - Only show if scrolling is needed */}
            {needsScrolling && (
              <button
                onClick={() => scrollTabs('left')}
                disabled={tabScrollIndex === 0}
                className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                  tabScrollIndex === 0
                    ? 'cursor-not-allowed text-white/20 bg-transparent'
                    : 'text-white bg-white/10 hover:bg-[#0081FB] hover:text-white shadow-lg'
                }`}
                title="Previous tabs"
              >
                <Icon icon="mdi:chevron-left" className="h-5 w-5" />
              </button>
            )}

            {/* Tabs Container */}
            <div className="flex flex-1 gap-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#0081FB]/10 text-[#0081FB]'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                >
                  <Icon icon={tab.icon} className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Right Navigation Button - Only show if scrolling is needed */}
            {needsScrolling && (
              <button
                onClick={() => scrollTabs('right')}
                disabled={tabScrollIndex >= maxScrollIndex}
                className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                  tabScrollIndex >= maxScrollIndex
                    ? 'cursor-not-allowed text-white/20 bg-transparent'
                    : 'text-white bg-white/10 hover:bg-[#0081FB] hover:text-white shadow-lg'
                }`}
                title="Next tabs"
              >
                <Icon icon="mdi:chevron-right" className="h-5 w-5" />
              </button>
            )}

            {/* User Login Menu */}
            <UserMenu />
          </div>

          {/* Tab Content */}
          {activeTab === 'manager' ? (
            <DeviceManager selectedDevice={selectedDevice} />
          ) : activeTab === 'games' ? (
            <StandaloneGames selectedDevice={selectedDevice} />
          ) : activeTab === 'liveassist' ? (
            <LiveAssist />
          ) : activeTab === 'qgo' ? (
            <QuestGamesOptimizer selectedDevice={selectedDevice} />
          ) : (
            <Tutorials />
          )}
        </div>
      </div>

      {/* Global Download Widget - Shows in bottom right corner */}
      <GameDownloadWidget
        isVisible={showWidget && !isInstalling}
        fileName={downloadInfo.fileName}
        gameTitle={downloadInfo.gameTitle}
        downloadProgress={downloadInfo.progress}
        downloadSpeed={downloadInfo.speed}
        downloadedBytes={downloadInfo.downloadedBytes}
        totalBytes={downloadInfo.totalBytes}
        status={downloadInfo.status}
        isComplete={downloadComplete}
        onClose={closeWidget}
        onCancel={cancelDownload}
      />

      {/* Global Install Widget - Shows in bottom right corner for Download & Install */}
      <GameInstallWidget
        isVisible={showWidget && (isInstalling || installComplete)}
        gameTitle={installInfo.gameTitle}
        step={installInfo.step}
        percent={installInfo.percent}
        detail={installInfo.detail}
        downloadedBytes={installInfo.downloadedBytes}
        totalBytes={installInfo.totalBytes}
        speed={installInfo.speed}
        isComplete={installComplete}
        onClose={closeInstallWidget}
      />

      {/* Network Status Widget - Shows when offline or API unreachable */}
      <NetworkStatusWidget />
    </>
  )
}

export default App
