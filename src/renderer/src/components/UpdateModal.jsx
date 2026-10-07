import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
import { Modal } from './ui/Modal'

export default function UpdateModal({
  isOpen,
  updateInfo,
  isDownloading,
  downloadProgress,
  downloadSpeed,
  downloadedBytes,
  totalBytes,
  onDownload,
  onLater,
  onInstall,
  isReady
}) {
  const { t } = useLanguage()

  if (!updateInfo) return null

  const formatSize = (bytes) => {
    if (!bytes) return null
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(1) + ' MB'
  }

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return null
    const mbps = bytesPerSecond / (1024 * 1024)
    if (mbps >= 1) return mbps.toFixed(1) + ' MB/s'
    const kbps = bytesPerSecond / 1024
    return kbps.toFixed(0) + ' KB/s'
  }

  const calculateETA = (speed, downloaded, total) => {
    if (!speed || !total || speed <= 0) return null
    const remaining = total - (downloaded || 0)
    if (remaining <= 0) return null
    const seconds = remaining / speed
    if (seconds < 60) return `${Math.ceil(seconds)}s`
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60)
      const secs = Math.ceil(seconds % 60)
      return `${mins}m ${secs}s`
    }
    return null
  }

  const getDisplaySize = () => {
    if (totalBytes && totalBytes > 0) return formatSize(totalBytes)
    return null
  }

  const fileSize = getDisplaySize()
  const speedDisplay = formatSpeed(downloadSpeed)
  const etaDisplay = calculateETA(downloadSpeed, downloadedBytes, totalBytes)

  const footer = isReady ? (
    <button
      onClick={onInstall}
      className="flex-1 py-4 px-4 rounded-xl bg-[#00d050] hover:bg-[#00e058] text-white text-[16px] font-bold transition-all flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,208,80,0.3)]"
    >
      <Icon icon="line-md:loading-loop" className="text-xl shrink-0" />
      <span className="leading-tight text-center">
        {t('update_ready_restart') || 'Memulai Ulang Otomatis...'}
      </span>
    </button>
  ) : isDownloading ? (
    <button
      disabled={true}
      className="flex-1 py-4 px-4 rounded-xl bg-[#0081FB] text-white text-[16px] font-bold transition-all flex items-center justify-center gap-2.5 opacity-80 shadow-[0_0_20px_rgba(0,129,251,0.2)]"
    >
      <Icon icon="line-md:loading-loop" className="text-xl shrink-0" />
      <span className="leading-tight text-center">
        {t('update_downloading') || `Downloading v${updateInfo.version}...`}
      </span>
    </button>
  ) : (
    <div className="flex flex-1 gap-3">
      <button
        type="button"
        onClick={onLater}
        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10"
      >
        {t('update_later') || 'Later'}
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="flex-1 rounded-xl bg-[#0081FB] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#006fe0]"
      >
        {t('update_download_now') || 'Download Now'}
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={
        isReady
          ? t('update_ready_title') || 'Pembaruan Siap Diinstal'
          : t('update_new_version') || 'New Version Available!'
      }
      subtitle={
        isReady
          ? t('update_restarting') || 'The app is ready to restart.'
          : isDownloading
            ? t('update_downloading') || 'Downloading update...'
            : t('update_download_prompt') || 'A new version is available. Download it now or later.'
      }
      icon={isReady ? 'mdi:check-circle-outline' : 'mdi:arrow-up-circle-outline'}
      iconColor={isReady ? '#10B981' : '#0081FB'}
      size="md"
      footer={footer}
      closeOnBackdrop={false}
      hideTrafficLights={true}
      overlayOpacity={40}
    >
      <div className="p-6">
        {/* Version info */}
        <div className="mb-6 flex flex-col justify-between rounded-2xl bg-gray-50 dark:bg-[#1e1e1e] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
                {t('update_new_version_label') || 'Versi Baru'}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#0081FB]">
                v{updateInfo.version}
              </p>
            </div>
            {fileSize && (
              <div className="text-right">
                <p className="text-[13px] font-medium text-gray-500 dark:text-white/40">
                  {t('update_size') || 'Ukuran'}
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {fileSize}
                </p>
              </div>
            )}
          </div>
          <p className="mt-6 text-[13px] font-medium text-gray-500 dark:text-white/40">
            {updateInfo.releaseDate
              ? new Date(updateInfo.releaseDate).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Progress bar (when downloading) */}
        {isDownloading && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-white/50 mb-2">
              <span>{t('update_downloading') || 'Downloading...'}</span>
              <span className="font-mono">{downloadProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-[#0081FB] rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            {(speedDisplay || etaDisplay) && (
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 dark:text-white/40 mt-2">
                <span className="flex items-center gap-1.5 font-mono">
                  <Icon icon="mdi:speedometer" className="h-3.5 w-3.5" />
                  {speedDisplay || '-'}
                </span>
                {etaDisplay && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Icon icon="mdi:clock-outline" className="h-3.5 w-3.5" />
                    {etaDisplay} {t('update_remaining') || 'remaining'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

UpdateModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  updateInfo: PropTypes.object,
  isDownloading: PropTypes.bool,
  downloadProgress: PropTypes.number,
  downloadSpeed: PropTypes.number,
  downloadedBytes: PropTypes.number,
  totalBytes: PropTypes.number,
  onDownload: PropTypes.func,
  onLater: PropTypes.func,
  onInstall: PropTypes.func,
  isReady: PropTypes.bool
}
