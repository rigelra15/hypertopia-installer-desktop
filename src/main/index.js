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
    title: 'HyperTopia Installer',
    icon: icon, // Explicitly set icon for Windows dev mode
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

// IPC: Get App Version (Git Commit Count & Date)
ipcMain.handle('get-app-version', async () => {
  return new Promise((resolve) => {
    // 1. Get Commit Count for Version (1.0.X)
    exec('git rev-list --count HEAD', (errCount, stdoutCount) => {
      if (errCount) {
        console.warn('Git version check failed:', errCount)
        return resolve({ version: '1.0.0', build: 'DEV' })
      }

      const commitCount = stdoutCount.trim()
      const dynamicVersion = `1.0.${commitCount}`

      // 2. Get Commit Date for Build Number (YYYYMMDD)
      exec('git log -1 --format=%cd --date=format:%Y%m%d', (errDate, stdoutDate) => {
        const buildDate = errDate ? 'UNKNOWN' : stdoutDate.trim()
        resolve({ version: dynamicVersion, build: buildDate })
      })
    })
  })
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.hypertopia.installer')

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

const fs = require('fs-extra')
const os = require('os')

// Helper: Extract APK from ZIP
function extractApkFromZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)

      let apkFound = false

      zipfile.readEntry()
      zipfile.on('entry', (entry) => {
        const lowerName = entry.fileName.toLowerCase()
        if (lowerName.endsWith('.apk')) {
          apkFound = true
          // Found APK, extract it
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err)

            const tempDir = path.join(os.tmpdir(), 'hypertopia-installer')
            fs.ensureDirSync(tempDir)

            // Generate a safe filename (flattening the path)
            const safeName = path.basename(entry.fileName)
            const tempFilePath = path.join(tempDir, safeName)
            const writeStream = fs.createWriteStream(tempFilePath)

            readStream.pipe(writeStream)

            writeStream.on('finish', () => {
              zipfile.close()
              resolve(tempFilePath)
            })

            writeStream.on('error', (err) => {
              zipfile.close()
              reject(err)
            })
          })
        } else {
          zipfile.readEntry()
        }
      })

      zipfile.on('end', () => {
        if (!apkFound) {
          reject(new Error('No APK found inside the archive'))
        }
      })

      zipfile.on('error', (err) => reject(err))
    })
  })
}

// IPC: Install Game
ipcMain.handle('install-game', async (event, { filePath, type, deviceSerial }) => {
  const adb = getAdbPath()
  const safeAdb = `"${adb}"`
  const deviceFlag = deviceSerial ? `-s ${deviceSerial}` : ''

  let targetPath = filePath
  let needsCleanup = false

  try {
    // Check if it's a ZIP/RAR that needs extraction
    const lowerPath = filePath.toLowerCase()
    if (lowerPath.endsWith('.zip') || lowerPath.endsWith('.rar')) {
      console.log('Detected archive, extracting APK...')
      targetPath = await extractApkFromZip(filePath)
      needsCleanup = true
      console.log('Extracted APK to:', targetPath)
    }

    if (type === 'apk') {
      const safeFilePath = `"${targetPath}"`
      const command = `${safeAdb} ${deviceFlag} install -r ${safeFilePath}`
      console.log('Running:', command)

      return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          // Cleanup temp file if needed
          if (needsCleanup) {
            fs.unlink(targetPath).catch(console.error)
          }

          if (error) {
            console.error('ADB Error:', stderr)
            return reject(new Error(stderr || error.message))
          }
          resolve(stdout)
        })
      })
    } else {
      // OBB / Full Install logic here (skipped for now, placeholder)
      throw new Error(
        'Full OBB install not yet supported automatically. Please copy OBB manually for now.'
      )
    }
  } catch (err) {
    if (needsCleanup) {
      fs.unlink(targetPath).catch(console.error)
    }
    throw err
  }
})

// FUNGSI SCAN ZIP
ipcMain.handle('scan-zip', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    let result = {
      hasApk: false,
      hasObb: false,
      apkName: null,
      obbFolder: null
    }

    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('Error buka zip:', err)
        return resolve(result) // Return false semua kalau error
      }

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName
        const lowerName = fileName.toLowerCase()

        // Cek APK
        if (lowerName.endsWith('.apk') && !result.hasApk) {
          result.hasApk = true
          result.apkName = fileName.split('/').pop() // Get just the filename
        }

        // Cek OBB (File .obb atau folder Android/obb)
        if ((lowerName.endsWith('.obb') || lowerName.includes('/obb/')) && !result.hasObb) {
          result.hasObb = true
          // Try to get the folder name that contains the OBB
          const parts = fileName.split('/')
          const obbIndex = parts.findIndex((p) => p.toLowerCase() === 'obb')
          if (obbIndex !== -1 && parts[obbIndex + 1]) {
            result.obbFolder = parts[obbIndex + 1] // Usually com.package.name
          } else if (lowerName.endsWith('.obb')) {
            // Fallback if structure is weird, just get the parent folder
            result.obbFolder = parts.length > 1 ? parts[parts.length - 2] : 'Detected'
          }
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

// IPC: List OBB Folders
ipcMain.handle('list-obb', async (event, deviceSerial) => {
  return new Promise((resolve) => {
    const adb = getAdbPath()
    const safeAdb = `"${adb}"`
    // Add -s <serial> if deviceSerial provided
    const deviceFlag = deviceSerial ? `-s ${deviceSerial}` : ''

    // List directories provided by 'ls -F' (directories append /)
    const command = `${safeAdb} ${deviceFlag} shell ls -F /sdcard/Android/obb/`

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.warn('ADB List OBB Error (maybe no device?):', stderr || error.message)
        return resolve([]) // Return empty array on error/no device
      }

      // Parse stdout
      const files = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.endsWith('/')) // Only directories
        .map((line) => line.slice(0, -1)) // Remove trailing slash

      resolve(files)
    })
  })
})

// IPC: List Connected Devices
ipcMain.handle('list-devices', async () => {
  return new Promise((resolve) => {
    const adb = getAdbPath()
    const safeAdb = `"${adb}"`
    const command = `${safeAdb} devices -l`

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('ADB List Devices Error:', stderr)
        return resolve([])
      }

      // Parse output
      // Example:
      // List of devices attached
      // 1234567890          device product:quest2 model:Quest_2 device:hollywood_1
      const devices = []
      const lines = stdout.split('\n')

      for (const line of lines) {
        if (!line.trim() || line.startsWith('List of devices')) continue

        // Split by whitespace
        const parts = line.split(/\s+/)
        if (parts.length < 2) continue

        const serial = parts[0]
        const state = parts[1] // device, offline, unauthorized

        // Capture extra info like model:Quest_2
        const modelPart = parts.find((p) => p.startsWith('model:'))
        const model = modelPart ? modelPart.replace('model:', '') : 'Unknown'

        const productPart = parts.find((p) => p.startsWith('product:'))
        const product = productPart ? productPart.replace('product:', '') : 'Android'

        devices.push({ serial, state, model, product })
      }

      resolve(devices)
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
