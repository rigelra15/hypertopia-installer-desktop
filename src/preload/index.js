import { contextBridge, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  scanZip: (filePath) => ipcRenderer.invoke('scan-zip', filePath),
  getFilePath: (file) => webUtils.getPathForFile(file),
  installGame: (filePath, type, deviceSerial) =>
    ipcRenderer.invoke('install-game', { filePath, type, deviceSerial }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  listObb: (deviceSerial) => ipcRenderer.invoke('list-obb', deviceSerial),
  listDevices: () => ipcRenderer.invoke('list-devices'),
  selectExtractFolder: () => ipcRenderer.invoke('select-extract-folder'),
  getDiskSpace: (folderPath) => ipcRenderer.invoke('get-disk-space', folderPath),
  moveExtractFolder: (oldPath) => ipcRenderer.invoke('move-extract-folder', oldPath),
  listApps: (deviceSerial) => ipcRenderer.invoke('list-apps', deviceSerial),
  uninstallApp: (deviceSerial, packageName) =>
    ipcRenderer.invoke('uninstall-app', deviceSerial, packageName),
  onInstallProgress: (callback) => {
    const subscription = (_event, value) => callback(value)
    ipcRenderer.on('install-progress', subscription)
    return () => ipcRenderer.removeListener('install-progress', subscription)
  },
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
  onUpdateDownloadProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress)
    ipcRenderer.on('update-download-progress', subscription)
    return () => ipcRenderer.removeListener('update-download-progress', subscription)
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, info) => callback(info)
    ipcRenderer.on('update-downloaded', subscription)
    return () => ipcRenderer.removeListener('update-downloaded', subscription)
  }
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
