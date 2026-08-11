import { useState, useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useDownload } from '../contexts/DownloadContext'
import { useGames } from '../contexts/GamesContext'
import { useToast } from '../hooks/useToast'
import coverImages from '../utils/coverImages'
import { Tooltip } from './Tooltip'
import UpdateGameDialog from './UpdateGameDialog'
import ReportGameDialog from './ReportGameDialog'
import { apiFetch } from '../utils/apiClient'

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

const normalizeAccessKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const gameAccessRecordMatches = (record, candidates) => {
  if (!record || typeof record !== 'object') return false
  const candidateSet = new Set(candidates.map(normalizeAccessKey).filter(Boolean))
  if (candidateSet.size === 0) return false

  return [record.id, record.gameId, record.gameTitle]
    .map(normalizeAccessKey)
    .some((value) => value && candidateSet.has(value))
}

const normalizeDownloadLinks = (links) =>
  Array.isArray(links)
    ? links.filter((link) => typeof link === 'string' && link.trim()).map((link) => link.trim())
    : []

const getDownloadPartCount = (version) => {
  const rawPartCount = version?.partCount
  if (rawPartCount !== undefined && rawPartCount !== null && rawPartCount !== '') {
    const partCount = Number(rawPartCount)
    if (Number.isFinite(partCount)) return Math.max(0, Math.floor(partCount))
  }

  if (Array.isArray(version?.downloadLinks)) {
    const linkCount = normalizeDownloadLinks(version.downloadLinks).length
    if (linkCount > 0) return linkCount
  }

  // The paginated endpoint may omit or redact secure download URLs. Assume one
  // part until the authenticated download endpoint tells us otherwise.
  return 1
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
  game: gameProp,
  selectedDevice,
  connectedDevice
}) {
  const { t } = useLanguage()
  const { user, accessTypes, gameAccess } = useAuth()
  const {
    isDownloading,
    downloadInfo,
    downloadComplete,
    startDownload,
    showWidget,
    cancelDownload,
    // Install context
    isInstalling: isGlobalInstalling,
    startInstall: startInstallWidget,
    cancelInstall
  } = useDownload()
  const toast = useToast()
  const { fetchDownloadUrl } = useGames()
  const [renderedGame, setRenderedGame] = useState(gameProp)
  const game = gameProp || renderedGame

  useEffect(() => {
    if (gameProp) setRenderedGame(gameProp)
  }, [gameProp])

  const [coverUrl, setCoverUrl] = useState(null)
  const [loadingImage, setLoadingImage] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState(0)
  const [showVersionSelector, setShowVersionSelector] = useState(false)
  const [showDownloadParts, setShowDownloadParts] = useState(false)
  // For confirmation modal
  const [deviceModel, setDeviceModel] = useState(null) // Device model name for display
  const [downloadedFiles, setDownloadedFiles] = useState({}) // Track which files are already downloaded
  const [resolvedDownloadLinks, setResolvedDownloadLinks] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // For delete confirmation modal

  // YouTube video state
  const iframeRef = useRef(null)
  const glowRef = useRef(null)
  const [videoReady, setVideoReady] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
  const [volume, setVolume] = useState(50)

  // Download and install state
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState({
    step: '',
    percent: 0,
    detail: '',
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0,
    gdFileName: ''
  })
  const [confirmInstall, setConfirmInstall] = useState(null) // For install confirmation modal
  const [showInstallModal, setShowInstallModal] = useState(false) // For install progress modal

  useEffect(() => {
    if (!isGlobalInstalling) setIsInstalling(false)
  }, [isGlobalInstalling])

  // Update and Report dialog state
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)

  // Safely extract game properties with fallbacks (must be before state that uses them)
  const gameTitle = game?.gameTitle || game?.name || game?.id?.replace(/!/g, '') || 'Unknown Game'
  const gameStatus = game?.gameStatus || ''
  const isEligible = accessTypes.some((type) => normalizeAccessKey(type) === 'standalone')
  const hasStandaloneGameAccess = (gameAccess?.standalone || []).some((record) =>
    gameAccessRecordMatches(record, [game?.id, game?.gameTitle, game?.name, gameTitle])
  )
  const canAccessDownload = isEligible || hasStandaloneGameAccess
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

  // YouTube video autoplay with 2-second delay
  useEffect(() => {
    if (!isOpen || !game?.videoIdYouTube) {
      setVideoReady(false)
      setIsMuted(true)
      setIsPlaying(true)
      return
    }
    const timer = setTimeout(() => {
      setVideoReady(true)
      postYTCommand('mute')
      postYTCommand('playVideo')
    }, 2000)
    return () => clearTimeout(timer)
  }, [isOpen, game?.videoIdYouTube])

  // YouTube iframe command helper
  const postYTCommand = (command, args = []) => {
    const message = JSON.stringify({ event: 'command', func: command, args })
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage(message, '*')
    }
    if (glowRef.current) {
      glowRef.current.contentWindow.postMessage(message, '*')
    }
  }

  // Reset state when game changes
  useEffect(() => {
    if (!game) return
    setSelectedVersion(initialSelectedVersion)
    // Reset other states when game changes
    setCoverUrl(null)
    setLoadingImage(true)
    setShowVersionSelector(false)
    setShowDownloadParts(false)
    setIsMuted(true)
    setIsInstalling(false)
    setShowInstallModal(false)
    setDownloadedFiles({})
    setResolvedDownloadLinks(null)
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
          downloadLinks: resolvedDownloadLinks || (game.linkDownload ? [game.linkDownload] : [])
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
  }, [
    isOpen,
    game,
    gameTitle,
    selectedVersion,
    gameVersion,
    downloadComplete,
    localVersions,
    resolvedDownloadLinks
  ])

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
        speed: progress.speed || 0,
        gdFileName: progress.gdFileName || ''
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
      downloadLinks: game.linkDownload ? [game.linkDownload] : resolvedDownloadLinks || undefined,
      isSupportedV76: isSupportedV76,
      downloadCount: localDownloadCount || 0
    }
  }

  const cacheResolvedDownloadLinks = (links) => {
    const normalizedLinks = normalizeDownloadLinks(links)
    if (normalizedLinks.length === 0) return

    setResolvedDownloadLinks(normalizedLinks)
    setLocalVersions((previousVersions) => {
      if (previousVersions.length === 0) return previousVersions

      const updatedVersions = [...previousVersions]
      updatedVersions[selectedVersion] = {
        ...updatedVersions[selectedVersion],
        downloadLinks: normalizedLinks,
        partCount: normalizedLinks.length
      }
      return updatedVersions
    })
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

        // Record download via API (server handles atomic increment + history)
        versionText = localVersions[selectedVersion]?.version || gameVersion
        await apiFetch('/api/v1/record-download', {
          method: 'POST',
          body: JSON.stringify({
            gameTitle,
            type: 'standalone',
            versionIndex: selectedVersion,
            version: versionText,
            uid: user?.uid || null,
            partNumber: partIndex !== null ? partIndex + 1 : null
          })
        })
      } else {
        // Single version - just update total count
        const updatedCount = localDownloadCount + 1
        setLocalDownloadCount(updatedCount)

        versionText = gameVersion || 'v1.0'
        await apiFetch('/api/v1/record-download', {
          method: 'POST',
          body: JSON.stringify({
            gameTitle,
            type: 'standalone',
            versionIndex: null,
            version: versionText,
            uid: user?.uid || null,
            partNumber: partIndex !== null ? partIndex + 1 : null
          })
        })
      }
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

    // If THIS specific file is currently downloading, it is NOT fully downloaded.
    // This prevents partial/temp files from triggering the "Downloaded" state.
    if (isDownloading && downloadInfo?.fileName === fileName) {
      return false
    }

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
      const response = await apiFetch('/api/v1/game-size', {
        method: 'POST',
        body: JSON.stringify({
          type: 'standalone',
          identifier: identifier,
          fileSize: fileSize
        })
      })

      if (!response.ok) {
        console.warn('[GameDetailModal] Failed to update file size:', await response.text())
      }
    } catch (error) {
      console.error('[GameDetailModal] Error updating file size:', error)
    }
  }

  // Download file in-app — fetch URL from secure API first, then start download
  const downloadInApp = async (gameId, partIndex = null) => {
    if (!user?.email) {
      toast.error(t('login_required') || 'Login diperlukan untuk mengunduh game.')
      return
    }

    const currentVer = getCurrentVersion()
    const version = currentVer.version || gameVersion
    let fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}`

    if (partIndex !== null) {
      fileName += `_Part${partIndex + 1}`
    }
    fileName += '.zip'

    // Fetch secure download URL from server (server verifies eligibility)
    let url
    try {
      const result = await fetchDownloadUrl(gameId, user.email, 'standalone')
      const secureLinks = normalizeDownloadLinks(result.linkDownload)
      if (secureLinks.length === 0 && result.downloadUrl) {
        secureLinks.push(result.downloadUrl)
      }

      cacheResolvedDownloadLinks(secureLinks)

      // The list endpoint may not expose part metadata. Resolve it from the
      // authenticated response before showing the parts picker.
      if (partIndex === null && secureLinks.length > 1) {
        setShowDownloadParts(true)
        return
      }

      url = secureLinks[partIndex ?? 0]
    } catch (err) {
      toast.error(err.message || t('download_failed') || 'Gagal mengambil link download.')
      return
    }

    if (!url) {
      toast.error(t('no_download_url') || 'Tidak ada link download untuk game ini.')
      return
    }

    await updateDownloadCount(partIndex)

    const result = await startDownload(url, fileName, gameTitle, version)

    if (result.success) {
      if (downloadInfo.totalBytes > 0) {
        await updateStandaloneFileSize(gameTitle, downloadInfo.totalBytes)
      }
      if (!showWidget) {
        toast.success(`${t('download_success') || 'Download completed!'} ${fileName}`)
      }
    } else if (result.queued) {
      toast.success(`${gameTitle} ${t('queued_for_download') || 'ditambahkan ke antrian unduhan'}`)
    } else if (result.error && !result.canceled) {
      toast.error(`${t('download_failed') || 'Download failed:'} ${result.error}`)
    }
  }

  // Handle download button click
  const handleDownload = async () => {
    if (!user?.email) {
      toast.error(t('login_required') || 'Login diperlukan untuk mengunduh game.')
      return
    }

    // Determine number of parts from current version (count only, no URLs needed)
    const currentVer = getCurrentVersion()
    // versions may have downloadLinks stripped — use partCount if available, else assume 1
    const partCount = getDownloadPartCount(currentVer)
    const hasResolvedParts = normalizeDownloadLinks(currentVer.downloadLinks).length > 1

    if (partCount > 1 && hasResolvedParts) {
      setShowDownloadParts(true)
    } else {
      await downloadInApp(game.id || gameTitle, null)
    }
  }

  // Open single download link (for parts) — fetch URL from server first
  const openDownloadLink = async (partIndex) => {
    await downloadInApp(game.id || gameTitle, partIndex)
  }

  // Handle Download and Install to device
  const handleDownloadAndInstall = () => {
    if (!user?.email) {
      toast.error(t('login_required') || 'Login diperlukan untuk mengunduh game.')
      return
    }
    // Show confirm modal — URL will be fetched from server at confirm time
    setConfirmInstall({ gameId: game.id || gameTitle })
  }

  // Handle confirm install from modal — fetch URL from server
  const handleConfirmInstall = async () => {
    if (!confirmInstall || !connectedDevice) return
    if (!user?.email) {
      toast.error(t('login_required') || 'Login diperlukan untuk mengunduh game.')
      setConfirmInstall(null)
      return
    }

    // Fetch secure URL from server
    let link
    try {
      const result = await fetchDownloadUrl(confirmInstall.gameId, user.email, 'standalone')
      link =
        result.downloadUrl || (Array.isArray(result.linkDownload) ? result.linkDownload[0] : null)
    } catch (err) {
      toast.error(err.message || 'Gagal mengambil link download.')
      setConfirmInstall(null)
      return
    }

    if (!link) {
      toast.error('Tidak ada link download untuk game ini.')
      setConfirmInstall(null)
      return
    }

    const currentVer = getCurrentVersion()
    const version = currentVer.version || gameVersion
    const urlLower = link.toLowerCase()
    const isRar = urlLower.includes('.rar')
    const ext = isRar ? '.rar' : '.zip'
    const fileName = `${gameTitle.replace(/[<>:"/\\|?*]/g, '_')}_${version}${ext}`

    setConfirmInstall(null)
    setIsInstalling(true)
    setInstallProgress({
      step: 'DOWNLOADING',
      percent: 0,
      detail: t('qgo_preparing') || 'Preparing...',
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 0
    })

    startInstallWidget(gameTitle, version, fileName)

    try {
      await updateDownloadCount()

      let result = await window.api.downloadAndInstallArchive(link, fileName, connectedDevice)
      if (!result.success && result.retryUrl && result.retryUrl !== link) {
        result = await window.api.downloadAndInstallArchive(
          result.retryUrl,
          fileName,
          connectedDevice
        )
      }

      if (result.success) {
        setIsInstalling(false)
        setShowInstallModal(false)
        const obbMsg = result.hasObb ? ' (APK + OBB)' : ''
        toast.success(`${t('install_success') || 'Installation complete!'} ${gameTitle}${obbMsg}`)
      } else {
        setIsInstalling(false)
        setShowInstallModal(false)
        if (result.error !== 'Installation cancelled') {
          toast.error(`${t('install_failed') || 'Installation failed:'} ${result.error}`)
        }
      }
    } catch (error) {
      console.error('[Install] Error:', error)
      setIsInstalling(false)
      setShowInstallModal(false)
      if (error.message !== 'Installation cancelled') {
        toast.error(`${t('install_failed') || 'Installation failed:'} ${error.message}`)
      }
    }
  }

  const currentVersion = getCurrentVersion()
  const currentVersionPartCount = getDownloadPartCount(currentVersion)

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!isOpen && !gameProp) setRenderedGame(null)
      }}
    >
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
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
              className="relative w-full max-w-2xl bg-white dark:bg-[#111] rounded-2xl shadow-2xl overflow-visible"
            >
              {/* Header / Image Area with Ambient Glow */}
              <div className="px-4 pt-4 pb-2 shrink-0" style={{ overflow: 'visible' }}>
                <div className="relative" style={{ overflow: 'visible' }}>
                  {/* Ambient bloom - dynamic video or blurred image behind cover/video */}
                  {game?.videoIdYouTube ? (
                    <div
                      className="absolute pointer-events-none select-none overflow-hidden"
                      style={{
                        top: '-10%',
                        left: '-10%',
                        right: '-10%',
                        bottom: '-10%',
                        width: '120%',
                        height: '120%',
                        filter: 'blur(40px) brightness(0.8)',
                        opacity: 0.8,
                        zIndex: 0
                      }}
                    >
                      <iframe
                        ref={glowRef}
                        src={`https://www.youtube.com/embed/${game.videoIdYouTube}?autoplay=0&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${game.videoIdYouTube}&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.protocol === 'file:' ? 'https://hypertopia.web.id' : window.location.origin)}`}
                        className="w-full h-full scale-110"
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  ) : (
                    (game?.videoIdYouTube || coverUrl) && (
                      <motion.img
                        src={
                          game?.videoIdYouTube
                            ? `https://img.youtube.com/vi/${game.videoIdYouTube}/maxresdefault.jpg`
                            : coverUrl
                        }
                        onError={(e) => {
                          if (game?.videoIdYouTube && e.target.src.includes('maxresdefault')) {
                            e.target.src = `https://img.youtube.com/vi/${game.videoIdYouTube}/hqdefault.jpg`
                          } else if (coverUrl) {
                            e.target.src = coverUrl
                          }
                        }}
                        alt=""
                        aria-hidden="true"
                        className="absolute rounded-2xl object-cover pointer-events-none select-none"
                        animate={{
                          scale: [1, 1.07, 1.03, 1.08, 1],
                          x: [0, 10, -8, 6, 0],
                          y: [0, -8, 6, -5, 0],
                          opacity: [0.72, 0.88, 0.68, 0.85, 0.72]
                        }}
                        transition={{
                          duration: 9,
                          ease: 'easeInOut',
                          repeat: Infinity,
                          repeatType: 'loop'
                        }}
                        style={{
                          top: '-8px',
                          left: '0px',
                          right: '0px',
                          bottom: '-8px',
                          width: 'calc(100% + 32px)',
                          height: 'calc(100% + 20px)',
                          filter: 'blur(24px) brightness(0.7)',
                          zIndex: 0
                        }}
                      />
                    )
                  )}

                  <div
                    className="relative aspect-video w-full rounded-2xl overflow-hidden"
                    style={{ zIndex: 1 }}
                  >
                    {game?.videoIdYouTube ? (
                      <>
                        {/* YouTube iframe */}
                        <iframe
                          ref={iframeRef}
                          key={game.videoIdYouTube}
                          src={`https://www.youtube.com/embed/${game.videoIdYouTube}?autoplay=0&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${game.videoIdYouTube}&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.protocol === 'file:' ? 'https://hypertopia.web.id' : window.location.origin)}`}
                          title={gameTitle}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="w-full h-full border-0"
                        />
                        {/* Poster overlay covers iframe for first 2 seconds */}
                        {!videoReady && (
                          <div className="absolute inset-0">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={gameTitle}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-900 dark:bg-[#0a0a0a] flex items-center justify-center">
                                <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : coverUrl ? (
                      <img src={coverUrl} alt={gameTitle} className="w-full h-full object-cover" />
                    ) : loadingImage ? (
                      <div className="w-full h-full bg-gray-100 dark:bg-[#0a0a0a] flex items-center justify-center">
                        <div className="w-10 h-10 border-3 border-gray-200 dark:border-white/10 border-t-[#0081FB] rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-[#1a1a1a] flex flex-col items-center justify-center">
                        <Icon
                          icon="mdi:image-off"
                          className="w-16 h-16 text-gray-300 dark:text-white/20"
                        />
                        <span className="text-gray-400 dark:text-white/30 text-sm mt-2">
                          No Cover Image
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Close button */}
                    <button
                      onClick={onClose}
                      className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10"
                    >
                      <Icon icon="mdi:close" className="w-5 h-5" />
                    </button>

                    {/* v76+ Badge - top left of cover */}
                    {currentVersion.isSupportedV76 && (
                      <div className="absolute top-3 left-3 group z-10">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-sm font-bold rounded-lg shadow-md cursor-help">
                          <Icon icon="mdi:alert-circle" className="w-3.5 h-3.5" />
                          <span>v76+</span>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute top-full left-0 mt-2 w-56 px-3 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-30">
                          <p className="text-xs text-gray-800 dark:text-white font-semibold mb-1">
                            {t('v76_tooltip_title') || 'Requires Firmware v76+'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-white/50 leading-relaxed">
                            {t('v76_tooltip_desc') ||
                              'This game requires Quest firmware version 76 or higher to play.'}
                          </p>
                          <div className="absolute bottom-full left-3 w-2 h-2 bg-white dark:bg-[#1a1a1a] border-t border-l border-gray-200 dark:border-white/10 rotate-45 translate-y-1" />
                        </div>
                      </div>
                    )}

                    {/* Video controls - bottom right */}
                    {game?.videoIdYouTube && videoReady && (
                      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                        <Tooltip content={t('video_restart')} side="left">
                          <button
                            onClick={() => {
                              postYTCommand('seekTo', [0, true])
                              postYTCommand('playVideo')
                              setIsPlaying(true)
                            }}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200"
                          >
                            <Icon icon="mdi:restart" className="w-4 h-4" />
                          </button>
                        </Tooltip>

                        <Tooltip
                          content={isPlaying ? t('video_pause') : t('video_play')}
                          side="left"
                        >
                          <button
                            onClick={() => {
                              postYTCommand(isPlaying ? 'pauseVideo' : 'playVideo')
                              setIsPlaying((p) => !p)
                            }}
                            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200"
                          >
                            <Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} className="w-4 h-4" />
                          </button>
                        </Tooltip>

                        <div className="flex items-center group/volume h-9">
                          <div
                            className={`flex items-center transition-all duration-500 rounded-full ${
                              !isMuted
                                ? 'hover:bg-black/60 hover:backdrop-blur-md hover:pr-3 hover:gap-2'
                                : ''
                            }`}
                          >
                            <Tooltip
                              content={isMuted ? t('video_unmute') : t('video_mute')}
                              side="left"
                            >
                              <button
                                onClick={() => {
                                  postYTCommand(isMuted ? 'unMute' : 'mute')
                                  if (isMuted) postYTCommand('setVolume', [volume])
                                  setIsMuted((p) => !p)
                                }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 outline-none focus:outline-none ${
                                  isMuted
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg'
                                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white group-hover/volume:bg-transparent group-hover/volume:backdrop-blur-none'
                                }`}
                              >
                                <Icon
                                  icon={isMuted ? 'mdi:volume-off' : 'mdi:volume-high'}
                                  className="w-5 h-5"
                                />
                              </button>
                            </Tooltip>

                            {!isMuted && (
                              <div className="flex items-center gap-2 max-w-0 opacity-0 group-hover/volume:max-w-[200px] group-hover/volume:opacity-100 transition-all duration-500 overflow-hidden">
                                <div className="relative flex items-center">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value)
                                      setVolume(val)
                                      postYTCommand('setVolume', [val])
                                    }}
                                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:bg-white/40 transition-colors outline-none focus:outline-none"
                                    style={{
                                      background: `linear-gradient(to right, white ${volume}%, rgba(255, 255, 255, 0.3) ${volume}%)`
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-white min-w-[24px] tabular-nums">
                                  {volume}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title & Badges */}
              <div className="px-6 pt-4 pb-0 shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {gameTitle}
                </h2>
                {/* Device Support Badges */}
                <div className="flex gap-2 items-center flex-wrap pb-1">
                  {(() => {
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
                        <div
                          key={quest}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            isSelected
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white/60 border-gray-200 dark:border-white/10'
                          }`}
                        >
                          {questInfo.fullName}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Content Body */}
              <div className="p-6">
                {/* Main actions area */}
                {user && canAccessDownload ? (
                  <div className="space-y-4">
                    {/* Version selector */}
                    {(versions.length > 0 || gameVersion) && (
                      <div className="relative version-selector">
                        <label className="block text-sm font-medium text-gray-500 dark:text-white/50 mb-2">
                          {t('select_version') || 'Select Version'}
                        </label>
                        <button
                          onClick={() => setShowVersionSelector(!showVersionSelector)}
                          className="w-full h-12 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-between px-4 rounded-xl border border-gray-200 dark:border-white/10"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {currentVersion.version || gameVersion}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-white/50 font-medium flex items-center gap-1">
                              <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                              {formatDownloadCount(currentVersion.downloadCount || 0)}
                            </span>
                            {currentVersion.isSupportedV76 && (
                              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                                v76+
                              </span>
                            )}
                            {currentVersion.mixedReality === 'yes' && (
                              <span className="text-xs bg-[#0081FB] text-white px-2 py-0.5 rounded-full font-bold">
                                MR
                              </span>
                            )}
                            <Icon
                              icon="heroicons:chevron-down"
                              className={`w-5 h-5 text-gray-400 dark:text-white/50 transition-transform ${showVersionSelector ? 'rotate-180' : ''}`}
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
                              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-20 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
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
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex justify-between items-center ${
                                      version.originalIndex === selectedVersion
                                        ? 'bg-[#0081FB]/10'
                                        : ''
                                    }`}
                                  >
                                    <span
                                      className={`font-medium ${version.originalIndex === selectedVersion ? 'text-[#0081FB]' : 'text-gray-900 dark:text-white'}`}
                                    >
                                      {version.version}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600 dark:text-white/50 font-medium flex items-center gap-1">
                                        <Icon icon="mdi:download" className="w-3.5 h-3.5" />
                                        {formatDownloadCount(version.downloadCount || 0)}
                                      </span>
                                      {version.isSupportedV76 && (
                                        <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
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
                          {currentVersionPartCount > 1 ? (
                            areAllPartsDownloaded() ? (
                              <button
                                onClick={handleDeleteAllParts}
                                disabled={isDownloading || isInstalling}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex items-center justify-center gap-2"
                              >
                                <Icon icon="mdi:delete-sweep" className="w-5 h-5" />
                                {t('delete_all_files') || 'Delete All Downloaded Files'}
                              </button>
                            ) : (
                              <button
                                onClick={handleDownload}
                                disabled={
                                  currentVersionPartCount === 0 || isDownloading || isInstalling
                                }
                                className="w-full py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex flex-col items-center justify-center gap-1"
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
                                      <span className="text-xs text-white/90 font-normal">
                                        {t('some_parts_downloaded') ||
                                          'Some parts already downloaded'}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            )
                          ) : currentVersionPartCount === 1 && isFileDownloaded(null) ? (
                            // Single file ALREADY downloaded → [Hapus File] + [Instal Game] in flex-row
                            <div className="flex flex-row gap-3">
                              <button
                                onClick={() => handleDeleteFile(null)}
                                disabled={
                                  isDownloading || (showWidget && !downloadComplete) || isInstalling
                                }
                                className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex items-center justify-center gap-2"
                              >
                                <Icon icon="mdi:delete" className="w-5 h-5" />
                                {t('delete_file') || 'Delete File'}
                              </button>
                              <button
                                onClick={handleDownloadAndInstall}
                                disabled={
                                  !connectedDevice ||
                                  currentVersionPartCount === 0 ||
                                  isDownloading ||
                                  isInstalling
                                }
                                className="flex-1 py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex items-center justify-center gap-2"
                              >
                                {isInstalling ? (
                                  <div className="flex items-center gap-2">
                                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                                    {t('installing') || 'Installing...'}
                                  </div>
                                ) : (
                                  <>
                                    <Icon icon="bi:headset-vr" className="w-5 h-5" />
                                    {t('install_game') || 'Install Game'}
                                    {connectedDevice && deviceModel && (
                                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                                        {deviceModel}
                                      </span>
                                    )}
                                    {!connectedDevice && (
                                      <span className="text-[10px] opacity-60">
                                        {t('no_device_connected') || 'No device'}
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
                                currentVersionPartCount === 0 || isDownloading || isInstalling
                              }
                              className="w-full py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex items-center justify-center gap-2"
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
                                  <Icon icon="bi:headset-vr" className="w-5 h-5" />
                                  {t('download_and_install') || 'Download & Install to Quest'}
                                  {deviceModel && (
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                                      {deviceModel}
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
                                currentVersionPartCount === 0 || isDownloading || isInstalling
                              }
                              className="w-full py-3.5 bg-[#0081FB] hover:bg-[#0070e0] disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-white/50 rounded-xl font-medium text-base disabled:shadow-none transition-all flex items-center justify-center gap-2"
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
                          className="w-full py-3.5 bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-white/50 rounded-xl font-medium text-base cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:clock-outline" className="w-5 h-5" />
                          {t('coming_soon') || 'Coming Soon'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-xl text-center text-gray-500 dark:text-white/50 text-sm">
                    {!user
                      ? t('login_required') || 'Please login to download'
                      : t('not_eligible') || 'You are not eligible to access downloads'}
                  </div>
                )}

                {/* Update & Report Buttons */}
                {user && canAccessDownload && gameStatus !== 'coming_soon' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowUpdateDialog(true)}
                      className="flex-1 py-2.5 px-4 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-yellow-500/20"
                    >
                      <Icon icon="mdi:update" className="w-4 h-4" />
                      {t('request_type_update') || 'Request Update'}
                    </button>
                    <button
                      onClick={() => setShowReportDialog(true)}
                      className="flex-1 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 border border-red-500/20"
                    >
                      <Icon icon="mdi:alert-circle" className="w-4 h-4" />
                      {t('request_type_report') || 'Report Issue'}
                    </button>
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
                    className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                  >
                    <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-white/10">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {t('download_parts') || 'Download Parts'}
                      </h3>
                      <button
                        onClick={() => setShowDownloadParts(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Icon
                          icon="mdi:close"
                          className="w-5 h-5 text-gray-500 dark:text-white/60"
                        />
                      </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                        {t('download_all_parts_warning') ||
                          'You must download all parts for the game to work!'}
                      </p>

                      {/* Download Progress */}
                      {isDownloading && (
                        <div className="mb-4 p-3 rounded-xl border border-[#0081FB]/30 bg-[#0081FB]/5">
                          <p className="text-sm text-gray-800 dark:text-white/80 mb-2 truncate">
                            {downloadInfo.fileName}
                          </p>

                          {downloadInfo.status === 'downloading' && downloadInfo.totalBytes > 0 ? (
                            <>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/50 mb-1">
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
                              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                                <div
                                  className="h-full bg-linear-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, (downloadInfo.downloadedBytes / downloadInfo.totalBytes) * 100)}%`
                                  }}
                                />
                              </div>
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
                            </>
                          ) : (
                            <div className="flex items-center justify-center py-2">
                              <Icon
                                icon="mdi:loading"
                                className="h-6 w-6 animate-spin text-[#0081FB]"
                              />
                              <span className="ml-2 text-sm text-gray-500 dark:text-white/60">
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
                            className="mt-3 w-full py-2 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
                                  : 'border-gray-200 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-[#0081FB]/10 hover:border-blue-300 dark:hover:border-[#0081FB]/30'
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
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    Part {idx + 1}
                                  </span>
                                  {partDownloaded && fileInfo?.size && (
                                    <span className="text-[10px] text-green-700 dark:text-green-400">
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
                                    onClick={() => openDownloadLink(idx)}
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
                    className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 shadow-2xl"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-full bg-red-500/20">
                        <Icon icon="mdi:delete-alert" className="w-6 h-6 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('delete_confirm_title') || 'Delete Downloaded File?'}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-white/60">
                      {confirmDelete.isMultiple
                        ? t('delete_confirm_desc_multiple') ||
                          'You are about to delete the following files:'
                        : t('delete_confirm_desc') || 'You are about to delete:'}
                    </p>
                    <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      {confirmDelete.isMultiple ? (
                        <div className="space-y-1">
                          {confirmDelete.files.map((file, idx) => (
                            <p
                              key={idx}
                              className="font-mono text-sm text-gray-700 dark:text-white/80 truncate"
                            >
                              {file}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="font-mono text-sm text-gray-700 dark:text-white/80 truncate">
                          {confirmDelete.fileName}
                        </p>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                      {t('delete_warning') || 'This action cannot be undone.'}
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-600 dark:text-white/70 transition-all hover:bg-gray-100 dark:hover:bg-white/5"
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
                    className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('install_confirm_title') || 'Download & Install'}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
                      {t('install_confirm_desc') ||
                        'This will download and install the APK directly to your Meta Quest device:'}
                    </p>
                    <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                      <p className="font-medium text-gray-900 dark:text-white">{gameTitle}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
                        {t('qgo_version') || 'Version'}: {currentVersion.version || gameVersion}
                      </p>
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#0081FB]/25 bg-[#0081FB]/10 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0081FB] text-white shadow-lg shadow-[#0081FB]/20">
                          <Icon icon="bi:headset-vr" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#0081FB]">
                            {t('connected_device') || 'Device Connected'}
                          </p>
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {deviceModel || connectedDevice}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmInstall(null)}
                        className="rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-600 dark:text-white/70 transition-all hover:bg-gray-100 dark:hover:bg-white/5"
                      >
                        {t('cancel') || 'Cancel'}
                      </button>
                      <button
                        onClick={handleConfirmInstall}
                        className="rounded-lg bg-linear-to-r from-[#0081FB] to-[#00C2FF] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#0081FB]/20 transition-all hover:shadow-xl"
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
                    className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6"
                  >
                    {/* Header with minimize button */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                        title={t('minimize') || 'Minimize to widget'}
                      >
                        <Icon icon="octicon:minimize-16" className="h-5 w-5" />
                      </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-white/60">{gameTitle}</p>

                    {/* Show actual filename from Google Drive with extension badge */}
                    {installProgress.gdFileName && (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-gray-400 dark:text-white/40 truncate flex-1">
                          {installProgress.gdFileName}
                        </p>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            installProgress.gdFileName.toLowerCase().endsWith('.rar')
                              ? 'bg-[#0081FB]/20 text-[#0081FB] border border-[#0081FB]/30'
                              : installProgress.gdFileName.toLowerCase().endsWith('.7z')
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {installProgress.gdFileName.split('.').pop()?.toUpperCase() || 'ZIP'}
                        </span>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-white/50">
                        <span>{installProgress.detail}</span>
                        <span>{Math.round(installProgress.percent)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                        <div
                          className="h-full bg-linear-to-r from-[#0081FB] to-[#00C2FF] transition-all duration-300"
                          style={{ width: `${installProgress.percent}%` }}
                        />
                      </div>

                      {/* Speed and progress info for download phase */}
                      {installProgress.step === 'DOWNLOADING' && installProgress.totalBytes > 0 && (
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-white/50">
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
                          className="mt-3 w-full py-2 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Icon icon="mdi:close-circle" className="w-4 h-4" />
                          {t('cancel_download_install') || 'Cancel Download & Install'}
                        </button>
                      )}
                    </div>

                    {/* Status info */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-white/70">
                      {installProgress.step === 'COMPLETED' ? (
                        <>
                          <Icon icon="mdi:check-circle" className="h-5 w-5 text-[#0081FB]" />
                          <span>{t('install_success') || 'Installation complete!'}</span>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="mdi:loading"
                            className="h-5 w-5 animate-spin text-[#0081FB]"
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
        </motion.div>
      )}

      {/* Update Game Dialog */}
      <UpdateGameDialog
        isOpen={showUpdateDialog}
        onClose={() => setShowUpdateDialog(false)}
        gameTitle={gameTitle}
        currentVersion={getCurrentVersion()?.version || gameVersion}
        onSubmit={() => setShowUpdateDialog(false)}
      />

      {/* Report Game Dialog */}
      <ReportGameDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        gameTitle={gameTitle}
        gameVersion={getCurrentVersion()?.version || gameVersion}
        onSubmit={() => setShowReportDialog(false)}
      />
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
