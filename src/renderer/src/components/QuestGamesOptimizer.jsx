import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useDownload } from '../contexts/DownloadContext'
import { useGames } from '../contexts/GamesContext'
import { useToast } from '../hooks/useToast'
import PropTypes from 'prop-types'
import { apiFetch, API_BASE_URL } from '../utils/apiClient'

// QGO package name pattern
const QGO_PACKAGE_PATTERNS = ['com.anagan.qgo', 'questgamesoptimizer', 'qgo']

export function QuestGamesOptimizer({
  selectedDevice,
  pendingDeepLinkDownload,
  onDeepLinkProcessed
}) {
  const { t } = useLanguage()
  const { user, accessTypes } = useAuth()
  const { isDownloading, downloadInfo, startDownload, showDownloadWidget, cancelDownload } =
    useDownload()
  const {
    qgoLinks: cachedQgoLinks,
    qgoDownloadStats: cachedQgoStats,
    qgoLoading,
    fetchQgoLinks,
    fetchDownloadUrl
  } = useGames()
  const toast = useToast()

  // Check if user has QGO access (case-insensitive)
  const hasQgoAccess = accessTypes.some((t) => t.toLowerCase() === 'qgo')

  const [qgoLinks, setQgoLinks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, _setSearchQuery] = useState('')
  const [sortBy, _setSortBy] = useState('version-desc')

  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [deviceModel, setDeviceModel] = useState(null)

  // Installed QGO detection
  const [installedQgoVersion, setInstalledQgoVersion] = useState(null)
  const [_isCheckingInstalled, setIsCheckingInstalled] = useState(false)

  // Downloaded files tracking
  const [downloadedFiles, setDownloadedFiles] = useState({}) // { version: { exists, path, size } }

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { item, fileName }

  // Install state
  const [confirmInstall, setConfirmInstall] = useState(null)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState({
    step: '',
    percent: 0,
    detail: '',
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0
  })

  // Confirmation modals for destructive actions
  const [clearDataConfirm, setClearDataConfirm] = useState(false)
  const [uninstallConfirm, setUninstallConfirm] = useState(false)

  // Auto-close download modal when download actually starts (status changes to 'downloading')
  useEffect(() => {
    if (showDownloadModal && downloadInfo.status === 'downloading') {
      setShowDownloadModal(false)
    }
  }, [downloadInfo.status, showDownloadModal])

  // Download stats from Firebase
  const [downloadStats, setDownloadStats] = useState({
    total: 0,
    byVersion: {} // { version: count }
  })

  // QGO package name pattern

  // Extract version from description string (e.g., "Quest Games Optimizer v13.0.4" -> "13.0.4")
  const extractVersion = (description) => {
    if (!description) return null
    const match = description.match(/v(\d+\.\d+\.\d+)/i)
    return match ? match[1] : null
  }

  // Compare semver versions
  const compareSemver = (a, b) => {
    if (!a && !b) return 0
    if (!a) return -1
    if (!b) return 1

    const pa = String(a)
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
    const pb = String(b)
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
    const len = Math.max(pa.length, pb.length)

    for (let i = 0; i < len; i++) {
      const va = pa[i] || 0
      const vb = pb[i] || 0
      if (va !== vb) return va - vb
    }
    return 0
  }

  // Use cached data from GamesContext, or fetch if needed
  useEffect(() => {
    if (cachedQgoLinks.length > 0) {
      setQgoLinks(cachedQgoLinks)
      setDownloadStats(cachedQgoStats)
      setIsLoading(false)
    } else if (!qgoLoading) {
      // Fetch if not already loading and no cached data
      setIsLoading(true)
      fetchQgoLinks()
        .then((result) => {
          if (result) {
            setQgoLinks(result.links || [])
            setDownloadStats(result.stats || { total: 0, byVersion: {} })
          }
          setIsLoading(false)
        })
        .catch((err) => {
          console.error('Error fetching QGO:', err)
          setError(err.message)
          setIsLoading(false)
        })
    }
  }, [cachedQgoLinks, cachedQgoStats, qgoLoading, fetchQgoLinks])

  // Sync loading state with context
  useEffect(() => {
    if (qgoLoading && qgoLinks.length === 0) {
      setIsLoading(true)
    }
  }, [qgoLoading, qgoLinks.length])

  // Refresh QGO data (manual refresh button)
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchQgoLinks(true) // force refresh
      if (result) {
        setQgoLinks(result.links || [])
        setDownloadStats(result.stats || { total: 0, byVersion: {} })
      }
    } catch (err) {
      console.error('Error refreshing QGO:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [fetchQgoLinks])

  // Install progress listener
  useEffect(() => {
    const removeInstallListener = window.api.onInstallApkProgress?.((progress) => {
      setInstallProgress({
        step: progress.step || '',
        percent: progress.percent || 0,
        detail: progress.detail || '',
        downloadedBytes: progress.downloadedBytes || 0,
        totalBytes: progress.totalBytes || 0,
        speed: progress.speed || 0
      })
    })

    return () => {
      removeInstallListener?.()
    }
  }, [])

  // Check which QGO files are already downloaded
  useEffect(() => {
    const checkDownloadedFiles = async () => {
      if (qgoLinks.length === 0) return

      // Generate file names for all versions
      const fileNames = qgoLinks.map((item) => {
        const version = extractVersion(item.description)
        return version ? `QuestGamesOptimizer_v${version}.apk` : 'QuestGamesOptimizer.apk'
      })

      try {
        const result = await window.api.checkDownloadedFiles(fileNames)
        if (result.success) {
          // Convert to version-keyed object
          const versionMap = {}
          qgoLinks.forEach((item) => {
            const version = extractVersion(item.description)
            const fileName = version
              ? `QuestGamesOptimizer_v${version}.apk`
              : 'QuestGamesOptimizer.apk'
            if (result.downloadedFiles[fileName]) {
              versionMap[version || 'unknown'] = result.downloadedFiles[fileName]
            }
          })
          setDownloadedFiles(versionMap)
        }
      } catch (err) {
        console.error('Failed to check downloaded files:', err)
      }
    }

    checkDownloadedFiles()
  }, [qgoLinks])

  // Check if QGO is installed on device
  useEffect(() => {
    const checkInstalledQgo = async () => {
      if (!selectedDevice) {
        setInstalledQgoVersion(null)
        return
      }

      setIsCheckingInstalled(true)
      try {
        const apps = await window.api.listApps(selectedDevice)

        // Find QGO app by package name pattern
        const qgoApp = apps.find((app) => {
          const pkgLower = (app.package || '').toLowerCase()
          const nameLower = (app.name || '').toLowerCase()
          return QGO_PACKAGE_PATTERNS.some(
            (pattern) => pkgLower.includes(pattern) || nameLower.includes(pattern)
          )
        })

        if (qgoApp) {
          // Extract version from app info
          // App version might be in version, versionName, or we extract from name
          const version =
            qgoApp.version || qgoApp.versionName || extractVersion(qgoApp.name) || null
          setInstalledQgoVersion(version)
        } else {
          setInstalledQgoVersion(null)
        }
      } catch (err) {
        console.error('Failed to check installed QGO:', err)
        setInstalledQgoVersion(null)
      } finally {
        setIsCheckingInstalled(false)
      }
    }

    checkInstalledQgo()
  }, [selectedDevice, installing]) // Re-check after install completes

  // Fetch device model when selectedDevice changes
  useEffect(() => {
    const fetchDeviceModel = async () => {
      if (!selectedDevice) {
        setDeviceModel(null)
        return
      }
      try {
        const devices = await window.api.listDevices()
        const device = devices.find((d) => d.serial === selectedDevice)
        setDeviceModel(device?.model || selectedDevice)
      } catch (err) {
        console.error('Failed to get device model:', err)
        setDeviceModel(selectedDevice)
      }
    }
    fetchDeviceModel()
  }, [selectedDevice])

  // Check if a specific version is installed
  const isVersionInstalled = (itemVersion) => {
    if (!installedQgoVersion) return false
    // Direct match
    if (installedQgoVersion === itemVersion) return true
    // Try without leading zeros or spaces
    const normalizeVersion = (v) => v?.replace(/^0+/, '').trim()
    return normalizeVersion(installedQgoVersion) === normalizeVersion(itemVersion)
  }

  // Check if ANY version of QGO is installed (for showing uninstall on any item)
  const _isAnyQgoInstalled = () => {
    return installedQgoVersion !== null
  }

  // Check if a specific version is downloaded locally
  const isVersionDownloaded = (itemVersion) => {
    const fileName = itemVersion
      ? `QuestGamesOptimizer_v${itemVersion}.apk`
      : 'QuestGamesOptimizer.apk'

    // If THIS specific file is currently downloading, it is NOT fully downloaded.
    if (isDownloading && downloadInfo?.fileName === fileName) {
      return false
    }

    return downloadedFiles[itemVersion]?.exists === true
  }

  // Get downloaded file info for a version
  const getDownloadedFileInfo = (itemVersion) => {
    return downloadedFiles[itemVersion] || null
  }

  // Sort QGO links
  const sortedLinks = [...qgoLinks].sort((a, b) => {
    const versionA = extractVersion(a.description)
    const versionB = extractVersion(b.description)

    if (sortBy === 'version-desc') {
      return -compareSemver(versionA, versionB)
    }
    if (sortBy === 'version-asc') {
      return compareSemver(versionA, versionB)
    }
    // For date sorting, fallback to version since we don't have date field
    if (sortBy === 'date-new') {
      return -compareSemver(versionA, versionB)
    }
    if (sortBy === 'date-old') {
      return compareSemver(versionA, versionB)
    }
    return 0
  })

  // Filter by search query
  const filteredLinks = sortedLinks.filter((item) => {
    if (!searchQuery.trim()) return true

    const q = searchQuery.toLowerCase()
    const description = (item.description || '').toLowerCase()

    return description.includes(q)
  })

  // Find highest version
  const maxVersion = qgoLinks.reduce((max, item) => {
    const version = extractVersion(item.description)
    if (!max) return version
    return compareSemver(version, max) > 0 ? version : max
  }, null)

  // Update QGO download count via API
  const updateQgoDownloadCount = async (version) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/qgo/download-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })

      const result = await response.json()

      if (!(response.ok && result.success)) {
        console.error('[QGO] Failed to update download count:', result)
      }
    } catch (error) {
      console.error('[QGO] Failed to update download count:', error)
      // Don't show error to user - download count update is non-critical
    }
  }

  // Update QGO file size via API (only if not already set)
  const updateQgoFileSize = async (version, fileSize) => {
    if (!version || !fileSize || fileSize <= 0) return

    try {
      const response = await apiFetch('/api/v1/game-size', {
        method: 'POST',
        body: JSON.stringify({
          type: 'qgo',
          identifier: version,
          fileSize
        })
      })

      const result = await response.json()

      if (!(response.ok && result.success)) {
        console.error('[QGO] Failed to update file size:', result)
      }
    } catch (error) {
      console.error('[QGO] Failed to update file size:', error)
      // Don't show error to user - file size update is non-critical
    }
  }

  const handleDownload = useCallback(
    async (item) => {
      if (!item) return

      const version = extractVersion(item.description)
      const fileName = version ? `QuestGamesOptimizer_v${version}.apk` : 'QuestGamesOptimizer.apk'
      const gameTitle = item.description || 'Quest Games Optimizer'

      setShowDownloadModal(true)

      // Fetch secure URL from server instead of using item.url (which is now stripped)
      let url
      try {
        const result = await fetchDownloadUrl(version, user?.email, 'qgo')
        url =
          result.downloadUrl || (Array.isArray(result.linkDownload) ? result.linkDownload[0] : null)
      } catch (err) {
        setShowDownloadModal(false)
        toast.error(err.message || 'Gagal mengambil link download.')
        return
      }

      if (!url) {
        setShowDownloadModal(false)
        toast.error('Tidak ada link download untuk versi ini.')
        return
      }

      const result = await startDownload(url, fileName, gameTitle, version)

      if (result.queued) {
        setShowDownloadModal(false)
        toast.success(
          `${gameTitle} ${t('queued_for_download') || 'ditambahkan ke antrian unduhan'}`
        )
        return
      }

      if (result.success) {
        setShowDownloadModal(false)
        // Update downloaded files state
        setDownloadedFiles((prev) => ({
          ...prev,
          [version || 'unknown']: { exists: true, path: result.filePath }
        }))
        // Update download count to Firebase
        await updateQgoDownloadCount(version)
        // Update file size to database (only if not already set)
        if (downloadInfo.totalBytes > 0) {
          await updateQgoFileSize(version, downloadInfo.totalBytes)
        }
        // Refresh download stats to show updated count
        await handleRefresh()
      } else if (result.canceled) {
        setShowDownloadModal(false)
      } else if (result.error) {
        setShowDownloadModal(false)
        toast.error(`${t('qgo_download_failed') || 'Download failed:'} ${result.error}`)
      }
    },
    [t, startDownload, downloadInfo.totalBytes, handleRefresh, toast, fetchDownloadUrl, user]
  )

  // Handle deep link download from website
  useEffect(() => {
    if (pendingDeepLinkDownload && pendingDeepLinkDownload.game && qgoLinks.length > 0) {
      const matchingItem = qgoLinks.find((item) => {
        const itemVersion = extractVersion(item.description)
        return itemVersion === pendingDeepLinkDownload.version
      })

      if (matchingItem) {
        handleDownload(matchingItem)
        if (onDeepLinkProcessed) {
          onDeepLinkProcessed()
        }
      } else {
        const latestItem = qgoLinks.find((item) => {
          const itemVersion = extractVersion(item.description)
          return itemVersion === maxVersion
        })
        if (latestItem) {
          handleDownload(latestItem)
        }
        if (onDeepLinkProcessed) {
          onDeepLinkProcessed()
        }
      }
    }
  }, [pendingDeepLinkDownload, qgoLinks, maxVersion, onDeepLinkProcessed, handleDownload])

  // Handle delete downloaded file — opens custom confirm modal
  const handleDeleteFile = (item) => {
    const version = extractVersion(item.description)
    const fileName = version ? `QuestGamesOptimizer_v${version}.apk` : 'QuestGamesOptimizer.apk'
    setDeleteConfirm({ item, fileName, version })
  }

  // Called when user confirms deletion inside the modal
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    const { fileName, version } = deleteConfirm
    setDeleteConfirm(null)
    try {
      const result = await window.api.deleteDownloadedFile(fileName)
      if (result.success) {
        setDownloadedFiles((prev) => {
          const updated = { ...prev }
          delete updated[version || 'unknown']
          return updated
        })
        toast.success(t('qgo_delete_file_success') || 'File deleted successfully')
      } else {
        toast.error(`${t('qgo_delete_file_failed') || 'Failed to delete file:'} ${result.error}`)
      }
    } catch (err) {
      toast.error(`${t('qgo_delete_file_failed') || 'Failed to delete file:'} ${err.message}`)
    }
  }

  // Handle install from local file
  const handleInstallLocal = async (item) => {
    const version = extractVersion(item.description)
    const fileInfo = getDownloadedFileInfo(version)

    if (!fileInfo?.path || !selectedDevice) return

    setInstalling(true)
    setInstallProgress({
      step: 'PREPARING',
      percent: 0,
      detail: t('qgo_preparing') || 'Preparing...',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })

    try {
      // Check if a different version of QGO is already installed
      if (installedQgoVersion && installedQgoVersion !== version) {
        setInstallProgress({
          step: 'UNINSTALLING',
          percent: 10,
          detail: t('qgo_uninstalling_old') || 'Uninstalling previous version...',
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0
        })

        // Find and uninstall existing QGO
        const apps = await window.api.listApps(selectedDevice)
        const qgoApp = apps.find((app) => {
          const pkgLower = (app.package || '').toLowerCase()
          const nameLower = (app.name || '').toLowerCase()
          return QGO_PACKAGE_PATTERNS.some(
            (pattern) => pkgLower.includes(pattern) || nameLower.includes(pattern)
          )
        })

        if (qgoApp) {
          const uninstallResult = await window.api.uninstallApp(selectedDevice, qgoApp.package)
          if (!uninstallResult.success) {
            throw new Error(uninstallResult.message || 'Failed to uninstall previous version')
          }
        }
      }

      setInstallProgress({
        step: 'INSTALLING',
        percent: 30,
        detail: t('installing') || 'Installing...',
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0
      })

      const result = await window.api.installLocalApk(fileInfo.path, selectedDevice)

      if (result.success) {
        setInstalling(false)
        setInstallProgress({
          step: '',
          percent: 0,
          detail: '',
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0
        })
        setInstalledQgoVersion(version)
        toast.success(
          `${t('install_success') || 'Installation complete!'} Quest Games Optimizer v${version}`
        )

        // Auto-delete APK file after successful install to avoid clutter
        try {
          const fileName = version ? `QuestGamesOptimizer_v${version}.apk` : 'QuestGamesOptimizer.apk'
          await window.api.deleteDownloadedFile(fileName)
          setDownloadedFiles((prev) => {
            const updated = { ...prev }
            delete updated[version || 'unknown']
            return updated
          })
        } catch (_) {
          // Non-critical — ignore if delete fails
        }
      } else {
        setInstalling(false)
        setInstallProgress({
          step: '',
          percent: 0,
          detail: '',
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0
        })
        toast.error(
          `${t('install_failed') || 'Installation failed:'} ${result.error || 'Unknown error'}`
        )
      }
    } catch (error) {
      console.error('Install local error:', error)
      setInstalling(false)
      setInstallProgress({
        step: '',
        percent: 0,
        detail: '',
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0
      })
      toast.error(`${t('install_failed') || 'Installation failed:'} ${error.message}`)
    }
  }

  // Handle minimize download modal to background widget
  const handleMinimizeDownload = () => {
    setShowDownloadModal(false)
    showDownloadWidget()
  }

  // Handle install button click
  const _handleInstall = (item) => {
    setConfirmInstall(item)
  }

  // Handle confirm install
  const handleConfirmInstall = async () => {
    if (!confirmInstall?.url || !selectedDevice) return

    setInstalling(true)
    setInstallProgress({
      step: 'DOWNLOADING',
      percent: 0,
      detail: t('qgo_preparing') || 'Preparing...',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })

    try {
      const version = extractVersion(confirmInstall.description)
      const fileName = version ? `QuestGamesOptimizer_v${version}.apk` : 'QuestGamesOptimizer.apk'

      // Fetch secure URL from server instead of using confirmInstall.url
      let url
      try {
        const result = await fetchDownloadUrl(version, user?.email, 'qgo')
        url =
          result.downloadUrl || (Array.isArray(result.linkDownload) ? result.linkDownload[0] : null)
      } catch (err) {
        throw new Error(err.message || 'Gagal mengambil link download.')
      }

      if (!url) {
        throw new Error('Tidak ada link download untuk versi ini.')
      }

      const result = await window.api.downloadAndInstallApk(url, fileName, selectedDevice)

      if (result.success) {
        setConfirmInstall(null)
        setInstalling(false)
        setInstallProgress({
          step: '',
          percent: 0,
          detail: '',
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0
        })
        // Update installed version
        setInstalledQgoVersion(version)
        toast.success(`${t('install_success') || 'Installation complete!'} Quest Games Optimizer`)
      } else {
        setInstalling(false)
        setInstallProgress({
          step: '',
          percent: 0,
          detail: '',
          downloadedBytes: 0,
          totalBytes: 0,
          speed: 0
        })
        toast.error(
          `${t('install_failed') || 'Installation failed:'} ${result.error || 'Unknown error'}`
        )
        setConfirmInstall(null)
      }
    } catch (error) {
      console.error('Install error:', error)
      setInstalling(false)
      setInstallProgress({
        step: '',
        percent: 0,
        detail: '',
        downloadedBytes: 0,
        totalBytes: 0,
        speed: 0
      })
      toast.error(`${t('install_failed') || 'Installation failed:'} ${error.message}`)
      setConfirmInstall(null)
    }
  }

  // Handle uninstall QGO
  const handleUninstall = async () => {
    if (!selectedDevice) return

    try {
      const apps = await window.api.listApps(selectedDevice)
      const qgoApp = apps.find((app) => {
        const pkgLower = (app.package || '').toLowerCase()
        const nameLower = (app.name || '').toLowerCase()
        return QGO_PACKAGE_PATTERNS.some(
          (pattern) => pkgLower.includes(pattern) || nameLower.includes(pattern)
        )
      })

      if (!qgoApp) {
        toast.error(t('qgo_not_found') || 'QGO not found on device')
        setInstalledQgoVersion(null)
        return
      }

      const result = await window.api.uninstallApp(selectedDevice, qgoApp.package)

      if (result.success) {
        setInstalledQgoVersion(null)
        toast.success(
          t('qgo_uninstall_success') || 'Quest Games Optimizer uninstalled successfully'
        )
      } else {
        toast.error(`${t('qgo_uninstall_failed') || 'Uninstall failed:'} ${result.message}`)
      }
    } catch (err) {
      console.error('Uninstall error:', err)
      toast.error(`${t('qgo_uninstall_failed') || 'Uninstall failed:'} ${err.message}`)
    }
  }

  const handleClearQgoData = async () => {
    if (!selectedDevice) return

    try {
      const apps = await window.api.listApps(selectedDevice)
      const qgoApp = apps.find((app) => {
        const pkgLower = (app.package || '').toLowerCase()
        const nameLower = (app.name || '').toLowerCase()
        return QGO_PACKAGE_PATTERNS.some(
          (pattern) => pkgLower.includes(pattern) || nameLower.includes(pattern)
        )
      })

      if (!qgoApp) {
        toast.error(t('qgo_not_found') || 'QGO not found on device')
        return
      }

      const result = await window.api.clearAppData(selectedDevice, qgoApp.package)

      if (result.success) {
        toast.success(t('qgo_clear_data_success') || 'QGO data cleared successfully')
      } else {
        toast.error(`${t('qgo_clear_data_failed') || 'Failed to clear QGO data:'} ${result.message}`)
      }
    } catch (err) {
      console.error('Clear QGO data error:', err)
      toast.error(`${t('qgo_clear_data_failed') || 'Failed to clear QGO data:'} ${err.message}`)
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format speed (bytes per second to human readable)
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format ETA (remaining seconds to h m s format based on language)
  const formatEta = (remainingBytes, speed) => {
    if (!speed || speed === 0 || !remainingBytes) return '--'
    const seconds = Math.ceil(remainingBytes / speed)

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    // Get language-specific labels
    const isIndonesian = t('language_code') === 'id' || t('qgo_download') === 'Unduh'
    const hLabel = isIndonesian ? 'j' : 'h'
    const mLabel = isIndonesian ? 'm' : 'm'
    const sLabel = isIndonesian ? 'd' : 's'

    if (hours > 0) {
      return `${hours}${hLabel} ${minutes}${mLabel} ${secs}${sLabel}`
    } else if (minutes > 0) {
      return `${minutes}${mLabel} ${secs}${sLabel}`
    } else {
      return `${secs}${sLabel}`
    }
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-gray-100 dark:bg-white/5 p-6">
          <Icon icon="mdi:account-alert" className="h-12 w-12 text-gray-400 dark:text-white/40" />
        </div>
        <h2 className="text-xl font-bold text-gray-600 dark:text-white/70">
          {t('qgo_login_required') || 'Login Required'}
        </h2>
        <p className="max-w-md text-sm text-gray-500 dark:text-white/50">
          {t('qgo_login_desc') || 'Please login to access Quest Games Optimizer'}
        </p>
      </div>
    )
  }

  // Check if user has QGO access
  if (!hasQgoAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-full bg-red-500/10 p-6">
          <Icon icon="mdi:lock-outline" className="h-12 w-12 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-600 dark:text-white/70">
          {t('qgo_no_access_title') || 'Access Restricted'}
        </h2>
        <p className="max-w-md text-sm text-gray-500 dark:text-white/50">
          {t('qgo_no_access_desc') ||
            'You do not have access to Quest Games Optimizer. Please contact support if you believe this is an error.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0081FB]/10">
              <Icon icon="mdi:tune-variant" className="h-5 w-5 text-[#0081FB]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('qgo_title') || 'Quest Games Optimizer'}
                </h2>
                {installedQgoVersion && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Icon icon="mdi:check-circle" className="h-3 w-3" />v{installedQgoVersion}{' '}
                    {t('installed') || 'Installed'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {isLoading
                  ? t('qgo_loading') || 'Loading...'
                  : `${filteredLinks.length} ${t('qgo_versions') || 'versions available'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasQgoAccess && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[#0081FB]/10 px-3 py-2 text-sm text-[#0081FB]">
                <Icon icon="mdi:email-outline" className="h-4 w-4" />
                <span className="text-xs">
                  Email: <strong>hypertopiaqgo@gmail.com</strong>
                </span>
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 text-sm text-gray-500 dark:text-white/70 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              <Icon
                icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{t('refresh_btn') || 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QGO List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
            <p className="mt-4 text-sm text-gray-500 dark:text-white/50">
              {t('qgo_loading') || 'Loading...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('qgo_error') || 'Failed to load QGO'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#0081FB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0081FB]/80"
            >
              <Icon icon="mdi:refresh" className="h-4 w-4" />
              {t('qgo_retry') || 'Retry'}
            </button>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon
                icon="mdi:file-search-outline"
                className="h-8 w-8 text-gray-300 dark:text-white/30"
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {searchQuery
                ? t('search_no_results') || 'No results found'
                : t('qgo_empty') || 'No QGO versions available'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((item, index) => {
              const version = extractVersion(item.description)
              const isNewest = version === maxVersion

              return (
                <div
                  key={item.url || index}
                  className={`group relative overflow-hidden rounded-xl border transition-colors p-4 ${
                    isNewest
                      ? 'border-[#0081FB]/30 bg-[#0081FB]/[0.04] dark:bg-[#0081FB]/[0.07]'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f0f] hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  {/* Top accent strip for latest version */}
                  {isNewest && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0081FB] to-[#00C2FF]" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0081FB]/20 to-[#00C2FF]/10">
                          <Icon icon="mdi:android" className="h-6 w-6 text-[#0081FB]" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {item.description || 'Quest Games Optimizer'}
                            </h3>
                            {/* Latest badge */}
                            {isNewest && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF] px-2 py-0.5 text-[10px] font-bold text-white">
                                {t('qgo_latest') || 'LATEST'}
                              </span>
                            )}
                            {/* Installed badge */}
                            {isVersionInstalled(version) && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                <Icon icon="mdi:check-circle" className="h-3 w-3" />
                                {t('installed') || 'Installed'}
                              </span>
                            )}
                            {/* Downloaded badge */}
                            {!isVersionInstalled(version) && isVersionDownloaded(version) && (
                              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                <Icon icon="mdi:check-circle" className="h-3 w-3" />
                                {t('downloaded') || 'Downloaded'}
                              </span>
                            )}
                          </div>
                          {version && (
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-white/50">
                              <div className="flex items-center gap-1">
                                <Icon icon="mdi:tag" className="h-3 w-3" />
                                <span>v{version}</span>
                              </div>
                              <span className="text-gray-400 dark:text-white/30">•</span>
                              <div className="flex items-center gap-1">
                                <Icon icon="mdi:download" className="h-3 w-3" />
                                <span>
                                  {(downloadStats.byVersion[version] || 0).toLocaleString()}{' '}
                                  {t('downloads') || 'downloads'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Button logic based on state */}
                      {isVersionDownloaded(version) ? (
                        <>
                          {/* Delete File button - shown when file is downloaded */}
                          <button
                            onClick={() => handleDeleteFile(item)}
                            disabled={isDownloading || installing}
                            className="flex-shrink-0 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            <Icon icon="mdi:file-remove" className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {t('delete_file') || 'Delete File'}
                            </span>
                          </button>

                          {/* Install/Uninstall button */}
                          {isVersionInstalled(version) ? (
                            // Uninstall App button for installed version - only enabled if device connected
                            <>
                              {/* Reset Data button - fixes game profiles not showing after patch */}
                              <button
                                onClick={() => setClearDataConfirm(true)}
                                disabled={!selectedDevice || isDownloading || installing}
                                title={
                                  !selectedDevice
                                    ? t('connect_device_first') || 'Connect a device first'
                                    : ''
                                }
                                className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  selectedDevice
                                    ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:scale-105 disabled:opacity-50'
                                    : 'bg-gray-600 opacity-50'
                                }`}
                              >
                                <Icon icon="mdi:broom" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('qgo_clear_data') || 'Reset Data'}
                                </span>
                              </button>
                              <button
                                onClick={() => setUninstallConfirm(true)}
                                disabled={!selectedDevice || isDownloading || installing}
                                title={
                                  !selectedDevice
                                    ? t('connect_device_first') || 'Connect a device first'
                                    : ''
                                }
                                className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  selectedDevice
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 hover:scale-105 disabled:opacity-50'
                                    : 'bg-gray-600 opacity-50'
                                }`}
                              >
                                <Icon icon="mdi:delete" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('uninstall_app') || 'Uninstall App'}
                                </span>
                              </button>
                            </>
                          ) : (
                            // Install / Update button
                            (() => {
                              const isUpdate = installedQgoVersion &&
                                compareSemver(version, installedQgoVersion) > 0
                              return (
                                <button
                                  onClick={() => selectedDevice && handleInstallLocal(item)}
                                  disabled={!selectedDevice || isDownloading || installing}
                                  title={
                                    !selectedDevice
                                      ? t('connect_device_first') || 'Connect a device first'
                                      : ''
                                  }
                                  className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                    selectedDevice
                                      ? isUpdate
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:scale-105 disabled:opacity-50'
                                        : 'bg-gradient-to-r from-emerald-600 to-green-500 hover:scale-105 disabled:opacity-50'
                                      : 'bg-gray-600 opacity-50'
                                  }`}
                                >
                                  <Icon icon={isUpdate ? 'mdi:update' : 'mdi:package-down'} className="h-4 w-4" />
                                  <span className="hidden sm:inline">
                                    {isUpdate ? (t('qgo_update') || 'Update') : (t('install') || 'Install')}
                                  </span>
                                </button>
                              )
                            })()
                          )}
                        </>
                      ) : (
                        <>
                          {/* Download button - shown when file is not downloaded */}
                          <button
                            onClick={() => handleDownload(item)}
                            disabled={isDownloading || installing}
                            className="flex-shrink-0 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0081FB] to-[#00C2FF] px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            <Icon icon="mdi:download" className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {t('qgo_download') || 'Download'}
                            </span>
                          </button>

                          {/* Uninstall App button - show if this version is installed but file deleted */}
                          {isVersionInstalled(version) && (
                            <>
                              {/* Reset Data button */}
                              <button
                                onClick={() => setClearDataConfirm(true)}
                                disabled={!selectedDevice || isDownloading || installing}
                                title={
                                  !selectedDevice
                                    ? t('connect_device_first') || 'Connect a device first'
                                    : ''
                                }
                                className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  selectedDevice
                                    ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:scale-105 disabled:opacity-50'
                                    : 'bg-gray-600 opacity-50'
                                }`}
                              >
                                <Icon icon="mdi:broom" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('qgo_clear_data') || 'Reset Data'}
                                </span>
                              </button>
                              <button
                                onClick={() => setUninstallConfirm(true)}
                                disabled={!selectedDevice || isDownloading || installing}
                                title={
                                  !selectedDevice
                                    ? t('connect_device_first') || 'Connect a device first'
                                    : ''
                                }
                                className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                  selectedDevice
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-400 hover:scale-105 disabled:opacity-50'
                                    : 'bg-gray-600 opacity-50'
                                }`}
                              >
                                <Icon icon="mdi:delete" className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t('uninstall_app') || 'Uninstall App'}
                                </span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Download Progress Modal */}
      <AnimatePresence mode="wait">
        {showDownloadModal && isDownloading && (
          <motion.div
            key="download-progress-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('qgo_downloading') || 'Downloading...'}
                </h3>
                <button
                  onClick={handleMinimizeDownload}
                  className="rounded-lg p-1 text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title={t('minimize_to_background') || 'Minimize to background'}
                >
                  <Icon icon="material-symbols:close-fullscreen-rounded" className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
                {downloadInfo.fileName || downloadInfo.gameTitle || 'Quest Games Optimizer'}
              </p>

              {/* Progress Bar - Only show when downloading */}
              {downloadInfo.status === 'downloading' && downloadInfo.totalBytes > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
                    <span>
                      {formatBytes(downloadInfo.downloadedBytes)} /{' '}
                      {formatBytes(downloadInfo.totalBytes)}
                    </span>
                    <span>{Math.round(downloadInfo.progress)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                      style={{ width: `${downloadInfo.progress}%` }}
                    />
                  </div>

                  {/* Speed and ETA */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:speedometer" className="h-3 w-3" />
                      {formatSpeed(downloadInfo.speed)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:clock-outline" className="h-3 w-3" />
                      {t('qgo_eta') || 'ETA'}:{' '}
                      {formatEta(
                        downloadInfo.totalBytes - downloadInfo.downloadedBytes,
                        downloadInfo.speed
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-center py-4">
                  <Icon icon="mdi:loading" className="h-8 w-8 animate-spin text-[#0081FB]" />
                </div>
              )}

              {/* Download Info */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-white/70">
                <Icon icon="mdi:download" className="h-5 w-5 animate-pulse text-[#0081FB]" />
                <span>
                  {downloadInfo.status === 'preparing'
                    ? t('qgo_preparing') || 'Preparing download...'
                    : t('qgo_downloading_msg') || 'Downloading, please wait...'}
                </span>
              </div>

              {/* Minimize hint */}
              <p className="mt-4 text-center text-xs text-gray-400 dark:text-white/40">
                {t('download_minimize_hint') ||
                  'Click the arrow to minimize and continue in background'}
              </p>

              {/* Cancel Download Button */}
              <button
                onClick={async () => {
                  await cancelDownload()
                  setShowDownloadModal(false)
                  toast.info(t('download_cancelled') || 'Download Cancelled')
                }}
                className="mt-3 w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:close-circle" className="w-4 h-4" />
                {t('cancel_download') || 'Cancel Download'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Confirmation Modal */}
      <AnimatePresence mode="wait">
        {confirmInstall && !installing && (
          <motion.div
            key="confirm-install-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('install_confirm_title') || 'Download & Install'}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
                {t('install_confirm_desc') ||
                  'This will download and install the APK directly to your Meta Quest device:'}
              </p>
              <div className="mt-4 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  {confirmInstall.description || 'Quest Games Optimizer'}
                </p>
                {extractVersion(confirmInstall.description) && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                    {t('qgo_version') || 'Version'}: v{extractVersion(confirmInstall.description)}
                  </p>
                )}
                <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                  <Icon icon="bi:headset-vr" className="w-3 h-3" />
                  {t('connected_device') || 'Device'}: {deviceModel || selectedDevice}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmInstall(null)}
                  className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-500 dark:text-white/70 transition-all hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmInstall}
                  className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
                >
                  {t('install') || 'Install'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Progress Modal */}
      <AnimatePresence mode="wait">
        {installing && (
          <motion.div
            key="install-progress-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {installProgress.step === 'DOWNLOADING'
                  ? t('qgo_downloading') || 'Downloading...'
                  : installProgress.step === 'INSTALLING'
                    ? t('installing') || 'Installing...'
                    : installProgress.step === 'COMPLETED'
                      ? t('install_success') || 'Installation Complete!'
                      : t('qgo_preparing') || 'Preparing...'}
              </h3>

              <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
                {confirmInstall?.description || 'Quest Games Optimizer'}
              </p>

              {/* Progress */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
                  <span>{installProgress.detail}</span>
                  <span>{Math.round(installProgress.percent)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${installProgress.percent}%` }}
                  />
                </div>

                {/* Speed and progress info for download phase */}
                {installProgress.step === 'DOWNLOADING' && installProgress.totalBytes > 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:speedometer" className="h-3 w-3" />
                      {formatSpeed(installProgress.speed)}
                    </span>
                    <span>
                      {formatBytes(installProgress.downloadedBytes)} /{' '}
                      {formatBytes(installProgress.totalBytes)}
                    </span>
                  </div>
                )}
              </div>

              {/* Status info */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-white/70">
                {installProgress.step === 'COMPLETED' ? (
                  <>
                    <Icon icon="mdi:check-circle" className="h-5 w-5 text-green-500" />
                    <span>{t('install_success') || 'Installation complete!'}</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:loading" className="h-5 w-5 animate-spin text-green-500" />
                    <span>
                      {installProgress.step === 'DOWNLOADING'
                        ? t('qgo_downloading_msg') || 'Downloading, please wait...'
                        : t('installing_msg') || 'Installing to device...'}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reset Data confirmation modal */}
        {clearDataConfirm && (
          <motion.div
            key="clear-data-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setClearDataConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500/10">
                <Icon icon="mdi:broom" className="h-7 w-7 text-yellow-500" />
              </div>
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('qgo_clear_data') || 'Reset Data'}
              </h3>
              <p className="text-center text-sm text-gray-500 dark:text-white/50 mb-6">
                {t('qgo_confirm_clear_data') || 'Clear all QGO app data on device? This resets all settings and fixes the issue where game profiles don\'t show.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setClearDataConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-2.5 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  {t('cancel') || 'Batal'}
                </button>
                <button
                  onClick={() => { setClearDataConfirm(false); handleClearQgoData() }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-500 hover:brightness-110 py-2.5 text-sm font-semibold text-white transition-all"
                >
                  {t('qgo_clear_data') || 'Reset Data'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Uninstall confirmation modal */}
        {uninstallConfirm && (
          <motion.div
            key="uninstall-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setUninstallConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
                <Icon icon="mdi:delete-outline" className="h-7 w-7 text-orange-500" />
              </div>
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('uninstall_app') || 'Hapus Instalasi'}
              </h3>
              <p className="text-center text-sm text-gray-500 dark:text-white/50 mb-6">
                {t('qgo_confirm_uninstall') || 'Are you sure you want to uninstall Quest Games Optimizer from device?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUninstallConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-2.5 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  {t('cancel') || 'Batal'}
                </button>
                <button
                  onClick={() => { setUninstallConfirm(false); handleUninstall() }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 hover:brightness-110 py-2.5 text-sm font-semibold text-white transition-all"
                >
                  {t('uninstall_app') || 'Hapus Instalasi'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete file confirmation modal */}
        {deleteConfirm && (
          <motion.div
            key="delete-confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#111] p-6 border border-gray-200 dark:border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
                <Icon icon="mdi:delete-outline" className="h-7 w-7 text-red-500" />
              </div>

              {/* Title */}
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('qgo_delete_file_title') || 'Hapus File?'}
              </h3>

              {/* Message */}
              <p className="text-center text-sm text-gray-500 dark:text-white/50 mb-1">
                {t('qgo_confirm_delete_file') || 'Apakah kamu yakin ingin menghapus file ini?'}
              </p>
              <p className="text-center text-xs font-mono text-gray-400 dark:text-white/30 mb-6 truncate px-2">
                {deleteConfirm.fileName}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-2.5 text-sm font-medium text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  {t('cancel') || 'Batal'}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  {t('delete') || 'Hapus'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

QuestGamesOptimizer.propTypes = {
  selectedDevice: PropTypes.string,
  pendingDeepLinkDownload: PropTypes.shape({
    game: PropTypes.string,
    version: PropTypes.string,
    url: PropTypes.string,
    type: PropTypes.string
  }),
  onDeepLinkProcessed: PropTypes.func
}

QuestGamesOptimizer.defaultProps = {
  selectedDevice: null,
  pendingDeepLinkDownload: null,
  onDeepLinkProcessed: null
}
