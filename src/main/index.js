import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import yauzl from 'yauzl'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// FUNGSI SCAN ZIP
const { exec } = require('child_process')
const path = require('path')

// Helper: Get ADB Path
function getAdbPath() {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '../../resources/platform-tools/adb')
  }
  return path.join(process.resourcesPath, 'platform-tools/adb')
}

// IPC: Install Game
ipcMain.handle('install-game', async (event, { filePath, type }) => {
  return new Promise((resolve, reject) => {
    const adb = getAdbPath()
    // Quote paths to handle spaces
    const safeAdb = `"${adb}"`
    const safeFilePath = `"${filePath}"`

    if (type === 'apk') {
      const command = `${safeAdb} install -r ${safeFilePath}`
      console.log('Running:', command)

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('ADB Error:', stderr)
          return reject(new Error(stderr || error.message))
        }
        resolve(stdout)
      })
    } else {
      // OBB / Full Install logic here (skipped for now, placeholder)
      reject(
        new Error(
          'Full OBB install not yet supported automatically. Please copy OBB manually for now.'
        )
      )
    }
  })
})

// FUNGSI SCAN ZIP
ipcMain.handle('scan-zip', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    let result = { hasApk: false, hasObb: false }

    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('Error buka zip:', err)
        return resolve(result) // Return false semua kalau error
      }

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName.toLowerCase()
        // Cek APK
        if (fileName.endsWith('.apk')) {
          result.hasApk = true
        }
        // Cek OBB (File .obb atau folder Android/obb)
        if (fileName.endsWith('.obb') || fileName.includes('/obb/')) {
          result.hasObb = true
        }

        // Optimization: Kalau dua-duanya udah ketemu, stop aja biar cepet
        if (result.hasApk && result.hasObb) {
          zipfile.close()
          return resolve(result)
        }

        zipfile.readEntry() // Baca file selanjutnya
      })

      zipfile.on('end', () => {
        resolve(result) // Selesai baca semua
      })

      zipfile.on('error', (err) => reject(err))
    })
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
