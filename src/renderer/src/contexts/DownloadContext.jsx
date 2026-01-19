import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

const DownloadContext = createContext(null)

export function DownloadProvider({ children }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [downloadInfo, setDownloadInfo] = useState({
    fileName: '',
    gameTitle: '',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    status: 'idle' // 'idle' | 'preparing' | 'downloading'
  })

  // Install mode state (for Download & Install feature)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installComplete, setInstallComplete] = useState(false)
  const [installInfo, setInstallInfo] = useState({
    gameTitle: '',
    step: '', // 'DOWNLOADING' | 'EXTRACTING' | 'INSTALLING' | 'PUSHING_OBB' | 'COMPLETED' | 'ERROR'
    percent: 0,
    detail: '',
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0
  })

  // Listen for download progress events
  useEffect(() => {
    if (!window.api?.onDownloadProgress) return

    const unsubscribe = window.api.onDownloadProgress((progress) => {
      setDownloadInfo((prev) => ({
        ...prev,
        fileName: progress.fileName || prev.fileName,
        progress: progress.progress || 0,
        downloadedBytes: progress.downloadedBytes || 0,
        totalBytes: progress.totalBytes || 0,
        speed: progress.speed || 0,
        status: progress.status || 'downloading'
      }))
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Listen for install progress events (for Download & Install)
  useEffect(() => {
    if (!window.api?.onInstallApkProgress) return

    const unsubscribe = window.api.onInstallApkProgress((progress) => {
      setInstallInfo((prev) => ({
        ...prev,
        step: progress.step || prev.step,
        percent: progress.percent || 0,
        detail: progress.detail || '',
        downloadedBytes: progress.downloadedBytes || 0,
        totalBytes: progress.totalBytes || 0,
        speed: progress.speed || 0
      }))

      // Check for completion or error
      if (progress.step === 'COMPLETED') {
        setIsInstalling(false)
        setInstallComplete(true)
      } else if (progress.step === 'ERROR') {
        setIsInstalling(false)
        setInstallComplete(false)
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Start download
  const startDownload = useCallback(async (url, fileName, gameTitle) => {
    if (isDownloading) {
      console.warn('[Download] Another download is already in progress')
      return { success: false, error: 'Another download is in progress' }
    }

    setIsDownloading(true)
    setDownloadComplete(false)
    setShowWidget(true)
    setDownloadInfo({
      fileName,
      gameTitle,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      status: 'preparing'
    })

    try {
      const result = await window.api.downloadFile(url, fileName)

      if (result.success) {
        setIsDownloading(false)
        setDownloadComplete(true)
        setDownloadInfo((prev) => ({
          ...prev,
          progress: 100,
          status: 'idle'
        }))
        return { success: true, filePath: result.filePath }
      } else if (result.canceled) {
        setIsDownloading(false)
        setDownloadComplete(false)
        setShowWidget(false)
        setDownloadInfo({
          fileName: '',
          gameTitle: '',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0,
          status: 'idle'
        })
        return { success: false, canceled: true }
      } else {
        setIsDownloading(false)
        setDownloadComplete(false)
        setShowWidget(false)
        setDownloadInfo({
          fileName: '',
          gameTitle: '',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0,
          status: 'idle'
        })
        return { success: false, error: result.error || 'Unknown error' }
      }
    } catch (error) {
      console.error('[Download] Error:', error)
      setIsDownloading(false)
      setDownloadComplete(false)
      setShowWidget(false)
      setDownloadInfo({
        fileName: '',
        gameTitle: '',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        status: 'idle'
      })
      return { success: false, error: error.message }
    }
  }, [isDownloading])

  // Close widget
  const closeWidget = useCallback(() => {
    setShowWidget(false)
    setDownloadComplete(false)
    setDownloadInfo({
      fileName: '',
      gameTitle: '',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0,
      status: 'idle'
    })
    // Also reset install state
    setIsInstalling(false)
    setInstallComplete(false)
    setInstallInfo({
      gameTitle: '',
      step: '',
      percent: 0,
      detail: '',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })
  }, [])

  // Show widget (for minimizing modal)
  const showDownloadWidget = useCallback(() => {
    setShowWidget(true)
  }, [])

  // Start install (for Download & Install feature)
  const startInstall = useCallback((gameTitle) => {
    setIsInstalling(true)
    setInstallComplete(false)
    setShowWidget(true)
    setInstallInfo({
      gameTitle,
      step: 'DOWNLOADING',
      percent: 0,
      detail: '',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })
  }, [])

  // Close install widget
  const closeInstallWidget = useCallback(() => {
    setShowWidget(false)
    setInstallComplete(false)
    setIsInstalling(false)
    setInstallInfo({
      gameTitle: '',
      step: '',
      percent: 0,
      detail: '',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })
  }, [])

  const value = {
    isDownloading,
    downloadComplete,
    showWidget,
    downloadInfo,
    startDownload,
    closeWidget,
    showDownloadWidget,
    // Install states and functions
    isInstalling,
    installComplete,
    installInfo,
    startInstall,
    closeInstallWidget
  }

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  )
}

DownloadProvider.propTypes = {
  children: PropTypes.node.isRequired
}

export function useDownload() {
  const context = useContext(DownloadContext)
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider')
  }
  return context
}

export default DownloadContext
