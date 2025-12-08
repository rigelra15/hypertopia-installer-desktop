import { useState, useRef } from 'react'

function App() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState({ hasApk: false, hasObb: false })
  const [log, setLog] = useState('Waiting for game file...')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    processFile(droppedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0]
    processFile(selectedFile)
  }

  const processFile = async (paramFile) => {
    try {
      if (!paramFile) return

      // Use modern webUtils via preload to get path
      const filePath = window.api.getFilePath(paramFile)

      if (!filePath) {
        throw new Error('Could not resolve file path. Security restrictions?')
      }

      const lowerPath = filePath.toLowerCase()

      if (lowerPath.endsWith('.zip') || lowerPath.endsWith('.rar')) {
        setFile(paramFile)
        setLog('Scanning architecture...')
        setStatus({ hasApk: false, hasObb: false }) // Reset status

        const result = await window.api.scanZip(filePath)
        setStatus(result)

        if (result.hasApk && result.hasObb) {
          setLog('Complete Game Bundle Found')
        } else if (result.hasApk) {
          setLog('APK Installer Found')
        } else {
          setLog('No compatible content found')
        }
      } else {
        setLog('Invalid Format. Please use .ZIP or .RAR')
        setFile(null)
      }
    } catch (err) {
      console.error(err)
      setLog('Error: ' + (err.message || 'Unknown error'))
      setFile(null)
    }
  }

  const handleInstall = async (type) => {
    if (!file) return
    setIsInstalling(true)
    setLog(`Installing ${type.toUpperCase()}... Please wait.`)

    try {
      const filePath = window.api.getFilePath(file)
      await window.api.installGame(filePath, type)
      setLog(`Installation of ${type.toUpperCase()} Success!`)
    } catch (err) {
      console.error(err)
      setLog('Installation Failed: ' + err.message)
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] font-['Poppins'] text-white selection:bg-[#0081FB]/30">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#0081FB]/20 blur-[100px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-[#0081FB]/10 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-2xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="bg-linear-to-br from-white via-white to-white/50 bg-clip-text text-5xl font-bold tracking-tight text-transparent drop-shadow-sm md:text-6xl">
            Hyper<span className="text-[#0081FB]">Topia</span>
          </h1>
          <p className="mt-4 text-lg font-light text-white/40">Advanced VR Sideloading Protocol</p>
        </div>

        {/* Status/Log Bar */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-2 w-2 gap-0.5">
              <div className="h-full w-0.5 animate-[pulse_1s_ease-in-out_infinite] bg-[#0081FB]"></div>
              <div className="h-full w-0.5 animate-[pulse_1.2s_ease-in-out_infinite] bg-[#0081FB]"></div>
              <div className="h-full w-0.5 animate-[pulse_0.8s_ease-in-out_infinite] bg-[#0081FB]"></div>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider text-[#0081FB]">
              System Log
            </span>
          </div>
          <span className="font-mono text-sm text-white/70">{log}</span>
        </div>

        {/* Dropzone */}
        <div
          onClick={() => !isInstalling && fileInputRef.current?.click()}
          onDrop={!isInstalling ? handleDrop : undefined}
          onDragOver={!isInstalling ? handleDragOver : undefined}
          onDragLeave={!isInstalling ? handleDragLeave : undefined}
          className={`group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
            ${
              isDragOver
                ? 'scale-[1.02] border-[#0081FB] bg-[#0081FB]/10 shadow-[0_0_40px_-10px_rgba(0,129,251,0.3)]'
                : file
                  ? 'border-[#0081FB]/50 bg-[#0081FB]/5 shadow-[0_0_30px_-10px_rgba(0,129,251,0.2)]'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }
            ${isInstalling ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".zip,.rar"
            disabled={isInstalling}
          />

          <div className="relative z-10 flex flex-col items-center p-6 text-center">
            {isInstalling ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#0081FB]"></div>
                <h3 className="text-xl font-bold text-white">Installing...</h3>
                <p className="text-sm text-white/50">Do not disconnect device</p>
              </div>
            ) : file ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0081FB] shadow-lg shadow-[#0081FB]/30">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="max-w-[80%] truncate text-xl font-bold text-white">{file.name}</h3>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/50">
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="h-1 w-1 rounded-full bg-white/20"></span>
                  <span>ZIP Archive</span>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 transition-transform duration-300 ${isDragOver ? 'scale-110' : 'group-hover:scale-110'}`}
                >
                  <svg
                    className={`h-8 w-8 transition-colors ${isDragOver ? 'text-[#0081FB]' : 'text-white/40 group-hover:text-[#0081FB]'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white/80 group-hover:text-white">
                  Drop Game Archive Here
                </h3>
                <p className="mt-2 text-sm text-white/40">Support .ZIP or .RAR files</p>
              </>
            )}
          </div>

          {/* Scanning Grid Background Effect */}
          <div
            className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 transition-opacity ${isDragOver ? 'opacity-30' : ''}`}
          ></div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => handleInstall('apk')}
            disabled={!status.hasApk || isInstalling}
            className="group relative flex-1 overflow-hidden rounded-xl bg-[#0081FB] p-px transition-all disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-40"
          >
            <div className="relative flex h-full items-center justify-center gap-2 rounded-xl bg-transparent py-4 transition-all group-disabled:bg-transparent">
              <span className="font-bold text-white group-hover:scale-105 transition-transform">
                Install APK
              </span>
            </div>
            {/* Glow Effect */}
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:animate-[shimmer_1.5s_infinite] group-disabled:hidden"></div>
          </button>

          <button
            onClick={() => handleInstall('full')}
            disabled={!status.hasObb || isInstalling}
            className="group relative flex-1 overflow-hidden rounded-xl bg-[#0081FB] p-px transition-all disabled:cursor-not-allowed disabled:bg-white/5 disabled:opacity-40"
          >
            <div className="relative flex h-full items-center justify-center gap-2 rounded-xl bg-transparent py-4 text-white transition-all group-hover:scale-105 group-disabled:bg-transparent">
              <span className="font-bold">Install Full</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white">
                APK+OBB
              </span>
            </div>
            {/* Glow Effect */}
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:animate-[shimmer_1.5s_infinite] group-disabled:hidden"></div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-white/30">
            <span>v1.0.0</span>
            <span className="text-white/20">•</span>
            <span className="font-mono">BUILD_2024</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
