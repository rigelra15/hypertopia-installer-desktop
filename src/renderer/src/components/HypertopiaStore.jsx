import { useState, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function HypertopiaStore({ initialUrl }) {
  const { t } = useLanguage()
  const webviewRef = useRef(null)
  // Use initialUrl if provided, otherwise default to homepage
  const [url, setUrl] = useState(initialUrl || 'https://hypertopia.store')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (initialUrl && webviewRef.current) {
      try {
        if (typeof webviewRef.current.loadURL === 'function') {
          webviewRef.current.loadURL(initialUrl)
        }
      } catch (err) {
        console.error('Error loading URL:', err)
      }
    }
  }, [initialUrl])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDidStartLoading = () => setIsLoading(true)
    const handleDidStopLoading = () => setIsLoading(false)
    const handleDidNavigate = (e) => {
      setUrl(e.url)
      if (typeof webview.canGoBack === 'function') setCanGoBack(webview.canGoBack())
      if (typeof webview.canGoForward === 'function') setCanGoForward(webview.canGoForward())
    }

    try {
      webview.addEventListener('did-start-loading', handleDidStartLoading)
      webview.addEventListener('did-stop-loading', handleDidStopLoading)
      webview.addEventListener('did-navigate', handleDidNavigate)
      webview.addEventListener('did-navigate-in-page', handleDidNavigate)

      // Initial state check
      webview.addEventListener('dom-ready', () => {
        if (typeof webview.canGoBack === 'function') setCanGoBack(webview.canGoBack())
        if (typeof webview.canGoForward === 'function') setCanGoForward(webview.canGoForward())
        if (typeof webview.getURL === 'function') setUrl(webview.getURL())
      })
    } catch (err) {
      console.error('Error attaching webview listeners:', err)
    }

    return () => {
      try {
        webview.removeEventListener('did-start-loading', handleDidStartLoading)
        webview.removeEventListener('did-stop-loading', handleDidStopLoading)
        webview.removeEventListener('did-navigate', handleDidNavigate)
        webview.removeEventListener('did-navigate-in-page', handleDidNavigate)
      } catch {
        /* ignore cleanup errors */
      }
    }
  }, [])

  const handleGoBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack()
    }
  }

  const handleGoForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward()
    }
  }

  const handleReload = () => {
    if (webviewRef.current) {
      webviewRef.current.reload()
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url)
  }

  const handleOpenExternal = async () => {
    await window.electron.shell.openExternal(url)
  }

  return (
    <div className="flex flex-1 flex-col bg-[#111] overflow-hidden">
      {/* Browser Bar */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#191919] p-2">
        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoBack}
            disabled={!canGoBack}
            className={`rounded-lg p-1.5 transition-colors ${
              canGoBack ? 'text-white hover:bg-white/10' : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
          </button>
          <button
            onClick={handleGoForward}
            disabled={!canGoForward}
            className={`rounded-lg p-1.5 transition-colors ${
              canGoForward ? 'text-white hover:bg-white/10' : 'text-white/20 cursor-not-allowed'
            }`}
          >
            <Icon icon="mdi:arrow-right" className="h-5 w-5" />
          </button>
          <button
            onClick={handleReload}
            className="rounded-lg p-1.5 text-white hover:bg-white/10 transition-colors"
          >
            <Icon
              icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
              className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-[#0a0a0a] border border-white/5 px-3 py-1.5 shadow-inner">
          <Icon icon="mdi:lock" className="h-3.5 w-3.5 text-[#0081FB]" />
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 bg-transparent text-sm text-white/80 outline-none selection:bg-[#0081FB]/30"
          />
          <button
            onClick={handleCopyUrl}
            className="text-white/30 hover:text-white transition-colors"
            title="Copy link"
          >
            <Icon icon="mdi:content-copy" className="h-4 w-4" />
          </button>
        </div>

        {/* External Actions */}
        <button
          onClick={handleOpenExternal}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          title={t('open_in_browser')}
        >
          <Icon icon="mdi:open-in-new" className="h-5 w-5" />
        </button>
      </div>

      {/* Info Banner - Important Notice */}
      <div className="flex items-center gap-2 border-b border-[#0081FB]/20 bg-[#0081FB]/10 px-3 py-2">
        <Icon icon="mdi:information-outline" className="h-4 w-4 shrink-0 text-[#0081FB]" />
        <p className="flex-1 text-[11px] text-white/80">
          {t('webview_info_notice')}
        </p>
        <button
          onClick={handleOpenExternal}
          className="shrink-0 flex items-center gap-1 rounded-md bg-[#0081FB] px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#0081FB]/80"
        >
          <Icon icon="mdi:open-in-new" className="h-3 w-3" />
          {t('open_in_browser')}
        </button>
      </div>

      {/* Webview */}
      <div className="flex-1 overflow-hidden relative">
        {/* eslint-disable react/no-unknown-property */}
        <webview
          ref={webviewRef}
          src={initialUrl || 'https://hypertopia.store'}
          className="h-full w-full bg-white"
          partition="persist:hypertopia"
          allowpopups="true"
        />
        {/* eslint-enable react/no-unknown-property */}
      </div>
    </div>
  )
}

HypertopiaStore.propTypes = {
  initialUrl: PropTypes.string
}
