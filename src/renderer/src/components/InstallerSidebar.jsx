import { useState, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { DeviceSelector } from './DeviceSelector'
import { ErrorModal } from './ErrorModal'
import { SettingsModal } from './SettingsModal'
import UpdateNotification from './UpdateNotification'
import BrowseMethodModal from './BrowseMethodModal'
import ConfirmationModal from './ConfirmationModal'
import { SystemLogModal } from './SystemLogModal'
import { Tooltip } from './Tooltip'
import PropTypes from 'prop-types'
import logoImage from '../assets/images/HyperTopiaLauncher.png'
import { useDownload } from '../contexts/DownloadContext'
import DownloadActivityPanel from './DownloadActivityPanel'

// Shared battery helpers (same logic as DeviceSelector)
const getBatteryIcon = (batteryStr) => {
  if (!batteryStr || batteryStr === 'N/A') return 'fluent:battery-charge-0-20-regular'
  const p = parseInt(batteryStr.replace('%', ''), 10)
  if (isNaN(p)) return 'fluent:battery-charge-0-20-regular'
  if (p >= 95) return 'fluent:battery-charge-10-20-regular'
  if (p >= 85) return 'fluent:battery-charge-9-20-regular'
  if (p >= 75) return 'fluent:battery-charge-8-20-regular'
  if (p >= 65) return 'fluent:battery-charge-7-20-regular'
  if (p >= 55) return 'fluent:battery-charge-6-20-regular'
  if (p >= 45) return 'fluent:battery-charge-5-20-regular'
  if (p >= 35) return 'fluent:battery-charge-4-20-regular'
  if (p >= 25) return 'fluent:battery-charge-3-20-regular'
  if (p >= 15) return 'fluent:battery-charge-2-20-regular'
  if (p >= 5) return 'fluent:battery-charge-1-20-regular'
  return 'fluent:battery-charge-0-20-regular'
}
const getBatteryColor = (batteryStr) => {
  if (!batteryStr || batteryStr === 'N/A') return 'text-gray-300 dark:text-white/40'
  const p = parseInt(batteryStr.replace('%', ''), 10)
  if (isNaN(p)) return 'text-gray-300 dark:text-white/40'
  if (p < 20) return 'text-red-500'
  if (p < 50) return 'text-yellow-500'
  return 'text-green-500'
}

export function InstallerSidebar({
  selectedDevice,
  onDeviceSelect,
  extractPath,
  onExtractPathChange,
  onCollapsedChange,
  onNavigateToTab
}) {
  const { t, language } = useLanguage()
  const { unseenCount, isDownloading } = useDownload()
  const [file, setFile] = useState(null)
  const [appVersion, setAppVersion] = useState({ version: '1.0.0', build: '...' })
  const [status, setStatus] = useState({
    hasApk: false,
    hasObb: false,
    apkName: null,
    obbFolder: null
  })
  const [logHistory, setLogHistory] = useState([]) // Array of log entries
  const [isDragOver, setIsDragOver] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDownloadPanelOpen, setIsDownloadPanelOpen] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [sourceType, setSourceType] = useState('archive') // 'archive' or 'folder'
  const [folderPath, setFolderPath] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )

  // On mount: read collapsed state from config file (file = source of truth after reinstall)
  useEffect(() => {
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      if (config && typeof config.sidebarCollapsed === 'boolean') {
        setIsCollapsed(config.sidebarCollapsed)
        localStorage.setItem('sidebar-collapsed', config.sidebarCollapsed ? 'true' : 'false')
      }
    })
  }, [])
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [confirmModalMode, setConfirmModalMode] = useState('confirm')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [showFileDetail, setShowFileDetail] = useState(false)
  const [compactDeviceModel, setCompactDeviceModel] = useState(null)
  const [compactDeviceBattery, setCompactDeviceBattery] = useState(null)
  const fileInputRef = useRef(null)

  // Persist and notify parent when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false')
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed)
    }
    // Persist to config file
    window.api.storeRead?.('hypertopia-config.json').then((config) => {
      window.api.storeWrite?.('hypertopia-config.json', { ...(config || {}), sidebarCollapsed: isCollapsed })
    })
  }, [isCollapsed, onCollapsedChange])

  // Keep device model name + battery in sync for compact mode display
  useEffect(() => {
    if (!selectedDevice) {
      setCompactDeviceModel(null)
      setCompactDeviceBattery(null)
      return
    }
    let cancelled = false
    const refresh = async () => {
      try {
        const result = await window.api.listDevices()
        if (cancelled) return
        const found = result.find((d) => d.serial === selectedDevice)
        setCompactDeviceModel(found?.model || null)
        if (found?.battery && found.battery !== 'N/A') {
          const level = parseInt(found.battery.replace('%', ''), 10)
          setCompactDeviceBattery({ level: isNaN(level) ? 0 : level, charging: !!found.isCharging })
        } else {
          setCompactDeviceBattery(null)
        }
      } catch {
        // ignore
      }
    }
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selectedDevice])

  // Helper to add log entry with timestamp
  const addLogEntry = (message) => {
    const time = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setLogHistory((prev) => [...prev.slice(-399), { time, message }]) // Keep last 400 entries
  }

  // ... (keep useEffects and other handlers as is, until handleInstall)

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = (newPath) => {
    setIsSettingsOpen(false)
    if (newPath && onExtractPathChange) {
      onExtractPathChange(newPath)
    }
  }

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const ver = await window.api.getAppVersion()
        setAppVersion(ver)
      } catch (err) {
        console.error('Failed to get version', err)
      }
    }
    fetchVersion()
  }, [])

  useEffect(() => {
    if (!file && !isInstalling && logHistory.length === 0) {
      addLogEntry('Waiting for file...')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, isInstalling])

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)

    // Check if it's a folder using webkitGetAsEntry
    const items = e.dataTransfer.items
    if (items && items.length > 0) {
      const item = items[0]
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry()
        if (entry && entry.isDirectory) {
          // It's a folder - get the path from the file
          const droppedFile = e.dataTransfer.files[0]
          const folderPath = window.api.getFilePath(droppedFile)
          if (folderPath) {
            // Process as folder
            addLogEntry(t('scan_folder') || 'Scanning folder...')
            setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
            setFile(null)
            setSourceType('folder')
            setFolderPath(folderPath)

            try {
              const result = await window.api.scanFolder(folderPath)
              setStatus(result)

              if (result.hasApk && result.hasObb) {
                addLogEntry('Found APK and OBB bundle.')
              } else if (result.hasApk) {
                addLogEntry('Found APK file.')
              } else {
                addLogEntry('No APK found in the selected folder.')
              }

              const folderName = folderPath.split(/[/\\]/).pop()
              setFile({ name: folderName, size: 0, isFolder: true })
            } catch (err) {
              console.error(err)
              addLogEntry('Error: ' + (err.message || 'Unknown error'))
              setErrorDetails(err.message)
            }
            return
          }
        }
      }
    }

    // It's a file - process normally
    const droppedFile = e.dataTransfer.files[0]
    setSourceType('archive')
    setFolderPath(null)
    processFile(droppedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0]
    processFile(selectedFile)
  }

  const processFile = async (paramFile) => {
    try {
      if (!paramFile) return

      const filePath = window.api.getFilePath(paramFile)
      // Debug logging for production troubleshooting
      console.log('[processFile] paramFile:', paramFile)
      console.log('[processFile] paramFile.name:', paramFile?.name)
      console.log('[processFile] paramFile.path:', paramFile?.path)
      console.log('[processFile] resolved filePath:', filePath)

      if (!filePath) throw new Error('Could not resolve file path.')

      const lowerPath = filePath.toLowerCase()
      if (lowerPath.endsWith('.zip') || lowerPath.endsWith('.rar')) {
        setFile(paramFile)
        addLogEntry(t('scan_arch'))
        setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })

        try {
          const result = await window.api.scanZip(filePath)
          setStatus(result)

          if (result.hasApk && result.hasObb) {
            addLogEntry('Found APK and OBB bundle.')
          } else if (result.hasApk) {
            addLogEntry('Found APK file.')
          } else {
            addLogEntry('No content found.')
          }

          if (result.hasApk && selectedDevice) {
            setConfirmModalMode('confirm')
            setConfirmModalOpen(true)
          }
        } catch (scanErr) {
          // Handle scan errors
          addLogEntry('Error: ' + scanErr.message)
          setErrorDetails(scanErr.message)
          setFile(null)
          setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
        }
      } else {
        addLogEntry(t('invalid_fmt'))
        setFile(null)
      }
    } catch (err) {
      console.error(err)
      addLogEntry('Error: ' + (err.message || 'Unknown error'))
      setErrorDetails(err.message)
      setFile(null)
    }
  }

  // Handle archive selection (existing behavior)
  const handleSelectArchive = () => {
    setShowBrowseModal(false)
    fileInputRef.current.click()
  }

  // Handle folder selection (new behavior)
  const handleSelectFolder = async () => {
    setShowBrowseModal(false)
    try {
      const selectedPath = await window.api.selectGameFolder()
      if (!selectedPath) return

      addLogEntry(t('scan_folder') || 'Scanning folder...')
      setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
      setFile(null)
      setSourceType('folder')
      setFolderPath(selectedPath)

      const result = await window.api.scanFolder(selectedPath)
      setStatus(result)

      if (result.hasApk && result.hasObb) {
        addLogEntry('Found APK and OBB bundle.')
      } else if (result.hasApk) {
        addLogEntry('Found APK file.')
      } else {
        addLogEntry('No content found.')
      }

      // Create a fake file object for display purposes
      const folderName = selectedPath.split(/[/\\]/).pop()
      setFile({ name: folderName, size: 0, isFolder: true })

      if (result.hasApk && selectedDevice) {
        setConfirmModalMode('confirm')
        setConfirmModalOpen(true)
      }
    } catch (err) {
      console.error(err)
      addLogEntry('Error: ' + (err.message || 'Unknown error'))
      setErrorDetails(err.message)
    }
  }

  const handleCancelModal = () => {
    setConfirmModalOpen(false)
    if (confirmModalMode === 'confirm') {
      setFile(null)
      setFolderPath(null)
      setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
      addLogEntry(t('waiting_file') || 'Waiting for game file...')
    }
  }

  const handleConfirmModal = () => {
    setConfirmModalOpen(false)
  }

  const openDetailsModal = () => {
    setConfirmModalMode('view')
    setConfirmModalOpen(true)
  }

  const handleInstall = async (type) => {
    if (!file && !folderPath) return
    setIsInstalling(true)
    addLogEntry(type === 'apk' ? t('install_apk') : t('install_full'))

    try {
      if (sourceType === 'folder' && folderPath) {
        // Install from folder (skip extraction)
        await window.api.installGameFolder(folderPath, type, selectedDevice)
      } else {
        // Install from archive (existing behavior)
        const filePath = window.api.getFilePath(file)
        await window.api.installGame(filePath, type, selectedDevice)
      }
      addLogEntry(t('install_success'))
      setInstallProgress({ step: 'COMPLETED', percent: 100, detail: t('install_success') })
    } catch (err) {
      console.error(err)
      // Check if it was a cancellation
      if (err.message && err.message.includes('cancelled')) {
        addLogEntry(t('install_cancelled') || 'Installation cancelled')
        setInstallProgress(null)
      } else {
        addLogEntry(t('install_failed') + err.message)
        setErrorDetails(err.message)
      }
    } finally {
      setIsInstalling(false)
    }
  }

  const handleCancelInstall = async () => {
    try {
      addLogEntry(t('install_cancelling') || 'Cancelling installation...')
      await window.api.cancelInstallation()
      setIsInstalling(false)
      setInstallProgress(null)
      addLogEntry(t('install_cancelled') || 'Installation cancelled')
      addLogEntry(t('install_cancelled') || 'Installation cancelled')
    } catch (err) {
      console.error('Failed to cancel:', err)
    }
  }

  // Progress Listener
  useEffect(() => {
    const removeListener =
      window.api.onInstallProgress &&
      window.api.onInstallProgress((data) => {
        // Translate the detail if it's a translation key
        const translatedDetail = data.detail?.startsWith('progress_')
          ? t(data.detail) || data.detail
          : data.detail
        setInstallProgress({ ...data, detail: translatedDetail })
        // Add to log history
        if (translatedDetail) {
          addLogEntry(`[${data.step}] ${translatedDetail}`)
        }
      })
    return () => {
      if (removeListener) removeListener()
    }
  }, [t])

  return (
    <div
      className={`relative flex h-full flex-col bg-white dark:bg-[#0a0a0a] font-['Poppins'] text-gray-900 dark:text-white transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-full'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 dark:border-white/20 bg-white dark:bg-[#0a0a0a] text-gray-600 dark:text-white/70 transition-all hover:border-[#0081FB] hover:bg-[#0081FB]/20 hover:text-[#0081FB] hover:scale-110"
        title={
          isCollapsed
            ? t('expand_sidebar') || 'Expand Sidebar'
            : t('collapse_sidebar') || 'Collapse Sidebar'
        }
      >
        <svg
          className={`h-3 w-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {isCollapsed ? (
        // Collapsed View - Compact but useful
        <div className="flex h-full flex-col items-center justify-between py-3 px-2 gap-2">

          {/* TOP: Logo + settings shortcut */}
          <div className="flex flex-col items-center gap-3 w-full">
            {/* App Logo */}
            <Tooltip content={t('expand_sidebar') || 'Expand Sidebar'} side="right">
              <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
              >
                <img src={logoImage} alt="HyperTopia" className="w-7 h-7 object-contain" />
              </button>
            </Tooltip>

            {/* Divider */}
            <div className="w-6 h-px bg-gray-200 dark:bg-white/10" />

            {/* Settings shortcut */}
            <Tooltip content={t('settings_title') || 'Pengaturan'} side="right">
              <button
                onClick={handleOpenSettings}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-white transition-all"
              >
                {updateAvailable && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-white dark:border-[#0a0a0a]" />
                )}
                <Icon icon="mdi:cog-outline" className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Log shortcut */}
            <Tooltip content="System Log" side="right">
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-white transition-all"
              >
                <Icon icon="mdi:console" className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Download Activity shortcut */}
            <Tooltip content={t('download_activity')} side="right">
              <button
                onClick={() => setIsDownloadPanelOpen(true)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-[#0081FB]/10 hover:text-[#0081FB] ${
                  isDownloading
                    ? 'text-[#0081FB]'
                    : 'text-gray-500 dark:text-white/40'
                }`}
              >
                {isDownloading && (
                  <span className="absolute inset-0 rounded-lg animate-ping bg-[#0081FB]/30" />
                )}
                <Icon icon="mdi:download-circle-outline" className="h-4 w-4 relative z-10" />
                {unseenCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0081FB] text-[8px] font-bold text-white z-20">
                    {unseenCount > 9 ? '9+' : unseenCount}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>

          {/* MIDDLE: File status + install actions */}
          <div className="flex flex-col items-center gap-2 w-full flex-1 justify-center">
            {/* File loaded status */}
            {file ? (
              <div className="flex flex-col items-center gap-2">
                {/* File type badge – click to open detail */}
                {(() => {
                  const gameName = status?.manifestData?.gameName
                    || (sourceType === 'folder' ? status?.apkName : file?.name)
                    || ''
                  const shortName = gameName.replace(/\.apk$/i, '')
                  return (
                    <Tooltip content={status.hasObb ? 'APK + OBB — klik untuk detail' : 'APK — klik untuk detail'} side="right">
                      <button
                        onClick={() => setShowFileDetail(true)}
                        className={`group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all hover:scale-105 ${
                          status.hasObb
                            ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        <Icon icon="dashicons:games" className="h-5 w-5 shrink-0" />
                        {shortName && (
                          <span
                            className="text-[9px] font-semibold leading-none whitespace-nowrap"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 64, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {shortName.length > 14 ? shortName.slice(0, 14) + '\u2026' : shortName}
                          </span>
                        )}
                      </button>
                    </Tooltip>
                  )
                })()}

                {/* APK install button */}
                <Tooltip content={t('btn_apk') || 'Install APK'} side="right">
                  <button
                    onClick={() => handleInstall('apk')}
                    disabled={!status.hasApk || isInstalling || status.hasObb || !selectedDevice}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      !status.hasApk || isInstalling || status.hasObb || !selectedDevice
                        ? 'cursor-not-allowed bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/20'
                        : 'bg-[#0081FB]/10 text-[#0081FB] hover:bg-[#0081FB]/20'
                    }`}
                  >
                    <Icon icon="mdi:package-down" className="h-4 w-4" />
                  </button>
                </Tooltip>

                {/* Full install button */}
                <Tooltip content={`${t('btn_full') || 'Install Full'} (APK + OBB)`} side="right">
                  <button
                    onClick={() => handleInstall('full')}
                    disabled={!status.hasApk || !status.hasObb || isInstalling || !selectedDevice}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                      !status.hasApk || !status.hasObb || isInstalling || !selectedDevice
                        ? 'cursor-not-allowed bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/20'
                        : 'bg-purple-500/10 text-purple-500 dark:text-purple-400 hover:bg-purple-500/20'
                    }`}
                  >
                    <Icon icon="mdi:lightning-bolt" className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              /* No file – browse shortcut */
              <Tooltip content={t('browse_files') || 'Browse Files'} side="right">
                <button
                  onClick={() => setShowBrowseModal(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 hover:bg-[#0081FB]/10 hover:text-[#0081FB] transition-all"
                >
                  <Icon icon="mdi:folder-open-outline" className="h-5 w-5" />
                </button>
              </Tooltip>
            )}

            {/* Spinning progress while installing */}
            {isInstalling && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0081FB]/30 border-t-[#0081FB]" />
                {installProgress && (
                  <span className="text-[8px] font-bold text-[#0081FB] tabular-nums">
                    {installProgress.percent}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM: Device status */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="w-6 h-px bg-gray-200 dark:bg-white/10" />

            {/* Quick-nav: Standalone Games */}
            <Tooltip content="Standalone Games" side="right">
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('games')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-white/40 hover:bg-[#0081FB]/10 hover:text-[#0081FB] transition-all"
              >
                <Icon icon="mdi:gamepad-variant" className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Quick-nav: QGO */}
            <Tooltip content="Games Optimizer" side="right">
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('qgo')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-white/40 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
              >
                <Icon icon="mdi:tune-variant" className="h-4 w-4" />
              </button>
            </Tooltip>

            <div className="w-6 h-px bg-gray-200 dark:bg-white/10" />

            {/* Device icon + expand */}
            <Tooltip
              content={
                selectedDevice
                  ? (compactDeviceModel || selectedDevice) + (compactDeviceBattery ? ` · ${compactDeviceBattery.level}%${compactDeviceBattery.charging ? ' ⚡' : ''}` : '')
                  : (t('no_device_connected') || 'Tidak ada perangkat')
              }
              side="right"
            >
            <button
              onClick={() => setIsCollapsed(false)}
              className={`group flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all hover:bg-gray-100 dark:hover:bg-white/5 ${
                selectedDevice
                  ? 'text-[#0081FB]'
                  : 'text-gray-400 dark:text-white/30'
              }`}
            >
              <Icon
                icon={
                  (compactDeviceModel || '').toLowerCase().includes('quest')
                    ? 'ri:meta-fill'
                    : 'fluent:phone-32-filled'
                }
                className="h-5 w-5 shrink-0"
              />
              {selectedDevice && (
                <span
                  className="text-[9px] font-semibold whitespace-nowrap group-hover:text-[#0066d6] leading-none"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 64, overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {(() => {
                    const label = compactDeviceModel || selectedDevice
                    return label.length > 12 ? label.slice(0, 12) + '…' : label
                  })()}
                </span>
              )}
              {compactDeviceBattery != null && (
                <div className="flex flex-col items-center gap-0">
                  <Icon
                    icon={getBatteryIcon(compactDeviceBattery.level + '%')}
                    className={`h-4 w-4 shrink-0 ${getBatteryColor(compactDeviceBattery.level + '%')}`}
                  />
                  <span className={`text-[8px] font-bold tabular-nums leading-none ${getBatteryColor(compactDeviceBattery.level + '%')}`}>
                    {compactDeviceBattery.level}%
                  </span>
                </div>
              )}
            </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        // Expanded View - Original content
        <>
          <ConfirmationModal
            isOpen={confirmModalOpen}
            onClose={handleCancelModal}
            onConfirm={handleConfirmModal}
            mode={confirmModalMode}
            fileData={{
              name: sourceType === 'folder' ? status?.apkName || file?.name : file?.name,
              size:
                sourceType === 'folder'
                  ? (status?.apkSize || 0) + (status?.obbSize || 0)
                  : file?.size || 0,
              type: sourceType,
              hasObb: status?.hasObb,
              obbFolder: status?.obbFolder,
              apkSize: status?.apkSize || 0,
              obbSize: status?.obbSize || 0,
              obbEntries: [],
              obbFiles: status?.obbFiles || [],
              manifestData: status?.manifestData
            }}
          />

          {/* Header */}
          <div className="flex-none p-6 pb-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-4">
            <div className="flex-1 min-w-[140px]">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-[#0081FB]">HyperTopia</span> Installer
              </h1>
              <p className="mt-1 text-xs font-light text-gray-600 dark:text-white/50">
                v{appVersion.version} <span className="opacity-60">({appVersion.build})</span>
              </p>
              {extractPath && (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500 dark:text-white/30">
                  <svg
                    className="h-3 w-3 flex-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="truncate flex-1 min-w-0" title={extractPath}>
                    {extractPath}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 flex-none">
              <button
                onClick={() => setIsDownloadPanelOpen(true)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all shrink-0 hover:bg-[#0081FB]/20 hover:text-[#0081FB] ${
                  isDownloading
                    ? 'bg-[#0081FB]/10 border-[#0081FB]/40 text-[#0081FB]'
                    : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50'
                }`}
                title={t('download_activity')}
              >
                {isDownloading && (
                  <span className="absolute inset-0 rounded-lg animate-ping bg-[#0081FB]/25" />
                )}
                <Icon icon="mdi:download-circle-outline" className="text-lg relative z-10" />
                {unseenCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0081FB] text-[8px] font-bold text-white z-20">
                    {unseenCount > 9 ? '9+' : unseenCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:bg-[#0081FB]/20 hover:text-[#0081FB] transition-all shrink-0"
                title="System Log"
              >
                <Icon icon="mdi:console" className="text-lg" />
              </button>
              <button
                onClick={handleOpenSettings}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all shrink-0"
                title={t('settings_title')}
              >
                {/* Update available badge */}
                {updateAvailable && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#0a0a0a] animate-pulse" />
                )}
                <svg
                  className="h-[18px] w-[18px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content (Scrollable) */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
            {/* Update Notification */}
            <UpdateNotification
              className="mb-4"
              onUpdateAvailable={(hasUpdate, info) => {
                setUpdateAvailable(hasUpdate)
                if (info) setUpdateInfo(info)
              }}
            />

            {/* No Device Warning - Moved to the top */}
            {!selectedDevice && file && status.hasApk && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3">
                <svg
                  className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    {t('no_device_warning_title') || 'No VR Device Connected'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-orange-600 dark:text-orange-300/70">
                    {t('connect_to_install') || 'Connect your Meta Quest to install this game'}
                  </p>
                </div>
              </div>
            )}

            {/* Drop Zone - Always enabled, user can select file first */}
            {!file ? (
              <div
                className={`relative mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
                  isDragOver
                    ? 'border-[#0081FB] bg-[#0081FB]/10 scale-[1.02]'
                    : 'border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInput}
                  className="hidden"
                  accept=".zip,.rar"
                />

                <div className="mb-4 rounded-full p-4 bg-blue-100 dark:bg-[#0081FB]/20 text-[#0081FB]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-center text-sm font-medium text-gray-700 dark:text-white/90">
                  {t('drag_drop_full') || 'Drop Game File or Folder Here'}
                </p>
                <p className="mt-1 text-center text-xs text-gray-500 dark:text-white/50">
                  {t('support_ext_full') || 'ZIP, RAR, or extracted folder'}
                </p>
                <button
                  onClick={() => setShowBrowseModal(true)}
                  className="mt-4 rounded-lg px-4 py-2 text-xs font-medium transition-all bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20"
                >
                  {t('browse_files')}
                </button>
              </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151921] p-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 rounded-xl p-3 ${
                      file.isFolder
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-[#0081FB]/10 text-[#0081FB]'
                    }`}
                  >
                    <Icon icon="dashicons:games" className="text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-base font-bold text-gray-900 dark:text-white mb-2.5">
                      {status?.manifestData?.gameName ||
                        (sourceType === 'folder' ? status.apkName || file.name : file.name)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded bg-gray-100 dark:bg-[#111520] px-2 py-1 text-[11px] font-bold tracking-wider ring-1 ring-inset ${
                          status.hasObb
                            ? 'text-indigo-700 dark:text-indigo-400 ring-indigo-500/30'
                            : 'text-emerald-700 dark:text-emerald-400 ring-emerald-500/30'
                        }`}
                      >
                        {status.hasObb
                          ? t('badge_apk_obb') || 'APK + OBB'
                          : t('badge_apk') || 'APK ONLY'}
                      </span>

                      <span className="inline-flex items-center rounded bg-gray-100 dark:bg-[#111520] px-2 py-1 text-[11px] font-bold tracking-wider text-gray-600 dark:text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600/30">
                        {(() => {
                          const totalSize =
                            sourceType === 'folder'
                              ? (status?.apkSize || 0) + (status?.obbSize || 0)
                              : file?.size || 0
                          if (!totalSize) return '0 B TOTAL'
                          const k = 1024
                          const sizes = ['B', 'KB', 'MB', 'GB']
                          const i = Math.floor(Math.log(totalSize) / Math.log(k))
                          return (
                            parseFloat((totalSize / Math.pow(k, i)).toFixed(2)) +
                            ' ' +
                            sizes[i] +
                            ' TOTAL'
                          )
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3 border-t border-gray-200 dark:border-white/5 pt-4">
                  <button
                    onClick={() => setShowBrowseModal(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  >
                    <Icon icon="mdi:swap-horizontal" className="text-sm" />
                    {t('change_method') ||
                      (language === 'id' ? 'Ganti File/Folder' : 'Change File/Folder')}
                  </button>
                  <button
                    onClick={openDetailsModal}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-200 dark:bg-[#2A3241] px-4 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-[#374151] border border-gray-300 dark:border-[#374151]"
                  >
                    <Icon icon="mdi:eye-outline" className="text-sm" />
                    {t('view_details') || 'View Details'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Access Buttons */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('games')}
                className="group flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 transition-all hover:border-[#0081FB]/50 hover:bg-[#0081FB]/10 text-left"
              >
                <div className="rounded-lg bg-blue-100 dark:bg-[#0081FB]/20 p-1.5 text-[#0081FB] shrink-0 transition-all group-hover:bg-[#0081FB]/30">
                  <Icon icon="mdi:gamepad-variant" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-white/90 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                    {language === 'id' ? 'Standalone Games' : 'Standalone Games'}
                  </p>
                  <p className="text-[9px] text-gray-600 dark:text-white/50 group-hover:text-gray-700 dark:group-hover:text-white/70 truncate mt-0.5">
                    {language === 'id' ? 'Download langsung' : 'Download directly'}
                  </p>
                </div>
              </button>
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('qgo')}
                className="group flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-2.5 transition-all hover:border-purple-500/50 hover:bg-purple-500/10 text-left"
              >
                <div className="rounded-lg bg-purple-500/20 p-1.5 text-purple-700 dark:text-purple-400 shrink-0 transition-all group-hover:bg-purple-500/30">
                  <Icon icon="mdi:rocket-launch" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-white/90 group-hover:text-gray-900 dark:group-hover:text-white truncate">
                    Games Optimizer
                  </p>
                  <p className="text-[9px] text-gray-600 dark:text-white/50 group-hover:text-gray-700 dark:group-hover:text-white/70 truncate mt-0.5">
                    {language === 'id' ? 'Optimize VR games' : 'Optimize VR games'}
                  </p>
                </div>
              </button>
            </div>

            {/* Progress Bar (Visible during installation) */}
            {(isInstalling || (installProgress && installProgress.step === 'COMPLETED')) &&
              installProgress && (
                <div className="mb-6 rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0081FB]">
                      {installProgress.step.replace('_', ' ')}
                    </p>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {installProgress.percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full bg-[#0081FB] transition-all duration-300 ease-out"
                      style={{ width: `${installProgress.percent}%` }}
                    ></div>
                  </div>
                  <p
                    className="mt-2 break-all text-xs font-mono text-gray-600 dark:text-white/50"
                    title={installProgress.detail}
                  >
                    {installProgress.detail}
                  </p>

                  {/* Cancel Button - Only show when installing (not completed) */}
                  {isInstalling && installProgress.step !== 'COMPLETED' && (
                    <button
                      onClick={handleCancelInstall}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      {t('cancel_install') || 'Cancel Installation'}
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* Action Buttons & Footer / Device Selector */}
          <div className="flex-none border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#111] p-4 flex flex-col gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.5)] relative z-10">
            {/* Action Buttons */}
            <div className="flex flex-row gap-2">
              <button
                onClick={() => handleInstall('apk')}
                disabled={
                  !file || !status.hasApk || isInstalling || status.hasObb || !selectedDevice
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                  !file || !status.hasApk || isInstalling || status.hasObb || !selectedDevice
                    ? 'cursor-not-allowed bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20'
                    : 'bg-linear-to-r from-[#0081FB] to-[#00C2FF] text-white shadow-lg shadow-[#0081FB]/25 hover:shadow-[#0081FB]/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isInstalling && !status.hasObb ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                )}
                {t('btn_apk')}
              </button>

              <button
                onClick={() => handleInstall('full')}
                disabled={
                  !file || !status.hasApk || !status.hasObb || isInstalling || !selectedDevice
                }
                className={`group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-xl py-2 text-xs font-semibold transition-all ${
                  !file || !status.hasApk || !status.hasObb || isInstalling || !selectedDevice
                    ? 'cursor-not-allowed bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20'
                    : 'bg-linear-to-r from-purple-600 to-purple-400 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isInstalling && status.hasObb ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                )}
                <div className="flex flex-col items-start leading-none">
                  <span>{t('btn_full')}</span>
                  <span className="text-[9px] opacity-80 font-normal mt-0.5">
                    {t('install_full_badge')}
                  </span>
                </div>
              </button>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-white/30">
                {t('connected_device')}
              </p>
              <DeviceSelector
                selectedSerial={selectedDevice}
                onSelect={(serial) => onDeviceSelect(serial)}
              />
            </div>
          </div>

          {/* Modals */}
        </>
      )}

      {/* Always-mounted DeviceSelector (hidden in compact) so ADB polling never stops */}
      {isCollapsed && (
        <div className="hidden">
          <DeviceSelector
            selectedSerial={selectedDevice}
            onSelect={(serial) => onDeviceSelect(serial)}
          />
        </div>
      )}

      {/* Always-mounted modals – work in both collapsed and expanded states */}
      <ErrorModal
        isOpen={!!errorDetails}
        onClose={() => setErrorDetails(null)}
        error={errorDetails}
      />
      <BrowseMethodModal
        isOpen={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        onSelectArchive={handleSelectArchive}
        onSelectFolder={handleSelectFolder}
      />
      <ConfirmationModal
        isOpen={showFileDetail}
        onClose={() => setShowFileDetail(false)}
        onConfirm={() => setShowFileDetail(false)}
        mode="view"
        fileData={{
          name: sourceType === 'folder' ? status?.apkName || file?.name : file?.name,
          size:
            sourceType === 'folder'
              ? (status?.apkSize || 0) + (status?.obbSize || 0)
              : file?.size || 0,
          type: sourceType,
          hasObb: status?.hasObb,
          obbFolder: status?.obbFolder,
          apkSize: status?.apkSize || 0,
          obbSize: status?.obbSize || 0,
          obbEntries: [],
          obbFiles: status?.obbFiles || [],
          manifestData: status?.manifestData
        }}
      />
      <DownloadActivityPanel
        isOpen={isDownloadPanelOpen}
        onClose={() => setIsDownloadPanelOpen(false)}
        onNavigateToManager={() => onNavigateToTab?.('manager:downloads')}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        currentPath={extractPath}
        appVersion={appVersion}
        updateAvailable={updateAvailable}
        updateInfo={updateInfo}
        onUpdateNow={() => {
          window.api.downloadUpdate()
        }}
      />
      <SystemLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        logHistory={logHistory}
      />
    </div>
  )
}

InstallerSidebar.propTypes = {
  selectedDevice: PropTypes.string,
  onDeviceSelect: PropTypes.func,
  extractPath: PropTypes.string,
  onExtractPathChange: PropTypes.func,
  onCollapsedChange: PropTypes.func,
  onNavigateToTab: PropTypes.func
}
