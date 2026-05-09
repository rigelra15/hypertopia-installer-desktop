import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from './contexts/LanguageContext'
import { useToast } from './hooks/useToast'
import { useDownload } from './contexts/DownloadContext'
import { InstallerSidebar } from './components/InstallerSidebar'
import { DeviceManager } from './components/DeviceManager'
import { StandaloneGames } from './components/StandaloneGames'
import { Tutorials } from './components/Tutorials'
import { LiveAssist } from './components/LiveAssist'
import { QuestGamesOptimizer } from './components/QuestGamesOptimizer'
import { SetupModal } from './components/SetupModal'
import { UserMenu } from './components/UserMenu'
import { TitleBar } from './components/TitleBar'
import LiveAssistNotification from './components/LiveAssistNotification'
import GameDownloadWidget from './components/GameDownloadWidget'
import GameInstallWidget from './components/GameInstallWidget'
import NetworkStatusWidget from './components/NetworkStatusWidget'
import { useAuth } from './contexts/AuthContext'
import { useGames } from './contexts/GamesContext'

function App() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { qgoLinks, fetchGames } = useGames()
  const [gamesCount, setGamesCount] = useState(null)
  const toast = useToast()

  // Eagerly fetch games count respecting device preference so badge is visible before visiting the tab
  useEffect(() => {
    const FIREBASE_DB_URL =
      'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'
    const load = async () => {
      try {
        let devicePref = null
        if (user?.uid) {
          const res = await fetch(
            `${FIREBASE_DB_URL}/usersData/preferences/${user.uid}/device.json`
          )
          const val = await res.json()
          if (val) devicePref = val
        }
        const result = await fetchGames({
          page: 1,
          limit: 1,
          sortBy: 'added',
          sortOrder: 'asc',
          search: '',
          device: devicePref || ''
        })
        if (result?.pagination?.totalItems != null) {
          setGamesCount(result.pagination.totalItems)
        }
      } catch {
        // non-critical, badge just stays hidden
      }
    }
    load()
  }, [user, fetchGames])
  const {
    showWidget,
    downloadInfo,
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
  const [managerSubTab, setManagerSubTab] = useState('obb') // sub-tab for DeviceManager

  // Navigation handler — supports composite targets like 'manager:downloads'
  const handleNavigateToTab = (target) => {
    if (typeof target === 'string' && target.includes(':')) {
      const [tab, subTab] = target.split(':')
      setActiveTab(tab)
      setManagerSubTab(subTab)
    } else {
      setActiveTab(target)
      // Reset sub-tab when user manually clicks the top-level manager tab
      if (target === 'manager') setManagerSubTab('obb')
    }
  }
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [extractPath, setExtractPath] = useState(() => localStorage.getItem('extractPath') || '')
  const [showSetupModal, setShowSetupModal] = useState(() => {
    // Check if extract path is configured
    const savedPath = localStorage.getItem('extractPath')
    return !savedPath
  })

  // On mount: read extractPath from config file (file = source of truth after reinstall)
  useEffect(() => {
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      if (config?.extractPath) {
        setExtractPath(config.extractPath)
        localStorage.setItem('extractPath', config.extractPath)
        setShowSetupModal(false)
      }
    })
  }, [])
  const [tabScrollIndex, setTabScrollIndex] = useState(0)
  // Deep link download pending info (from website)
  const [pendingDeepLinkDownload, setPendingDeepLinkDownload] = useState(null)

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
    { id: 'games', icon: 'mdi:gamepad-variant', label: t('tab_games'), count: gamesCount },
    {
      id: 'qgo',
      icon: 'mdi:tune-variant',
      label: t('tab_qgo') || 'QGO',
      count: qgoLinks.length || null
    },
    { id: 'manager', icon: 'mdi:folder-cog', label: t('tab_manager') || 'Device Manager' }
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

  // Listen for deep link download from website
  useEffect(() => {
    const removeDeepLinkListener = window.api.onDeepLinkDownload((data) => {
      console.log('[DeepLinkDownload] Received from website:', data)

      // Navigate to the correct tab based on type
      if (data.type === 'qgo') {
        setActiveTab('qgo')
      } else {
        setActiveTab('games')
      }

      // Store pending download info
      setPendingDeepLinkDownload(data)

      // Show toast notification
      toast.info(`Opening ${data.game}...`)
    })

    return () => {
      removeDeepLinkListener()
    }
  }, [toast])

  return (
    <>
      <TitleBar />
      <SetupModal isOpen={showSetupModal} onComplete={handleSetupComplete} />

      {/* Live Assist Notification - Shows from any tab except Live Assist */}
      <LiveAssistNotification
        userEmail={user?.email}
        isOnLiveAssistTab={activeTab === 'liveassist'}
        onNavigateToLiveAssist={() => setActiveTab('liveassist')}
      />
      <div className="flex flex-1 w-full flex-col overflow-hidden bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white selection:bg-[#0081FB]/30 md:flex-row">
        {/* Sidebar */}
        <div
          className="flex flex-none flex-col border-b border-gray-200 dark:border-white/10 md:h-full md:border-b-0 md:border-r relative transition-all duration-300"
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
            onNavigateToTab={handleNavigateToTab}
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
        <div className="flex w-full flex-1 flex-col overflow-hidden min-h-0 md:h-full min-w-0">
          {/* Tab Switcher */}
          <div className="flex items-center border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-2 gap-2">
            {/* Left Navigation Button - Only show if scrolling is needed */}
            {needsScrolling && (
              <button
                onClick={() => scrollTabs('left')}
                disabled={tabScrollIndex === 0}
                className={`flex items-center justify-center rounded-lg p-2 transition-all ${
                  tabScrollIndex === 0
                    ? 'cursor-not-allowed text-gray-300 dark:text-white/20 bg-transparent'
                    : 'text-gray-600 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-[#0081FB] hover:text-white shadow-lg'
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
                      : 'text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white/70'
                  }`}
                >
                  <Icon icon={tab.icon} className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count != null && tab.count > 0 && (
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                        activeTab === tab.id
                          ? 'bg-[#0081FB] text-white'
                          : 'bg-gray-200 dark:bg-white/15 text-gray-600 dark:text-white/70'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
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
                    ? 'cursor-not-allowed text-gray-300 dark:text-white/20 bg-transparent'
                    : 'text-gray-600 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-[#0081FB] hover:text-white shadow-lg'
                }`}
                title="Next tabs"
              >
                <Icon icon="mdi:chevron-right" className="h-5 w-5" />
              </button>
            )}

            {/* User Login Menu */}
            <UserMenu onLiveAssist={() => setActiveTab('liveassist')} />
          </div>

          {activeTab === 'manager' ? (
            <DeviceManager selectedDevice={selectedDevice} initialSubTab={managerSubTab} />
          ) : activeTab === 'games' ? (
            <StandaloneGames
              selectedDevice={selectedDevice}
              onGameCountChange={setGamesCount}
              pendingDeepLinkDownload={
                pendingDeepLinkDownload?.type === 'standalone' ? pendingDeepLinkDownload : null
              }
              onDeepLinkProcessed={() => setPendingDeepLinkDownload(null)}
            />
          ) : activeTab === 'liveassist' ? (
            <LiveAssist />
          ) : activeTab === 'qgo' ? (
            <QuestGamesOptimizer
              selectedDevice={selectedDevice}
              pendingDeepLinkDownload={
                pendingDeepLinkDownload?.type === 'qgo' ? pendingDeepLinkDownload : null
              }
              onDeepLinkProcessed={() => setPendingDeepLinkDownload(null)}
            />
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
