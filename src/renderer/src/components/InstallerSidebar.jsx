import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { DeviceSelector } from './DeviceSelector'
import { ErrorModal } from './ErrorModal'
import { SettingsModal } from './SettingsModal'
import UpdateNotification from './UpdateNotification'
import BrowseMethodModal from './BrowseMethodModal'
import PropTypes from 'prop-types'

export function InstallerSidebar({ selectedDevice, onDeviceSelect }) {
  const { t, language, setLanguage } = useLanguage()
  const [file, setFile] = useState(null)
  const [appVersion, setAppVersion] = useState({ version: '1.0.0', build: '...' })
  const [status, setStatus] = useState({
    hasApk: false,
    hasObb: false,
    apkName: null,
    obbFolder: null
  })
  const [log, setLog] = useState('Waiting...')
  const [logHistory, setLogHistory] = useState([]) // Array of log entries
  const [isDragOver, setIsDragOver] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [extractPath, setExtractPath] = useState(localStorage.getItem('extractPath') || '')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showBrowseModal, setShowBrowseModal] = useState(false)
  const [sourceType, setSourceType] = useState('archive') // 'archive' or 'folder'
  const [folderPath, setFolderPath] = useState(null)
  const fileInputRef = useRef(null)
  const logContainerRef = useRef(null)

  // Helper to add log entry with timestamp
  const addLogEntry = (message) => {
    const time = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    setLogHistory((prev) => [...prev.slice(-19), { time, message }]) // Keep last 20 entries
    setLog(message)
  }

  // ... (keep useEffects and other handlers as is, until handleInstall)

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleCloseSettings = (newPath) => {
    setIsSettingsOpen(false)
    if (newPath) {
      setExtractPath(newPath)
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

  // Update log when language changes
  useEffect(() => {
    if (!file && !isInstalling) {
      setLog(t('waiting_file'))
    }
  }, [language, file, isInstalling, t])

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
            setLog(t('scan_folder') || 'Scanning folder...')
            setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
            setFile(null)
            setSourceType('folder')
            setFolderPath(folderPath)

            try {
              const result = await window.api.scanFolder(folderPath)
              setStatus(result)

              if (result.hasApk && result.hasObb) {
                setLog(t('bundle_found'))
              } else if (result.hasApk) {
                setLog(t('apk_found'))
              } else {
                setLog(t('no_content'))
              }

              const folderName = folderPath.split(/[/\\]/).pop()
              setFile({ name: folderName, size: 0, isFolder: true })
            } catch (err) {
              console.error(err)
              setLog('Error: ' + (err.message || 'Unknown error'))
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
      if (!filePath) throw new Error('Could not resolve file path.')

      const lowerPath = filePath.toLowerCase()
      if (lowerPath.endsWith('.zip') || lowerPath.endsWith('.rar')) {
        setFile(paramFile)
        setLog(t('scan_arch'))
        setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })

        try {
          const result = await window.api.scanZip(filePath)
          setStatus(result)

          if (result.hasApk && result.hasObb) {
            setLog(t('bundle_found'))
          } else if (result.hasApk) {
            setLog(t('apk_found'))
          } else {
            setLog(t('no_content'))
          }
        } catch (scanErr) {
          // Handle scan errors
          setLog('Error: ' + scanErr.message)
          setErrorDetails(scanErr.message)
          setFile(null)
          setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
        }
      } else {
        setLog(t('invalid_fmt'))
        setFile(null)
      }
    } catch (err) {
      console.error(err)
      setLog('Error: ' + (err.message || 'Unknown error'))
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

      setLog(t('scan_folder') || 'Scanning folder...')
      setStatus({ hasApk: false, hasObb: false, apkName: null, obbFolder: null })
      setFile(null)
      setSourceType('folder')
      setFolderPath(selectedPath)

      const result = await window.api.scanFolder(selectedPath)
      setStatus(result)

      if (result.hasApk && result.hasObb) {
        setLog(t('bundle_found'))
      } else if (result.hasApk) {
        setLog(t('apk_found'))
      } else {
        setLog(t('no_content'))
      }

      // Create a fake file object for display purposes
      const folderName = selectedPath.split(/[/\\]/).pop()
      setFile({ name: folderName, size: 0, isFolder: true })
    } catch (err) {
      console.error(err)
      setLog('Error: ' + (err.message || 'Unknown error'))
      setErrorDetails(err.message)
    }
  }

  const handleInstall = async (type) => {
    if (!file && !folderPath) return
    setIsInstalling(true)
    setLog(type === 'apk' ? t('install_apk') : t('install_full'))

    try {
      if (sourceType === 'folder' && folderPath) {
        // Install from folder (skip extraction)
        await window.api.installGameFolder(folderPath, type, selectedDevice)
      } else {
        // Install from archive (existing behavior)
        const filePath = window.api.getFilePath(file)
        await window.api.installGame(filePath, type, selectedDevice)
      }
      setLog(t('install_success'))
      setInstallProgress({ step: 'COMPLETED', percent: 100, detail: t('install_success') })
    } catch (err) {
      console.error(err)
      // Check if it was a cancellation
      if (err.message && err.message.includes('cancelled')) {
        setLog(t('install_cancelled') || 'Installation cancelled')
        setInstallProgress(null)
      } else {
        setLog(t('install_failed') + err.message)
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
      setLog(t('install_cancelled') || 'Installation cancelled')
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

  // Auto-scroll log container
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logHistory])

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0a] font-['Poppins'] text-white">
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

      {/* Header */}
      <div className="flex-none p-6 pb-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-4">
        <div className="flex-1 min-w-[140px]">
          <h1 className="text-xl font-bold tracking-tight">
            HyperTopia <span className="text-[#0081FB]">Installer</span>
          </h1>
          <p className="mt-1 text-xs font-light text-white/50">
            v{appVersion.version} <span className="opacity-50">({appVersion.build})</span>
          </p>
          {extractPath && (
            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-white/30">
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
            onClick={handleOpenSettings}
            className="relative rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
            title={t('settings_title')}
          >
            {/* Update available badge */}
            {updateAvailable && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#0a0a0a] animate-pulse" />
            )}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="relative group">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-6 py-1 text-[10px] font-bold text-white/70 hover:text-white uppercase cursor-pointer outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all w-full"
              title="Change Language"
            >
              <option value="en" className="bg-[#0a0a0a] text-white">
                EN
              </option>
              <option value="id" className="bg-[#0a0a0a] text-white">
                ID
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-white/30 group-hover:text-white/70">
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
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

        {/* Drop Zone */}
        <div
          className={`relative mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
            !selectedDevice
              ? 'border-white/5 bg-white/[0.02] cursor-not-allowed opacity-50'
              : isDragOver
                ? 'border-[#0081FB] bg-[#0081FB]/10 scale-[1.02]'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
          }`}
          onDrop={selectedDevice ? handleDrop : (e) => e.preventDefault()}
          onDragOver={selectedDevice ? handleDragOver : (e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            className="hidden"
            accept=".zip,.rar"
            disabled={!selectedDevice}
          />

          <div className={`mb-4 rounded-full p-4 ${selectedDevice ? 'bg-[#0081FB]/20 text-[#0081FB]' : 'bg-white/5 text-white/30'}`}>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className={`text-center text-sm font-medium ${selectedDevice ? 'text-white/90' : 'text-white/40'}`}>
            {selectedDevice
              ? (t('drag_drop_full') || 'Drop Game File or Folder Here')
              : (t('connect_device_first') || 'Connect VR Device First')}
          </p>
          <p className={`mt-1 text-center text-xs ${selectedDevice ? 'text-white/50' : 'text-white/30'}`}>
            {selectedDevice
              ? (t('support_ext_full') || 'ZIP, RAR, or extracted folder')
              : (t('connect_device_first_desc') || 'Please connect your Meta Quest to continue')}
          </p>
          <button
            onClick={() => selectedDevice && setShowBrowseModal(true)}
            disabled={!selectedDevice}
            className={`mt-4 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
              selectedDevice
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            {t('browse_files')}
          </button>
        </div>

        {/* File Info Card */}
        {file && (
          <div className="mb-6 rounded-xl border border-white/10 bg-[#111] p-4">
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 rounded-lg p-2 ${file.isFolder ? 'bg-green-500/20 text-green-400' : 'bg-[#0081FB]/20 text-[#0081FB]'}`}
              >
                {file.isFolder ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-white">{file.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {file.isFolder ? (
                    <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                      {t('folder_selected') || 'Folder'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-white/60 ring-1 ring-inset ring-white/10">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  {status.apkName && (
                    <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-400 ring-1 ring-inset ring-green-500/20">
                      APK: {status.apkName}
                    </span>
                  )}
                  {status.obbFolder && (
                    <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
                      OBB: {status.obbFolder}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar (Visible during installation) */}
        {(isInstalling || (installProgress && installProgress.step === 'COMPLETED')) &&
          installProgress && (
            <div className="mb-6 rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0081FB]">
                  {installProgress.step.replace('_', ' ')}
                </p>
                <span className="text-xs font-bold text-white">{installProgress.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full bg-[#0081FB] transition-all duration-300 ease-out"
                  style={{ width: `${installProgress.percent}%` }}
                ></div>
              </div>
              <p
                className="mt-2 break-all text-xs font-mono text-white/50"
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

        {/* Status Log */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#111] p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
              {t('system_log')}
            </p>
            {isInstalling && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-[#0081FB]"></div>
            )}
          </div>
          <div
            ref={logContainerRef}
            className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10"
          >
            {logHistory.length > 0 ? (
              logHistory.map((entry, idx) => (
                <div key={idx} className="flex gap-2 text-[11px] font-mono">
                  <span className="text-white/30 shrink-0">{entry.time}</span>
                  <span className="text-white/70 break-all">{entry.message}</span>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-white/50">{log}</p>
            )}
          </div>
        </div>

        {/* No Device Warning */}
        {!selectedDevice && (file || status.hasApk) && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <svg
              className="h-5 w-5 shrink-0 text-red-400"
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
              <p className="text-xs font-semibold text-red-400">
                {t('no_device_warning_title')}
              </p>
              <p className="mt-0.5 text-[10px] text-red-300/70">
                {t('no_device_warning_desc')}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleInstall('apk')}
            disabled={!file || !status.hasApk || isInstalling || status.hasObb || !selectedDevice}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
              !file || !status.hasApk || isInstalling || status.hasObb || !selectedDevice
                ? 'cursor-not-allowed bg-white/5 text-white/20'
                : 'bg-linear-to-r from-[#0081FB] to-[#00C2FF] text-white shadow-lg shadow-[#0081FB]/25 hover:shadow-[#0081FB]/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isInstalling && !status.hasObb ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
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
            disabled={!file || !status.hasApk || !status.hasObb || isInstalling || !selectedDevice}
            className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold transition-all ${
              !file || !status.hasApk || !status.hasObb || isInstalling || !selectedDevice
                ? 'cursor-not-allowed bg-white/5 text-white/20'
                : 'bg-linear-to-r from-purple-600 to-purple-400 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isInstalling && status.hasObb ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
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
      </div>

      {/* Footer / Device Selector */}
      <div className="flex-none border-t border-white/5 bg-[#111] p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
          {t('connected_device')}
        </p>
        <DeviceSelector
          selectedSerial={selectedDevice}
          onSelect={(serial) => onDeviceSelect(serial)}
        />
      </div>

      {/* Modals */}
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
    </div>
  )
}

InstallerSidebar.propTypes = {
  selectedDevice: PropTypes.string,
  onDeviceSelect: PropTypes.func
}
