import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec, spawn, execFile } from 'child_process'
import { autoUpdater } from 'electron-updater'
import fs from 'fs-extra'
import os from 'os'

// Set app name for native OS integrations
app.name = 'HyperTopia Installer'

// Google API credentials - injected at build time via define in electron.vite.config.mjs
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || ''

// ── ZIP/RAR Password (obfuscated at build time) ──────────────────────────────
// Password is XOR'd with a random key during build. We decode it here at runtime.
function _deobfuscatePassword() {
  const key = process.env.REACT_APP_ZIP_PASSWORD_KEY || ''
  const data = process.env.REACT_APP_ZIP_PASSWORD_DATA || ''
  if (!key || !data) return ''
  try {
    const keyBytes = Buffer.from(key, 'base64')
    const dataBytes = Buffer.from(data, 'base64')
    const result = []
    for (let i = 0; i < dataBytes.length; i++) {
      result.push(dataBytes[i] ^ keyBytes[i])
    }
    return Buffer.from(result).toString('utf8')
  } catch {
    return ''
  }
}
const ZIP_PASSWORD = _deobfuscatePassword()

// Configure auto-updater
// autoDownload is true by default and can no longer be disabled by the user.
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Disable strict semver check to allow custom suffixes like -revX.
// By default, semver considers 1.0.216-rev1 to be OLDER than 1.0.216.
// The user explicitly wants to ignore this and just install whatever is the newest published release on GitHub.
autoUpdater.allowDowngrade = true
autoUpdater.isUpdateAvailable = async function (updateInfo) {
  if (!updateInfo || !updateInfo.version) return false
  // Simply compare version strings - if they differ, there's an update
  if (updateInfo.version === app.getVersion()) return false
  return true
}

let mainWindow = null

// Deep linking: Store pending auth resolve function
let pendingAuthResolve = null

// Register custom protocol for deep linking (hypertopia://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('hypertopia', process.execPath, [process.argv[1]])
  }
} else {
  app.setAsDefaultProtocolClient('hypertopia')
}

// Handle deep link URL (Windows/Linux)
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }

    // Handle deep link URL on Windows/Linux
    const url = commandLine.find((arg) => arg.startsWith('hypertopia://'))
    if (url) {
      handleDeepLink(url)
    }
  })
}

// Handle deep link URL (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// Process deep link URL
function handleDeepLink(url) {
  try {
    // Parse URL: hypertopia://auth-callback?token=xxx&email=xxx&name=xxx&photo=xxx
    // Or: hypertopia://download?game=xxx&version=xxx&url=xxx&type=standalone|qgo
    const urlObj = new URL(url)

    if (urlObj.hostname === 'auth-callback' || urlObj.pathname.includes('auth-callback')) {
      const params = new URLSearchParams(urlObj.search || urlObj.pathname.split('?')[1])
      const token = params.get('token')
      const email = params.get('email')
      const name = params.get('name')
      const photo = params.get('photo')

      if (token && email) {
        // Extract uid from JWT payload in main process
        let uid = null
        try {
          const payloadBase64 = token.split('.')[1]
          if (payloadBase64) {
            const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8')
            const payload = JSON.parse(payloadJson)
            uid = payload.sub || payload.uid || payload.user_id || null
          }
        } catch (jwtErr) {
          console.warn('[DeepLink] Could not extract uid from JWT:', jwtErr.message)
        }

        const authData = {
          success: true,
          uid,
          email: decodeURIComponent(email),
          displayName: name ? decodeURIComponent(name) : null,
          photoURL: photo ? decodeURIComponent(photo) : null,
          idToken: token // Pass the Firebase ID token for API authentication
        }

        // Resolve pending auth if exists
        if (pendingAuthResolve) {
          pendingAuthResolve(authData)
          pendingAuthResolve = null
        }

        // Also send to renderer if window exists
        if (mainWindow) {
          mainWindow.webContents.send('auth-callback', authData)
        }
      }
    } else if (urlObj.hostname === 'download' || urlObj.pathname.includes('download')) {
      // Handle download deep link from website
      const params = new URLSearchParams(urlObj.search || urlObj.pathname.split('?')[1])
      const game = params.get('game')
      const version = params.get('version')
      const downloadUrl = params.get('url')
      const type = params.get('type') // 'standalone' or 'qgo'

      if (game && mainWindow) {
        // Send download request to renderer
        mainWindow.webContents.send('deep-link-download', {
          game: decodeURIComponent(game),
          version: version ? decodeURIComponent(version) : null,
          url: downloadUrl ? decodeURIComponent(downloadUrl) : null,
          type: type || 'standalone'
        })
      }
    }
  } catch (err) {
    console.error('[DeepLink] Error parsing URL:', err)
  }
}

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
  installationState.isCancelled = true

  // Kill active child process if exists
  if (installationState.activeChildProcess) {
    try {
      installationState.activeChildProcess.kill('SIGTERM')
    } catch (err) {
      console.warn('[Cancel] Failed to kill child process:', err.message)
    }
  }

  // Cleanup temp directory if exists
  if (installationState.tempDir && fs.existsSync(installationState.tempDir)) {
    try {
      await fs.remove(installationState.tempDir)
    } catch (err) {
      console.warn('[Cancel] Failed to cleanup temp dir:', err.message)
    }
  }

  resetInstallationState()
  return { success: true, message: 'Installation cancelled' }
})

// Download cancellation state
let downloadState = {
  isCancelled: false,
  activeRequest: null, // HTTP request object (for abort)
  activeStream: null, // Write stream to close
  activeFilePath: null, // File path for cleanup
  currentFileName: null // For identifying current download
}

// Reset download state
function resetDownloadState() {
  downloadState.isCancelled = false
  downloadState.activeRequest = null
  downloadState.activeStream = null
  downloadState.activeFilePath = null
  downloadState.currentFileName = null
}

// Cancel download handler
ipcMain.handle('cancel-download', async () => {
  downloadState.isCancelled = true

  // Abort active HTTP request if exists
  if (downloadState.activeRequest) {
    try {
      downloadState.activeRequest.destroy()
    } catch (err) {
      console.warn('[CancelDownload] Failed to destroy request:', err.message)
    }
  }

  // Close write stream if exists
  if (downloadState.activeStream) {
    try {
      downloadState.activeStream.destroy()
    } catch (err) {
      console.warn('[CancelDownload] Failed to destroy stream:', err.message)
    }
  }

  // Cleanup partial file if exists
  if (downloadState.activeFilePath) {
    try {
      if (fs.existsSync(downloadState.activeFilePath)) {
        fs.unlinkSync(downloadState.activeFilePath)
      }
    } catch (err) {
      console.warn('[CancelDownload] Failed to cleanup file:', err.message)
    }
  }

  resetDownloadState()
  return { success: true, message: 'Download cancelled' }
})

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: process.platform !== 'darwin', // Use frameless on Windows/Linux. On macOS, keep frame but hidden titleBar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    title: 'HyperTopia Installer',
    icon: icon, // Explicitly set icon for Windows dev mode
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // Send maximize/unmaximize events to renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized')
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized')
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

// IPC: Window Controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('is-window-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

// Send maximize/unmaximize events to renderer — moved inside createWindow() above

// IPC: Get Device Info (used for login history metadata)
ipcMain.handle('get-device-info', () => {
  return {
    platform: process.platform, // 'darwin' | 'win32' | 'linux'
    arch: process.arch,
    osRelease: os.release(),
    osVersion: typeof os.version === 'function' ? os.version() : '',
    hostname: os.hostname(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    totalMemMB: Math.round(os.totalmem() / 1024 / 1024)
  }
})

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
        console.warn('Git version check failed: Not a git repository, using DEV version.')
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

// IPC: Get Latest Release from GitHub
ipcMain.handle('get-latest-release', async () => {
  try {
    const { net } = require('electron')
    const response = await net.fetch(
      'https://api.github.com/repos/rigelra15/hypertopia-installer-releases/releases/latest',
      {
        headers: { 'User-Agent': 'HyperTopia-Installer' }
      }
    )
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`)
    }
    const data = await response.json()
    return {
      version: data.tag_name ? data.tag_name.replace(/^v/, '') : null,
      url: data.html_url || null
    }
  } catch (err) {
    console.error('[get-latest-release] Error:', err.message)
    return { version: null, url: null, error: err.message }
  }
})

// IPC: Select Extract Folder (only returns path, does NOT create folder yet)
ipcMain.handle('select-extract-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Extract Folder',
    buttonLabel: 'Select Folder'
  })

  if (result.canceled) {
    return null
  }

  const selectedFolder = result.filePaths[0]
  const folderName = path.basename(selectedFolder)

  // Check if selected folder is already named "HyperTopiaExtraction"
  if (folderName === 'HyperTopiaExtraction') {
    return selectedFolder
  }

  // Return the path WITH HyperTopiaExtraction appended (preview only, not created yet)
  const extractFolder = path.join(selectedFolder, 'HyperTopiaExtraction')
  return extractFolder
})

// IPC: Ensure Extract Folder exists (called when user clicks Continue)
ipcMain.handle('ensure-extract-folder', async (event, folderPath) => {
  if (!folderPath) {
    return { success: false, error: 'No folder path provided' }
  }

  try {
    await fs.ensureDir(folderPath)
    return { success: true, path: folderPath }
  } catch (err) {
    console.error('[Folder] Error creating folder:', err)
    return { success: false, error: err.message }
  }
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
      // macOS & Linux: Use df (needs an existing path)
      let checkPath = folderPath
      try {
        while (!fs.existsSync(checkPath) && checkPath !== path.parse(checkPath).root) {
          checkPath = path.dirname(checkPath)
        }
      } catch {
        // Ignore errors and fallback to folderPath
      }
      command = `df -k "${checkPath}"`
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

        // Convert to human-readable format (dynamic units, base 1024)
        const formatBytes = (bytes) => {
          if (bytes === 0) return '0 B'
          const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
          const k = 1024
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          const size = bytes / Math.pow(k, i)
          return size.toFixed(1) + ' ' + units[i]
        }

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

// ─── Persistent file-based store ─────────────────────────────────────────────
// Stores JSON files in app.getPath('userData') so data survives reinstalls and
// is human-readable (unlike localStorage which is stored in Chromium LevelDB).
//
// Files created:
//   • hypertopia-config.json  — app settings (theme, language, autoUpdate, etc.)
//   • download-history.json   — completed download/install history
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('store-read', async (_, fileName) => {
  const filePath = join(app.getPath('userData'), fileName)
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null // file doesn't exist yet or parse error → renderer uses localStorage fallback
  }
})

ipcMain.handle('store-write', async (_, fileName, data) => {
  const filePath = join(app.getPath('userData'), fileName)
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    return { ok: true }
  } catch (err) {
    console.error('[store-write] Failed to write', fileName, err)
    return { ok: false, error: err.message }
  }
})

// IPC: Secure API proxy — keeps X-API-Secret and X-Build-ID in main process only,
// never embedded in the renderer bundle.
// The renderer can pass an Authorization header (Bearer token) which is forwarded as-is.
ipcMain.handle('api-fetch', async (_, { path: apiPath, options = {} }) => {
  const { net } = await import('electron')

  const API_BASE_URL = process.env.VITE_API_URL || 'https://api.hypertopia.web.id'
  const APP_SECRET = process.env.REACT_APP_HYPERTOPIA_API_SECRET || ''
  const BUILD_ID = process.env.BUILD_ID || 'dev-build'

  const url = `${API_BASE_URL}${apiPath}`
  const method = (options.method || 'GET').toUpperCase()

  // Build headers: inject secrets + forward Authorization from renderer
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    'X-API-Secret': APP_SECRET,
    'X-Build-ID': BUILD_ID
  }

  try {
    const response = await net.fetch(url, {
      method,
      headers,
      ...(options.body ? { body: options.body } : {})
    })

    const text = await response.text()
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: text
    }
  } catch (err) {
    console.error('[api-fetch] Request failed:', err.message)
    return { ok: false, status: 0, statusText: err.message, body: null }
  }
})

// IPC: Move temp folders to new extract path
ipcMain.handle('move-extract-folder', async (event, oldPath) => {
  try {
    // Cleanup old temp folders in old path
    if (oldPath && (await fs.pathExists(oldPath))) {
      const folders = await fs.readdir(oldPath)
      for (const folder of folders) {
        if (folder.startsWith('hypertopia_install_')) {
          const tempPath = path.join(oldPath, folder)
          try {
            await fs.remove(tempPath)
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

// IPC: Clear app data (pm clear)
ipcMain.handle('clear-app-data', async (event, serial, packageName) => {
  try {
    const result = await runAdbCommandAsync(['shell', 'pm', 'clear', packageName], serial)
    if (result.includes('Success')) {
      return { success: true, message: 'App data cleared successfully' }
    } else {
      return { success: false, message: result || 'Clear data failed' }
    }
  } catch (error) {
    console.error('Error clearing app data:', error)
    return { success: false, message: error.message }
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.hypertopia.installer')

  // Set the app icon explicitly in the macOS dock during development
  if (process.platform === 'darwin' && is.dev) {
    app.dock.setIcon(icon)
  }

  // Set Custom Menu Bar
  const isMac = process.platform === 'darwin'
  const menuTemplate = [
    ...(isMac
      ? [
          {
            label: 'HyperTopia Installer',
            submenu: [
              { label: 'About HyperTopia Installer', role: 'about' },
              { type: 'separator' },
              {
                label: 'Check for Updates',
                click: () => {
                  if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify()
                  else
                    dialog.showMessageBox({
                      message: 'Update check is only available in production.'
                    })
                }
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { label: 'Hide', role: 'hide' },
              { label: 'Hide Others', role: 'hideOthers' },
              { label: 'Show All', role: 'unhide' },
              { type: 'separator' },
              { label: 'Quit', role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Extraction Folder',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              try {
                const extractPath = await mainWindow.webContents.executeJavaScript(
                  'localStorage.getItem("extractPath")'
                )
                if (extractPath) shell.openPath(extractPath)
                else
                  dialog.showMessageBox({
                    message: 'No extraction folder set yet! Please configure it in settings.'
                  })
              } catch (e) {
                console.error(e)
              }
            }
          }
        },
        {
          label: 'Change Extraction Folder',
          click: async () => {
            if (mainWindow) {
              try {
                mainWindow.focus()
                dialog.showMessageBox({
                  message:
                    'To change extraction folder, open the Settings cog in the app and click Change Folder.'
                })
              } catch (e) {
                console.error(e)
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Clear Stored Downloads Cache',
          click: async () => {
            if (mainWindow) {
              const res = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['Cancel', 'Clear Cache'],
                title: 'Clear Cache',
                message:
                  'This will delete all temporarily downloaded files and free up disk space. Continue?'
              })
              if (res.response === 1) {
                mainWindow.webContents.executeJavaScript(
                  'window.api && window.api.clearDownloadsFolder ? window.api.clearDownloadsFolder() : console.log("API not loaded")'
                )
                dialog.showMessageBox({
                  message:
                    'Cache clearing process initiated internally. Progress might take a moment.'
                })
              }
            }
          }
        },
        { type: 'separator' },
        isMac ? { label: 'Close Window', role: 'close' } : { label: 'Quit', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        ...(isMac
          ? [
              { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' },
              { label: 'Delete', role: 'delete' },
              { label: 'Select All', role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [
                  { label: 'Start Speaking', role: 'startSpeaking' },
                  { label: 'Stop Speaking', role: 'stopSpeaking' }
                ]
              }
            ]
          : [
              { label: 'Delete', role: 'delete' },
              { type: 'separator' },
              { label: 'Select All', role: 'selectAll' }
            ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload Window', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Reset Zoom', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Force Kill ADB Server',
          click: async () => {
            const { execFile } = require('child_process')
            const adbPath = isMac
              ? path.join(__dirname, '../../resources/platform-tools-darwin/adb')
              : path.join(__dirname, '../../resources/platform-tools/adb.exe')
            execFile(adbPath, ['kill-server'], (err) => {
              if (err) dialog.showMessageBox({ message: 'Failed to kill ADB: ' + err.message })
              else
                dialog.showMessageBox({
                  message: 'ADB Server killed successfully! It will restart when needed.'
                })
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Cancel Active Download',
          click: async () => {
            if (mainWindow)
              mainWindow.webContents.executeJavaScript(
                'window.api && window.api.cancelDownload ? window.api.cancelDownload() : null'
              )
          }
        },
        {
          label: 'Cancel Active Installation',
          click: async () => {
            if (mainWindow)
              mainWindow.webContents.executeJavaScript(
                'window.api && window.api.cancelInstallation ? window.api.cancelInstallation() : null'
              )
          }
        }
      ]
    },
    {
      label: 'Account',
      submenu: [
        {
          label: 'Sign Out User',
          click: async () => {
            if (mainWindow) {
              try {
                const response = await dialog.showMessageBox(mainWindow, {
                  type: 'question',
                  buttons: ['Cancel', 'Sign Out'],
                  title: 'Confirm',
                  message: 'Are you sure you want to sign out?'
                })
                if (response.response === 1) {
                  await mainWindow.webContents.executeJavaScript(
                    'localStorage.removeItem("hypertopia_user"); localStorage.removeItem("hypertopia_token"); window.location.reload();'
                  )
                }
              } catch (e) {
                console.error(e)
              }
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { label: 'Bring All to Front', role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ label: 'Close', role: 'close' }])
      ]
    },
    {
      role: 'help',
      label: 'Help',
      submenu: [
        {
          label: 'HyperTopia Website',
          click: async () => {
            await shell.openExternal('https://hypertopia.web.id')
          }
        },
        {
          label: 'Software Helper',
          click: async () => {
            await shell.openExternal('https://hypertopia.web.id/vr-games/software-helper')
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            if (app.isPackaged) autoUpdater.checkForUpdatesAndNotify()
            else dialog.showMessageBox({ message: 'Update check is only available in production.' })
          }
        }
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

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
  // macOS manual update check function — defined here so check-for-updates IPC can call it
  const checkForUpdatesMac = async () => {
    try {
      const { net } = await import('electron')
      const request = net.request({
        method: 'GET',
        url: 'https://api.github.com/repos/rigelra15/hypertopia-installer/releases/latest',
        headers: { 'User-Agent': 'HyperTopia-Installer' }
      })
      request.on('response', (response) => {
        let body = ''
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          try {
            const release = JSON.parse(body)
            const latestVersion = release.tag_name?.replace(/^v/, '')
            const currentVersion = app.getVersion()
            if (latestVersion && latestVersion !== currentVersion) {
              if (mainWindow) {
                mainWindow.webContents.send('update-available-mac', {
                  version: latestVersion,
                  releaseDate: release.published_at,
                  releaseUrl: release.html_url,
                  body: release.body || ''
                })
              }
            } else {
              // already on latest version
            }
          } catch (e) {
            console.error('[AutoUpdater] Mac: failed to parse release info', e.message)
          }
        })
      })
      request.on('error', (err) => {
        console.error('[AutoUpdater] Mac: version check failed', err.message)
      })
      request.end()
    } catch (err) {
      console.error('[AutoUpdater] Mac: update check error', err.message)
    }
  }

  if (app.isPackaged) {
    const isMac = process.platform === 'darwin'

    if (isMac) {
      // macOS: autoUpdater requires code-signing + notarization.
      // Until the app is signed, we do a manual version check via GitHub API
      // and prompt the user to download from the releases page instead.

      // Check on startup and expose IPC
      checkForUpdatesMac()
      ipcMain.handle('check-for-updates-mac', checkForUpdatesMac)
    } else {
      // Windows/Linux: use electron-updater normally
      autoUpdater.checkForUpdatesAndNotify()

      autoUpdater.on('checking-for-update', () => {})

      autoUpdater.on('update-available', (info) => {
        if (mainWindow) {
          mainWindow.webContents.send('update-available', info)
        }
      })

      autoUpdater.on('update-not-available', () => {
        if (mainWindow) {
          mainWindow.webContents.send('update-not-available')
        }
      })

      autoUpdater.on('download-progress', (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('update-download-progress', progress)
        }
      })

      autoUpdater.on('update-downloaded', async (info) => {
        if (mainWindow) {
          mainWindow.webContents.send('update-downloaded', info)
        }

        // Ask user before restarting — don't force-quit mid-installation
        if (mainWindow) {
          const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['Restart Now', 'Later'],
            defaultId: 0,
            cancelId: 1,
            title: 'Update Ready',
            message: `HyperTopia Installer v${info.version} has been downloaded.`,
            detail: 'Restart now to apply the update, or continue and restart later.'
          })
          if (response === 0) {
            autoUpdater.quitAndInstall()
          }
        } else {
          // No window open — safe to install immediately
          autoUpdater.quitAndInstall()
        }
      })

      autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Error:', err.message)
        console.error('[AutoUpdater] Full error:', err)
        if (mainWindow) {
          mainWindow.webContents.send('update-error', {
            message: err.message,
            stack: err.stack
          })
        }
      })
    } // end else (Windows/Linux)
  }

  // IPC: Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    if (app.isPackaged) {
      if (process.platform === 'darwin') {
        checkForUpdatesMac()
        return null
      }
      return autoUpdater.checkForUpdates()
    } else {
      // Direct dev simulation for UI testing
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
      autoUpdater.downloadUpdate()
      return true
    }
    return false
  })

  // IPC: Set auto-download setting (Hardcoded to true as per request)
  ipcMain.handle('set-auto-download', () => {
    autoUpdater.autoDownload = true
    return true
  })

  // IPC: Install update and restart
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  // IPC: Google Sign In via Website Deep Linking
  // Opens default browser to HyperTopia website, user logs in, website redirects back via hypertopia:// protocol
  ipcMain.handle('google-sign-in', async () => {
    return new Promise((resolve) => {
      // Store resolve function for deep link callback
      pendingAuthResolve = resolve

      // Open HyperTopia website auth page in default browser
      const authUrl = 'https://hypertopia.web.id/auth-installer'
      shell.openExternal(authUrl)

      // Set timeout for auth (2 minutes)
      setTimeout(
        () => {
          if (pendingAuthResolve === resolve) {
            pendingAuthResolve = null
            resolve({ success: false, error: 'Auth timeout' })
          }
        },
        2 * 60 * 1000
      )
    })
  })

  // IPC: Google Sign In via BrowserWindow (fallback method)
  ipcMain.handle('google-sign-in-popup', async () => {
    return new Promise((resolve) => {
      const firebaseAuthDomain = 'hypertopia-id-bc.firebaseapp.com'
      const webClientId = '176112373977-61sguaetet4tu1gdbpolgu6m7dgt5je8.apps.googleusercontent.com'
      const redirectUri = encodeURIComponent(`https://${firebaseAuthDomain}/__/auth/handler`)
      const scope = encodeURIComponent('openid email profile')

      const googleAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${webClientId}` +
        `&redirect_uri=${redirectUri}` +
        `&response_type=id_token token` +
        `&scope=${scope}` +
        `&nonce=${Date.now()}`

      const { session } = require('electron')
      const authSession = session.fromPartition('persist:google-auth')

      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        title: 'Login dengan Google',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          session: authSession
        }
      })

      authWindow.loadURL(googleAuthUrl)

      let hasResolved = false

      const extractToken = (url) => {
        try {
          if (url.includes('access_token=') || url.includes('id_token=')) {
            let tokenPart = url
            if (url.includes('#')) {
              tokenPart = url.split('#')[1]
            }
            const params = new URLSearchParams(tokenPart)
            return params.get('access_token') || params.get('id_token')
          }
        } catch (err) {
          console.error('[OAuth] Error extracting token:', err)
        }
        return null
      }

      const handleUrl = (url) => {
        if (hasResolved) return
        if (url.includes('access_token=') || url.includes('id_token=')) {
          const token = extractToken(url)
          if (token) {
            hasResolved = true
            authWindow.close()
            resolve({ success: true, accessToken: token })
            return true
          }
        }
        if (url.includes('error=')) {
          hasResolved = true
          authWindow.close()
          resolve({ success: false, error: 'OAuth error' })
          return true
        }
        return false
      }

      authWindow.webContents.on('will-navigate', (e, url) => handleUrl(url))
      authWindow.webContents.on('will-redirect', (e, url) => handleUrl(url))
      authWindow.webContents.on('did-navigate', (e, url) => handleUrl(url))
      authWindow.webContents.on('did-finish-load', () => {
        if (!hasResolved) handleUrl(authWindow.webContents.getURL())
      })
      authWindow.on('closed', () => {
        if (!hasResolved) resolve({ success: false, error: 'User closed window' })
      })
    })
  })

  // IPC: Google Sign Out (just returns success, actual sign out handled in renderer)
  ipcMain.handle('google-sign-out', async () => {
    return { success: true }
  })

  // IPC: Get desktop sources for screen sharing
  ipcMain.handle('get-desktop-sources', async () => {
    const { desktopCapturer } = require('electron')
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    })
    // Return simplified source info
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }))
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Auto Cleanup: Jalankan cleanup saat app start
  cleanupOldTempFolders()

  // Auto Cleanup: Jalankan cleanup setiap 1 jam
  setInterval(
    () => {
      cleanupOldTempFolders()
    },
    60 * 60 * 1000
  ) // 1 hour
})

// FUNGSI SCAN ZIP/RAR
// node-7z untuk ZIP, node-unrar-js untuk RAR (karena 7za tidak support RAR5)
const Seven = require('node-7z')
const sevenBin = require('7zip-bin')

// Helper: Get 7za binary path
function get7zPath() {
  const isDev = !app.isPackaged

  if (isDev) {
    // In development, use the path from 7zip-bin package
    return sevenBin.path7za
  }

  // In production, the 7zip-bin module is unpacked to app.asar.unpacked
  // We need to manually construct the path to the executable
  const arch = process.arch // x64, ia32, arm64
  const sevenZipPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    '7zip-bin',
    'win',
    arch,
    '7za.exe'
  )

  return sevenZipPath
}

// Helper: Get UnRAR binary path (cross-platform)
function getUnrarPath() {
  const isDev = !app.isPackaged
  const platform = process.platform // 'win32', 'darwin', 'linux'

  // Determine binary name based on platform
  let unrarBinary = 'unrar'
  if (platform === 'win32') unrarBinary = 'unrar.exe'
  else if (platform === 'darwin') unrarBinary = 'unrar-darwin'

  if (isDev) {
    return path.join(__dirname, `../../resources/${unrarBinary}`)
  }
  return path.join(process.resourcesPath, unrarBinary)
}

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

// Helper: Get ADB Path (cross-platform)
function getAdbPath() {
  const isDev = !app.isPackaged
  const platform = process.platform // 'win32', 'darwin', 'linux'

  // Determine binary name based on platform
  const adbBinary = platform === 'win32' ? 'adb.exe' : 'adb'

  // Determine platform-tools folder based on OS
  let platformToolsFolder = 'platform-tools' // Default for Windows
  if (platform === 'darwin') {
    platformToolsFolder = 'platform-tools-darwin'
  } else if (platform === 'linux') {
    platformToolsFolder = 'platform-tools-linux'
  }

  if (isDev) {
    return path.join(__dirname, `../../resources/${platformToolsFolder}/${adbBinary}`)
  }
  return path.join(process.resourcesPath, `${platformToolsFolder}/${adbBinary}`)
}

// Helper to parse VRP release.manifest
function parseManifestData(content) {
  try {
    const lines = content.split(/\r?\n/)
    let dataSection = false
    let headers = []
    let values = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('#VRPRELEASEMANIFEST') || line === '') continue
      if (line === '#filelist') break

      if (!dataSection) {
        headers = line.split(';')
        dataSection = true
      } else {
        values = line.split(';')
        break
      }
    }

    if (values.length > 0 && headers.length > 0) {
      let rawGameName = values[headers.findIndex((h) => h.trim() === 'Game Name')] || ''
      let rawReleaseName = values[headers.findIndex((h) => h.trim() === 'Release Name')] || ''
      let packageName = values[headers.findIndex((h) => h.trim() === 'Package Name')] || ''
      let sizeMB = values[headers.findIndex((h) => h.trim() === 'Size (MB)')] || ''

      // Remove text inside parentheses like (MR-Fix)
      let gameName = rawGameName.replace(/\s*\(.*?\)\s*/g, ' ').trim()

      // Extract version after the '+' sign
      let version = ''
      const versionMatch = rawReleaseName.match(/\+(.*?)(?:\s|-|$)/)
      if (versionMatch && versionMatch[1]) {
        version = 'v' + versionMatch[1]
      } else {
        // Fallback to searching for vX.Y.Z
        const genericV = rawReleaseName.match(/(v\S+)/)
        if (genericV) {
          version = genericV[1].split('-')[0].trim()
        }
      }

      return {
        gameName,
        version,
        packageName,
        sizeMB,
        rawGameName,
        rawReleaseName
      }
    }
  } catch (e) {
    console.error('Failed to parse manifest:', e)
  }
  return null
}

// Helper: Scan RAR for APK and OBB using UnRAR command-line (no memory limit)
async function scanRar(rarPath) {
  return new Promise((resolve, reject) => {
    const unrarPath = getUnrarPath()
    const zipPassword = ZIP_PASSWORD

    let result = {
      hasApk: false,
      hasObb: false,
      apkName: null,
      obbFolder: null,
      manifestPath: null,
      manifestData: null
    }

    // Use 'lb' command for bare list output (just filenames)
    const listArgs = ['lb']
    if (zipPassword) listArgs.push(`-p${zipPassword}`)
    listArgs.push(rarPath)

    const child = spawn(unrarPath, listArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', async (code) => {
      if (code !== 0 && code !== 1) {
        console.error('UnRAR error:', stderr)
        if (stderr.includes('Cannot open') || stderr.includes('is not RAR archive')) {
          return reject(new Error('RAR_INVALID: File bukan RAR yang valid atau corrupt.'))
        }
        if (stderr.includes('Wrong password') || stderr.includes('encrypted')) {
          return reject(new Error('RAR_ENCRYPTED: File RAR terenkripsi/memiliki password.'))
        }
        return reject(new Error('RAR_ERROR: Gagal membaca file RAR: ' + stderr))
      }

      // Parse file list
      const lines = stdout
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l)

      // First pass: find APK name and manifest
      for (const fileName of lines) {
        const lowerName = fileName.toLowerCase()

        // Cek APK
        if (lowerName.endsWith('.apk') && !result.hasApk) {
          result.hasApk = true
          result.apkName = fileName.split('/').pop().split('\\').pop()
        }

        // Cek release.manifest
        if (lowerName.endsWith('release.manifest') || lowerName.endsWith('release.manifest.txt')) {
          result.manifestPath = fileName
        }
      }

      // Second pass: detect OBB folder by matching APK package name
      if (result.apkName) {
        const packageName = result.apkName.replace(/\.apk$/i, '')
        for (const fileName of lines) {
          const parts = fileName.replace(/\\/g, '/').split('/')
          if (parts.some((p) => p === packageName)) {
            result.hasObb = true
            result.obbFolder = packageName
            break
          }
        }
      }

      // If manifest found, try to read it
      if (result.manifestPath) {
        try {
          // Use 'p' command to print file to stdout
          const manifestArgs = ['p', '-inul']
          if (zipPassword) manifestArgs.push(`-p${zipPassword}`)
          manifestArgs.push(rarPath, result.manifestPath)

          const manifestChild = spawn(unrarPath, manifestArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
          })
          let manifestOutput = ''
          manifestChild.stdout.on('data', (d) => {
            manifestOutput += d.toString()
          })
          await new Promise((res) => manifestChild.on('close', res))
          result.manifestData = parseManifestData(manifestOutput)
        } catch (e) {
          console.error('[scanRar] Failed to read manifest:', e)
        }
      }

      resolve(result)
    })

    child.on('error', (err) => {
      console.error('UnRAR spawn error:', err)
      reject(new Error('RAR_ERROR: Gagal menjalankan UnRAR: ' + err.message))
    })
  })
}

// Helper: Scan Archive for APK and OBB using 7-zip (for ZIP files)
async function scan7z(archivePath) {
  return new Promise((resolve, reject) => {
    const sevenPath = get7zPath()

    // Get ZIP password from build-time env
    const zipPassword = ZIP_PASSWORD

    let result = {
      hasApk: false,
      hasObb: false,
      apkName: null,
      obbFolder: null,
      obbSize: 0,
      obbFiles: [],
      manifestPath: null,
      manifestData: null
    }

    // Use raw spawn with -slt (technical listing) to get file sizes
    const args = ['l', '-slt', archivePath]
    if (zipPassword) {
      args.splice(1, 0, `-p${zipPassword}`)
    }

    const child = spawn(sevenPath, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let output = ''
    let stderr = ''

    child.stdout.on('data', (d) => { output += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })

    child.on('close', async (code) => {
      if (code !== 0 && code !== 1) {
        return reject(new Error(stderr || `7z exited with code ${code}`))
      }

      // Parse technical listing: blocks separated by empty lines, each has "Path = ..." and "Size = ..."
      const blocks = output.split('\n\n').filter(b => b.includes('Path = '))
      const allEntries = []

      for (const block of blocks) {
        const pathMatch = block.match(/^Path = (.+)$/m)
        const sizeMatch = block.match(/^Size = (\d+)$/m)
        if (pathMatch) {
          const fileName = pathMatch[1].trim()
          const size = parseInt(sizeMatch ? sizeMatch[1] : '0', 10)
          allEntries.push({ file: fileName, size })

          const lowerName = fileName.toLowerCase()

          // Cek APK
          if (lowerName.endsWith('.apk') && !result.hasApk) {
            result.hasApk = true
            result.apkName = fileName.split('/').pop().split('\\').pop()
          }

          // Cek release.manifest
          if (lowerName.endsWith('release.manifest') || lowerName.endsWith('release.manifest.txt')) {
            result.manifestPath = fileName
          }
        }
      }

      // Detect OBB folder by matching APK package name
      if (result.apkName) {
        const packageName = result.apkName.replace(/\.apk$/i, '')
        for (const entry of allEntries) {
          const parts = entry.file.replace(/\\/g, '/').split('/')
          if (parts.some((p) => p === packageName)) {
            result.hasObb = true
            result.obbFolder = packageName
            break
          }
        }

        // Collect OBB files and total size
        if (result.hasObb) {
          const obbPrefix = result.obbFolder + '/'
          for (const entry of allEntries) {
            const normalized = entry.file.replace(/\\/g, '/')
            const folderIdx = normalized.indexOf(obbPrefix)
            if (folderIdx !== -1 && entry.size > 0) {
              const relativePath = normalized.substring(folderIdx + obbPrefix.length)
              if (relativePath && !relativePath.endsWith('/')) {
                result.obbFiles.push({
                  name: relativePath.split('/').pop(),
                  relativePath: relativePath,
                  size: entry.size
                })
                result.obbSize += entry.size
              }
            }
          }
        }
      }

      // If manifest found, try to read it
      if (result.manifestPath) {
        try {
          const extractArgs = ['e', '-so', archivePath, result.manifestPath]
          if (zipPassword) {
            extractArgs.splice(1, 0, `-p${zipPassword}`)
          }
          const childProcess = spawn(sevenPath, extractArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
          })
          let manifestOutput = ''
          childProcess.stdout.on('data', (d) => {
            manifestOutput += d.toString()
          })
          await new Promise((res) => childProcess.on('close', res))
          result.manifestData = parseManifestData(manifestOutput)
        } catch (e) {
          console.error('[scan7z] Failed to read manifest:', e)
        }
      }
      resolve(result)
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

// Helper: Extract RAR with Progress using UnRAR command-line (no memory limit)
async function extractRar(rarPath, targetDir, onProgress) {
  fs.ensureDirSync(targetDir)

  // Get ZIP/RAR password from build-time env
  const zipPassword = ZIP_PASSWORD

  return new Promise((resolve, reject) => {
    const unrarPath = getUnrarPath()

    // First, get file count for progress
    let totalFiles = 0
    let extractedFiles = 0

    // Count relevant files first
    const countArgs = ['lb']
    if (zipPassword) countArgs.push(`-p${zipPassword}`)
    countArgs.push(rarPath)

    const countChild = spawn(unrarPath, countArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let countOutput = ''

    countChild.stdout.on('data', (data) => {
      countOutput += data.toString()
    })

    countChild.on('close', () => {
      const lines = countOutput.split('\n').filter((l) => {
        const lower = l.trim().toLowerCase()
        return lower.endsWith('.apk') || lower.endsWith('.obb')
      })
      totalFiles = lines.length

      // Now extract with progress
      // Use 'x' to extract with full paths
      const extractArgs = ['x', '-y', '-o+']
      if (zipPassword) extractArgs.push(`-p${zipPassword}`)
      extractArgs.push(rarPath, targetDir + path.sep)

      const extractChild = spawn(unrarPath, extractArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stderr = ''

      extractChild.stdout.on('data', (data) => {
        const output = data.toString()
        // Parse extraction progress
        const lines = output.split('\n')
        for (const line of lines) {
          // UnRAR outputs "Extracting  filename" for each file
          if (line.includes('Extracting') || line.includes('...')) {
            const match = line.match(/(?:Extracting|\.\.\.)\s+(.+)/)
            if (match) {
              const fileName = match[1].trim()
              const lowerName = fileName.toLowerCase()
              if (lowerName.endsWith('.apk') || lowerName.endsWith('.obb')) {
                extractedFiles++
                if (onProgress) {
                  onProgress(extractedFiles, totalFiles, fileName)
                }
              }
            }
          }
        }
      })

      extractChild.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      extractChild.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          console.error('UnRAR extract error:', stderr)
          if (stderr.includes('Wrong password') || stderr.includes('encrypted')) {
            return reject(new Error('RAR_ENCRYPTED: File RAR terenkripsi/memiliki password.'))
          }
          return reject(new Error('RAR_ERROR: Gagal mengekstrak file RAR: ' + stderr))
        }
        resolve(true)
      })

      extractChild.on('error', (err) => {
        console.error('UnRAR extract spawn error:', err)
        reject(new Error('RAR_ERROR: Gagal menjalankan UnRAR: ' + err.message))
      })
    })

    countChild.on('error', (err) => {
      console.error('UnRAR count spawn error:', err)
      reject(new Error('RAR_ERROR: Gagal menjalankan UnRAR: ' + err.message))
    })
  })
}

// Helper: Extract Archive with Progress using 7-zip (for ZIP files)
async function extract7z(archivePath, targetDir, onProgress) {
  fs.ensureDirSync(targetDir)

  // Get ZIP password from build-time env (obfuscated in compiled binary)
  const zipPassword = ZIP_PASSWORD

  return new Promise((resolve, reject) => {
    const sevenPath = get7zPath()

    // First, get list of files to calculate total count
    let totalFiles = 0
    let extractedFiles = 0
    const filesToExtract = []

    const listOptions = {
      $bin: sevenPath,
      $progress: false
    }
    if (zipPassword) {
      listOptions.password = zipPassword
    }

    const listStream = Seven.list(archivePath, listOptions)

    listStream.on('data', (data) => {
      const fileName = data.file
      if (!fileName) return

      const lowerName = fileName.toLowerCase()
      if (lowerName.endsWith('.apk') || lowerName.endsWith('.obb')) {
        totalFiles++
        filesToExtract.push(fileName)
      }
    })

    listStream.on('end', () => {
      if (filesToExtract.length === 0) {
        return resolve(true)
      }

      // Extract all files (wildcard filtering has issues with node-7z)
      const extractOptions = {
        $bin: sevenPath,
        $progress: true,
        recursive: true
      }
      if (zipPassword) {
        extractOptions.password = zipPassword
      }

      const extractStream = Seven.extractFull(archivePath, targetDir, extractOptions)

      extractStream.on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(progress.percent, 100, `Extracting... ${progress.percent}%`)
        }
      })

      extractStream.on('data', (data) => {
        if (data.file) {
          extractedFiles++
          if (onProgress) {
            onProgress(extractedFiles, totalFiles, data.file)
          }
        }
      })

      extractStream.on('end', () => {
        resolve(true)
      })

      extractStream.on('error', (err) => {
        console.error('7z extract error:', err)
        reject(err)
      })
    })

    listStream.on('error', (err) => {
      console.error('7z list error:', err)
      reject(err)
    })
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
    }

    const processStderr = (data) => {
      const str = data.toString()
      stderrBuffer += str
      outputBuffer += str

      // Also process stderr for progress (ADB outputs progress to stderr)
      if (onOutput) {
        onOutput(str)
      }
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

async function pushObbFile(deviceFlag, localFilePath, remoteDestPath, sendProgress, label) {
  try {
    await runAdbCommand([...deviceFlag, 'push', localFilePath, remoteDestPath])
    return
  } catch (directErr) {
    console.warn(`[OBB Fallback] Direct push failed for ${label}: ${directErr.message}`)
  }

  const tmpName = `obb_tmp_${Date.now()}_${path.basename(localFilePath)}`
  const tmpPath = `/data/local/tmp/${tmpName}`

  try {
    await runAdbCommand([...deviceFlag, 'push', localFilePath, tmpPath])
  } catch (tmpErr) {
    throw new Error(`Failed to push OBB file "${label}" (direct and /tmp): ${tmpErr.message}`)
  }

  const remoteDir = remoteDestPath.substring(0, remoteDestPath.lastIndexOf('/'))
  try {
    await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteDir])
  } catch (e) {
    console.warn(`[OBB Fallback] mkdir ${remoteDir} failed:`, e.message)
  }

  try {
    await runAdbCommand([...deviceFlag, 'shell', 'mv', tmpPath, remoteDestPath])
  } catch {
    try {
      await runAdbCommand([...deviceFlag, 'shell', 'cp', tmpPath, remoteDestPath])
      await runAdbCommand([...deviceFlag, 'shell', 'rm', tmpPath]).catch(() => {})
    } catch (cpErr) {
      throw new Error(`Failed to move OBB file "${label}" to final location: ${cpErr.message}`)
    }
  }
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

      try {
        if (isRar) {
          // Use extractRar for RAR files (supports RAR5)
          await extractRar(filePath, tempDir, (current, total, fileName) => {
            const percent = total > 0 ? Math.floor((current / total) * 100) : 0
            sendProgress('EXTRACTING', percent, `Extracting: ${fileName}`)
          })
        } else {
          // Use extract7z for ZIP files
          await extract7z(filePath, tempDir, (current, total, fileName) => {
            const percent = total > 0 ? Math.floor((current / total) * 100) : 0
            sendProgress('EXTRACTING', percent, `Extracting: ${fileName}`)
          })
        }
      } catch (extractErr) {
        const errMsg = extractErr.message || ''

        // Re-throw user-friendly errors as-is
        if (errMsg.startsWith('RAR_') || errMsg.startsWith('ARCHIVE_')) {
          throw extractErr
        }

        // Check for common errors
        if (
          errMsg.includes('Cannot open') ||
          errMsg.includes('not supported') ||
          errMsg.includes('invalid signature')
        ) {
          throw new Error(
            'File archive tidak valid atau format tidak didukung. Coba download ulang atau extract manual menggunakan WinRAR/7-Zip lalu pilih folder hasil ekstrak.'
          )
        } else if (errMsg.includes('Wrong password') || errMsg.includes('encrypted')) {
          throw new Error(
            'File archive terenkripsi/memiliki password. Extract manual menggunakan WinRAR/7-Zip lalu pilih folder hasil ekstrak.'
          )
        }
        throw extractErr
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

      // Find OBB folder by matching APK package name
      const findObbByPackageName = (dir, packageName) => {
        const ent = fs.readdirSync(dir, { withFileTypes: true })
        for (const dirent of ent) {
          const res = path.resolve(dir, dirent.name)
          if (dirent.isDirectory()) {
            if (dirent.name === packageName) {
              return res
            }
            const found = findObbByPackageName(res, packageName)
            if (found) return found
          }
        }
        return null
      }

      if (apkPath) {
        const apkFileName = path.basename(apkPath)
        const packageName = apkFileName.replace(/\.apk$/i, '')
        obbPath = findObbByPackageName(tempDir, packageName)
      }
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

      // Get list of ALL files in OBB folder recursively
      const obbFolderName = path.basename(obbPath)

      const getAllFilesRelative = (dir, basePath = '') => {
        let results = []
        const list = fs.readdirSync(dir)
        list.forEach((file) => {
          const fullPath = path.join(dir, file)
          const relPath = path.join(basePath, file)
          const stat = fs.statSync(fullPath)
          if (stat && stat.isDirectory()) {
            results = results.concat(getAllFilesRelative(fullPath, relPath))
          } else {
            results.push({ localPath: fullPath, relativePath: relPath, name: file })
          }
        })
        return results
      }

      const obbFiles = getAllFilesRelative(obbPath)

      // Create remote folder (without quotes - spawn passes args individually)
      const remoteObbFolder = `/sdcard/Android/obb/${obbFolderName}`
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteObbFolder])
      } catch (e) {
        console.warn('mkdir obb folder failed:', e.message)
      }

      // Verify the directory was actually created
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'ls', '-d', remoteObbFolder])
      } catch {
        console.warn(
          '[OBB Push] Directory verification failed, attempting push of entire folder...'
        )
        // Fallback: push entire OBB folder at once (adb push handles dir creation)
        try {
          sendProgress('PUSHING_OBB', 0, `Copying OBB folder...`)
          await runAdbCommand([...deviceFlag, 'push', obbPath, remoteObbFolder])
          sendProgress('PUSHING_OBB', 100, 'progress_obb_complete')
          // Skip individual file push since folder push succeeded
          obbFiles.length = 0
        } catch (pushFolderErr) {
          console.error('[OBB Push] Folder push also failed:', pushFolderErr.message)
          throw pushFolderErr
        }
      }

      // Push each file individually with progress tracking
      const createdDirs = new Set([remoteObbFolder])

      for (let i = 0; i < obbFiles.length; i++) {
        const fileObj = obbFiles[i]
        const remoteFilePath = `${remoteObbFolder}/${fileObj.relativePath.replace(/\\/g, '/')}`
        const remoteDirPath = remoteFilePath.substring(0, remoteFilePath.lastIndexOf('/'))

        if (!createdDirs.has(remoteDirPath)) {
          try {
            // NOTE: Do NOT wrap path in quotes - spawn() passes each arg separately
            await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteDirPath])
            createdDirs.add(remoteDirPath)
          } catch (err) {
            console.warn(`[OBB Push] Failed to create dir ${remoteDirPath}:`, err.message)
          }
        }

        const progressPercent = Math.round((i / obbFiles.length) * 100)
        sendProgress('PUSHING_OBB', progressPercent, `Copying: ${fileObj.name}`)

        await pushObbFile(deviceFlag, fileObj.localPath, remoteFilePath, sendProgress, fileObj.name)
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
    sendProgress('CLEANUP', 0, 'progress_cleanup')

    try {
      await fs.remove(tempDir)
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
  // Debug logging for production troubleshooting

  // Verify file exists before attempting scan
  if (!fs.existsSync(filePath)) {
    console.error('[scan-zip] File does not exist:', filePath)
    // Try to normalize the path
    const normalizedPath = path.normalize(filePath)
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(
        'ARCHIVE_NOT_FOUND: File tidak ditemukan. Pastikan file masih ada di lokasi tersebut.'
      )
    }
    // Use normalized path if it exists
    filePath = normalizedPath
  }

  const lowerPath = filePath.toLowerCase()

  // Check if file is a supported archive format
  if (!lowerPath.endsWith('.zip') && !lowerPath.endsWith('.rar') && !lowerPath.endsWith('.7z')) {
    throw new Error('UNSUPPORTED_FORMAT: Hanya format ZIP, RAR, dan 7z yang didukung.')
  }

  // Use scanRar for RAR files (node-unrar-js supports RAR5)
  if (lowerPath.endsWith('.rar')) {
    try {
      return await scanRar(filePath)
    } catch (err) {
      console.error('Error scanning RAR:', err)
      const errMsg = err.message || ''

      // Re-throw user-friendly errors as-is
      if (errMsg.startsWith('RAR_')) {
        throw err
      }

      // Handle other errors
      if (errMsg.includes('invalid signature') || errMsg.includes('Invalid signature')) {
        throw new Error(
          'RAR_INVALID: File bukan RAR yang valid atau corrupt. Coba download ulang file-nya.'
        )
      }
      throw new Error('RAR_ERROR: Gagal membaca file RAR: ' + err.message)
    }
  }

  // Use scan7z for ZIP and 7z files
  try {
    return await scan7z(filePath)
  } catch (err) {
    console.error('Error scanning archive:', err)
    const errMsg = err.message || ''

    // Check for common 7z errors and provide user-friendly messages
    if (
      errMsg.includes('Cannot open') ||
      errMsg.includes('not archive') ||
      errMsg.includes('Unsupported')
    ) {
      throw new Error(
        'ARCHIVE_INVALID: File archive tidak valid atau corrupt. Coba download ulang file-nya atau extract manual menggunakan WinRAR/7-Zip.'
      )
    } else if (errMsg.includes('Wrong password') || errMsg.includes('encrypted')) {
      throw new Error(
        'ARCHIVE_ENCRYPTED: File archive terenkripsi/memiliki password. Extract manual menggunakan WinRAR/7-Zip lalu gunakan opsi "Pilih Folder".'
      )
    } else if (errMsg.includes('ENOENT') || errMsg.includes('no such file')) {
      throw new Error(
        'ARCHIVE_NOT_FOUND: File tidak ditemukan. Pastikan file masih ada di lokasi tersebut.'
      )
    }
    throw new Error('ARCHIVE_ERROR: Gagal membaca file archive: ' + err.message)
  }
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

// IPC: Select Archive File (ZIP/RAR) via native dialog
ipcMain.handle('select-archive-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    title: 'Select Game Archive',
    buttonLabel: 'Select File',
    filters: [{ name: 'Archives', extensions: ['zip', 'rar', '7z'] }]
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  const filePath = result.filePaths[0]
  const stats = fs.statSync(filePath)
  return { path: filePath, name: path.basename(filePath), size: stats.size }
})

// IPC: Scan Folder for APK/OBB (similar to scan-zip but for folders)
ipcMain.handle('scan-folder', async (event, folderPath) => {
  let result = {
    hasApk: false,
    hasObb: false,
    apkName: null,
    apkSize: 0,
    obbFolder: null,
    obbSize: 0,
    obbFiles: [],
    folderPath: folderPath,
    manifestData: null
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
          const stats = fs.statSync(fullPath)
          return { path: fullPath, name: entry.name, size: stats.size }
        }
      }
      return null
    }

    // Recursive function to find OBB folder by matching APK package name
    const findObbFolder = (dir, packageName) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          // Check if this folder name matches the APK package name
          if (entry.name === packageName) {
            let obbFilesList = []
            let totalObbSize = 0

            const getAllFilesRelative = (currentDir, basePath = '') => {
              const list = fs.readdirSync(currentDir, { withFileTypes: true })
              for (const file of list) {
                const subPath = path.join(currentDir, file.name)
                const relPath = path.join(basePath, file.name)
                if (file.isDirectory()) {
                  getAllFilesRelative(subPath, relPath)
                } else {
                  const stat = fs.statSync(subPath)
                  obbFilesList.push({ name: file.name, relativePath: relPath, size: stat.size })
                  totalObbSize += stat.size
                }
              }
            }
            getAllFilesRelative(fullPath)

            return {
              path: fullPath,
              name: entry.name,
              obbFiles: obbFilesList,
              obbSize: totalObbSize
            }
          }
          // Otherwise recurse
          const found = findObbFolder(fullPath, packageName)
          if (found) return found
        }
      }
      return null
    }

    const apkResult = findApk(folderPath)
    if (apkResult) {
      result.hasApk = true
      result.apkName = apkResult.name
      result.apkSize = apkResult.size
    }

    // Use APK package name to find OBB folder
    if (apkResult) {
      const packageName = apkResult.name.replace(/\.apk$/i, '')
      const obbResult = findObbFolder(folderPath, packageName)
      if (obbResult) {
        result.hasObb = true
        result.obbFolder = obbResult.name
        result.obbSize = obbResult.obbSize
        result.obbFiles = obbResult.obbFiles
      }
    }

    // Attempt to find and parse release.manifest
    try {
      const findManifest = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            const found = findManifest(fullPath)
            if (found) return found
          } else {
            const lowerName = entry.name.toLowerCase()
            if (lowerName === 'release.manifest' || lowerName === 'release.manifest.txt') {
              return fullPath
            }
          }
        }
        return null
      }
      const manifestPath = findManifest(folderPath)
      if (manifestPath) {
        const manifestOutput = fs.readFileSync(manifestPath, 'utf8')
        result.manifestData = parseManifestData(manifestOutput)
      }
    } catch (e) {
      console.error('[Scan Folder] Failed to find/read manifest:', e)
    }

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

    // Find OBB folder by matching APK package name
    const findObbByPackageName = (dir, packageName) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === packageName) {
            return fullPath
          }
          const found = findObbByPackageName(fullPath, packageName)
          if (found) return found
        }
      }
      return null
    }

    const apkPath = findApk(folderPath)
    if (!apkPath) throw new Error('No APK found in folder.')

    const apkFileName = path.basename(apkPath)
    const packageName = apkFileName.replace(/\.apk$/i, '')
    const obbPath = findObbByPackageName(folderPath, packageName)

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

      // Get list of ALL files in OBB folder recursively
      const obbFolderName = path.basename(obbPath)

      const getAllFilesRelative = (dir, basePath = '') => {
        let results = []
        const list = fs.readdirSync(dir)
        list.forEach((file) => {
          const fullPath = path.join(dir, file)
          const relPath = path.join(basePath, file)
          const stat = fs.statSync(fullPath)
          if (stat && stat.isDirectory()) {
            results = results.concat(getAllFilesRelative(fullPath, relPath))
          } else {
            results.push({ localPath: fullPath, relativePath: relPath, name: file })
          }
        })
        return results
      }

      const obbFiles = getAllFilesRelative(obbPath)

      // Create remote folder (without quotes - spawn passes args individually)
      const remoteObbFolder = `/sdcard/Android/obb/${obbFolderName}`
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteObbFolder])
      } catch (e) {
        console.warn('mkdir obb folder failed:', e.message)
      }

      // Verify the directory was actually created
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'ls', '-d', remoteObbFolder])
      } catch {
        console.warn(
          '[OBB Push Folder] Directory verification failed, attempting push of entire folder...'
        )
        // Fallback: push entire OBB folder at once (adb push handles dir creation)
        try {
          sendProgress('PUSHING_OBB', 0, `Copying OBB folder...`)
          await runAdbCommand([...deviceFlag, 'push', obbPath, remoteObbFolder])
          sendProgress('PUSHING_OBB', 100, 'progress_obb_complete')
          // Skip individual file push since folder push succeeded
          obbFiles.length = 0
        } catch (pushFolderErr) {
          console.error('[OBB Push Folder] Folder push also failed:', pushFolderErr.message)
          throw pushFolderErr
        }
      }

      // Push each file individually with progress tracking
      const createdDirs = new Set([remoteObbFolder])

      for (let i = 0; i < obbFiles.length; i++) {
        const fileObj = obbFiles[i]
        const remoteFilePath = `${remoteObbFolder}/${fileObj.relativePath.replace(/\\/g, '/')}`
        const remoteDirPath = remoteFilePath.substring(0, remoteFilePath.lastIndexOf('/'))

        if (!createdDirs.has(remoteDirPath)) {
          try {
            // NOTE: Do NOT wrap path in quotes - spawn() passes each arg separately
            await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteDirPath])
            createdDirs.add(remoteDirPath)
          } catch (err) {
            console.warn(`[OBB Push Folder] Failed to create dir ${remoteDirPath}:`, err.message)
          }
        }

        const progressPercent = Math.round((i / obbFiles.length) * 100)
        sendProgress('PUSHING_OBB', progressPercent, `Copying: ${fileObj.name}`)

        await pushObbFile(deviceFlag, fileObj.localPath, remoteFilePath, sendProgress, fileObj.name)
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
        let isCharging = false
        let storage = { free: '0', total: '0', percent: '0' }

        if (state === 'device') {
          try {
            const deviceFlag = `-s ${serial}`

            // Run battery and storage checks in parallel
            const [batteryResult, storageResult] = await Promise.all([
              new Promise((res) => {
                // Remove grep for Windows compatibility
                exec(`${safeAdb} ${deviceFlag} shell dumpsys battery`, (err, out) => {
                  if (err) return res({ percent: 'N/A', isCharging: false })
                  const levelMatch = out.match(/level:\s*(\d+)/)
                  const acMatch = out.match(/AC powered:\s*(true|false)/)
                  const usbMatch = out.match(/USB powered:\s*(true|false)/)
                  const wirelessMatch = out.match(/Wireless powered:\s*(true|false)/)
                  const isCharging =
                    acMatch?.[1] === 'true' ||
                    usbMatch?.[1] === 'true' ||
                    wirelessMatch?.[1] === 'true'
                  const percent = levelMatch ? levelMatch[1] + '%' : 'N/A'
                  res({ percent, isCharging })
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

            battery = batteryResult.percent
            isCharging = batteryResult.isCharging
            storage = storageResult
          } catch (e) {
            console.warn(`Failed to get details for ${serial}`, e)
          }
        }

        devices.push({ serial, state, model, battery, isCharging, storage })
      }

      resolve(devices)
    })
  })
})

// Helper: Check if URL is Google Drive
const isGoogleDriveUrl = (url) => {
  return url && (url.includes('drive.google.com') || url.includes('docs.google.com'))
}

// Helper: Check if URL is Dropbox
const isDropboxUrl = (url) => {
  return url && url.includes('dropbox.com')
}

// Helper: Get direct download URL for Dropbox
const getDropboxDirectUrl = (url) => {
  // Replace dl=0 with dl=1 for direct download
  let directUrl = url.replace('dl=0', 'dl=1')
  // Also handle URLs without dl parameter
  if (!directUrl.includes('dl=1')) {
    directUrl += (directUrl.includes('?') ? '&' : '?') + 'dl=1'
  }
  return directUrl
}

// Helper: Extract file ID from Google Drive URL
const extractGoogleDriveFileId = (url) => {
  // Format 1: /file/d/FILE_ID/view
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match1) return match1[1]

  // Format 2: ?id=FILE_ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match2) return match2[1]

  return null
}

// IPC: Download File with Progress (for downloads from Google Drive or Dropbox)
// Now automatically saves to HyperTopiaExtraction/Downloads folder
ipcMain.handle('download-file', async (event, { url, fileName }) => {
  try {
    // Reset download state first to ensure clean start
    resetDownloadState()

    const https = require('https')

    // Get extractPath from localStorage
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      throw new Error('No extraction folder configured. Please set it up in Settings.')
    }

    // Create Downloads subfolder in the extractPath
    const downloadFolder = path.join(extractPath, 'Downloads')
    await fs.ensureDir(downloadFolder)

    // Create full file path
    const filePath = path.join(downloadFolder, fileName)

    // Determine download type and handle accordingly
    if (isDropboxUrl(url)) {
      // ============ DROPBOX DOWNLOAD ============
      return new Promise((resolve, reject) => {
        const directUrl = getDropboxDirectUrl(url)

        let downloadedBytes = 0
        let totalBytes = 0
        let resolved = false
        let lastTime = Date.now()
        let lastBytes = 0
        let speed = 0

        // Send initial status
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('download-progress', {
            fileName,
            downloadedBytes: 0,
            totalBytes: 0,
            progress: 0,
            speed: 0,
            status: 'preparing'
          })
        }

        const followRedirects = (downloadUrl, maxRedirects = 5) => {
          if (maxRedirects <= 0) {
            reject(new Error('Too many redirects'))
            return
          }

          // Check if cancelled before starting
          if (downloadState.isCancelled) {
            reject(new Error('Download cancelled'))
            return
          }

          const parsedUrl = new URL(downloadUrl)
          const httpModule = parsedUrl.protocol === 'https:' ? https : require('http')

          const request = httpModule.get(
            downloadUrl,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            },
            (response) => {
              // Store request for cancellation
              downloadState.activeRequest = request

              // Handle redirects
              if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
              ) {
                followRedirects(response.headers.location, maxRedirects - 1)
                return
              }

              if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
                return
              }

              totalBytes = parseInt(response.headers['content-length'] || '0', 10)

              const dest = fs.createWriteStream(filePath)

              // Store stream and file path for cancellation
              downloadState.activeStream = dest
              downloadState.activeFilePath = filePath

              response.on('data', (chunk) => {
                // Check if cancelled
                if (downloadState.isCancelled) {
                  response.destroy()
                  dest.destroy()
                  return
                }

                downloadedBytes += chunk.length
                const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

                // Calculate speed
                const now = Date.now()
                const timeDiff = (now - lastTime) / 1000
                if (timeDiff >= 0.5) {
                  speed = (downloadedBytes - lastBytes) / timeDiff
                  lastTime = now
                  lastBytes = downloadedBytes
                }

                if (event.sender && !event.sender.isDestroyed() && !downloadState.isCancelled) {
                  event.sender.send('download-progress', {
                    fileName,
                    downloadedBytes,
                    totalBytes,
                    progress,
                    speed,
                    status: 'downloading'
                  })
                }
              })

              response.pipe(dest)

              dest.on('finish', () => {
                dest.close(() => {
                  try {
                    const stats = fs.statSync(filePath)

                    if (stats.size === 0) {
                      fs.unlink(filePath, () => {})
                      if (!resolved) {
                        resolved = true
                        reject(new Error('Downloaded file is empty'))
                      }
                    } else {
                      if (!resolved) {
                        resolved = true
                        resolve({ success: true, filePath })
                      }
                    }
                  } catch (err) {
                    if (!resolved) {
                      resolved = true
                      reject(err)
                    }
                  }
                })
              })

              dest.on('error', (err) => {
                fs.unlink(filePath, () => {})
                if (!resolved) {
                  resolved = true
                  reject(err)
                }
              })
            }
          )

          request.on('error', (err) => {
            console.error('[Download] Dropbox request error:', err)
            if (!resolved) {
              resolved = true
              reject(err)
            }
          })
        }

        followRedirects(directUrl)
      })
    } else if (isGoogleDriveUrl(url)) {
      // ============ GOOGLE DRIVE DOWNLOAD ============
      const { google } = require('googleapis')

      const fileId = extractGoogleDriveFileId(url)
      if (!fileId) {
        throw new Error('Invalid Google Drive URL - cannot extract file ID')
      }

      return new Promise((resolve, reject) => {
        // Use the pre-defined GOOGLE_API_KEY constant (has fallback)
        const apiKey = GOOGLE_API_KEY

        if (!apiKey) {
          reject(
            new Error(
              'Google Drive API Key not found. Please set REACT_APP_GOOGLE_API_KEY in .env file'
            )
          )
          return
        }

        // Create custom HTTP agent and options with referer header
        const customHeaders = {
          Referer: 'https://hypertopia.web.id/',
          Origin: 'https://hypertopia.web.id',
          'Accept-Encoding': 'identity'
        }

        // Initialize Google Drive API with API Key and custom headers
        const drive = google.drive({
          version: 'v3',
          auth: apiKey,
          headers: customHeaders
        })

        let downloadedBytes = 0
        let totalBytes = 0
        let resolved = false
        let lastTime = Date.now()
        let lastBytes = 0
        let speed = 0

        // Send initial status (selecting file location done)
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('download-progress', {
            fileName,
            downloadedBytes: 0,
            totalBytes: 0,
            progress: 0,
            speed: 0,
            status: 'preparing'
          })
        }

        // Get file metadata first to get the file size
        drive.files
          .get(
            {
              fileId: fileId,
              fields: 'size,name',
              supportsAllDrives: true
            },
            {
              responseType: 'json',
              headers: customHeaders
            }
          )
          .then((metadata) => {
            totalBytes = parseInt(metadata.data.size || '0', 10)

            // Download the file
            const dest = fs.createWriteStream(filePath)

            drive.files.get(
              {
                fileId: fileId,
                alt: 'media',
                supportsAllDrives: true,
                acknowledgeAbuse: true
              },
              {
                responseType: 'stream',
                headers: customHeaders
              },
              (err, response) => {
                if (err) {
                  console.error('[Download] Error downloading file:', err)
                  dest.close()
                  fs.unlink(filePath, () => {})
                  if (!resolved) {
                    resolved = true
                    reject(err)
                  }
                  return
                }

                // Try to get content-length from response headers if totalBytes is 0
                if (totalBytes === 0 && response.headers && response.headers['content-length']) {
                  totalBytes = parseInt(response.headers['content-length'], 10)
                }

                // Store stream and filepath for cancellation
                downloadState.activeStream = dest
                downloadState.activeFilePath = filePath

                response.data
                  .on('data', (chunk) => {
                    // Check if cancelled
                    if (downloadState.isCancelled) {
                      response.data.destroy()
                      dest.destroy()
                      return
                    }

                    downloadedBytes += chunk.length
                    const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

                    // Calculate speed (bytes per second)
                    const now = Date.now()
                    const timeDiff = (now - lastTime) / 1000 // in seconds
                    if (timeDiff >= 0.5) {
                      // Update speed every 500ms
                      speed = (downloadedBytes - lastBytes) / timeDiff
                      lastTime = now
                      lastBytes = downloadedBytes
                    }

                    // Send progress to renderer (only if not cancelled)
                    if (event.sender && !event.sender.isDestroyed() && !downloadState.isCancelled) {
                      event.sender.send('download-progress', {
                        fileName,
                        downloadedBytes,
                        totalBytes,
                        progress,
                        speed,
                        status: 'downloading'
                      })
                    }
                  })
                  .on('end', () => {})
                  .on('error', (err) => {
                    console.error('[Download] Stream error:', err)
                    dest.close()
                    fs.unlink(filePath, () => {})
                    if (!resolved) {
                      resolved = true
                      reject(err)
                    }
                  })
                  .pipe(dest)

                dest.on('finish', () => {
                  dest.close(() => {
                    // Verify file size
                    try {
                      const stats = fs.statSync(filePath)

                      if (stats.size === 0) {
                        fs.unlink(filePath, () => {})
                        if (!resolved) {
                          resolved = true
                          reject(new Error('Downloaded file is empty'))
                        }
                      } else {
                        if (!resolved) {
                          resolved = true
                          resolve({ success: true, filePath })
                        }
                      }
                    } catch (err) {
                      console.error('[Download] Error checking file size:', err)
                      if (!resolved) {
                        resolved = true
                        reject(err)
                      }
                    }
                  })
                })

                dest.on('error', (err) => {
                  console.error('[Download] File stream error:', err)
                  fs.unlink(filePath, () => {})
                  if (!resolved) {
                    resolved = true
                    reject(err)
                  }
                })
              }
            )
          })
          .catch((err) => {
            console.error('[Download] Error getting file metadata:', err)
            if (!resolved) {
              resolved = true
              reject(err)
            }
          })
      })
    } else {
      // ============ UNSUPPORTED URL - Open in browser ============
      await shell.openExternal(url)
      return { success: false, error: 'Unsupported download URL - opened in browser' }
    }
  } catch (error) {
    console.error('Failed to download file:', error)
    return { success: false, error: error.message }
  }
})

// IPC: Open External URL (for Google Drive downloads etc)
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    console.error('Failed to open external URL:', error)
    return { success: false, error: error.message }
  }
})

// IPC: List all downloaded files
ipcMain.handle('list-downloaded-files', async (event) => {
  try {
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      return { success: false, error: 'No extraction folder configured' }
    }

    const downloadFolder = path.join(extractPath, 'Downloads')
    await fs.ensureDir(downloadFolder)

    // Read directory
    const files = await fs.readdir(downloadFolder)
    const fileDetails = []

    for (const file of files) {
      if (file === 'temp' || file.startsWith('.')) continue // Skip temp and hidden
      const fullPath = path.join(downloadFolder, file)
      try {
        const stats = await fs.stat(fullPath)

        let type = 'unknown'
        const lowerFile = file.toLowerCase()
        if (stats.isDirectory()) type = 'folder'
        else if (
          lowerFile.endsWith('.zip') ||
          lowerFile.endsWith('.rar') ||
          lowerFile.endsWith('.7z')
        )
          type = 'archive'
        else if (lowerFile.endsWith('.apk')) type = 'apk'

        fileDetails.push({
          name: file,
          path: fullPath,
          size: stats.size,
          type: type,
          lastModified: stats.mtimeMs
        })
      } catch (err) {
        console.warn(`Error reading stats for ${file}:`, err.message)
      }
    }

    // Sort by last modified (newest first)
    fileDetails.sort((a, b) => b.lastModified - a.lastModified)

    return { success: true, files: fileDetails }
  } catch (error) {
    console.error('Failed to list downloaded files:', error)
    return { success: false, error: error.message }
  }
})

// IPC: Open Downloads folder in file explorer
ipcMain.handle('open-downloads-folder', async (event) => {
  try {
    // Get extractPath from localStorage
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      return { success: false, error: 'No extraction folder configured' }
    }

    const downloadFolder = path.join(extractPath, 'Downloads')
    await fs.ensureDir(downloadFolder)
    await shell.openPath(downloadFolder)
    return { success: true, path: downloadFolder }
  } catch (error) {
    console.error('Failed to open downloads folder:', error)
    return { success: false, error: error.message }
  }
})

// IPC: Download and Install Archive (ZIP/RAR) to device
// This handles the full flow: download -> extract -> scan -> install APK + OBB
ipcMain.handle('download-and-install-archive', async (event, { url, fileName, deviceSerial }) => {
  const https = require('https')

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
  let archivePath = path.join(tempDir, fileName)

  // Store temp directory for cleanup on cancel
  installationState.tempDir = tempDir

  const sendProgress = (step, percent, detail, downloadInfo = null) => {
    if (installationState.isCancelled) return
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('install-apk-progress', {
        step,
        percent,
        detail,
        ...downloadInfo
      })
    }
  }

  try {
    sendProgress('DOWNLOADING', 0, 'Preparing download...')
    fs.ensureDirSync(tempDir)

    // 1. DOWNLOAD THE ARCHIVE
    const downloadResult = await new Promise((resolve, reject) => {
      let downloadedBytes = 0
      let totalBytes = 0
      let lastTime = Date.now()
      let lastBytes = 0
      let speed = 0

      const handleDownload = (downloadUrl) => {
        // Handle Dropbox
        if (isDropboxUrl(downloadUrl)) {
          downloadUrl = getDropboxDirectUrl(downloadUrl)
        }

        const parsedUrl = new URL(downloadUrl)
        const httpModule = parsedUrl.protocol === 'https:' ? https : require('http')

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://hypertopia.web.id/',
            Origin: 'https://hypertopia.web.id'
          }
        }

        const request = httpModule.get(downloadUrl, options, (response) => {
          // Handle redirects
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            handleDownload(response.headers.location, true)
            return
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
            return
          }

          totalBytes = parseInt(response.headers['content-length'] || '0', 10)
          const dest = fs.createWriteStream(archivePath)

          response.on('data', (chunk) => {
            if (installationState.isCancelled) {
              request.destroy()
              dest.close()
              reject(new Error('Installation cancelled'))
              return
            }

            downloadedBytes += chunk.length
            const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000
            if (timeDiff >= 0.5) {
              speed = (downloadedBytes - lastBytes) / timeDiff
              lastTime = now
              lastBytes = downloadedBytes
            }

            sendProgress('DOWNLOADING', Math.round(progress), 'Downloading game archive...', {
              downloadedBytes,
              totalBytes,
              speed
            })
          })

          response.pipe(dest)

          dest.on('finish', () => {
            dest.close(() => {
              const stats = fs.statSync(archivePath)
              if (stats.size === 0) {
                reject(new Error('Downloaded file is empty'))
              } else {
                resolve({ success: true, filePath: archivePath })
              }
            })
          })

          dest.on('error', (err) => {
            fs.unlink(archivePath, () => {})
            reject(err)
          })
        })

        request.on('error', (err) => reject(err))
      }

      // Check if Google Drive URL
      if (isGoogleDriveUrl(url)) {
        const { google } = require('googleapis')
        const fileId = extractGoogleDriveFileId(url)

        if (!fileId) {
          reject(new Error('Invalid Google Drive URL'))
          return
        }
        // Use the pre-defined GOOGLE_API_KEY constant (has fallback)
        const apiKey = GOOGLE_API_KEY
        if (!apiKey) {
          reject(new Error('Google Drive API Key not found'))
          return
        }

        const customHeaders = {
          Referer: 'https://hypertopia.web.id/',
          Origin: 'https://hypertopia.web.id',
          'Accept-Encoding': 'identity'
        }

        const drive = google.drive({
          version: 'v3',
          auth: apiKey,
          headers: customHeaders
        })

        // Get file metadata first
        drive.files
          .get(
            { fileId, fields: 'size,name', supportsAllDrives: true },
            { responseType: 'json', headers: customHeaders }
          )
          .then((metadata) => {
            totalBytes = parseInt(metadata.data.size || '0', 10)
            const gdFileName = metadata.data.name || ''

            const dest = fs.createWriteStream(archivePath)

            // Download the file (acknowledgeAbuse bypasses virus scan confirmation for large files)
            drive.files.get(
              { fileId, alt: 'media', supportsAllDrives: true, acknowledgeAbuse: true },
              { responseType: 'stream', headers: customHeaders },
              (err, response) => {
                if (err) {
                  console.error('[Install Archive] Google Drive download error:', err)
                  dest.close()
                  fs.unlink(archivePath, () => {})
                  reject(err)
                  return
                }

                if (totalBytes === 0 && response.headers && response.headers['content-length']) {
                  totalBytes = parseInt(response.headers['content-length'], 10)
                }

                response.data.on('data', (chunk) => {
                  if (installationState.isCancelled) {
                    response.data.destroy()
                    dest.close()
                    reject(new Error('Installation cancelled'))
                    return
                  }

                  downloadedBytes += chunk.length
                  const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

                  const now = Date.now()
                  const timeDiff = (now - lastTime) / 1000
                  if (timeDiff >= 0.5) {
                    speed = (downloadedBytes - lastBytes) / timeDiff
                    lastTime = now
                    lastBytes = downloadedBytes
                  }

                  sendProgress('DOWNLOADING', Math.round(progress), 'Downloading game archive...', {
                    downloadedBytes,
                    totalBytes,
                    speed,
                    gdFileName
                  })
                })

                response.data.pipe(dest)

                dest.on('finish', () =>
                  dest.close(() => {
                    const stats = fs.statSync(archivePath)
                    if (stats.size === 0) {
                      reject(new Error('Downloaded file is empty'))
                    } else if (totalBytes > 0 && Math.abs(stats.size - totalBytes) > 1024) {
                      // File size mismatch - likely encoding/decompression issue
                      console.warn(
                        '[Install Archive] WARNING: File size mismatch! On disk:',
                        stats.size,
                        'expected:',
                        totalBytes
                      )
                      // Still resolve but log warning - the file may still work
                      resolve({ success: true, filePath: archivePath })
                    } else {
                      resolve({ success: true, filePath: archivePath })
                    }
                  })
                )

                dest.on('error', (err) => {
                  fs.unlink(archivePath, () => {})
                  reject(err)
                })
              }
            )
          })
          .catch(reject)
      } else {
        // Regular URL or Dropbox
        handleDownload(url)
      }
    })

    if (!downloadResult.success) {
      throw new Error('Download failed')
    }

    // Check for cancellation
    if (installationState.isCancelled) {
      throw new Error('Installation cancelled')
    }

    // Validate the downloaded file and fix extension if needed
    // (Google Drive files may have different format than the extension we gave them)
    try {
      const fd = fs.openSync(archivePath, 'r')
      const headerBuf = Buffer.alloc(16)
      fs.readSync(fd, headerBuf, 0, 16, 0)
      fs.closeSync(fd)

      // Check magic bytes for common archive formats
      const isZipMagic = headerBuf[0] === 0x50 && headerBuf[1] === 0x4b // PK (ZIP)
      const is7zMagic =
        headerBuf[0] === 0x37 &&
        headerBuf[1] === 0x7a &&
        headerBuf[2] === 0xbc &&
        headerBuf[3] === 0xaf // 7z
      const isRarMagic =
        headerBuf[0] === 0x52 &&
        headerBuf[1] === 0x61 &&
        headerBuf[2] === 0x72 &&
        headerBuf[3] === 0x21 // Rar!

      if (!isZipMagic && !is7zMagic && !isRarMagic) {
        // Check if it's HTML (Google Drive virus scan page)
        const headerStr = headerBuf.toString('utf8').trim().toLowerCase()
        if (
          headerStr.startsWith('<!doc') ||
          headerStr.startsWith('<html') ||
          headerStr.startsWith('<head')
        ) {
          console.error(
            '[Install Archive] Downloaded file is an HTML page (likely Google Drive virus scan confirmation)'
          )
          throw new Error(
            'Download gagal: Google Drive mengembalikan halaman konfirmasi, bukan file arsip. Coba lagi atau gunakan link download langsung.'
          )
        }
        console.warn(
          '[Install Archive] Unknown archive format, magic bytes:',
          headerBuf.slice(0, 8).toString('hex')
        )
      } else {
        const detectedFormat = isZipMagic ? 'ZIP' : is7zMagic ? '7Z' : 'RAR'
        void detectedFormat // used for logging context only

        // Fix file extension if it doesn't match the actual format
        // This happens when Google Drive file is e.g. .rar but we saved it as .zip
        const currentExt = path.extname(archivePath).toLowerCase()
        const correctExt = isRarMagic ? '.rar' : is7zMagic ? '.7z' : '.zip'

        if (currentExt !== correctExt) {
          const newArchivePath = archivePath.replace(/\.[^.]+$/, correctExt)
          fs.renameSync(archivePath, newArchivePath)
          archivePath = newArchivePath
        }
      }

      // Also verify file size matches expected
      fs.statSync(archivePath) // validate file is readable
    } catch (validationErr) {
      if (validationErr.message.includes('Download gagal')) {
        throw validationErr
      }
      console.warn('[Install Archive] Could not validate archive:', validationErr.message)
    }

    // 2. EXTRACTION
    sendProgress('EXTRACTING', 0, 'Extracting archive...')

    const isRar = archivePath.toLowerCase().endsWith('.rar')
    const extractDir = path.join(tempDir, 'extracted')
    fs.ensureDirSync(extractDir)

    try {
      if (isRar) {
        await extractRar(archivePath, extractDir, (current, total, extractFileName) => {
          if (installationState.isCancelled) throw new Error('Installation cancelled')
          const percent = total > 0 ? Math.floor((current / total) * 100) : 0
          sendProgress('EXTRACTING', percent, `Extracting: ${extractFileName}`)
        })
      } else {
        await extract7z(archivePath, extractDir, (current, total, extractFileName) => {
          if (installationState.isCancelled) throw new Error('Installation cancelled')
          const percent = total > 0 ? Math.floor((current / total) * 100) : 0
          sendProgress('EXTRACTING', percent, `Extracting: ${extractFileName}`)
        })
      }
    } catch (extractErr) {
      if (extractErr.message === 'Installation cancelled') throw extractErr

      const errMsg = extractErr.message || ''
      if (errMsg.startsWith('RAR_') || errMsg.startsWith('ARCHIVE_')) {
        throw extractErr
      }
      if (
        errMsg.includes('Cannot open') ||
        errMsg.includes('not supported') ||
        errMsg.includes('invalid signature')
      ) {
        throw new Error('File archive tidak valid atau format tidak didukung.')
      } else if (errMsg.includes('Wrong password') || errMsg.includes('encrypted')) {
        throw new Error('File archive terenkripsi/memiliki password.')
      }
      throw extractErr
    }

    // Check for cancellation
    if (installationState.isCancelled) {
      throw new Error('Installation cancelled')
    }

    // 3. FIND APK AND OBB
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

    const apkPath = findFileByExt(extractDir, '.apk')
    const obbPath = findObbParent(extractDir)

    if (!apkPath) {
      throw new Error('No APK found in archive.')
    }

    // 4. INSTALL APK
    sendProgress('INSTALLING', 0, 'Pushing APK to device...')

    const remoteApk = `/data/local/tmp/base.apk`
    await runAdbCommand([...deviceFlag, 'push', apkPath, remoteApk], (output) => {
      if (installationState.isCancelled) return
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING', parseInt(match[1]) * 0.5, 'Pushing APK to device...')
      }
    })

    if (installationState.isCancelled) {
      throw new Error('Installation cancelled')
    }

    sendProgress('INSTALLING', 50, 'Installing package...')
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    // Cleanup remote APK
    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    // 5. PUSH OBB (if exists)
    if (obbPath) {
      sendProgress('PUSHING_OBB', 0, 'Preparing OBB data...')

      // Ensure /sdcard/Android/obb/ directory exists
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', '/sdcard/Android/obb/'])
      } catch (mkdirErr) {
        console.warn('mkdir /sdcard/Android/obb/ failed:', mkdirErr.message)
      }

      const obbFolderName = path.basename(obbPath)
      const obbFiles = fs
        .readdirSync(obbPath)
        .filter((f) => fs.statSync(path.join(obbPath, f)).isFile())

      const remoteObbFolder = `/sdcard/Android/obb/${obbFolderName}`
      try {
        await runAdbCommand([...deviceFlag, 'shell', 'mkdir', '-p', remoteObbFolder])
      } catch (e) {
        console.warn('mkdir obb folder failed:', e.message)
      }

      for (let i = 0; i < obbFiles.length; i++) {
        if (installationState.isCancelled) {
          throw new Error('Installation cancelled')
        }

        const obbFileName = obbFiles[i]
        const localFilePath = path.join(obbPath, obbFileName)
        const remoteFilePath = `${remoteObbFolder}/${obbFileName}`
        const progressPercent = Math.round((i / obbFiles.length) * 100)

        sendProgress('PUSHING_OBB', progressPercent, `Copying: ${obbFileName}`)

        try {
          await runAdbCommand([...deviceFlag, 'push', localFilePath, remoteFilePath], (output) => {
            const match = output.match(/\[\s*(\d+)%\]/)
            if (match) {
              const fileProgress = parseInt(match[1])
              const totalProgress = Math.round(((i + fileProgress / 100) / obbFiles.length) * 100)
              sendProgress('PUSHING_OBB', totalProgress, `Copying: ${obbFileName}`)
            }
          })
        } catch (directErr) {
          console.warn(
            `[Install Archive] Direct OBB push failed, using fallback: ${directErr.message}`
          )
          await pushObbFile(deviceFlag, localFilePath, remoteFilePath, sendProgress, obbFileName)
        }
      }

      sendProgress('PUSHING_OBB', 100, 'OBB data copied successfully!')
    }

    sendProgress('COMPLETED', 100, 'Installation complete!')

    // Cleanup temp directory on success
    try {
      await fs.remove(tempDir)
    } catch (cleanupErr) {
      console.warn(`[Install Archive] Cleanup failed: ${cleanupErr.message}`)
    }

    return { success: true, hasObb: !!obbPath }
  } catch (error) {
    console.error('[Install Archive] Error:', error)
    sendProgress('ERROR', 0, error.message)

    // On cancellation, clean up everything
    if (error.message === 'Installation cancelled') {
      try {
        await fs.remove(tempDir)
      } catch (cleanupErr) {
        console.warn(`[Install Archive] Cleanup failed: ${cleanupErr.message}`)
        setTimeout(() => {
          fs.remove(tempDir).catch((err) =>
            console.warn(`[Install Archive] Delayed cleanup also failed: ${err.message}`)
          )
        }, 1000)
      }
    } else {
      // On install failure, only clean up extracted files but KEEP the downloaded archive
      // so the user doesn't have to re-download a large file
      const extractDir = path.join(tempDir, 'extracted')
      try {
        if (await fs.pathExists(extractDir)) {
          await fs.remove(extractDir)
        }
      } catch (cleanupErr) {
        console.warn(`[Install Archive] Extract cleanup failed: ${cleanupErr.message}`)
      }
    }

    return { success: false, error: error.message }
  }
})

// IPC: Download and Install APK to device
ipcMain.handle('download-and-install-apk', async (event, { url, fileName, deviceSerial }) => {
  const https = require('https')

  // Create temp directory for download
  const tempDir = path.join(os.tmpdir(), 'hypertopia_apk_install_' + Date.now())
  fs.mkdirSync(tempDir, { recursive: true })
  const tempFilePath = path.join(tempDir, fileName)

  const sendProgress = (step, percent, detail, downloadInfo = null) => {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('install-apk-progress', {
        step,
        percent,
        detail,
        ...downloadInfo
      })
    }
  }

  try {
    sendProgress('DOWNLOADING', 0, 'Preparing download...')

    // Download the file
    const downloadResult = await new Promise((resolve, reject) => {
      let downloadedBytes = 0
      let totalBytes = 0
      let lastTime = Date.now()
      let lastBytes = 0
      let speed = 0

      const handleDownload = (downloadUrl) => {
        // Handle Dropbox
        if (isDropboxUrl(downloadUrl)) {
          downloadUrl = getDropboxDirectUrl(downloadUrl)
        }

        const parsedUrl = new URL(downloadUrl)
        const httpModule = parsedUrl.protocol === 'https:' ? https : require('http')

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: 'https://hypertopia.web.id/',
            Origin: 'https://hypertopia.web.id'
          }
        }

        const request = httpModule.get(downloadUrl, options, (response) => {
          // Handle redirects
          if (
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            handleDownload(response.headers.location, true)
            return
          }

          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
            return
          }

          totalBytes = parseInt(response.headers['content-length'] || '0', 10)
          const dest = fs.createWriteStream(tempFilePath)

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000
            if (timeDiff >= 0.5) {
              speed = (downloadedBytes - lastBytes) / timeDiff
              lastTime = now
              lastBytes = downloadedBytes
            }

            sendProgress('DOWNLOADING', Math.round(progress), 'Downloading APK...', {
              downloadedBytes,
              totalBytes,
              speed
            })
          })

          response.pipe(dest)

          dest.on('finish', () => {
            dest.close(() => {
              const stats = fs.statSync(tempFilePath)
              if (stats.size === 0) {
                reject(new Error('Downloaded file is empty'))
              } else {
                resolve({ success: true, filePath: tempFilePath })
              }
            })
          })

          dest.on('error', (err) => {
            fs.unlink(tempFilePath, () => {})
            reject(err)
          })
        })

        request.on('error', (err) => reject(err))
      }

      // Check if Google Drive URL
      if (isGoogleDriveUrl(url)) {
        const { google } = require('googleapis')
        const fileId = extractGoogleDriveFileId(url)

        if (!fileId) {
          reject(new Error('Invalid Google Drive URL'))
          return
        }
        // Use the pre-defined GOOGLE_API_KEY constant (has fallback)
        const apiKey = GOOGLE_API_KEY
        if (!apiKey) {
          reject(new Error('Google Drive API Key not found'))
          return
        }

        // Custom headers required for API key restrictions
        const customHeaders = {
          Referer: 'https://hypertopia.web.id/',
          Origin: 'https://hypertopia.web.id',
          'Accept-Encoding': 'identity'
        }

        const drive = google.drive({
          version: 'v3',
          auth: apiKey,
          headers: customHeaders
        })

        // Get file metadata first
        drive.files
          .get(
            { fileId, fields: 'size,name', supportsAllDrives: true },
            { responseType: 'json', headers: customHeaders }
          )
          .then((metadata) => {
            totalBytes = parseInt(metadata.data.size || '0', 10)

            const dest = fs.createWriteStream(tempFilePath)

            // Download the file (acknowledgeAbuse bypasses virus scan confirmation for large files)
            drive.files.get(
              { fileId, alt: 'media', supportsAllDrives: true, acknowledgeAbuse: true },
              { responseType: 'stream', headers: customHeaders },
              (err, response) => {
                if (err) {
                  console.error('[Install] Google Drive download error:', err)
                  dest.close()
                  fs.unlink(tempFilePath, () => {})
                  reject(err)
                  return
                }

                // Get content-length from response if totalBytes is 0
                if (totalBytes === 0 && response.headers && response.headers['content-length']) {
                  totalBytes = parseInt(response.headers['content-length'], 10)
                }

                response.data.on('data', (chunk) => {
                  downloadedBytes += chunk.length
                  const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

                  const now = Date.now()
                  const timeDiff = (now - lastTime) / 1000
                  if (timeDiff >= 0.5) {
                    speed = (downloadedBytes - lastBytes) / timeDiff
                    lastTime = now
                    lastBytes = downloadedBytes
                  }

                  sendProgress('DOWNLOADING', Math.round(progress), 'Downloading APK...', {
                    downloadedBytes,
                    totalBytes,
                    speed
                  })
                })

                response.data.pipe(dest)

                dest.on('finish', () => {
                  dest.close(() => {
                    const stats = fs.statSync(tempFilePath)
                    if (stats.size === 0) {
                      reject(new Error('Downloaded file is empty'))
                    } else {
                      resolve({ success: true, filePath: tempFilePath })
                    }
                  })
                })

                dest.on('error', (err) => {
                  fs.unlink(tempFilePath, () => {})
                  reject(err)
                })
              }
            )
          })
          .catch(reject)
      } else {
        // Regular URL or Dropbox
        handleDownload(url)
      }
    })

    if (!downloadResult.success) {
      throw new Error('Download failed')
    }

    // Now install the APK
    sendProgress('INSTALLING', 0, 'Pushing APK to device...')

    const deviceFlag = deviceSerial ? ['-s', deviceSerial] : []
    const remoteApk = `/data/local/tmp/downloaded_app.apk`

    // Push APK to device
    await runAdbCommand([...deviceFlag, 'push', tempFilePath, remoteApk], (output) => {
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING', parseInt(match[1]) * 0.5, 'Pushing APK to device...')
      }
    })

    sendProgress('INSTALLING', 50, 'Installing package...')

    // Install APK
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    // Cleanup remote APK
    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e)
    }

    sendProgress('COMPLETED', 100, 'Installation complete!')

    return { success: true }
  } catch (error) {
    console.error('Download and install failed:', error)

    // Cleanup temp directory on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e)
    }

    sendProgress('ERROR', 0, error.message)
    return { success: false, error: error.message }
  }
})

// IPC: Check which QGO files are already downloaded
ipcMain.handle('check-downloaded-files', async (event, { fileNames }) => {
  try {
    // Get extractPath from localStorage
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      return { success: true, downloadedFiles: {} }
    }

    const downloadFolder = path.join(extractPath, 'Downloads')
    const downloadedFiles = {}

    for (const fileName of fileNames) {
      const filePath = path.join(downloadFolder, fileName)
      try {
        const exists = fs.existsSync(filePath)
        if (exists) {
          const stats = fs.statSync(filePath)
          downloadedFiles[fileName] = {
            exists: true,
            path: filePath,
            size: stats.size
          }
        } else {
          downloadedFiles[fileName] = { exists: false }
        }
      } catch {
        downloadedFiles[fileName] = { exists: false }
      }
    }

    return { success: true, downloadedFiles }
  } catch (error) {
    console.error('Check downloaded files error:', error)
    return { success: false, error: error.message, downloadedFiles: {} }
  }
})

// IPC: Delete a downloaded file
ipcMain.handle('delete-downloaded-file', async (event, { fileName }) => {
  try {
    // Get extractPath from localStorage
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      throw new Error('No extraction folder configured')
    }

    const downloadFolder = path.join(extractPath, 'Downloads')
    const filePath = path.join(downloadFolder, fileName)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return { success: true }
    } else {
      return { success: false, error: 'File not found' }
    }
  } catch (error) {
    console.error('Delete downloaded file error:', error)
    return { success: false, error: error.message }
  }
})

// IPC: Clear all files in the Downloads folder
ipcMain.handle('clear-downloads-folder', async (event) => {
  try {
    const extractPath = await new Promise((resolve) => {
      event.sender
        .executeJavaScript('localStorage.getItem("extractPath")')
        .then(resolve)
        .catch(() => resolve(null))
    })

    if (!extractPath) {
      return { success: false, error: 'No extraction folder configured' }
    }

    const downloadFolder = path.join(extractPath, 'Downloads')
    await fs.ensureDir(downloadFolder)

    const entries = await fs.readdir(downloadFolder)
    let deletedCount = 0
    const errors = []

    for (const entry of entries) {
      if (entry === 'temp' || entry.startsWith('.')) continue
      const fullPath = path.join(downloadFolder, entry)
      try {
        await fs.remove(fullPath)
        deletedCount++
      } catch (err) {
        console.warn(`Failed to delete ${entry}:`, err.message)
        errors.push(entry)
      }
    }

    return { success: true, deletedCount, errors }
  } catch (error) {
    console.error('Failed to clear downloads folder:', error)
    return { success: false, error: error.message }
  }
})

// IPC: Install local APK file to device
ipcMain.handle('install-local-apk', async (event, { filePath, deviceSerial }) => {
  const sendProgress = (step, percent, detail) => {
    if (event.sender && !event.sender.isDestroyed()) {
      event.sender.send('install-apk-progress', { step, percent, detail })
    }
  }

  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('APK file not found')
    }

    sendProgress('INSTALLING', 0, 'Starting installation...')

    const deviceFlag = deviceSerial ? ['-s', deviceSerial] : []
    const remoteApk = `/data/local/tmp/local_app.apk`

    // Push APK to device
    await runAdbCommand([...deviceFlag, 'push', filePath, remoteApk], (output) => {
      const match = output.match(/\[\s*(\d+)%\]/)
      if (match) {
        sendProgress('INSTALLING', parseInt(match[1]) * 0.7, 'Pushing APK to device...')
      }
    })

    sendProgress('INSTALLING', 70, 'Installing package...')

    // Install APK
    await runAdbCommand([...deviceFlag, 'shell', 'pm', 'install', '-r', remoteApk])

    // Cleanup remote APK
    runAdbCommand([...deviceFlag, 'shell', 'rm', remoteApk]).catch(console.warn)

    sendProgress('COMPLETED', 100, 'Installation complete!')

    return { success: true }
  } catch (error) {
    console.error('Install local APK failed:', error)
    sendProgress('ERROR', 0, error.message)
    return { success: false, error: error.message }
  }
})

// Auto Cleanup: Bersihkan semua temp folder saat app akan quit
app.on('before-quit', async (event) => {
  event.preventDefault()
  await cleanupAllTempFolders()

  try {
    const adbPath = getAdbPath()
    // Use execFile directly here without awaiting its output, or we can await a promise
    await new Promise((resolve) => {
      execFile(adbPath, ['kill-server'], (error) => {
        if (error) {
          console.warn('[Cleanup] Failed to kill ADB server:', error.message)
        }
        resolve() // Continue quitting regardless of error
      })
    })
  } catch (err) {
    console.warn('[Cleanup] Error during ADB kill:', err.message)
  }

  app.exit(0)
})

// Quit when all windows are closed, forcing the app to completely exit on all platforms.
app.on('window-all-closed', () => {
  app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
