import { useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useDownload } from '../contexts/DownloadContext'
import { useToast } from '../hooks/useToast'
import coverImages from '../utils/coverImages'

// Firebase Database URL (same as website for game data)
const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'

// HyperTopia API URL
const API_BASE_URL = 'https://api.hypertopia.store'

// Helper function to compare versions (from highest to lowest)
const compareVersions = (versionA, versionB) => {
  const parseVersion = (version) => {
    if (!version) return { major: 0, minor: 0, patch: 0, build: 0 }
    const cleaned = version.replace(/^v/, '')
    const [versionPart, buildPart] = cleaned.split('_')
    const versionNumbers = versionPart.split('.').map((num) => parseInt(num) || 0)
    const buildNumber = parseInt(buildPart) || 0
    return {
      major: versionNumbers[0] || 0,
      minor: versionNumbers[1] || 0,
      patch: versionNumbers[2] || 0,
      build: buildNumber
    }
  }

  const a = parseVersion(versionA)
  const b = parseVersion(versionB)

  if (a.major !== b.major) return b.major - a.major
  if (a.minor !== b.minor) return b.minor - a.minor
  if (a.patch !== b.patch) return b.patch - a.patch
  return b.build - a.build
}

// Format download count
const formatDownloadCount = (count) => {
  if (!count || count === 0) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

// Helper function to get Quest model info
const getQuestInfo = (questKey) => {
  const questMap = {
    supportMetaQuest1: { label: 'Q1', fullName: 'Meta Quest 1' },
    supportMetaQuest2: { label: 'Q2', fullName: 'Meta Quest 2' },
    supportMetaQuest3: { label: 'Q3', fullName: 'Meta Quest 3' },
    supportMetaQuest3S: { label: 'Q3S', fullName: 'Meta Quest 3S' },
    supportMetaQuestPro: { label: 'QP', fullName: 'Meta Quest Pro' }
  }
  return (
    questMap[questKey] || {
      label: questKey.replace('supportMetaQuest', 'Q'),
      fullName: 'Meta ' + questKey.replace('supportMetaQuest', 'Quest ')
    }
  )
}

export default function GameDetailModal({
  isOpen,
  onClose,
  game,
  selectedDevice,
  connectedDevice
}) {
  const { t } = useLanguage()
  const { user, accessTypes } = useAuth()
  const {
    isDownloading,
    downloadInfo,
    downloadComplete,
    startDownload,
    showWidget,
    showDownloadWidget,
    cancelDownload,
    // Install context
    startInstall: startInstallWidget,
    cancelInstall
  } = useDownload()
  const toast = useToast()
  const isEligible = accessTypes.includes('standalone')

  const [coverUrl, setCoverUrl] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState(0)
  const [showVersionSelector, setShowVersionSelector] = useState(false)
  const [showDownloadParts, setShowDownloadParts] = useState(false)
  const [confirmDownload, setConfirmDownload] = useState(null) // For confirmation modal
  const [showDownloadModal, setShowDownloadModal] = useState(false) // For progress modal
  const [deviceModel, setDeviceModel] = useState(null) // Device model name for display
  const [downloadedFiles, setDownloadedFiles] = useState({}) // Track which files are already downloaded
  const [confirmDelete, setConfirmDelete] = useState(null) // For delete confirmation modal

  // Download and install state
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState({
    step: '',
    percent: 0,
    detail: '',
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0
  })
  const [confirmInstall, setConfirmInstall] = useState(null) // For install confirmation modal
  const [showInstallModal, setShowInstallModal] = useState(false) // For install progress modal

  // Safely extract game properties with fallbacks (must be before state that uses them)
  const gameTitle = game?.gameTitle || game?.name || game?.id?.replace(/!/g, '') || 'Unknown Game'
  const gameStatus = game?.gameStatus || ''
  const isSupportedV76 = game?.isSupportedV76 || false
  const versions = useMemo(
    () => (Array.isArray(game?.versions) ? game.versions.filter((v) => v !== null) : []),
    [game?.versions]
  )
  const gameVersion = game?.version || game?.gameVersion || 'v1.0'

  // Compute initial selected version index (newest first) without using setState inside effect
  const initialSelectedVersion = useMemo(() => {
    if (versions.length > 0) {
      const sorted = versions
        .map((version, originalIndex) => ({ ...version, originalIndex }))
        .sort((a, b) => compareVersions(a.version, b.version))
      return sorted[0]?.originalIndex || 0
    }
    return 0
  }, [versions])

  // Local download count state for UI updates
  const [localDownloadCount, setLocalDownloadCount] = useState(game?.downloadCount || 0)
  const [localVersions, setLocalVersions] = useState(versions)

  // Fetch cover image
  useEffect(() => {
    if (!isOpen || !game || !gameTitle) return
    let mounted = true

    const fetchCover = async () => {
      setLoadingImage(true)
      try {
        const url = await coverImages.getCoverUrl(gameTitle)
        if (mounted && url) {
          setCoverUrl(url)
        }
      } catch (err) {
        console.warn('Cover fetch failed:', err)
      }
      if (mounted) setLoadingImage(false)
    }
    fetchCover()
    return () => {
      mounted = false
    }
  }, [isOpen, game, gameTitle])

  // Reset state when game changes
  useEffect(() => {
    if (!game) return
    setSelectedVersion(initialSelectedVersion)
    // Reset other states when game changes
    setCoverUrl(null)
    setLoadingImage(true)
    setShowVersionSelector(false)
    setShowDownloadParts(false)
    setIsInstalling(false)
    setShowInstallModal(false)
    setDownloadedFiles({})
    // Sync local download count with game data
    setLocalDownloadCount(game?.downloadCount || 0)
    setLocalVersions(versions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, initialSelectedVersion])

  // Check which files are already downloaded when modal opens, version changes, or download completes
  useEffect(() => {
    if (!isOpen || !game || !gameTitle) return

    const checkDownloaded = async () => {
      try {
        const currentVer = localVersions[selectedVersion] || {
          version: gameVersion,
          downloadLinks: []
        }
        const version = currentVer.version || gameVersion
        const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

        // Generate file names that would be created for each download link
        const fileNames = downloadLinks.map((_, index) => {
          let fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}`
          if (downloadLinks.length > 1) {
            fileName += `_Part${index + 1}`
          }
          fileName += '.zip'
          return fileName
        })

        if (fileNames.length === 0) {
          setDownloadedFiles({})
          return
        }

        const result = await window.api.checkDownloadedFiles(fileNames)
        if (result.success) {
          setDownloadedFiles(result.downloadedFiles)
        }
      } catch (err) {
        console.warn('Failed to check downloaded files:', err)
      }
    }

    checkDownloaded()
  }, [isOpen, game, gameTitle, selectedVersion, gameVersion, downloadComplete, localVersions])

  // Listen for install progress events
  useEffect(() => {
    if (!window.api?.onInstallApkProgress) return

    const unsubscribe = window.api.onInstallApkProgress((progress) => {
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
      unsubscribe?.()
    }
  }, [])

  // Fetch device model when connectedDevice changes
  useEffect(() => {
    const fetchDeviceModel = async () => {
      if (!connectedDevice) {
        setDeviceModel(null)
        return
      }
      try {
        const devices = await window.api.listDevices()
        const device = devices.find((d) => d.serial === connectedDevice)
        setDeviceModel(device?.model || connectedDevice)
      } catch (err) {
        console.error('Failed to get device model:', err)
        setDeviceModel(connectedDevice)
      }
    }
    fetchDeviceModel()
  }, [connectedDevice])

  // Close version selector on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showVersionSelector && !event.target.closest('.version-selector')) {
        setShowVersionSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showVersionSelector])

  // Early return AFTER all hooks
  if (!game) return null

  // Get current version data
  const getCurrentVersion = () => {
    if (localVersions && localVersions.length > 0) {
      return localVersions[selectedVersion] || localVersions[0]
    }
    return {
      version: gameVersion,
      downloadLinks: game.linkDownload ? [game.linkDownload] : [],
      isSupportedV76: isSupportedV76,
      downloadCount: localDownloadCount || 0
    }
  }

  // Get total download count
  const getTotalDownloadCount = () => {
    if (localVersions && localVersions.length > 0) {
      return localVersions.reduce((total, version) => total + (version?.downloadCount || 0), 0)
    }
    return localDownloadCount || 0
  }

  // Update download count to Firebase (same as website)
  const updateDownloadCount = async (partIndex = null) => {
    try {
      let versionText = ''

      if (localVersions && localVersions.length > 0) {
        // Update version-specific download count
        const currentVersionDownloadCount = localVersions[selectedVersion]?.downloadCount || 0
        const updatedVersionCount = currentVersionDownloadCount + 1

        // Update local state
        const updatedVersions = [...localVersions]
        updatedVersions[selectedVersion] = {
          ...updatedVersions[selectedVersion],
          downloadCount: updatedVersionCount
        }
        setLocalVersions(updatedVersions)

        // Update Firebase - version specific count
        await fetch(
          `${FIREBASE_DB_URL}/vrGames/standalone/${gameTitle}/versions/${selectedVersion}/downloadCount.json`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedVersionCount)
          }
        )

        // Update Firebase - total download count
        const totalDownloadCount = getTotalDownloadCount() + 1
        await fetch(`${FIREBASE_DB_URL}/vrGames/standalone/${gameTitle}/downloadCount.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(totalDownloadCount)
        })

        versionText = localVersions[selectedVersion]?.version || gameVersion
      } else {
        // Single version - just update total count
        const updatedCount = localDownloadCount + 1
        setLocalDownloadCount(updatedCount)

        await fetch(`${FIREBASE_DB_URL}/vrGames/standalone/${gameTitle}/downloadCount.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedCount)
        })

        versionText = gameVersion || 'v1.0'
      }

      // Record download history for user
      if (user) {
        const historyEntry = {
          gameTitle: gameTitle,
          version: versionText,
          downloadDate: new Date().toISOString(),
          source: 'installer', // Mark as downloaded from installer
          ...(partIndex !== null && { partNumber: partIndex + 1 })
        }

        await fetch(`${FIREBASE_DB_URL}/usersData/downloadHistory/${user.uid}/standalone.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historyEntry)
        })
      }

      console.log('[GameDetailModal] Download count updated successfully')
    } catch (error) {
      console.error('[GameDetailModal] Failed to update download count:', error)
      // Don't show error to user - download count update is non-critical
    }
  }

  // Generate file name for a download link
  const getFileName = (partIndex = null) => {
    const currentVer = getCurrentVersion()
    const version = currentVer.version || gameVersion
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    let fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}`
    if (downloadLinks.length > 1 && partIndex !== null) {
      fileName += `_Part${partIndex + 1}`
    }
    fileName += '.zip'
    return fileName
  }

  // Check if a specific file (by part index) is downloaded
  const isFileDownloaded = (partIndex = null) => {
    const fileName = getFileName(partIndex)
    return downloadedFiles[fileName]?.exists || false
  }

  // Check if ALL parts are downloaded (for multi-part games)
  const areAllPartsDownloaded = () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    if (downloadLinks.length === 0) return false
    if (downloadLinks.length === 1) return isFileDownloaded(null)

    return downloadLinks.every((_, index) => isFileDownloaded(index))
  }

  // Check if ANY parts are downloaded (for multi-part games)
  const areAnyPartsDownloaded = () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    if (downloadLinks.length === 0) return false
    if (downloadLinks.length === 1) return isFileDownloaded(null)

    return downloadLinks.some((_, index) => isFileDownloaded(index))
  }

  // Handle delete file
  const handleDeleteFile = async (partIndex = null) => {
    const fileName = getFileName(partIndex)
    setConfirmDelete({ fileName, partIndex })
  }

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return

    try {
      const result = await window.api.deleteDownloadedFile(confirmDelete.fileName)
      if (result.success) {
        // Update local state to reflect deletion
        setDownloadedFiles((prev) => ({
          ...prev,
          [confirmDelete.fileName]: { exists: false }
        }))
        toast.success(`${t('file_deleted') || 'File deleted:'} ${confirmDelete.fileName}`)
      } else {
        toast.error(`${t('delete_failed') || 'Delete failed:'} ${result.error}`)
      }
    } catch (err) {
      toast.error(`${t('delete_failed') || 'Delete failed:'} ${err.message}`)
    }

    setConfirmDelete(null)
  }

  // Handle delete all parts
  const handleDeleteAllParts = async () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    const filesToDelete = downloadLinks
      .map((_, index) => getFileName(index))
      .filter((fileName) => downloadedFiles[fileName]?.exists)

    if (filesToDelete.length === 0) return

    setConfirmDelete({ fileName: filesToDelete.join(', '), isMultiple: true, files: filesToDelete })
  }

  // Confirm and execute delete all
  const handleConfirmDeleteAll = async () => {
    if (!confirmDelete?.isMultiple || !confirmDelete.files) return

    let successCount = 0
    let failCount = 0

    for (const fileName of confirmDelete.files) {
      try {
        const result = await window.api.deleteDownloadedFile(fileName)
        if (result.success) {
          successCount++
          setDownloadedFiles((prev) => ({
            ...prev,
            [fileName]: { exists: false }
          }))
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ${t('files_deleted') || 'file(s) deleted'}`)
    }
    if (failCount > 0) {
      toast.error(`${failCount} ${t('files_failed_delete') || 'file(s) failed to delete'}`)
    }

    setConfirmDelete(null)
  }

  // Get supported Quest devices
  const getSupportedDevices = () => {
    return Object.entries(game).filter(([k, v]) => k.startsWith('supportMetaQuest') && v)
  }

  // Check if URL is a Google Drive URL
  const isGoogleDriveUrl = (url) => {
    return url && (url.includes('drive.google.com') || url.includes('docs.google.com'))
  }

  // Check if URL is a Dropbox URL
  const isDropboxUrl = (url) => {
    return url && url.includes('dropbox.com')
  }

  // Check if URL is downloadable in-app (Google Drive or Dropbox)
  const isDownloadableUrl = (url) => {
    return isGoogleDriveUrl(url) || isDropboxUrl(url)
  }

  // Format bytes helper
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format speed helper
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
    const k = 1024
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format ETA helper
  const formatEta = (remainingBytes, speed) => {
    if (!speed || speed === 0 || !remainingBytes) return '--'
    const seconds = Math.ceil(remainingBytes / speed)

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const isIndonesian = t('language_code') === 'id' || t('download') === 'Unduh'
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

  // Update standalone game file size to API (only if not already set)
  const updateStandaloneFileSize = async (identifier, fileSize) => {
    if (!identifier || !fileSize || fileSize <= 0) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/game-size`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'standalone',
          identifier: identifier,
          fileSize: fileSize
        })
      })

      if (response.ok) {
        console.log(`[GameDetailModal] File size updated for ${identifier}: ${fileSize} bytes`)
      } else {
        console.warn('[GameDetailModal] Failed to update file size:', await response.text())
      }
    } catch (error) {
      console.error('[GameDetailModal] Error updating file size:', error)
    }
  }

  // Download file in-app using global context (supports Google Drive and Dropbox)
  const downloadInApp = async (url, partIndex = null) => {
    const currentVer = getCurrentVersion()
    const version = currentVer.version || gameVersion
    let fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}`

    if (partIndex !== null) {
      fileName += `_Part${partIndex + 1}`
    }
    fileName += '.zip'

    setShowDownloadModal(true)

    // Update download count when download starts
    await updateDownloadCount(partIndex)

    const result = await startDownload(url, fileName, gameTitle)

    if (result.success) {
      setShowDownloadModal(false)
      // Update file size to database (only if not already set)
      if (downloadInfo.totalBytes > 0) {
        await updateStandaloneFileSize(gameTitle, downloadInfo.totalBytes)
      }
      // Only show toast if widget is NOT visible (to avoid duplicate notification)
      // Widget already shows completion status with game info
      if (!showWidget) {
        toast.success(`${t('download_success') || 'Download completed!'} ${fileName}`)
      }
    } else if (result.canceled) {
      setShowDownloadModal(false)
    } else if (result.error) {
      setShowDownloadModal(false)
      toast.error(`${t('download_failed') || 'Download failed:'} ${result.error}`)
    }
  }

  // Handle minimize download modal to background widget
  const handleMinimizeDownload = () => {
    setShowDownloadModal(false)
    showDownloadWidget()
  }

  // Handle download button click - show confirmation modal
  const handleDownload = async () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    if (downloadLinks.length === 0) {
      return
    }

    if (downloadLinks.length > 1) {
      setShowDownloadParts(true)
    } else {
      // Single link - show confirmation modal
      const link = downloadLinks[0]
      if (isDownloadableUrl(link) && window.api?.downloadFile) {
        setConfirmDownload({ link, partIndex: null })
      } else if (window.api?.openExternal) {
        await window.api.openExternal(link)
      } else {
        window.open(downloadLinks[0], '_blank')
      }
    }
  }

  // Handle confirm download from modal
  const handleConfirmDownload = async () => {
    if (!confirmDownload) return
    setConfirmDownload(null)
    await downloadInApp(confirmDownload.link, confirmDownload.partIndex)
  }

  // Open single download link (for parts)
  const openDownloadLink = async (link, partIndex) => {
    if (isDownloadableUrl(link) && window.api?.downloadFile) {
      // Show confirmation modal for parts too
      setConfirmDownload({ link, partIndex })
    } else if (window.api?.openExternal) {
      await window.api.openExternal(link)
    } else {
      window.open(link, '_blank')
    }
  }

  // Handle Download and Install to device
  const handleDownloadAndInstall = () => {
    const currentVer = getCurrentVersion()
    const downloadLinks = (currentVer.downloadLinks || []).filter((link) => link && link.trim())

    if (downloadLinks.length === 0) return

    // Get first link (games are in ZIP/RAR format)
    const link = downloadLinks[0]
    if (isDownloadableUrl(link) && window.api?.downloadAndInstallArchive) {
      setConfirmInstall({ link })
    } else {
      toast.error(
        t('install_not_supported') ||
          'Direct install is only supported for Google Drive and Dropbox links'
      )
    }
  }

  // Handle confirm install from modal
  const handleConfirmInstall = async () => {
    if (!confirmInstall || !connectedDevice) return

    const currentVer = getCurrentVersion()
    const version = currentVer.version || gameVersion
    // Determine file extension from URL or default to .zip
    const urlLower = confirmInstall.link.toLowerCase()
    const isRar = urlLower.includes('.rar')
    const ext = isRar ? '.rar' : '.zip'
    const fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}${ext}`

    setConfirmInstall(null)
    setIsInstalling(true)
    setShowInstallModal(true)
    setInstallProgress({
      step: 'DOWNLOADING',
      percent: 0,
      detail: t('qgo_preparing') || 'Preparing...',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })

    // Also start the install widget for background tracking
    startInstallWidget(gameTitle)

    try {
      // Update download count when install starts
      await updateDownloadCount()

      // Use downloadAndInstallArchive for ZIP/RAR files (handles APK + OBB)
      const result = await window.api.downloadAndInstallArchive(
        confirmInstall.link,
        fileName,
        connectedDevice
      )

      if (result.success) {
        setIsInstalling(false)
        setShowInstallModal(false)
        const obbMsg = result.hasObb ? ' (APK + OBB)' : ''
        toast.success(`${t('install_success') || 'Installation complete!'} ${gameTitle}${obbMsg}`)
      } else {
        setIsInstalling(false)
        setShowInstallModal(false)
        toast.error(`${t('install_failed') || 'Installation failed:'} ${result.error}`)
      }
    } catch (error) {
      console.error('[Install] Error:', error)
      setIsInstalling(false)
      setShowInstallModal(false)
      toast.error(`${t('install_failed') || 'Installation failed:'} ${error.message}`)
    }
  }

  const currentVersion = getCurrentVersion()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/80"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl bg-[#111] rounded-2xl shadow-2xl border border-white/10"
            >
              {/* Header / Image Area */}
              <div className="relative h-56 md:h-72 w-full overflow-hidden rounded-t-2xl">
                {/* Loading spinner */}
                {loadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
                    <div className="w-10 h-10 border-3 border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
                  </div>
                )}

                {/* Placeholder */}
                {!loadingImage && !coverUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
                    <Icon icon="mdi:image-off" className="w-16 h-16 text-white/20" />
                    <span className="text-white/30 text-sm mt-2">No Cover Image</span>
                  </div>
                )}

                {/* Cover image */}
                {coverUrl && (
                  <img src={coverUrl} alt={gameTitle} className="w-full h-full object-cover" />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
                >
                  <Icon icon="mdi:close" className="w-5 h-5" />
                </button>

                {/* Title & badges */}
                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
                    {gameTitle}
                  </h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Device badges with user preference highlight */}
                    {(() => {
                      // Map selectedDevice to supportMetaQuest key
                      const deviceToKeyMap = {
                        quest1: 'supportMetaQuest1',
                        quest2: 'supportMetaQuest2',
                        quest3: 'supportMetaQuest3',
                        quest3s: 'supportMetaQuest3S',
                        questPro: 'supportMetaQuestPro'
                      }
                      const selectedKey = selectedDevice ? deviceToKeyMap[selectedDevice] : null

                      return getSupportedDevices().map(([quest]) => {
                        const questInfo = getQuestInfo(quest)
                        const isSelected = quest === selectedKey
                        return (
                          <span
                            key={quest}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isSelected
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white/20 text-white border-white/10'
                            }`}
                            title={questInfo.fullName}
                          >
                            {questInfo.fullName}
                          </span>
                        )
                      })
                    })()}

                    {/* v76 badge */}
                    {currentVersion.isSupportedV76 && (
                      <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm">
                        v76+
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6">
                {/* Stats row */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-2 rounded-lg text-sm font-medium">
                    <Icon icon="mdi:download" className="w-4 h-4" />
                    {formatDownloadCount(getTotalDownloadCount())}
                  </div>
                  {versions.length > 1 && (
                    <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-2 rounded-lg text-sm font-medium">
                      <Icon icon="mdi:layers-outline" className="w-4 h-4 text-[#0081FB]" />
                      {versions.length} {t('versions') || 'versions'}
                    </div>
                  )}
                </div>

                {/* Main actions area */}
                {user && isEligible ? (
                  <div className="space-y-4">
                    {/* Version selector */}
                    {(versions.length > 0 || gameVersion) && (
                      <div className="relative version-selector">
                        <label className="block text-sm font-medium text-white/50 mb-2">
                          {t('select_version') || 'Select Version'}
                        </label>
                        <button
                          onClick={() => setShowVersionSelector(!showVersionSelector)}
                          className="w-full h-12 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between px-4 rounded-xl border border-white/10"
                        >
                          <span className="font-semibold text-white">
                            {currentVersion.version || gameVersion}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/40 font-medium flex items-center gap-1">
                              <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                              {formatDownloadCount(currentVersion.downloadCount || 0)}
                            </span>
                            {currentVersion.isSupportedV76 && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                                v76+
                              </span>
                            )}
                            {currentVersion.mixedReality === 'yes' && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold">
                                MR
                              </span>
                            )}
                            <Icon
                              icon="heroicons:chevron-down"
                              className={`w-5 h-5 text-white/50 transition-transform ${showVersionSelector ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {/* Version dropdown */}
                        <AnimatePresence>
                          {showVersionSelector && versions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
                            >
                              {[...versions]
                                .map((version, originalIndex) => ({ ...version, originalIndex }))
                                .sort((a, b) => compareVersions(a.version, b.version))
                                .map((version) => (
                                  <button
                                    key={version.originalIndex}
                                    onClick={() => {
                                      setSelectedVersion(version.originalIndex)
                                      setShowVersionSelector(false)
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex justify-between items-center ${
                                      version.originalIndex === selectedVersion
                                        ? 'bg-[#0081FB]/10'
                                        : ''
                                    }`}
                                  >
                                    <span
                                      className={`font-medium ${version.originalIndex === selectedVersion ? 'text-[#0081FB]' : 'text-white'}`}
                                    >
                                      {version.version}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-white/40 font-medium flex items-center gap-1">
                                        <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                                        {formatDownloadCount(version.downloadCount || 0)}
                                      </span>
                                      {version.isSupportedV76 && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                          v76+
                                        </span>
                                      )}
                                      {version.originalIndex === selectedVersion && (
                                        <Icon icon="mdi:check" className="w-4 h-4 text-[#0081FB]" />
                                      )}
                                    </div>
                                  </button>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Download / Install buttons */}
                    <div className="flex flex-col gap-3 mt-4">
                      {gameStatus !== 'coming_soon' ? (
                        <>
                          {/* Multi-part games */}
                          {currentVersion.downloadLinks?.length > 1 ? (
                            areAllPartsDownloaded() ? (
                              <button
                                onClick={handleDeleteAllParts}
                                disabled={isDownloading || isInstalling}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-red-500/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                              >
                                <Icon icon="mdi:delete-sweep" className="w-5 h-5" />
                                {t('delete_all_files') || 'Delete All Downloaded Files'}
                              </button>
                            ) : (
                              <button
                                onClick={handleDownload}
                                disabled={
                                  !currentVersion.downloadLinks?.length ||
                                  isDownloading ||
                                  isInstalling
                                }
                                className="w-full py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-[#0081FB]/20 disabled:shadow-none transition-all flex flex-col items-center justify-center gap-1"
                              >
                                {isDownloading ? (
                                  <div className="flex items-center gap-2">
                                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                    {t('downloading') || 'Downloading...'}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Icon icon="mdi:download" className="w-5 h-5" />
                                      {t('download') || 'Download'}
                                    </div>
                                    {areAnyPartsDownloaded() && (
                                      <span className="text-xs text-white/70 font-normal">
                                        {t('some_parts_downloaded') ||
                                          'Some parts already downloaded'}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            )
                          ) : currentVersion.downloadLinks?.length === 1 &&
                            isFileDownloaded(null) ? (
                            // Single file ALREADY downloaded → [Hapus File] + [Instal Game] in flex-row
                            <div className="flex flex-row gap-3">
                              <button
                                onClick={() => handleDeleteFile(null)}
                                disabled={
                                  isDownloading || (showWidget && !downloadComplete) || isInstalling
                                }
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-red-500/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                              >
                                <Icon icon="mdi:delete" className="w-5 h-5" />
                                {t('delete_file') || 'Delete File'}
                              </button>
                              <button
                                onClick={handleDownloadAndInstall}
                                disabled={
                                  !connectedDevice ||
                                  !currentVersion.downloadLinks?.length ||
                                  isDownloading ||
                                  isInstalling
                                }
                                className="flex-1 py-3.5 bg-linear-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:from-white/10 disabled:to-white/10 disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-green-500/20 disabled:shadow-none transition-all flex flex-col items-center justify-center gap-0.5"
                              >
                                {isInstalling ? (
                                  <div className="flex items-center gap-2">
                                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                    {t('installing') || 'Installing...'}
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <Icon icon="bi:headset-vr" className="w-5 h-5" />
                                      {t('install_game') || 'Install Game'}
                                    </div>
                                    {connectedDevice && deviceModel && (
                                      <span className="text-xs text-white/70 font-normal">
                                        {t('device') || 'Device'}: {deviceModel}
                                      </span>
                                    )}
                                    {!connectedDevice && (
                                      <span className="text-xs text-white/50 font-normal">
                                        {t('no_device_connected') || 'No device connected'}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            </div>
                          ) : connectedDevice ? (
                            // Single file NOT downloaded + device connected → [Unduh & Install]
                            <button
                              onClick={handleDownloadAndInstall}
                              disabled={
                                !currentVersion.downloadLinks?.length ||
                                isDownloading ||
                                isInstalling
                              }
                              className="w-full py-3.5 bg-linear-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:from-white/10 disabled:to-white/10 disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-green-500/20 disabled:shadow-none transition-all flex flex-col items-center justify-center gap-0.5"
                            >
                              {isInstalling ? (
                                <div className="flex items-center gap-2">
                                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                  {t('installing') || 'Installing...'}
                                </div>
                              ) : isDownloading ? (
                                <div className="flex items-center gap-2">
                                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                  {t('downloading') || 'Downloading...'}
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Icon icon="bi:headset-vr" className="w-5 h-5" />
                                    {t('download_and_install') || 'Download & Install to Quest'}
                                  </div>
                                  {deviceModel && (
                                    <span className="text-xs text-white/70 font-normal">
                                      {t('device') || 'Device'}: {deviceModel}
                                    </span>
                                  )}
                                </>
                              )}
                            </button>
                          ) : (
                            // Single file NOT downloaded + NO device → [Download] only
                            <button
                              onClick={handleDownload}
                              disabled={
                                !currentVersion.downloadLinks?.length ||
                                isDownloading ||
                                isInstalling
                              }
                              className="w-full py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-white/50 rounded-xl font-medium text-base shadow-lg shadow-[#0081FB]/20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                            >
                              {isDownloading ? (
                                <>
                                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                  {t('downloading') || 'Downloading...'}
                                </>
                              ) : (
                                <>
                                  <Icon icon="mdi:download" className="w-5 h-5" />
                                  {t('download') || 'Download'}
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          disabled
                          className="w-full py-3.5 bg-white/10 text-white/50 rounded-xl font-medium text-base cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:clock-outline" className="w-5 h-5" />
                          {t('coming_soon') || 'Coming Soon'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl text-center text-white/50 text-sm">
                    {!user
                      ? t('login_required') || 'Please login to download'
                      : t('not_eligible') || 'You are not eligible to access downloads'}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Download Parts Modal */}
            <AnimatePresence>
              {showDownloadParts && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center p-4"
                >
                  <div
                    className="fixed inset-0 bg-black/60"
                    onClick={() => setShowDownloadParts(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10"
                  >
                    <div className="flex justify-between items-center p-4 border-b border-white/10">
                      <h3 className="font-bold text-lg text-white">
                        {t('download_parts') || 'Download Parts'}
                      </h3>
                      <button
                        onClick={() => setShowDownloadParts(false)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Icon icon="mdi:close" className="w-5 h-5 text-white/60" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-red-400 mb-3">
                        {t('download_all_parts_warning') ||
                          'You must download all parts for the game to work!'}
                      </p>

                      {/* Download Progress */}
                      {isDownloading && (
                        <div className="mb-4 p-3 rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/5">
                          <p className="text-sm text-white/80 mb-2 truncate">
                            {downloadInfo.fileName}
                          </p>

                          {downloadInfo.status === 'downloading' && downloadInfo.totalBytes > 0 ? (
                            <>
                              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                                <span>
                                  {formatBytes(downloadInfo.downloadedBytes)} /{' '}
                                  {formatBytes(downloadInfo.totalBytes)}
                                </span>
                                <span>
                                  {Math.round(
                                    (downloadInfo.downloadedBytes / downloadInfo.totalBytes) * 100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full bg-linear-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, (downloadInfo.downloadedBytes / downloadInfo.totalBytes) * 100)}%`
                                  }}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between text-xs text-white/40">
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
                            </>
                          ) : (
                            <div className="flex items-center justify-center py-2">
                              <Icon
                                icon="mdi:loading"
                                className="h-6 w-6 animate-spin text-[#0081FB]"
                              />
                              <span className="ml-2 text-sm text-white/60">
                                {t('qgo_preparing') || 'Preparing...'}
                              </span>
                            </div>
                          )}
                          {/* Cancel Download Button */}
                          <button
                            onClick={async () => {
                              await cancelDownload()
                              toast.info(t('download_cancelled') || 'Download Cancelled')
                            }}
                            className="mt-3 w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Icon icon="mdi:close-circle" className="w-4 h-4" />
                            {t('cancel_download') || 'Cancel Download'}
                          </button>
                        </div>
                      )}

                      {(currentVersion.downloadLinks || [])
                        .filter((l) => l && l.trim())
                        .map((link, idx) => {
                          const partDownloaded = isFileDownloaded(idx)
                          const fileName = getFileName(idx)
                          const fileInfo = downloadedFiles[fileName]

                          return (
                            <div
                              key={idx}
                              className={`w-full flex items-center justify-between p-3 border rounded-xl transition-colors ${
                                partDownloaded
                                  ? 'border-green-500/30 bg-green-500/5'
                                  : 'border-white/10 hover:bg-[#0081FB]/10 hover:border-[#0081FB]/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                                    partDownloaded
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-[#0081FB]/20 text-[#0081FB]'
                                  }`}
                                >
                                  {partDownloaded ? (
                                    <Icon icon="mdi:check" className="w-5 h-5" />
                                  ) : (
                                    idx + 1
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white">Part {idx + 1}</span>
                                  {partDownloaded && fileInfo?.size && (
                                    <span className="text-[10px] text-green-400/70">
                                      {formatBytes(fileInfo.size)} -{' '}
                                      {t('downloaded') || 'Downloaded'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {partDownloaded ? (
                                  <button
                                    onClick={() => handleDeleteFile(idx)}
                                    disabled={isDownloading}
                                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
                                    title={t('delete_file') || 'Delete file'}
                                  >
                                    <Icon icon="mdi:delete" className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openDownloadLink(link, idx)}
                                    disabled={isDownloading}
                                    className="p-2 rounded-lg bg-[#0081FB]/20 hover:bg-[#0081FB]/30 text-[#0081FB] transition-colors disabled:opacity-50"
                                    title={t('download') || 'Download'}
                                  >
                                    <Icon icon="mdi:download" className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
                  onClick={() => setConfirmDelete(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#111] p-6 shadow-2xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-red-500/20">
                        <Icon icon="mdi:delete-alert" className="w-6 h-6 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {t('delete_confirm_title') || 'Delete Downloaded File?'}
                      </h3>
                    </div>
                    <p className="text-sm text-white/60">
                      {confirmDelete.isMultiple
                        ? t('delete_confirm_desc_multiple') ||
                          'You are about to delete the following files:'
                        : t('delete_confirm_desc') || 'You are about to delete:'}
                    </p>
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      {confirmDelete.isMultiple ? (
                        <div className="space-y-1">
                          {confirmDelete.files.map((file, idx) => (
                            <p key={idx} className="font-mono text-sm text-white/80 truncate">
                              {file}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-mono text-sm text-white/80 truncate">
                          {confirmDelete.fileName}
                        </p>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-red-400/70">
                      {t('delete_warning') || 'This action cannot be undone.'}
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/5"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={
                          confirmDelete.isMultiple ? handleConfirmDeleteAll : handleConfirmDelete
                        }
                        className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all"
                      >
                        {t('delete') || 'Delete'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Confirmation Modal */}
            <AnimatePresence>
              {confirmDownload && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
                  onClick={() => setConfirmDownload(null)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {t('qgo_confirm_title') || 'Download Confirmation'}
                    </h3>
                    <p className="mt-2 text-sm text-white/60">
                      {t('qgo_confirm_desc') || 'You are about to download:'}
                    </p>
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-white">{gameTitle}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {t('qgo_version') || 'Version'}:{' '}
                        {getCurrentVersion().version || gameVersion}
                        {confirmDownload.partIndex !== null &&
                          ` - Part ${confirmDownload.partIndex + 1}`}
                      </p>
                      {game?.gameSize && (
                        <p className="mt-1 text-xs text-white/50">
                          {t('game_size') || 'Size'}: {game.gameSize}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDownload(null)}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/5"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={handleConfirmDownload}
                        className="rounded-lg bg-linear-to-r from-[#0081FB] to-[#00C2FF] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#0081FB]/20 transition-all hover:shadow-xl hover:shadow-[#0081FB]/30"
                      >
                        {t('qgo_download') || 'Download'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Progress Modal */}
            <AnimatePresence>
              {showDownloadModal && isDownloading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        {t('qgo_downloading') || 'Downloading...'}
                      </h3>
                      <button
                        onClick={handleMinimizeDownload}
                        className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        title={t('minimize_to_background') || 'Minimize to background'}
                      >
                        <Icon
                          icon="material-symbols:close-fullscreen-rounded"
                          className="h-5 w-5"
                        />
                      </button>
                    </div>

                    <p className="mt-2 text-sm text-white/60">
                      {downloadInfo.fileName || gameTitle}
                    </p>

                    {/* Progress Bar */}
                    {downloadInfo.status === 'downloading' && downloadInfo.totalBytes > 0 ? (
                      <div className="mt-4">
                        {(() => {
                          // Use progress from context directly (already calculated by main process)
                          const progressPercent = downloadInfo.progress || 0
                          return (
                            <>
                              <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                                <span>
                                  {formatBytes(downloadInfo.downloadedBytes)} /{' '}
                                  {formatBytes(downloadInfo.totalBytes)}
                                </span>
                                <span>{Math.round(progressPercent)}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                  className="h-full bg-linear-to-r from-[#0081FB] to-[#00C2FF]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPercent}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            </>
                          )
                        })()}

                        {/* Speed and ETA */}
                        <div className="mt-2 flex items-center justify-between text-xs text-white/40">
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
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
                      <Icon icon="mdi:download" className="h-5 w-5 animate-pulse text-[#0081FB]" />
                      <span>
                        {downloadInfo.status === 'preparing'
                          ? t('qgo_preparing') || 'Preparing download...'
                          : t('qgo_downloading_msg') || 'Downloading, please wait...'}
                      </span>
                    </div>

                    {/* Minimize hint */}
                    <p className="mt-4 text-center text-xs text-white/40">
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
            <AnimatePresence>
              {confirmInstall && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center p-4"
                >
                  <div
                    className="fixed inset-0 bg-black/80"
                    onClick={() => setConfirmInstall(null)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 p-6"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {t('install_confirm_title') || 'Download & Install'}
                    </h3>
                    <p className="mt-2 text-sm text-white/60">
                      {t('install_confirm_desc') ||
                        'This will download and install the APK directly to your Meta Quest device:'}
                    </p>
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-white">{gameTitle}</p>
                      <p className="mt-1 text-xs text-white/50">
                        {t('qgo_version') || 'Version'}: {currentVersion.version || gameVersion}
                      </p>
                      <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                        <Icon icon="bi:headset-vr" className="w-3 h-3" />
                        {t('connected_device') || 'Device'}: {deviceModel || connectedDevice}
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmInstall(null)}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:bg-white/5"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={handleConfirmInstall}
                        className="rounded-lg bg-linear-to-r from-green-600 to-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl"
                      >
                        {t('install') || 'Install'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Install Progress Modal */}
            <AnimatePresence>
              {showInstallModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-60 flex items-center justify-center p-4"
                >
                  <div className="fixed inset-0 bg-black/80" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 p-6"
                  >
                    {/* Header with minimize button */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {installProgress.step === 'DOWNLOADING'
                          ? t('qgo_downloading') || 'Downloading...'
                          : installProgress.step === 'EXTRACTING'
                            ? t('extracting') || 'Extracting...'
                            : installProgress.step === 'INSTALLING'
                              ? t('installing') || 'Installing...'
                              : installProgress.step === 'PUSHING_OBB'
                                ? t('pushing_obb') || 'Copying OBB Data...'
                                : installProgress.step === 'COMPLETED'
                                  ? t('install_success') || 'Installation Complete!'
                                  : t('qgo_preparing') || 'Preparing...'}
                      </h3>
                      {/* Minimize button */}
                      <button
                        onClick={() => {
                          setShowInstallModal(false)
                          // Widget is already showing via context
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title={t('minimize') || 'Minimize to widget'}
                      >
                        <Icon icon="mdi:arrow-collapse-down" className="h-5 w-5" />
                      </button>
                    </div>

                    <p className="text-sm text-white/60">{gameTitle}</p>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                        <span>{installProgress.detail}</span>
                        <span>{Math.round(installProgress.percent)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-linear-to-r from-green-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${installProgress.percent}%` }}
                        />
                      </div>

                      {/* Speed and progress info for download phase */}
                      {installProgress.step === 'DOWNLOADING' && installProgress.totalBytes > 0 && (
                        <div className="mt-2 flex items-center justify-between text-xs text-white/40">
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

                      {/* Cancel Install Button - only during download phase */}
                      {installProgress.step === 'DOWNLOADING' && (
                        <button
                          onClick={async () => {
                            await cancelInstall()
                            setIsInstalling(false)
                            setShowInstallModal(false)
                            toast.info(t('download_cancelled') || 'Download Cancelled')
                          }}
                          className="mt-3 w-full py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:close-circle" className="w-4 h-4" />
                          {t('cancel_download_install') || 'Cancel Download & Install'}
                        </button>
                      )}
                    </div>

                    {/* Status info */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
                      {installProgress.step === 'COMPLETED' ? (
                        <>
                          <Icon icon="mdi:check-circle" className="h-5 w-5 text-green-500" />
                          <span>{t('install_success') || 'Installation complete!'}</span>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="mdi:loading"
                            className="h-5 w-5 animate-spin text-green-500"
                          />
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
            </AnimatePresence>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

GameDetailModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  game: PropTypes.object,
  selectedDevice: PropTypes.string,
  connectedDevice: PropTypes.string
}
