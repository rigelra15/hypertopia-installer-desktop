import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useDownload } from '../contexts/DownloadContext'
import { useLanguage } from '../contexts/LanguageContext'
import coverImages from '../utils/coverImages'
import QGOLogo from '../assets/images/qgo-logo.png'

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bps) => {
  if (!bps || bps === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bps) / Math.log(k))
  return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const calcEta = (speed, totalBytes, downloadedBytes) => {
  const remaining = (totalBytes || 0) - (downloadedBytes || 0)
  if (!speed || speed <= 0 || remaining <= 0) return null
  const s = Math.ceil(remaining / speed)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

const formatDate = (iso, _t) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const ago = _t?.('da_ago') || 'ago'
  if (diffMins < 1) return _t?.('da_just_now') || 'Just now'
  if (diffMins < 60) return `${diffMins}${_t?.('da_unit_min') || 'm'} ${ago}`
  if (diffHours < 24) return `${diffHours}${_t?.('da_unit_hour') || 'h'} ${ago}`
  if (diffDays < 7) return `${diffDays}${_t?.('da_unit_day') || 'd'} ${ago}`
  return d.toLocaleDateString()
}

const INSTALL_STEP_ICONS = {
  DOWNLOADING: 'line-md:downloading-loop',
  EXTRACTING: 'mdi:folder-zip',
  INSTALLING: 'mdi:package-down',
  PUSHING_OBB: 'mdi:file-send',
  COMPLETED: 'line-md:confirm-circle',
  ERROR: 'mdi:alert-circle'
}

export default function DownloadActivityModal({ isOpen, onClose, onNavigateToManager }) {
  const { t } = useLanguage()
  const {
    isDownloading,
    isInstalling,
    downloadInfo,
    installInfo,
    cancelDownload,
    cancelInstall,
    downloadHistory,
    unseenCount,
    markHistorySeen,
    downloadQueue,
    removeFromQueue,
    moveQueueItem
  } = useDownload()

  // Mark as seen when modal opens
  useEffect(() => {
    if (isOpen && unseenCount > 0) {
      markHistorySeen()
    }
  }, [isOpen, unseenCount, markHistorySeen])

  const [historyTab, setHistoryTab] = useState('downloads')

  // Fetch cover images for all visible entries
  const [coverUrls, setCoverUrls] = useState({})
  useEffect(() => {
    let mounted = true
    const titles = new Set()
    if (isDownloading && downloadInfo.gameTitle) titles.add(downloadInfo.gameTitle)
    if (isInstalling && installInfo.gameTitle) titles.add(installInfo.gameTitle)
    downloadQueue.forEach((q) => { if (q.gameTitle) titles.add(q.gameTitle) })
    downloadHistory.forEach((e) => { if (e.gameTitle) titles.add(e.gameTitle) })
    for (const title of titles) {
      // skip if already cached
      if (coverUrls[title]) continue
      coverImages.getCoverUrl(title).then((url) => {
        if (!mounted || !url) return
        setCoverUrls((prev) => ({ ...prev, [title]: url }))
      }).catch(() => {})
    }
    return () => { mounted = false }
  }, [downloadHistory, downloadQueue, isDownloading, isInstalling, downloadInfo.gameTitle, installInfo.gameTitle])

  const hasActive = isDownloading || isInstalling
  const activeProgress = isInstalling ? (installInfo.percent ?? 0) : (downloadInfo.progress ?? 0)

  const getStepLabel = (step) => {
    const map = {
      DOWNLOADING: t('da_step_downloading'),
      EXTRACTING: t('da_step_extracting'),
      INSTALLING: t('da_step_installing'),
      PUSHING_OBB: t('da_step_pushing_obb'),
      COMPLETED: t('da_step_completed'),
      ERROR: t('da_step_error')
    }
    return map[step] || step || 'Processing...'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
            className="fixed inset-0 z-[61] flex items-center justify-center px-4 py-6 pointer-events-none"
          >
            <div className="relative w-full max-w-md pointer-events-auto flex flex-col rounded-2xl bg-white dark:bg-[#0a0a0a] shadow-2xl max-h-[80vh]">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 px-5 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0081FB]/10 flex items-center justify-center">
                    <Icon icon="mdi:download-circle-outline" className="h-[18px] w-[18px] text-[#0081FB]" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {t('download_activity')}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Icon icon="mdi:close" className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* ── ACTIVE ── */}
                {hasActive && (
                  <div className="px-5 pt-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30">
                      {t('da_active')}
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#191919] overflow-hidden flex flex-row">
                      {/* Cover – left, fixed width, stretches to card height */}
                      <div className={`relative w-[120px] shrink-0 self-stretch overflow-hidden ${
                        coverUrls[isInstalling ? installInfo.gameTitle : downloadInfo.gameTitle]
                          ? 'bg-gray-100 dark:bg-[#111]'
                          : 'bg-[#0081FB]/10'
                      }`}>
                        {coverUrls[isInstalling ? installInfo.gameTitle : downloadInfo.gameTitle] ? (
                          <img
                            src={coverUrls[isInstalling ? installInfo.gameTitle : downloadInfo.gameTitle]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon
                              icon={
                                isInstalling
                                  ? (INSTALL_STEP_ICONS[installInfo.step] || 'mdi:loading')
                                  : 'line-md:downloading-loop'
                              }
                              className="h-8 w-8 text-[#0081FB] animate-pulse"
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />
                      </div>

                      {/* Content – right col */}
                      <div className="flex flex-1 flex-col justify-between gap-2 px-3 pt-3 pb-3 min-w-0">
                        {/* Title + cancel */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
                              {isInstalling ? installInfo.gameTitle : downloadInfo.gameTitle}
                            </p>
                            {(isInstalling ? installInfo.version : downloadInfo.version) && (
                              <span className="inline-block text-[10px] font-medium text-[#0081FB] bg-[#0081FB]/10 px-1.5 py-0.5 rounded mt-0.5 mb-0.5">
                                v{isInstalling ? installInfo.version : downloadInfo.version}
                              </span>
                            )}
                            <p className="text-xs text-gray-500 dark:text-white/40 truncate">
                              {isInstalling
                                ? getStepLabel(installInfo.step)
                                : downloadInfo.status === 'preparing'
                                  ? t('da_preparing')
                                  : `${formatSize(downloadInfo.downloadedBytes)} / ${formatSize(downloadInfo.totalBytes)}`}
                            </p>
                          </div>
                          <button
                            onClick={isInstalling ? cancelInstall : cancelDownload}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/40 hover:border-red-400 hover:text-red-500 transition-colors"
                            title={t('da_cancel')}
                          >
                            <Icon icon="mdi:close" className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#0081FB] to-[#00C2FF]"
                            initial={{ width: 0 }}
                            animate={{ width: `${activeProgress}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>

                        {/* Stats */}
                        {!isInstalling && downloadInfo.status !== 'preparing' && (
                          <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-white/40">
                            <span className="flex items-center gap-1">
                              <Icon icon="mdi:speedometer" className="h-3 w-3" />
                              {formatSpeed(downloadInfo.speed)}
                            </span>
                            <span>{activeProgress.toFixed(0)}%</span>
                            {calcEta(downloadInfo.speed, downloadInfo.totalBytes, downloadInfo.downloadedBytes) && (
                              <span className="flex items-center gap-1">
                                <Icon icon="mdi:clock-outline" className="h-3 w-3" />
                                {calcEta(downloadInfo.speed, downloadInfo.totalBytes, downloadInfo.downloadedBytes)}
                              </span>
                            )}
                          </div>
                        )}
                        {isInstalling && (
                          <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-white/40">
                            <span className="truncate mr-2">{installInfo.detail || ''}</span>
                            <span className="shrink-0">{activeProgress.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── QUEUE ── */}
                {downloadQueue.length > 0 && (
                  <div className="px-5 pt-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30">
                      {t('da_queue') || 'Antrian'}
                    </p>
                    <div className="flex flex-col gap-2">
                      {downloadQueue.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex flex-row rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden"
                        >
                          {/* Queue number badge + cover */}
                          <div className="relative w-[90px] shrink-0 self-stretch overflow-hidden bg-gray-100 dark:bg-[#0a0a0a]">
                            {coverUrls[item.gameTitle] ? (
                              <img src={coverUrls[item.gameTitle]} alt="" className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon icon="mdi:clock-outline" className="h-6 w-6 text-gray-300 dark:text-white/20" />
                              </div>
                            )}
                            {/* position number */}
                            <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white leading-none">{idx + 1}</span>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex flex-1 items-center gap-2 px-3 py-2.5 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                                {item.gameTitle}
                              </p>
                              {item.version && (
                                <span className="text-[10px] font-medium text-[#0081FB]">v{item.version}</span>
                              )}
                            </div>

                            {/* Reorder + remove */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => moveQueueItem(item.id, 'up')}
                                disabled={idx === 0}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-gray-400 hover:text-gray-600 dark:hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Icon icon="mdi:chevron-up" className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => moveQueueItem(item.id, 'down')}
                                disabled={idx === downloadQueue.length - 1}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-gray-400 hover:text-gray-600 dark:hover:text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <Icon icon="mdi:chevron-down" className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => removeFromQueue(item.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 dark:border-white/10 text-gray-400 dark:text-white/30 hover:border-red-400 hover:text-red-500 transition-colors"
                                title={t('da_cancel')}
                              >
                                <Icon icon="mdi:close" className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── RECENT ── */}
                <div className="px-5 pt-5 pb-5">
                  {/* Tab switcher */}
                  <div className="flex items-center gap-1 mb-3 bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                    <button
                      onClick={() => setHistoryTab('downloads')}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-1.5 rounded-md transition-colors ${
                        historyTab === 'downloads'
                          ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50'
                      }`}
                    >
                      <Icon icon="mdi:file-download-outline" className="h-3.5 w-3.5" />
                      {t('da_tab_downloads') || 'Unduhan'}
                    </button>
                    <button
                      onClick={() => setHistoryTab('installs')}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold py-1.5 rounded-md transition-colors ${
                        historyTab === 'installs'
                          ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50'
                      }`}
                    >
                      <Icon icon="mdi:package-down" className="h-3.5 w-3.5" />
                      {t('da_tab_installs') || 'Instalasi'}
                    </button>
                  </div>

                  {(() => {
                    const filtered = downloadHistory.filter((e) =>
                      historyTab === 'downloads' ? e.type === 'download' : e.type === 'install'
                    )
                    const emptyIcon = historyTab === 'downloads' ? 'mdi:download-off-outline' : 'mdi:package-variant-remove'
                    const emptyTitle = historyTab === 'downloads' ? t('da_no_recent') : (t('da_no_installs') || 'Belum ada riwayat instalasi')
                    const emptySub = historyTab === 'downloads' ? t('da_no_recent_sub') : (t('da_no_installs_sub') || 'Instalasi yang selesai akan muncul di sini')

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                            <Icon icon={emptyIcon} className="h-6 w-6 text-gray-400 dark:text-white/20" />
                          </div>
                          <p className="text-sm font-medium text-gray-500 dark:text-white/30">{emptyTitle}</p>
                          <p className="text-xs text-gray-400 dark:text-white/20 mt-1">{emptySub}</p>
                        </div>
                      )
                    }

                    return (
                      <div className="flex flex-col gap-2">
                        {filtered.map((entry) => (
                          <div
                            key={entry.id}
                            className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#191919] overflow-hidden flex flex-row"
                          >
                            {/* Unseen dot */}
                            {!entry.seen && (
                              <span className="absolute top-2 left-[108px] h-2 w-2 rounded-full bg-[#0081FB] z-10" />
                            )}
                            {/* Cover */}
                            {(() => {
                              const isQgo = (entry.gameTitle || '').toLowerCase().includes('quest games optimizer')
                              const coverSrc = isQgo ? QGOLogo : coverUrls[entry.gameTitle] || null
                              return (
                                <div className={`relative w-[120px] shrink-0 self-stretch overflow-hidden ${
                                  coverSrc
                                    ? 'bg-gray-100 dark:bg-[#111]'
                                    : (entry.type === 'install' ? 'bg-purple-500/10' : 'bg-[#0081FB]/10')
                                }`}>
                                  {coverSrc ? (
                                    <img src={coverSrc} alt="" className={`w-full h-full ${isQgo ? 'object-contain p-6' : 'object-cover'}`} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Icon
                                        icon={entry.type === 'install' ? 'mdi:package-down' : 'mdi:file-download-outline'}
                                        className={`h-7 w-7 ${entry.type === 'install' ? 'text-purple-500' : 'text-[#0081FB]'}`}
                                      />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />
                                </div>
                              )
                            })()}
                            {/* Info */}
                            <div className="flex flex-1 flex-col justify-center gap-1 px-3 py-3 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {entry.gameTitle || entry.fileName || '—'}
                              </p>
                              {/* fileName subtitle – show for installs if different from gameTitle */}
                              {entry.type === 'install' && entry.fileName && entry.fileName !== entry.gameTitle && (
                                <p className="text-[11px] text-gray-400 dark:text-white/30 truncate">{entry.fileName}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                {entry.version && (
                                  <span className="text-xs font-medium text-[#0081FB] bg-[#0081FB]/10 px-1.5 py-0.5 rounded">
                                    {entry.version.startsWith('v') ? entry.version : `v${entry.version}`}
                                  </span>
                                )}
                                {entry.totalBytes > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-white/40">
                                    {formatSize(entry.totalBytes)}
                                  </span>
                                )}
                                <span className="text-[10px] text-gray-400 dark:text-white/25">
                                  {formatDate(entry.completedAt, t)}
                                </span>
                              </div>
                              {/* Status + Category badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  entry.type === 'install'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}>
                                  {entry.type === 'install' ? t('installed') : t('downloaded')}
                                </span>
                                {(() => {
                                  const isQgo = (entry.gameTitle || '').toLowerCase().includes('quest games optimizer')
                                  return isQgo ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                                      {t('da_cat_qgo') || 'QGO'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white">
                                      {t('da_cat_game') || 'Game'}
                                    </span>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
              {/* Footer – Navigate to Downloads Manager */}
              <div className="shrink-0 border-t border-gray-200 dark:border-white/10 px-5 py-3">
                <button
                  onClick={() => { onNavigateToManager?.(); onClose() }}
                  className="flex items-center gap-2 text-sm font-medium text-[#0081FB] hover:text-[#0070e0] transition-colors"
                >
                  <Icon icon="mdi:folder-download-outline" className="h-4 w-4" />
                  {t('da_open_manager')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
