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
const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs-extra')
const os = require('os')

// Helper: Get ADB Path
function getAdbPath() {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '../../resources/platform-tools/adb')
  }
  return path.join(process.resourcesPath, 'platform-tools/adb')
}

// Helper: Extract ZIP with Progress
function extractZipWithProgress(zipPath, targetDir, onProgress) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)

      let totalSize = 0
      let entriesToExtract = []

      // Pass 1: Calculate total size and find relevant files
      zipfile.on('entry', (entry) => {
        totalSize += entry.uncompressedSize
        entriesToExtract.push(entry)
        zipfile.readEntry()
      })

      zipfile.on('end', () => {
        processEntries(entriesToExtract)
      })

      zipfile.readEntry()

      function processEntries(entries) {
        if (entries.length === 0) {
          return resolve(true)
        }

        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile2) => {
          if (err) return reject(err)

          let currentExtracted = 0

          zipfile2.readEntry()
          zipfile2.on('entry', (entry) => {
            const isApk = entry.fileName.toLowerCase().endsWith('.apk')
            const isObb = entry.fileName.toLowerCase().endsWith('.obb')

            if (isApk || isObb) {
              zipfile2.openReadStream(entry, (err, readStream) => {
                if (err) return reject(err)

                const safePath = path.join(targetDir, entry.fileName)

                // Ensure dir exists
                if (/\/$/.test(entry.fileName)) {
                  // Directory
                  fs.ensureDirSync(safePath)
                  zipfile2.readEntry()
                  return
                }

                fs.ensureDirSync(path.dirname(safePath))
                const writeStream = fs.createWriteStream(safePath)

                readStream.on('data', (chunk) => {
                  currentExtracted += chunk.length
                  if (onProgress) onProgress(currentExtracted, totalSize, entry.fileName)
                  writeStream.write(chunk)
                })

                readStream.on('end', () => {
                  writeStream.end()
                  zipfile2.readEntry()
                })
              })
            } else {
              zipfile2.readEntry()
            }
          })

          zipfile2.on('end', () => resolve())
        })
      }
    })
  })
}

// Helper: Run ADB Command with Spawn
function runAdbCommand(args, onOutput) {
  return new Promise((resolve, reject) => {
    const adb = getAdbPath()
    const child = spawn(adb, args)

    child.stdout.on('data', (data) => {
      if (onOutput) onOutput(data.toString())
    })

    child.stderr.on('data', (data) => {
      if (onOutput) onOutput(data.toString())
    })

    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ADB exited with code ${code}`))
    })
  })
}

// IPC: Install Game
ipcMain.handle('install-game', async (event, { filePath, type, deviceSerial }) => {
  const deviceFlag = deviceSerial ? ['-s', deviceSerial] : []
  const tempDir = path.join(os.tmpdir(), 'hypertopia_install_' + Date.now())

  const sendProgress = (step, percent, detail) => {
    event.sender.send('install-progress', { step, percent, detail })
  }

  try {
    sendProgress('INITIALIZING', 0, 'Preparing...')
    fs.ensureDirSync(tempDir)

    let apkPath = null
    let obbPath = null

    // 1. EXTRACTION
    if (filePath.toLowerCase().endsWith('.zip') || filePath.toLowerCase().endsWith('.rar')) {
      sendProgress('EXTRACTING', 0, 'Scanning archive...')

      await extractZipWithProgress(filePath, tempDir, (current, total, fileName) => {
        const percent = total > 0 ? Math.floor((current / total) * 100) : 0
        sendProgress('EXTRACTING', percent, `Extracting: ${fileName}`)
      })

      const findFileByExt = (dir, ext) => {
        const ent = fs.readdirSync(dir, { withFileTypes: true })
        for (const dirent of ent) {
          const res = path.resolve(dir, dirent.name)
          if (dirent.isDirectory()) {
            const found = findFileByExt(res, ext)
            if (found) return found
          } else if (res.toLowerCase().endsWith(ext)) {
            return res
          }
        }
        return null
      }

      apkPath = findFileByExt(tempDir, '.apk')

      const findObbParent = (dir) => {
        const ent = fs.readdirSync(dir, { withFileTypes: true })
        for (const dirent of ent) {
          const res = path.resolve(dir, dirent.name)
          if (dirent.isDirectory()) {
            const children = fs.readdirSync(res)
            if (children.some((c) => c.toLowerCase().endsWith('.obb'))) {
              return res
            }
            const found = findObbParent(res)
            if (found) return found
          }
        }
        return null
      }

      obbPath = findObbParent(tempDir)
    } else {
      apkPath = filePath
    }

    if (!apkPath) throw new Error('No APK found to install.')

    // 2. INSTALL APK
    sendProgress('INSTALLING_APK', 0, 'Pushing APK to device...')

    const remoteApk = `/data/local/tmp/base.apk`
    await runAdbCommand([...deviceFlag, 'push', apkPath, remoteApk], (output) => {
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING_APK', parseInt(match[1]), 'Pushing APK...')
      }
    })

    sendProgress('INSTALLING_APK', 100, 'Installing package...')
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    // 3. PUSH OBB
    if (type === 'full' && obbPath) {
      sendProgress('PUSHING_OBB', 0, 'Preparing OBB...')
      // const folderName = path.basename(obbPath)
      // We push TO obb folder, so we list existing as parent

      await runAdbCommand([...deviceFlag, 'push', obbPath, '/sdcard/Android/obb/'], (output) => {
        const match = output.match(/\[\s*(\d+)%\]/)
        const fileMatch = output.match(/: ([^\s]+)/)
        const detail = fileMatch ? `Copying: ${path.basename(fileMatch[1])}` : `Copying OBB...`

        if (match) {
          sendProgress('PUSHING_OBB', parseInt(match[1]), detail)
        }
      })
    }

    sendProgress('COMPLETED', 100, 'Installation Finished!')
  } catch (err) {
    console.error(err)
    sendProgress('ERROR', 0, err.message)
    throw err
  } finally {
    fs.remove(tempDir).catch(console.warn)
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

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('ADB List Devices Error:', stderr)
        return resolve([])
      }

      const lines = stdout.split('\n')
      const devices = []

      for (const line of lines) {
        if (!line.trim() || line.startsWith('List of devices')) continue

        const parts = line.split(/\s+/)
        if (parts.length < 2) continue

        const serial = parts[0]
        const state = parts[1]

        let model = 'Unknown'
        const modelPart = parts.find((p) => p.startsWith('model:'))
        if (modelPart) {
          model = modelPart.replace('model:', '').replace(/_/g, ' ')
          // Add "Meta" prefix if it's a Quest device and doesn't have it
          if (model.includes('Quest') && !model.includes('Meta')) {
            model = 'Meta ' + model
          }
        }

        // Only fetch details if authorized
        let battery = 'N/A'
        let storage = { free: '0', total: '0', percent: '0' }

        if (state === 'device') {
          try {
            const deviceFlag = `-s ${serial}`

            // Run battery and storage checks in parallel
            const [batteryResult, storageResult] = await Promise.all([
              new Promise((res) => {
                // Remove grep for Windows compatibility
                exec(`${safeAdb} ${deviceFlag} shell dumpsys battery`, (err, out) => {
                  if (err) return res('N/A')
                  const match = out.match(/level:\s*(\d+)/)
                  res(match ? match[1] + '%' : 'N/A')
                })
              }),
              new Promise((res) => {
                // df /sdcard outputs: Filesystem 1K-blocks Used Available Use% Mounted on
                // We want human readable roughly, but df -h is safer on modern android.
                // If -h fails, we can parse blocks. Let's try simple df first and parse logic.
                // Actually df -h is standard on most androids now. Use df /sdcard for broader support and calculate?
                // Let's use df -h /sdcard for simplicity first.
                exec(`${safeAdb} ${deviceFlag} shell df -h /sdcard`, (err, out) => {
                  if (err) return res(storage)
                  // Parse second line
                  // Filesystem Size Used Avail Use% Mounted on
                  // /dev/fuse 100G 10G 90G 10% /storage/emulated
                  const lines = out.trim().split('\n')
                  if (lines.length >= 2) {
                    const stats = lines[1].split(/\s+/)
                    if (stats.length >= 5) {
                      res({
                        total: stats[1],
                        used: stats[2],
                        free: stats[3],
                        percent: stats[4]
                      })
                      return
                    }
                  }
                  res(storage)
                })
              })
            ])

            battery = batteryResult
            storage = storageResult
          } catch (e) {
            console.warn(`Failed to get details for ${serial}`, e)
          }
        }

        devices.push({ serial, state, model, battery, storage })
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
