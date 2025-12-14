import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec, spawn, execFile } from 'child_process'
import yauzl from 'yauzl' // For fast ZIP scanning
import unzipper from 'unzipper' // For ZIP extraction with progress
import { autoUpdater } from 'electron-updater'

// Configure auto-updater
// autoDownload is false by default - user can control via settings
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow = null

// Installation cancellation state
let installationState = {
  isCancelled: false,
  activeChildProcess: null,
  tempDir: null
}

// Reset installation state
function resetInstallationState() {
  installationState.isCancelled = false
  installationState.activeChildProcess = null
  installationState.tempDir = null
}

// Cancel installation handler
ipcMain.handle('cancel-installation', async () => {
  console.log('[Cancel] Cancellation requested')
  installationState.isCancelled = true

  // Kill active child process if exists
  if (installationState.activeChildProcess) {
    try {
      installationState.activeChildProcess.kill('SIGTERM')
      console.log('[Cancel] Killed active child process')
    } catch (err) {
      console.warn('[Cancel] Failed to kill child process:', err.message)
    }
  }

  // Cleanup temp directory if exists
  if (installationState.tempDir && fs.existsSync(installationState.tempDir)) {
    try {
      await fs.remove(installationState.tempDir)
      console.log('[Cancel] Cleaned up temp directory:', installationState.tempDir)
    } catch (err) {
      console.warn('[Cancel] Failed to cleanup temp dir:', err.message)
    }
  }

  resetInstallationState()
  return { success: true, message: 'Installation cancelled' }
})

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'HyperTopia Installer',
    icon: icon, // Explicitly set icon for Windows dev mode
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
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
// IPC: Get App Version (Git Commit Count & Date)
ipcMain.handle('get-app-version', async () => {
  // Production: Use the version from package.json and injected build date
  if (app.isPackaged) {
    // Build date is injected at build time via electron.vite.config.mjs
    // We need to read it from a file or environment, but since main process
    // doesn't have access to renderer's define, we'll use the build timestamp
    const buildDate =
      process.env.BUILD_DATE || new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return {
      version: app.getVersion(),
      build: buildDate
    }
  }

  // Development: Calculate dynamic version based on git
  return new Promise((resolve) => {
    // 1. Get Commit Count for Version (1.0.X)
    exec('git rev-list --count HEAD', (errCount, stdoutCount) => {
      if (errCount) {
        console.warn('Git version check failed:', errCount)
        return resolve({ version: app.getVersion(), build: 'DEV' })
      }

      const commitCount = stdoutCount.trim()

      // Get major.minor from package.json
      const currentVersion = app.getVersion() // 1.0.0
      const [major, minor] = currentVersion.split('.')
      const dynamicVersion = `${major}.${minor}.${commitCount}`

      // 2. Get Commit Date for Build Number (YYYYMMDD)
      exec('git log -1 --format=%cd --date=format:%Y%m%d', (errDate, stdoutDate) => {
        const buildDate = errDate ? 'UNKNOWN' : stdoutDate.trim()
        resolve({ version: dynamicVersion, build: buildDate })
      })
    })
  })
})

// IPC: Select Extract Folder
ipcMain.handle('select-extract-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Extract Folder',
    buttonLabel: 'Select Folder'
  })

  if (result.canceled) {
    return null
  }

  // Auto-create HyperTopiaExtraction subfolder
  const baseFolder = result.filePaths[0]
  const extractFolder = path.join(baseFolder, 'HyperTopiaExtraction')

  // Create folder if it doesn't exist
  try {
    await fs.ensureDir(extractFolder)
    console.log('[Folder] Created HyperTopiaExtraction folder at:', extractFolder)
  } catch (err) {
    console.error('[Folder] Error creating HyperTopiaExtraction folder:', err)
  }

  return extractFolder
})

// IPC: Get Disk Space for a path
ipcMain.handle('get-disk-space', async (event, folderPath) => {
  return new Promise((resolve) => {
    if (!folderPath) {
      return resolve({ total: '0 GB', free: '0 GB', used: '0 GB', percent: 0 })
    }

    // Cross-platform disk space check
    let command = ''

    if (process.platform === 'win32') {
      // Windows: Use PowerShell for better reliability
      const drive = folderPath.charAt(0)
      command = `powershell -Command "Get-PSDrive -Name ${drive} | Select-Object @{Name='Size';Expression={$_.Used + $_.Free}}, @{Name='Free';Expression={$_.Free}} | ConvertTo-Json"`
    } else if (process.platform === 'darwin' || process.platform === 'linux') {
      // macOS & Linux: Use df
      command = `df -k "${folderPath}"`
    }

    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.warn('Failed to get disk space:', error.message)
        console.warn('stderr:', stderr)
        return resolve({ total: '0 GB', free: '0 GB', used: '0 GB', percent: 0 })
      }

      try {
        let total = 0
        let free = 0

        if (process.platform === 'win32') {
          // Parse PowerShell JSON output
          console.log('PowerShell output:', stdout)
          const data = JSON.parse(stdout.trim())
          total = parseInt(data.Size) || 0
          free = parseInt(data.Free) || 0
        } else {
          // Parse Unix output (df -k)
          const lines = stdout.trim().split('\n')
          if (lines.length >= 2) {
            const parts = lines[1].split(/\s+/)
            // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
            total = parseInt(parts[1]) * 1024 // Convert KB to bytes
            free = parseInt(parts[3]) * 1024 // Convert KB to bytes
          }
        }

        const used = total - free
        const percent = total > 0 ? Math.round((used / total) * 100) : 0

        // Convert to human-readable format
        const formatBytes = (bytes) => {
          if (bytes === 0) return '0 GB'
          const gb = bytes / 1024 ** 3
          return gb.toFixed(1) + ' GB'
        }

        console.log('Disk space result:', { total, free, used, percent })

        resolve({
          total: formatBytes(total),
          free: formatBytes(free),
          used: formatBytes(used),
          percent: percent
        })
      } catch (parseErr) {
        console.warn('Failed to parse disk space:', parseErr.message)
        console.warn('stdout:', stdout)
        resolve({ total: '0 GB', free: '0 GB', used: '0 GB', percent: 0 })
      }
    })
  })
})

// IPC: Get Extract Path from localStorage (via webContents)
ipcMain.handle('get-extract-path', async (event) => {
  return new Promise((resolve) => {
    event.sender
      .executeJavaScript('localStorage.getItem("extractPath")')
      .then(resolve)
      .catch(() => resolve(null))
  })
})

// IPC: Move temp folders to new extract path
ipcMain.handle('move-extract-folder', async (event, oldPath) => {
  try {
    // Cleanup old temp folders in old path
    if (oldPath && (await fs.pathExists(oldPath))) {
      console.log('[Move] Cleaning up old extract path:', oldPath)
      const folders = await fs.readdir(oldPath)
      for (const folder of folders) {
        if (folder.startsWith('hypertopia_install_')) {
          const tempPath = path.join(oldPath, folder)
          try {
            await fs.remove(tempPath)
            console.log('[Move] Removed old temp folder:', tempPath)
          } catch (err) {
            console.warn('[Move] Failed to remove temp folder:', tempPath, err)
          }
        }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[Move] Error moving extract folder:', err)
    return { success: false, error: err.message }
  }
})

// Helper function to run ADB commands asynchronously
async function runAdbCommandAsync(args, serial = null) {
  return new Promise((resolve, reject) => {
    const adbPath = getAdbPath()
    const fullArgs = serial ? ['-s', serial, ...args] : args

    execFile(adbPath, fullArgs, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`ADB command failed: ${adbPath} ${fullArgs.join(' ')}`)
        console.error('stderr:', stderr)
        return reject(new Error(stderr || error.message))
      }
      resolve(stdout.trim())
    })
  })
}

// IPC: List Installed Apps
ipcMain.handle('list-apps', async (event, serial) => {
  try {
    // List third-party packages only
    const result = await runAdbCommandAsync(['shell', 'pm', 'list', 'packages', '-3'], serial)

    if (!result || result.trim() === '') {
      return []
    }

    const packages = result
      .split('\n')
      .filter((line) => line.startsWith('package:'))
      .map((line) => line.replace('package:', '').trim())
      .filter(Boolean)

    // Popular app package to name mapping
    const APP_NAME_MAP = {
      'com.beatgames.beatsaber': 'Beat Saber',
      'com.beatgames.beatpaber': 'Beat Saber (Modded)',
      'com.cloudheadgames.pistolwhip': 'Pistol Whip',
      'com.owlchemylabs.jobsimulator': 'Job Simulator',
      'com.polyarc.Moss2': 'Moss: Book II',
      'com.roblox.client': 'Roblox',
      'com.spotify.horizon': 'Spotify',
      'com.whatsapp': 'WhatsApp',
      'com.facebook.orca': 'Messenger',
      'com.oculus.facebook': 'Facebook',
      'com.google.android.apps.youtube.vr.oculus': 'YouTube VR',
      'com.enhanceexperience.tetriseffect': 'Tetris Effect',
      'com.valvesoftware.steamlinkvr': 'Steam Link',
      'com.mgatelabs.mobilevrstationthree': 'Mobile VR Station',
      'com.amazon.avod.thirdpartyclient': 'Prime Video',
      'com.titangamez.UBoatVR': 'UBoat VR',
      'com.rrrgames.ThiefSimVRQuest': 'Thief Simulator VR',
      'quest.eleven.forfunlabs': 'Eleven Table Tennis'
    }

    // Helper: Parse package name to readable format
    function packageToName(pkg) {
      // Check manual mapping first
      if (APP_NAME_MAP[pkg]) {
        return APP_NAME_MAP[pkg]
      }

      // Get last segment after final dot
      const parts = pkg.split('.')
      let name = parts[parts.length - 1]

      // Handle camelCase: insert space before capitals
      name = name.replace(/([a-z])([A-Z])/g, '$1 $2')

      // Capitalize first letter of each word
      name = name
        .split(/[\s_-]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return name
    }

    // Get app labels for each package
    const apps = []
    for (const pkg of packages) {
      try {
        let name = packageToName(pkg)
        let version = 'Unknown'

        // Get version from dumpsys (fast and reliable)
        try {
          const dumpResult = await runAdbCommandAsync(['shell', 'dumpsys', 'package', pkg], serial)
          const versionMatch = dumpResult.match(/versionName=([^\s]+)/)
          if (versionMatch) {
            version = versionMatch[1]
          }
        } catch {
          // Version extraction failed, keep 'Unknown'
        }

        apps.push({ package: pkg, name, version })
      } catch {
        apps.push({ package: pkg, name: packageToName(pkg), version: 'Unknown' })
      }
    }

    return apps.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error listing apps:', error)
    throw new Error(`Failed to list apps: ${error.message}`)
  }
})

// IPC: Uninstall App
ipcMain.handle('uninstall-app', async (event, serial, packageName) => {
  try {
    const result = await runAdbCommandAsync(['uninstall', packageName], serial)

    // ADB returns 'Success' if uninstall worked
    if (result.includes('Success')) {
      return { success: true, message: 'App uninstalled successfully' }
    } else {
      return { success: false, message: result || 'Uninstall failed' }
    }
  } catch (error) {
    console.error('Error uninstalling app:', error)
    return { success: false, message: error.message }
  }
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

  // Auto-updater events (only in production)
  if (app.isPackaged) {
    // Check for updates after window is ready
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version)
      if (mainWindow) {
        mainWindow.webContents.send('update-available', info)
      }
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] No updates available')
      if (mainWindow) {
        mainWindow.webContents.send('update-not-available')
      }
    })

    autoUpdater.on('download-progress', (progress) => {
      console.log('[AutoUpdater] Download progress:', progress.percent.toFixed(1) + '%')
      if (mainWindow) {
        mainWindow.webContents.send('update-download-progress', progress)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version)
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info)
      }
    })

    autoUpdater.on('error', (err) => {
      console.error('[AutoUpdater] Error:', err.message)
    })
  }

  // IPC: Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    if (app.isPackaged) {
      return autoUpdater.checkForUpdates()
    } else {
      // Direct dev simulation for UI testing
      console.log('[AutoUpdater] Dev mode: Simulating check...')
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.send('update-not-available')
        }
      }, 1000)
    }
    return null
  })

  // IPC: Start downloading update manually
  ipcMain.handle('download-update', async () => {
    if (app.isPackaged) {
      console.log('[AutoUpdater] Starting manual download...')
      autoUpdater.downloadUpdate()
      return true
    }
    return false
  })

  // IPC: Set auto-download setting
  ipcMain.handle('set-auto-download', (_, enabled) => {
    autoUpdater.autoDownload = enabled
    console.log('[AutoUpdater] Auto-download set to:', enabled)
    return enabled
  })

  // IPC: Install update and restart
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Auto Cleanup: Jalankan cleanup saat app start
  console.log('[Cleanup] Running startup cleanup...')
  cleanupOldTempFolders()

  // Auto Cleanup: Jalankan cleanup setiap 1 jam
  setInterval(
    () => {
      console.log('[Cleanup] Running scheduled cleanup...')
      cleanupOldTempFolders()
    },
    60 * 60 * 1000
  ) // 1 hour
})

// FUNGSI SCAN ZIP/RAR
import { createExtractorFromData } from 'node-unrar-js'
const path = require('path')
const fs = require('fs-extra')
const os = require('os')

// Auto Cleanup: Bersihkan folder temporary lama
async function cleanupOldTempFolders(customExtractPath = null) {
  try {
    // Cleanup from both OS temp and custom extract path
    const pathsToClean = [os.tmpdir()]
    if (customExtractPath && customExtractPath !== os.tmpdir()) {
      pathsToClean.push(customExtractPath)
    }

    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000 // 24 hours

    for (const extractBasePath of pathsToClean) {
      // Check if directory exists
      if (!fs.existsSync(extractBasePath)) continue

      const dirs = fs.readdirSync(extractBasePath, { withFileTypes: true })

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name.startsWith('hypertopia_install_')) {
          const fullPath = path.join(extractBasePath, dir.name)
          try {
            const stats = fs.statSync(fullPath)
            // Hapus folder yang lebih dari 24 jam
            if (stats.mtimeMs < oneDayAgo) {
              console.log(`[Cleanup] Removing old temp folder: ${dir.name} from ${extractBasePath}`)
              await fs.remove(fullPath)
            }
          } catch (err) {
            console.warn(`[Cleanup] Failed to check/remove ${dir.name}:`, err.message)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cleanup] Failed to cleanup old temp folders:', err.message)
  }
}

// Auto Cleanup: Bersihkan semua folder temporary saat app exit
async function cleanupAllTempFolders(customExtractPath = null) {
  try {
    // Cleanup from both OS temp and custom extract path
    const pathsToClean = [os.tmpdir()]
    if (customExtractPath && customExtractPath !== os.tmpdir()) {
      pathsToClean.push(customExtractPath)
    }

    for (const extractBasePath of pathsToClean) {
      if (!fs.existsSync(extractBasePath)) continue

      const dirs = fs.readdirSync(extractBasePath, { withFileTypes: true })

      for (const dir of dirs) {
        if (dir.isDirectory() && dir.name.startsWith('hypertopia_install_')) {
          const fullPath = path.join(extractBasePath, dir.name)
          try {
            console.log(
              `[Cleanup] Removing temp folder on exit: ${dir.name} from ${extractBasePath}`
            )
            await fs.remove(fullPath)
          } catch (err) {
            console.warn(`[Cleanup] Failed to remove ${dir.name}:`, err.message)
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cleanup] Failed to cleanup temp folders on exit:', err.message)
  }
}

// Helper: Get ADB Path
function getAdbPath() {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '../../resources/platform-tools/adb')
  }
  return path.join(process.resourcesPath, 'platform-tools/adb')
}

// Helper: Scan RAR for APK and OBB
async function scanRar(rarPath) {
  const buf = Uint8Array.from(fs.readFileSync(rarPath)).buffer
  const extractor = await createExtractorFromData({ data: buf })

  const list = extractor.getFileList()
  const fileHeaders = [...list.fileHeaders]

  let result = {
    hasApk: false,
    hasObb: false,
    apkName: null,
    obbFolder: null
  }

  for (const file of fileHeaders) {
    const fileName = file.name
    const lowerName = fileName.toLowerCase()

    // Cek APK
    if (lowerName.endsWith('.apk') && !result.hasApk) {
      result.hasApk = true
      result.apkName = fileName.split('/').pop().split('\\').pop()
    }

    // Cek OBB
    if (
      (lowerName.endsWith('.obb') ||
        lowerName.includes('/obb/') ||
        lowerName.includes('\\obb\\')) &&
      !result.hasObb
    ) {
      result.hasObb = true
      const parts = fileName.replace(/\\/g, '/').split('/')
      const obbIndex = parts.findIndex((p) => p.toLowerCase() === 'obb')
      if (obbIndex !== -1 && parts[obbIndex + 1]) {
        result.obbFolder = parts[obbIndex + 1]
      } else if (lowerName.endsWith('.obb')) {
        result.obbFolder = parts.length > 1 ? parts[parts.length - 2] : 'Detected'
      }
    }
  }

  return result
}

// Helper: Extract RAR with Progress
async function extractRarWithProgress(rarPath, targetDir, onProgress) {
  fs.ensureDirSync(targetDir)

  // Read RAR file into buffer
  const buf = Uint8Array.from(fs.readFileSync(rarPath)).buffer
  const extractor = await createExtractorFromData({ data: buf })

  // Get file list first to calculate total
  const list = extractor.getFileList()
  const fileHeaders = [...list.fileHeaders]
  const totalFiles = fileHeaders.filter(
    (f) => f.name.toLowerCase().endsWith('.apk') || f.name.toLowerCase().endsWith('.obb')
  ).length

  let extractedFiles = 0

  // Extract all files
  const extracted = extractor.extract()

  // Process extracted files
  for (const file of extracted.files) {
    const fileName = file.fileHeader.name
    const lowerName = fileName.toLowerCase()

    // Only save APK and OBB files
    if (lowerName.endsWith('.apk') || lowerName.endsWith('.obb')) {
      extractedFiles++

      if (onProgress) {
        onProgress(extractedFiles, totalFiles, fileName)
      }

      // Skip if it's a directory
      if (!file.fileHeader.flags.directory && file.extraction) {
        const outputPath = path.join(targetDir, fileName)
        fs.ensureDirSync(path.dirname(outputPath))
        fs.writeFileSync(outputPath, Buffer.from(file.extraction))
      }
    }
  }

  return true
}

// Helper: Extract ZIP with Progress (using unzipper)
function extractZipWithProgress(zipPath, targetDir, onProgress) {
  return new Promise((resolve, reject) => {
    const fileStream = require('fs').createReadStream(zipPath)
    let totalSize = 0
    let extractedSize = 0
    const relevantFiles = []

    // First pass: Calculate total size of APK and OBB files only
    fileStream
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        const fileName = entry.path
        const lowerName = fileName.toLowerCase()
        const isApk = lowerName.endsWith('.apk')
        const isObb = lowerName.endsWith('.obb')

        if (isApk || isObb) {
          totalSize += entry.vars.uncompressedSize
          relevantFiles.push({
            path: fileName,
            size: entry.vars.uncompressedSize
          })
        }
        entry.autodrain()
      })
      .on('close', () => {
        // Second pass: Extract files with progress tracking
        if (relevantFiles.length === 0) {
          return resolve(true)
        }

        const extractStream = require('fs').createReadStream(zipPath)
        extractStream
          .pipe(unzipper.Parse())
          .on('entry', (entry) => {
            const fileName = entry.path
            const lowerName = fileName.toLowerCase()
            const isApk = lowerName.endsWith('.apk')
            const isObb = lowerName.endsWith('.obb')

            if (isApk || isObb) {
              const safePath = path.join(targetDir, fileName)

              // Handle directories
              if (entry.type === 'Directory') {
                fs.ensureDirSync(safePath)
                entry.autodrain()
                return
              }

              // Extract file
              fs.ensureDirSync(path.dirname(safePath))
              const writeStream = fs.createWriteStream(safePath)

              entry.on('data', (chunk) => {
                extractedSize += chunk.length
                if (onProgress && totalSize > 0) {
                  onProgress(extractedSize, totalSize, fileName)
                }
              })

              entry.pipe(writeStream).on('finish', () => {
                writeStream.close()
              })
            } else {
              entry.autodrain()
            }
          })
          .on('close', () => resolve(true))
          .on('error', (err) => reject(err))
      })
      .on('error', (err) => reject(err))
  })
}

// Helper: Run ADB Command with Spawn (improved progress tracking + cancellation support)
function runAdbCommand(args, onOutput) {
  return new Promise((resolve, reject) => {
    // Check if already cancelled before starting
    if (installationState.isCancelled) {
      return reject(new Error('Installation cancelled'))
    }

    const adb = getAdbPath()

    // Add -p flag for progress when pushing files
    let finalArgs = args
    if (args[0] === 'push' || (args.length > 2 && args[2] === 'push')) {
      // Insert -p flag after 'push' for progress output
      const pushIndex = args.indexOf('push')
      if (pushIndex !== -1) {
        finalArgs = [...args]
        // -p is not needed, progress is shown by default, but ensure we capture it
      }
    }

    const child = spawn(adb, finalArgs, {
      // Force line-buffered output for better progress tracking
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Store child process reference for cancellation
    installationState.activeChildProcess = child

    // Collect output and parse progress more frequently
    let outputBuffer = ''
    let stderrBuffer = ''

    const processOutput = (data) => {
      const str = data.toString()
      outputBuffer += str

      // Process each line/chunk for progress
      if (onOutput) {
        onOutput(str)
      }

      // Log for debugging
      console.log('[ADB Output]', str.trim())
    }

    const processStderr = (data) => {
      const str = data.toString()
      stderrBuffer += str
      outputBuffer += str

      // Also process stderr for progress (ADB outputs progress to stderr)
      if (onOutput) {
        onOutput(str)
      }

      console.log('[ADB Stderr]', str.trim())
    }

    child.stdout.on('data', processOutput)
    child.stderr.on('data', processStderr)

    child.on('close', (code, signal) => {
      // Clear child process reference
      installationState.activeChildProcess = null

      // Check if killed due to cancellation
      if (installationState.isCancelled || signal === 'SIGTERM') {
        return reject(new Error('Installation cancelled'))
      }

      if (code === 0) {
        resolve(outputBuffer)
      } else {
        // Include actual ADB output in error message for debugging
        const errorDetail = stderrBuffer.trim() || outputBuffer.trim() || 'Unknown error'
        const lastLines = errorDetail.split('\n').slice(-5).join('\n') // Last 5 lines
        reject(new Error(`ADB failed (code ${code}): ${lastLines}`))
      }
    })

    child.on('error', (err) => {
      installationState.activeChildProcess = null
      reject(new Error(`ADB spawn error: ${err.message}`))
    })
  })
}

// IPC: Install Game
ipcMain.handle('install-game', async (event, { filePath, type, deviceSerial }) => {
  // Reset cancellation state at start
  resetInstallationState()

  const deviceFlag = deviceSerial ? ['-s', deviceSerial] : []

  // Get extract path from localStorage or use temp directory
  let extractBasePath = os.tmpdir()
  try {
    const savedPath = await event.sender.executeJavaScript('localStorage.getItem("extractPath")')
    if (savedPath) {
      extractBasePath = savedPath
    }
  } catch (err) {
    console.warn('Could not get extract path from localStorage:', err)
  }

  const tempDir = path.join(extractBasePath, 'hypertopia_install_' + Date.now())

  // Store temp directory for cleanup on cancel
  installationState.tempDir = tempDir

  const sendProgress = (step, percent, detail) => {
    // Don't send progress if cancelled
    if (installationState.isCancelled) return
    event.sender.send('install-progress', { step, percent, detail })
  }

  try {
    sendProgress('INITIALIZING', 0, 'Preparing...')
    fs.ensureDirSync(tempDir)

    let apkPath = null
    let obbPath = null

    // 1. EXTRACTION
    if (filePath.toLowerCase().endsWith('.zip') || filePath.toLowerCase().endsWith('.rar')) {
      const isRar = filePath.toLowerCase().endsWith('.rar')
      sendProgress('EXTRACTING', 0, 'Scanning archive...')

      if (isRar) {
        await extractRarWithProgress(filePath, tempDir, (current, total, fileName) => {
          const percent = total > 0 ? Math.floor((current / total) * 100) : 0
          sendProgress('EXTRACTING', percent, `Extracting: ${fileName}`)
        })
      } else {
        await extractZipWithProgress(filePath, tempDir, (current, total, fileName) => {
          const percent = total > 0 ? Math.floor((current / total) * 100) : 0
          sendProgress('EXTRACTING', percent, `Extracting: ${fileName}`)
        })
      }

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
    sendProgress('INSTALLING_APK', 0, 'progress_pushing_apk')

    const remoteApk = `/data/local/tmp/base.apk`
    await runAdbCommand([...deviceFlag, 'push', apkPath, remoteApk], (output) => {
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING_APK', parseInt(match[1]), 'progress_pushing_apk')
      }
    })

    sendProgress('INSTALLING_APK', 100, 'progress_installing_package')
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    // 3. PUSH OBB
    if (type === 'full' && obbPath) {
      sendProgress('PUSHING_OBB', 0, 'progress_preparing_obb')

      // Ensure /sdcard/Android/obb/ directory exists
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', '/sdcard/Android/obb/'])
      } catch (mkdirErr) {
        console.warn('mkdir /sdcard/Android/obb/ failed (might already exist):', mkdirErr.message)
        // Continue anyway - folder might already exist
      }

      // Get list of files in OBB folder
      const obbFolderName = path.basename(obbPath)
      const obbFiles = fs
        .readdirSync(obbPath)
        .filter((f) => fs.statSync(path.join(obbPath, f)).isFile())

      console.log('[OBB Push] Files to push:', obbFiles)

      // Create remote folder
      const remoteObbFolder = `/sdcard/Android/obb/${obbFolderName}`
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteObbFolder])
      } catch (e) {
        console.warn('mkdir obb folder failed:', e.message)
      }

      // Push each file individually with progress tracking
      for (let i = 0; i < obbFiles.length; i++) {
        const fileName = obbFiles[i]
        const localFilePath = path.join(obbPath, fileName)
        const remoteFilePath = `${remoteObbFolder}/${fileName}`
        const progressPercent = Math.round((i / obbFiles.length) * 100)

        sendProgress('PUSHING_OBB', progressPercent, `Copying: ${fileName}`)
        console.log(`[OBB Push] Pushing file ${i + 1}/${obbFiles.length}: ${fileName}`)

        await runAdbCommand([...deviceFlag, 'push', localFilePath, remoteFilePath])
      }

      sendProgress('PUSHING_OBB', 100, 'progress_obb_complete')
    }

    sendProgress('COMPLETED', 100, 'progress_finished')
  } catch (err) {
    console.error(err)
    sendProgress('ERROR', 0, err.message)
    throw err
  } finally {
    // Auto Cleanup: Bersihkan folder temporary setelah instalasi selesai
    console.log(`[Cleanup] Cleaning up temp folder: ${tempDir}`)
    sendProgress('CLEANUP', 0, 'progress_cleanup')

    try {
      await fs.remove(tempDir)
      console.log(`[Cleanup] Successfully removed: ${tempDir}`)
    } catch (cleanupErr) {
      console.warn(`[Cleanup] Failed to remove temp folder: ${cleanupErr.message}`)
      // Try force cleanup after delay
      setTimeout(() => {
        fs.remove(tempDir).catch((err) =>
          console.warn(`[Cleanup] Delayed cleanup also failed: ${err.message}`)
        )
      }, 1000)
    }
  }
})

// FUNGSI SCAN ZIP/RAR
ipcMain.handle('scan-zip', async (event, filePath) => {
  // Handle RAR files
  if (filePath.toLowerCase().endsWith('.rar')) {
    try {
      return await scanRar(filePath)
    } catch (err) {
      console.error('Error scanning RAR:', err)
      throw new Error('Failed to scan RAR file: ' + err.message)
    }
  }

  // Handle ZIP files with yauzl (optimized for fast scanning)
  return new Promise((resolve, reject) => {
    if (!filePath.toLowerCase().endsWith('.zip')) {
      return reject(new Error('Only ZIP and RAR formats are supported'))
    }

    let result = {
      hasApk: false,
      hasObb: false,
      apkName: null,
      obbFolder: null
    }

    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('Error opening zip:', err)
        return resolve(result) // Return empty result on error
      }

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName
        const lowerName = fileName.toLowerCase()

        // Check APK
        if (lowerName.endsWith('.apk') && !result.hasApk) {
          result.hasApk = true
          result.apkName = fileName.split('/').pop().split('\\').pop()
        }

        // Check OBB
        if ((lowerName.endsWith('.obb') || lowerName.includes('/obb/')) && !result.hasObb) {
          result.hasObb = true
          const parts = fileName.replace(/\\/g, '/').split('/')
          const obbIndex = parts.findIndex((p) => p.toLowerCase() === 'obb')
          if (obbIndex !== -1 && parts[obbIndex + 1]) {
            result.obbFolder = parts[obbIndex + 1]
          } else if (lowerName.endsWith('.obb')) {
            result.obbFolder = parts.length > 1 ? parts[parts.length - 2] : 'Detected'
          }
        }

        // Early termination: Close if both found
        if (result.hasApk && result.hasObb) {
          zipfile.close()
          return resolve(result)
        }

        zipfile.readEntry()
      })

      zipfile.on('end', () => resolve(result))
      zipfile.on('error', (err) => reject(err))
    })
  })
})

// IPC: Select Game Folder (for pre-extracted games)
ipcMain.handle('select-game-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Extracted Game Folder',
    buttonLabel: 'Select Folder'
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  return result.filePaths[0]
})

// IPC: Scan Folder for APK/OBB (similar to scan-zip but for folders)
ipcMain.handle('scan-folder', async (event, folderPath) => {
  let result = {
    hasApk: false,
    hasObb: false,
    apkName: null,
    obbFolder: null,
    folderPath: folderPath
  }

  try {
    // Recursive function to find APK
    const findApk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const found = findApk(fullPath)
          if (found) return found
        } else if (entry.name.toLowerCase().endsWith('.apk')) {
          return { path: fullPath, name: entry.name }
        }
      }
      return null
    }

    // Recursive function to find OBB folder (folder containing .obb files)
    const findObbFolder = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          // Check if this folder contains .obb files
          const children = fs.readdirSync(fullPath)
          if (children.some((c) => c.toLowerCase().endsWith('.obb'))) {
            return { path: fullPath, name: entry.name }
          }
          // Otherwise recurse
          const found = findObbFolder(fullPath)
          if (found) return found
        }
      }
      return null
    }

    const apkResult = findApk(folderPath)
    if (apkResult) {
      result.hasApk = true
      result.apkName = apkResult.name
    }

    const obbResult = findObbFolder(folderPath)
    if (obbResult) {
      result.hasObb = true
      result.obbFolder = obbResult.name
    }

    console.log('[Scan Folder] Result:', result)
    return result
  } catch (err) {
    console.error('[Scan Folder] Error:', err)
    throw new Error('Failed to scan folder: ' + err.message)
  }
})

// IPC: Install Game from Folder (skip extraction)
ipcMain.handle('install-game-folder', async (event, { folderPath, type, deviceSerial }) => {
  // Reset cancellation state at start
  resetInstallationState()

  const deviceFlag = deviceSerial ? ['-s', deviceSerial] : []

  const sendProgress = (step, percent, detail) => {
    // Don't send progress if cancelled
    if (installationState.isCancelled) return
    event.sender.send('install-progress', { step, percent, detail })
  }

  try {
    sendProgress('INITIALIZING', 0, 'progress_preparing')

    // Find APK in folder
    const findApk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const found = findApk(fullPath)
          if (found) return found
        } else if (entry.name.toLowerCase().endsWith('.apk')) {
          return fullPath
        }
      }
      return null
    }

    // Find OBB folder
    const findObbFolder = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          const children = fs.readdirSync(fullPath)
          if (children.some((c) => c.toLowerCase().endsWith('.obb'))) {
            return fullPath
          }
          const found = findObbFolder(fullPath)
          if (found) return found
        }
      }
      return null
    }

    const apkPath = findApk(folderPath)
    if (!apkPath) throw new Error('No APK found in folder.')

    const obbPath = findObbFolder(folderPath)

    // Install APK
    sendProgress('INSTALLING_APK', 0, 'progress_pushing_apk')

    const remoteApk = `/data/local/tmp/base.apk`
    await runAdbCommand([...deviceFlag, 'push', apkPath, remoteApk], (output) => {
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING_APK', parseInt(match[1]), 'progress_pushing_apk')
      }
    })

    sendProgress('INSTALLING_APK', 100, 'progress_installing_package')
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    // Push OBB if full install
    if (type === 'full' && obbPath) {
      sendProgress('PUSHING_OBB', 0, 'progress_preparing_obb')

      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', '/sdcard/Android/obb/'])
      } catch (mkdirErr) {
        console.warn('mkdir failed (might exist):', mkdirErr.message)
      }

      // Get list of files in OBB folder
      const obbFolderName = path.basename(obbPath)
      const obbFiles = fs
        .readdirSync(obbPath)
        .filter((f) => fs.statSync(path.join(obbPath, f)).isFile())

      console.log('[OBB Push Folder] Files to push:', obbFiles)

      // Create remote folder
      const remoteObbFolder = `/sdcard/Android/obb/${obbFolderName}`
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteObbFolder])
      } catch (e) {
        console.warn('mkdir obb folder failed:', e.message)
      }

      // Push each file individually with progress tracking
      for (let i = 0; i < obbFiles.length; i++) {
        const fileName = obbFiles[i]
        const localFilePath = path.join(obbPath, fileName)
        const remoteFilePath = `${remoteObbFolder}/${fileName}`
        const progressPercent = Math.round((i / obbFiles.length) * 100)

        sendProgress('PUSHING_OBB', progressPercent, `Copying: ${fileName}`)
        console.log(`[OBB Push Folder] Pushing file ${i + 1}/${obbFiles.length}: ${fileName}`)

        await runAdbCommand([...deviceFlag, 'push', localFilePath, remoteFilePath])
      }

      sendProgress('PUSHING_OBB', 100, 'progress_obb_complete')
    }

    sendProgress('COMPLETED', 100, 'progress_finished')
  } catch (err) {
    console.error(err)
    sendProgress('ERROR', 0, err.message)
    throw err
  }
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

// Auto Cleanup: Bersihkan semua temp folder saat app akan quit
app.on('before-quit', async (event) => {
  event.preventDefault()
  console.log('[Cleanup] App is quitting, cleaning up temp folders...')
  await cleanupAllTempFolders()
  console.log('[Cleanup] Cleanup complete, exiting...')
  app.exit(0)
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
