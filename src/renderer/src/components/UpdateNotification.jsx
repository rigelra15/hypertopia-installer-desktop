import { lazy, Suspense, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
/* global __LOCAL_UPDATE_CARD_PREVIEW__: readonly */

const LOCAL_UPDATE_CARD_PREVIEW_INFO = {
  version: '1.0.325',
  releaseUrl: null,
  previewOnly: true
}

const UpdateModal = lazy(() => import('./UpdateModal'))
const DownloadProgressWidget = lazy(() => import('./DownloadProgressWidget'))

/**
 * UpdateNotification Component
 * Manages update state and shows notification/modal
 */
export default function UpdateNotification({ className = '', onUpdateAvailable }) {
  const { t } = useLanguage()
  const localUpdatePreview =
    import.meta.env.DEV &&
    typeof __LOCAL_UPDATE_CARD_PREVIEW__ !== 'undefined' &&
    __LOCAL_UPDATE_CARD_PREVIEW__
  const [updateState, setUpdateState] = useState('idle') // idle, available, downloading, ready
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [downloadedBytes, setDownloadedBytes] = useState(0)
  const [totalBytes, setTotalBytes] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showWidget, setShowWidget] = useState(false) // NEW: floating widget visibility
  const [hasMountedModal, setHasMountedModal] = useState(false)
  const [hasMountedWidget, setHasMountedWidget] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')
  const [macUpdateInfo, setMacUpdateInfo] = useState(
    localUpdatePreview ? LOCAL_UPDATE_CARD_PREVIEW_INFO : null
  ) // Mac manual update info
  const [showPreviewDetails, setShowPreviewDetails] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(() => localStorage.getItem('autoUpdate') === 'true')

  // Fetch current app version on mount
  useEffect(() => {
    window.api.getAppVersion?.().then((ver) => {
      setCurrentVersion(ver?.version || '')
    })
  }, [])
  useEffect(() => {
    if (!localUpdatePreview) return
    onUpdateAvailable?.(true, LOCAL_UPDATE_CARD_PREVIEW_INFO)
  }, [localUpdatePreview, onUpdateAvailable])

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      const enabled = event.detail === true
      setAutoUpdate(enabled)
      localStorage.setItem('autoUpdate', String(enabled))
    }
    window.addEventListener('auto-download-preference-changed', handlePreferenceChange)
    return () =>
      window.removeEventListener('auto-download-preference-changed', handlePreferenceChange)
  }, [])
  useEffect(() => {
    // Listen for update events from main process
    const unsubAvailable = window.api.onUpdateAvailable((info) => {
      const shouldAutoDownload =
        typeof info?.autoDownloadEnabled === 'boolean' ? info.autoDownloadEnabled : autoUpdate
      setUpdateInfo(info)
      setUpdateState(shouldAutoDownload ? 'downloading' : 'available')
      setDismissed(false)
      onUpdateAvailable?.(true, info)

      setHasMountedModal(true)
      setShowModal(true)
      if (shouldAutoDownload) {
        setHasMountedWidget(true)
        setShowWidget(true)
      }
    })

    // Mac: manual update notification (no auto-install, open browser instead)
    const unsubMacAvailable = window.api.onUpdateAvailableMac?.((info) => {
      setMacUpdateInfo(info)
      onUpdateAvailable?.(true, info)
    })

    const unsubProgress = window.api.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress.percent || 0)
      setDownloadSpeed(progress.bytesPerSecond || 0)
      setDownloadedBytes(progress.transferred || 0)
      setTotalBytes(progress.total || 0)
      setUpdateState('downloading')
    })

    const unsubDownloaded = window.api.onUpdateDownloaded((info) => {
      setUpdateInfo(info)
      setUpdateState('ready')
      setDownloadProgress(100)
      // Show modal when ready to install (user needs to click restart)
      setHasMountedModal(true)
      setShowModal(true)
      // Keep widget visible too
    })

    return () => {
      unsubAvailable?.()
      unsubMacAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
    }
  }, [autoUpdate, onUpdateAvailable])

  const handleDownload = () => {
    window.api.downloadUpdate()
    setUpdateState('downloading')
    // Close modal and show floating widget instead
    setShowModal(false)
    setHasMountedWidget(true)
    setShowWidget(true)
  }

  const handleInstall = () => {
    window.api.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowModal(false)
  }

  const handleLater = () => {
    setShowModal(false)
  }

  // Don't show inline notification if dismissed or idle
  const showInline = !dismissed && updateState !== 'idle'

  return (
    <>
      {/* Mac Manual Update Banner */}
      <AnimatePresence>
        {macUpdateInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`w-full overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm dark:border-orange-500/25 dark:from-[#1a1200] dark:via-[#15120c] dark:to-[#1a1200] ${className}`}
          >
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                    <Icon icon="mdi:apple" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold leading-4 text-gray-800 dark:text-white/80">
                      {t('update_available') || 'Update Available'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold leading-5 text-gray-900 dark:text-white">
                        v{macUpdateInfo.version}
                      </span>
                      {macUpdateInfo.previewOnly && (
                        <span className="rounded-md border border-orange-200 bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                          {t('update_preview_badge') || 'Preview'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t('close') || 'Close'}
                  title={t('close') || 'Close'}
                  onClick={() => {
                    setMacUpdateInfo(null)
                    setShowPreviewDetails(false)
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-orange-100 hover:text-gray-700 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <Icon icon="mdi:close" className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-gray-600 dark:text-white/60">
                {macUpdateInfo.previewOnly
                  ? t('update_preview_description') || 'Local preview only; not a real release.'
                  : t('update_mac_manual') || 'Download manual diperlukan di macOS'}
              </p>
              <button
                type="button"
                aria-expanded={macUpdateInfo.previewOnly ? showPreviewDetails : undefined}
                onClick={() => {
                  if (macUpdateInfo.previewOnly) {
                    setShowPreviewDetails((visible) => !visible)
                    return
                  }
                  window.api.openExternal?.(macUpdateInfo.releaseUrl)
                }}
                className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors ${
                  macUpdateInfo.previewOnly
                    ? 'border-orange-200 bg-orange-100/70 text-orange-700 hover:bg-orange-200/70 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200 dark:hover:bg-orange-500/20'
                    : 'border-orange-500 bg-orange-500 text-white shadow-sm hover:border-orange-600 hover:bg-orange-600'
                }`}
              >
                <Icon icon="mdi:download" className="h-3.5 w-3.5" />
                {macUpdateInfo.previewOnly
                  ? t('update_preview_badge') || 'Preview'
                  : t('update_download_now') || 'Download'}
              </button>
              {macUpdateInfo.previewOnly && showPreviewDetails && (
                <p
                  id="update-preview-action-detail"
                  role="status"
                  className="mt-2 rounded-lg bg-orange-100/70 px-2.5 py-2 text-[10px] leading-4 text-orange-800 dark:bg-orange-500/10 dark:text-orange-200"
                >
                  {t('update_preview_action_feedback') ||
                    'Preview only: no update will be downloaded.'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Modal */}
      {hasMountedModal && (
        <Suspense fallback={null}>
          <UpdateModal
            isOpen={showModal}
            updateInfo={updateInfo}
            onLater={handleLater}
            currentVersion={currentVersion}
            onDownload={handleDownload}
            isDownloading={updateState === 'downloading'}
            downloadProgress={downloadProgress}
            downloadSpeed={downloadSpeed}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
            onInstall={handleInstall}
            isReady={updateState === 'ready'}
          />
        </Suspense>
      )}

      {/* Floating Download Progress Widget */}
      {hasMountedWidget && (
        <Suspense fallback={null}>
          <DownloadProgressWidget
            isVisible={showWidget && (updateState === 'downloading' || updateState === 'ready')}
            updateInfo={updateInfo}
            downloadProgress={downloadProgress}
            downloadSpeed={downloadSpeed}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
            isReady={updateState === 'ready'}
            onInstall={handleInstall}
          />
        </Suspense>
      )}

      {/* Inline Notification */}
      <AnimatePresence>
        {showInline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`rounded-xl border overflow-hidden ${className} ${
              updateState === 'ready'
                ? 'bg-green-50 dark:bg-[#0d2818] border-green-300 dark:border-green-700'
                : 'bg-blue-50 dark:bg-[#0a1929] border-blue-300 dark:border-[#0066cc]'
            }`}
          >
            <div className="p-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-lg p-1.5 ${
                      updateState === 'ready'
                        ? 'bg-green-100 dark:bg-[#1a4028]'
                        : 'bg-blue-100 dark:bg-[#0a2840]'
                    }`}
                  >
                    {updateState === 'downloading' ? (
                      <Icon icon="line-md:downloading-loop" className="h-4 w-4 text-[#0081FB]" />
                    ) : updateState === 'ready' ? (
                      <Icon icon="line-md:confirm-circle" className="h-4 w-4 text-green-400" />
                    ) : (
                      <Icon icon="line-md:arrow-up-circle" className="h-4 w-4 text-[#0081FB]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {updateState === 'ready'
                        ? t('update_ready') || 'Update Ready!'
                        : updateState === 'downloading'
                          ? t('update_downloading') || 'Downloading...'
                          : t('update_available') || 'Update Available'}
                    </p>
                    {updateInfo?.version && (
                      <p className="text-[10px] text-gray-500 dark:text-white/50">
                        v{updateInfo.version}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dismiss button (only when not downloading) */}
                {updateState !== 'downloading' && (
                  <button
                    onClick={handleDismiss}
                    className="rounded p-1 text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
                  >
                    <Icon icon="mdi:close" className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Progress bar (downloading state) */}
              {updateState === 'downloading' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#0081FB] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-white/40 mt-1 text-right">
                    {downloadProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {updateState === 'available' && !showModal && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-blue-100 dark:bg-[#0a2840] hover:bg-blue-200 dark:hover:bg-[#0d3355] border border-blue-300 dark:border-[#0066cc] text-[#0081FB] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon icon="line-md:download-loop" className="h-3.5 w-3.5" />
                  {t('update_download_now') || 'Download Now'}
                </button>
              )}

              {updateState === 'ready' && (
                <button
                  onClick={handleInstall}
                  className="mt-2 w-full py-1.5 px-3 rounded-lg bg-green-100 dark:bg-[#1a4028] hover:bg-green-200 dark:hover:bg-[#225030] border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon icon="line-md:rotate-270" className="h-3.5 w-3.5" />
                  {t('update_restart') || 'Restart to Update'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

UpdateNotification.propTypes = {
  className: PropTypes.string,
  onUpdateAvailable: PropTypes.func
}
