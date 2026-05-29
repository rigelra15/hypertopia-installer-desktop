import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'

const DownloadContext = createContext(null)

export function DownloadProvider({ children }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [showWidget, setShowWidget] = useState(false)
  const [downloadInfo, setDownloadInfo] = useState({
    fileName: '',
    gameTitle: '',
    version: null,
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    status: 'idle' // 'idle' | 'preparing' | 'downloading'
  })

  // Download queue — in-memory only (session-scoped)
  const downloadQueueRef = useRef([]) // source of truth for queue processing
  const [downloadQueue, _setDownloadQueue] = useState([]) // mirror for UI
  const syncQueue = (next) => {
    downloadQueueRef.current = next
    _setDownloadQueue([...next])
  }

  // Download history — persisted to localStorage + download-history.json file
  const [downloadHistory, setDownloadHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('download-history') || '[]')
    } catch {
      return []
    }
  })

  // On mount: read from file (file = source of truth, migrates/overrides localStorage)
  useEffect(() => {
    window.api.storeRead?.('download-history.json').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setDownloadHistory(data)
        try {
          localStorage.setItem('download-history', JSON.stringify(data))
        } catch {
          /* ignore */
        }
      }
    })
  }, [])

  const addHistoryEntry = useCallback((entry) => {
    setDownloadHistory((prev) => {
      const next = [
        { id: Date.now(), seen: false, completedAt: new Date().toISOString(), ...entry },
        ...prev
      ].slice(0, 50)
      try {
        localStorage.setItem('download-history', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      window.api.storeWrite?.('download-history.json', next)
      return next
    })
  }, [])

  const markHistorySeen = useCallback(() => {
    setDownloadHistory((prev) => {
      const next = prev.map((e) => ({ ...e, seen: true }))
      try {
        localStorage.setItem('download-history', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      window.api.storeWrite?.('download-history.json', next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setDownloadHistory([])
    try {
      localStorage.removeItem('download-history')
    } catch {
      /* ignore */
    }
    window.api.storeWrite?.('download-history.json', [])
  }, [])

  // Install mode state (for Download & Install feature)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installComplete, setInstallComplete] = useState(false)
  const [installInfo, setInstallInfo] = useState({
    gameTitle: '',
    fileName: null,
    version: null,
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
        setInstallInfo((prev) => {
          addHistoryEntry({
            type: 'install',
            gameTitle: prev.gameTitle,
            fileName: prev.fileName || prev.gameTitle,
            totalBytes: prev.totalBytes || 0,
            version: prev.version || null
          })
          return prev
        })
      } else if (progress.step === 'ERROR') {
        setIsInstalling(false)
        setInstallComplete(false)
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [addHistoryEntry])

  // Internal: actually runs one download
  const executeDownload = useCallback(
    async (url, fileName, gameTitle, version) => {
      setIsDownloading(true)
      setDownloadComplete(false)
      setShowWidget(true)
      setDownloadInfo({
        fileName,
        gameTitle,
        version: version || null,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        status: 'preparing'
      })

      const _reset = () =>
        setDownloadInfo({
          fileName: '',
          gameTitle: '',
          version: null,
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0,
          status: 'idle'
        })

      try {
        const result = await window.api.downloadFile(url, fileName)
        if (result.success) {
          setIsDownloading(false)
          setDownloadComplete(true)
          setDownloadInfo((prev) => ({ ...prev, progress: 100, status: 'idle' }))
          addHistoryEntry({
            type: 'download',
            gameTitle,
            fileName,
            totalBytes: result.totalBytes || 0,
            version: version || null
          })
          return { success: true, filePath: result.filePath }
        } else if (result.canceled) {
          setIsDownloading(false)
          setDownloadComplete(false)
          setShowWidget(downloadQueueRef.current.length > 0)
          _reset()
          return { success: false, canceled: true }
        } else {
          setIsDownloading(false)
          setDownloadComplete(false)
          setShowWidget(downloadQueueRef.current.length > 0)
          _reset()
          return { success: false, error: result.error || 'Unknown error' }
        }
      } catch (error) {
        console.error('[Download] Error:', error)
        setIsDownloading(false)
        setDownloadComplete(false)
        setShowWidget(downloadQueueRef.current.length > 0)
        _reset()
        return { success: false, error: error.message }
      }
    },
    [addHistoryEntry]
  )

  // Auto-process queue
  useEffect(() => {
    if (!isDownloading && !isInstalling && downloadQueue.length > 0) {
      const next = downloadQueue[0]
      // Small delay to ensure state updates propagate
      setTimeout(() => {
        syncQueue(downloadQueue.slice(1))
        executeDownload(next.url, next.fileName, next.gameTitle, next.version)
      }, 150)
    }
  }, [isDownloading, isInstalling, downloadQueue, executeDownload])

  const startDownload = useCallback(
    async (url, fileName, gameTitle, version = null) => {
      if (isDownloading || isInstalling) {
        // Add to queue
        const item = { id: Date.now() + Math.random(), url, fileName, gameTitle, version }
        syncQueue([...downloadQueueRef.current, item])
        setShowWidget(true)
        return { success: false, queued: true }
      }
      return executeDownload(url, fileName, gameTitle, version)
    },
    [isDownloading, isInstalling, executeDownload]
  )

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
      version: null,
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
  const startInstall = useCallback(
    (gameTitle, version = null, fileName = null, initialStep = 'DOWNLOADING') => {
      setIsInstalling(true)
      setInstallComplete(false)
      setShowWidget(true)
      setInstallInfo({
        gameTitle,
        fileName,
        version,
        step: initialStep,
        percent: 0,
        detail: '',
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0
      })
    },
    []
  )

  // Close install widget
  const closeInstallWidget = useCallback(() => {
    setShowWidget(false)
    setInstallComplete(false)
    setIsInstalling(false)
    setInstallInfo({
      gameTitle: '',
      fileName: null,
      version: null,
      step: '',
      percent: 0,
      detail: '',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })
  }, [])

  // Cancel download
  const cancelDownload = useCallback(async () => {
    try {
      if (window.api?.cancelDownload) {
        await window.api.cancelDownload()
      }
      // Reset state — executeDownload's catch/cancel branch will call _processNext
      setIsDownloading(false)
      setDownloadComplete(false)
      setDownloadInfo({
        fileName: '',
        gameTitle: '',
        version: null,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0,
        status: 'idle'
      })
      if (downloadQueueRef.current.length === 0) setShowWidget(false)
      return { success: true }
    } catch (error) {
      console.error('[DownloadContext] Failed to cancel download:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Remove an item from the queue
  const removeFromQueue = useCallback((id) => {
    syncQueue(downloadQueueRef.current.filter((item) => item.id !== id))
  }, [])

  // Move a queue item up or down
  const moveQueueItem = useCallback((id, direction) => {
    const q = [...downloadQueueRef.current]
    const idx = q.findIndex((item) => item.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= q.length) return
    ;[q[idx], q[swapIdx]] = [q[swapIdx], q[idx]]
    syncQueue(q)
  }, [])

  // Cancel install (Download & Install)
  const cancelInstall = useCallback(async () => {
    try {
      // Cancel both download and installation
      if (window.api?.cancelDownload) {
        await window.api.cancelDownload()
      }
      if (window.api?.cancelInstallation) {
        await window.api.cancelInstallation()
      }
      // Reset state
      setIsInstalling(false)
      setInstallComplete(false)
      setShowWidget(false)
      setInstallInfo({
        gameTitle: '',
        step: '',
        percent: 0,
        detail: '',
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0
      })
      return { success: true }
    } catch (error) {
      console.error('[DownloadContext] Failed to cancel install:', error)
      return { success: false, error: error.message }
    }
  }, [])

  const value = {
    isDownloading,
    downloadComplete,
    showWidget,
    downloadInfo,
    startDownload,
    closeWidget,
    showDownloadWidget,
    cancelDownload,
    // Install states and functions
    isInstalling,
    installComplete,
    installInfo,
    startInstall,
    closeInstallWidget,
    cancelInstall,
    // Queue
    downloadQueue,
    removeFromQueue,
    moveQueueItem,
    // History
    downloadHistory,
    unseenCount: downloadHistory.filter((e) => !e.seen).length,
    markHistorySeen,
    clearHistory
  }

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>
}

DownloadProvider.propTypes = {
  children: PropTypes.node.isRequired
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDownload() {
  const context = useContext(DownloadContext)
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider')
  }
  return context
}

export default DownloadContext
