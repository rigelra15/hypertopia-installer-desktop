import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { DeviceSelector } from './DeviceSelector'
import { ErrorModal } from './ErrorModal'
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
  const [isDragOver, setIsDragOver] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const fileInputRef = useRef(null)

  // ... (keep useEffects and other handlers as is, until handleInstall)

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
    const droppedFile = e.dataTransfer.files[0]
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

        const result = await window.api.scanZip(filePath)
        setStatus(result)

        if (result.hasApk && result.hasObb) {
          setLog(t('bundle_found'))
        } else if (result.hasApk) {
          setLog(t('apk_found'))
        } else {
          setLog(t('no_content'))
        }
      } else {
        setLog(t('invalid_fmt'))
        setFile(null)
      }
    } catch (err) {
      console.error(err)
      setLog('Error: ' + (err.message || 'Unknown error'))
      setFile(null)
    }
  }

  const handleInstall = async (type) => {
    if (!file) return
    setIsInstalling(true)
    setLog(type === 'apk' ? t('install_apk') : t('install_full'))

    try {
      const filePath = window.api.getFilePath(file)
      // Pass selectedDevice
      await window.api.installGame(filePath, type, selectedDevice)
      setLog(t('install_success'))
      setInstallProgress({ step: 'COMPLETED', percent: 100, detail: t('install_success') })
    } catch (err) {
      console.error(err)
      setLog(t('install_failed') + err.message)
      setErrorDetails(err.message) // Trigger modal
    } finally {
      setIsInstalling(false)
    }
  }

  // Progress Listener
  useEffect(() => {
    const removeListener =
      window.api.onInstallProgress &&
      window.api.onInstallProgress((data) => {
        setInstallProgress(data)
        // Also sync log for history/context
        if (data.detail) setLog(data.detail)
      })
    return () => {
      if (removeListener) removeListener()
    }
  }, [])

  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0a] font-['Poppins'] text-white">
      <ErrorModal
        isOpen={!!errorDetails}
        onClose={() => setErrorDetails(null)}
        error={errorDetails}
      />
      {/* ... (rest of render) */}

      {/* Header */}
      <div className="flex-none p-6 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            HyperTopia <span className="text-[#0081FB]">Installer</span>
          </h1>
          <p className="mt-1 text-xs font-light text-white/50">
            v{appVersion.version} <span className="opacity-50">({appVersion.build})</span>
          </p>
        </div>
        <div className="relative group">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-6 py-1 text-[10px] font-bold text-white/70 hover:text-white uppercase cursor-pointer outline-none focus:ring-1 focus:ring-[#0081FB]/50 transition-all"
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

      {/* Main Content (Scrollable) */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
        {/* Drop Zone */}
        <div
          className={`relative mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
            isDragOver
              ? 'border-[#0081FB] bg-[#0081FB]/10 scale-[1.02]'
              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
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

          <div className="mb-4 rounded-full bg-[#0081FB]/20 p-4 text-[#0081FB]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className="text-center text-sm font-medium text-white/90">{t('drag_drop')}</p>
          <p className="mt-1 text-center text-xs text-white/50">{t('support_ext')}</p>
          <button
            onClick={() => fileInputRef.current.click()}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition-all hover:bg-white/20"
          >
            {t('browse_files')}
          </button>
        </div>

        {/* File Info Card */}
        {file && (
          <div className="mb-6 rounded-xl border border-white/10 bg-[#111] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg bg-[#0081FB]/20 p-2 text-[#0081FB]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-white line-clamp-2">{file.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-white/60 ring-1 ring-inset ring-white/10">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
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
                className="mt-2 truncate text-xs font-mono text-white/50"
                title={installProgress.detail}
              >
                {installProgress.detail}
              </p>
            </div>
          )}

        {/* Status Log */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#111] p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-2">
            {t('system_log')}
          </p>
          <div className="flex items-center gap-2">
            {isInstalling ? (
              <div className="h-2 w-2 animate-pulse rounded-full bg-[#0081FB]"></div>
            ) : (
              <div className="h-2 w-2 rounded-full bg-white/20"></div>
            )}
            <p className="text-xs font-mono text-white/70 truncate">{log}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleInstall('apk')}
            disabled={!file || !status.hasApk || isInstalling || status.hasObb}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
              !file || !status.hasApk || isInstalling || status.hasObb
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
            disabled={!file || !status.hasApk || !status.hasObb || isInstalling}
            className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold transition-all ${
              !file || !status.hasApk || !status.hasObb || isInstalling
                ? 'cursor-not-allowed bg-white/5 text-white/20'
                : 'bg-linear-to-r from-[#0081FB] to-[#00C2FF] text-white shadow-lg shadow-[#0081FB]/25 hover:shadow-[#0081FB]/40 hover:scale-[1.02] active:scale-[0.98]'
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
    </div>
  )
}

InstallerSidebar.propTypes = {
  selectedDevice: PropTypes.string,
  onDeviceSelect: PropTypes.func
}
