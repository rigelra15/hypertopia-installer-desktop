import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import logoImage from '../assets/images/HyperTopiaLauncher.png'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Check initial maximize state
    window.electron.ipcRenderer.invoke('is-window-maximized').then(setIsMaximized)

    // Listen for maximize/unmaximize events
    const unsubMaximize = window.electron.ipcRenderer.on('window-maximized', () => {
      setIsMaximized(true)
    })

    const unsubUnmaximize = window.electron.ipcRenderer.on('window-unmaximized', () => {
      setIsMaximized(false)
    })

    return () => {
      unsubMaximize?.()
      unsubUnmaximize?.()
    }
  }, [])

  const handleMinimize = () => {
    window.electron.ipcRenderer.send('minimize-window')
  }

  const handleMaximize = () => {
    window.electron.ipcRenderer.send('maximize-window')
  }

  const handleClose = () => {
    window.electron.ipcRenderer.send('close-window')
  }

  return (
    <div className="title-bar">
      {/* Draggable area */}
      <div className="title-bar-drag-region">
        <div className="title-bar-title">
          <img src={logoImage} alt="HyperTopia" className="title-bar-icon" />
          <span>HyperTopia Installer</span>
        </div>
      </div>

      {/* Window controls */}
      <div className="title-bar-controls">
        <button
          className="title-bar-button title-bar-button-minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <Icon icon="mdi:window-minimize" />
        </button>
        <button
          className="title-bar-button title-bar-button-maximize"
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          <Icon icon={isMaximized ? 'mdi:window-restore' : 'mdi:window-maximize'} />
        </button>
        <button
          className="title-bar-button title-bar-button-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <Icon icon="mdi:close" />
        </button>
      </div>
    </div>
  )
}
