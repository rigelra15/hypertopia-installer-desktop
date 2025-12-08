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
  listDevices: () => ipcRenderer.invoke('list-devices')
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
