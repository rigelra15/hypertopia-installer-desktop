import { contextBridge, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  scanZip: (filePath) => ipcRenderer.invoke('scan-zip', filePath),
  getFilePath: (file) => {
    // Debug logging

    // Try webUtils.getPathForFile first (new Electron API)
    try {
      const webUtilsPath = webUtils.getPathForFile(file)
      if (webUtilsPath && webUtilsPath.length > 0) {
        return webUtilsPath
      }
    } catch (err) {
      console.error('[getFilePath] webUtils.getPathForFile error:', err)
    }

    // Fallback to file.path (older Electron / some browsers)
    if (file?.path && file.path.length > 0) {
      return file.path
    }

    console.error('[getFilePath] Could not resolve file path')
    return null
  },
  installGame: (filePath, type, deviceSerial) =>
    ipcRenderer.invoke('install-game', { filePath, type, deviceSerial }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDeviceInfo: () => ipcRenderer.invoke('get-device-info'),
  getLatestRelease: () => ipcRenderer.invoke('get-latest-release'),
  listObb: (deviceSerial) => ipcRenderer.invoke('list-obb', deviceSerial),
  listDevices: () => ipcRenderer.invoke('list-devices'),
  selectExtractFolder: () => ipcRenderer.invoke('select-extract-folder'),
  ensureExtractFolder: (folderPath) => ipcRenderer.invoke('ensure-extract-folder', folderPath),
  getDiskSpace: (folderPath) => ipcRenderer.invoke('get-disk-space', folderPath),
  moveExtractFolder: (oldPath) => ipcRenderer.invoke('move-extract-folder', oldPath),
  listApps: (deviceSerial) => ipcRenderer.invoke('list-apps', deviceSerial),
  uninstallApp: (deviceSerial, packageName) =>
    ipcRenderer.invoke('uninstall-app', deviceSerial, packageName),
  clearAppData: (deviceSerial, packageName) =>
    ipcRenderer.invoke('clear-app-data', deviceSerial, packageName),
  // New APIs for folder selection
  selectGameFolder: () => ipcRenderer.invoke('select-game-folder'),
  selectArchiveFile: () => ipcRenderer.invoke('select-archive-file'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  installGameFolder: (folderPath, type, deviceSerial) =>
    ipcRenderer.invoke('install-game-folder', { folderPath, type, deviceSerial }),
  onInstallProgress: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('install-progress', subscription)
    return () => ipcRenderer.removeListener('install-progress', subscription)
  },
  // Cancel installation API
  cancelInstallation: () => ipcRenderer.invoke('cancel-installation'),
  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  setAutoDownload: (enabled) => ipcRenderer.invoke('set-auto-download', enabled),
  onUpdateAvailable: (callback) => {
    const subscription = (_event, info) => callback(info)
    ipcRenderer.on('update-available', subscription)
    return () => ipcRenderer.removeListener('update-available', subscription)
  },
  onUpdateAvailableMac: (callback) => {
    const subscription = (_event, info) => callback(info)
    ipcRenderer.on('update-available-mac', subscription)
    return () => ipcRenderer.removeListener('update-available-mac', subscription)
  },
  onUpdateDownloadProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress)
    ipcRenderer.on('update-download-progress', subscription)
    return () => ipcRenderer.removeListener('update-download-progress', subscription)
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, info) => callback(info)
    ipcRenderer.on('update-downloaded', subscription)
    return () => ipcRenderer.removeListener('update-downloaded', subscription)
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on('update-not-available', subscription)
    return () => ipcRenderer.removeListener('update-not-available', subscription)
  },
  // Google OAuth APIs
  googleSignIn: () => ipcRenderer.invoke('google-sign-in'),
  googleSignInPopup: () => ipcRenderer.invoke('google-sign-in-popup'),
  googleSignOut: () => ipcRenderer.invoke('google-sign-out'),
  onAuthCallback: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('auth-callback', subscription)
    return () => ipcRenderer.removeListener('auth-callback', subscription)
  },
  // Shell utilities
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
  // Download file with progress
  downloadFile: (url, fileName) => ipcRenderer.invoke('download-file', { url, fileName }),
  onDownloadProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress)
    ipcRenderer.on('download-progress', subscription)
    return () => ipcRenderer.removeListener('download-progress', subscription)
  },
  // Cancel download API
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  // Download and install APK to device
  downloadAndInstallApk: (url, fileName, deviceSerial) =>
    ipcRenderer.invoke('download-and-install-apk', { url, fileName, deviceSerial }),
  // Download and install archive (ZIP/RAR) to device - handles APK + OBB
  downloadAndInstallArchive: (url, fileName, deviceSerial) =>
    ipcRenderer.invoke('download-and-install-archive', { url, fileName, deviceSerial }),
  onInstallApkProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress)
    ipcRenderer.on('install-apk-progress', subscription)
    return () => ipcRenderer.removeListener('install-apk-progress', subscription)
  },
  // Check which files are already downloaded
  checkDownloadedFiles: (fileNames) => ipcRenderer.invoke('check-downloaded-files', { fileNames }),
  // List all downloaded files in Downloads folder
  listDownloadedFiles: () => ipcRenderer.invoke('list-downloaded-files'),
  // Delete a downloaded file
  deleteDownloadedFile: (fileName) => ipcRenderer.invoke('delete-downloaded-file', { fileName }),
  // Clear all files in the Downloads folder
  clearDownloadsFolder: () => ipcRenderer.invoke('clear-downloads-folder'),
  // Install a local APK file to device
  installLocalApk: (filePath, deviceSerial) =>
    ipcRenderer.invoke('install-local-apk', { filePath, deviceSerial }),
  // Desktop capturer for screen sharing
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  // Deep link download from website
  onDeepLinkDownload: (callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on('deep-link-download', subscription)
    return () => ipcRenderer.removeListener('deep-link-download', subscription)
  },
  // ── Persistent file-based store ──
  // Reads a JSON file from app userData directory. Returns parsed object/array, or null if not found.
  storeRead: (fileName) => ipcRenderer.invoke('store-read', fileName),
  // Writes data as pretty-printed JSON to app userData directory.
  storeWrite: (fileName, data) => ipcRenderer.invoke('store-write', fileName, data),
  // Secure API proxy — secret never leaves main process
  apiFetch: (path, options) => ipcRenderer.invoke('api-fetch', { path, options })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
