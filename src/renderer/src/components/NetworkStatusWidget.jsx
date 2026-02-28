import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useNetwork } from '../contexts/NetworkContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useDownload } from '../contexts/DownloadContext'

/**
 * NetworkStatusWidget Component
 * Floating notification in bottom-right corner showing network/offline status
 */
export default function NetworkStatusWidget() {
  const { t } = useLanguage()
  const {
    isOnline,
    isApiReachable,
    isConnected,
    showOfflineNotification,
    showBackOnlineNotification,
    dismissOfflineNotification,
    retryConnection
  } = useNetwork()

  // Check if download widget is showing to adjust position
  const { showWidget } = useDownload()

  // Determine which notification to show
  const showNotification = showOfflineNotification || showBackOnlineNotification

  if (!showNotification) return null

  // Adjust bottom position if download widget is visible
  const bottomPosition = showWidget ? 'bottom-[180px]' : 'bottom-4'

  return (
    <AnimatePresence mode="wait">
      {showBackOnlineNotification && (
        <motion.div
          key="back-online-notification"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed ${bottomPosition} right-4 z-50`}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-[#111] px-4 py-3 shadow-2xl shadow-green-500/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <Icon icon="mdi:wifi-check" className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t('network_back_online') || 'Back Online'}
              </p>
              <p className="text-xs text-white/50">
                {t('network_connection_restored') || 'Connection restored'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {showOfflineNotification && !showBackOnlineNotification && (
        <motion.div
          key="offline-notification"
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed ${bottomPosition} right-4 z-50`}
        >
          <div className="min-w-[300px] max-w-[360px] overflow-hidden rounded-2xl border border-orange-500/30 bg-[#111] shadow-2xl shadow-orange-500/10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                  {!isOnline ? (
                    <Icon icon="mdi:wifi-off" className="h-5 w-5 text-orange-500" />
                  ) : !isApiReachable ? (
                    <Icon icon="mdi:cloud-off-outline" className="h-5 w-5 text-orange-500" />
                  ) : (
                    <Icon icon="mdi:wifi-alert" className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {!isOnline
                      ? t('network_offline') || 'No Internet Connection'
                      : t('network_api_unreachable') || 'Server Unreachable'}
                  </p>
                  <p className="text-xs text-white/50">
                    {!isOnline
                      ? t('network_check_connection') || 'Please check your connection'
                      : t('network_server_issue') || 'Unable to reach HyperTopia servers'}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissOfflineNotification}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon icon="mdi:close" className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {/* Status Info */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">{t('network_status') || 'Status'}:</span>
                <span
                  className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-orange-400'}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-orange-400 animate-pulse'}`}
                  ></span>
                  {isConnected
                    ? t('network_connected') || 'Connected'
                    : t('network_disconnected') || 'Disconnected'}
                </span>
              </div>

              {/* What's affected */}
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-xs text-white/70 mb-2">
                  {t('network_affected_features') || 'Affected features:'}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Icon icon="mdi:gamepad-variant" className="h-3.5 w-3.5" />
                    <span>{t('network_games_list') || 'Games list loading'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Icon icon="mdi:download" className="h-3.5 w-3.5" />
                    <span>{t('network_downloads') || 'Downloads'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Icon icon="mdi:account" className="h-3.5 w-3.5" />
                    <span>{t('network_login') || 'Login & account access'}</span>
                  </div>
                </div>
              </div>

              {/* Offline features available */}
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2">
                <p className="text-xs text-green-400 mb-2">
                  {t('network_offline_available') || 'Still available offline:'}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-green-400/70">
                    <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                    <span>{t('network_local_install') || 'Install from local files'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-400/70">
                    <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                    <span>{t('network_app_manager') || 'Apps & OBB Manager'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-400/70">
                    <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                    <span>{t('network_downloaded_files') || 'Previously downloaded files'}</span>
                  </div>
                </div>
              </div>

              {/* Retry button */}
              <button
                onClick={retryConnection}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0081FB] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#0081FB]/80"
              >
                <Icon icon="mdi:refresh" className="h-4 w-4" />
                {t('network_retry') || 'Retry Connection'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
