import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { Modal } from './ui/Modal'

const ConfirmationModal = ({ isOpen, onClose, onConfirm, fileData, mode = 'confirm' }) => {
  const { t } = useLanguage()

  const { name, size, type, hasObb, obbSize, installMethod, specialInstallData } = fileData || {}
  const isHalfLife2Vr = installMethod === 'half-life-2-vr'
  const hasRenderableContent = mode === 'clear-all' || !!fileData

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTitle = () => {
    if (mode === 'clear-all') return t('clear_downloads_title') || 'Clear All Downloads?'
    if (mode === 'delete') return t('delete_confirm_title') || 'Delete File?'
    if (mode === 'view') return t('view_details') || 'View Details'
    return t('confirm_install_title') || 'Confirm Installation'
  }

  const getIcon = () => {
    if (mode === 'clear-all' || mode === 'delete') return 'mdi:trash-can-outline'
    if (isHalfLife2Vr) return 'mdi:source-branch'
    if (type === 'zip' || type === 'rar' || type === 'archive') return 'mdi:folder-zip'
    return 'mdi:android'
  }

  const getIconColor = () => {
    if (mode === 'clear-all' || mode === 'delete') return '#EF4444'
    if (isHalfLife2Vr) return '#8B5CF6'
    return '#0081FB'
  }

  const getSubtitle = () => {
    if (mode === 'clear-all')
      return (
        t('clear_downloads_desc') ||
        'All files in the Downloads folder will be permanently deleted.'
      )
    if (mode === 'delete')
      return t('delete_confirm_desc') || 'This file will be permanently deleted.'
    if (mode === 'view') return null
    if (isHalfLife2Vr) {
      return (
        t('half_life_2_vr_confirm_desc') ||
        'SourceVR will install the APK, grant storage access, and copy the four game data folders.'
      )
    }
    return t('confirm_install_desc') || 'Review the file details before installing.'
  }

  const getFooter = () => {
    if (mode === 'view') return null

    if (mode === 'clear-all') {
      return (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#2A3241] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
            {t('clear_all_btn') || 'Clear All'}
          </button>
        </div>
      )
    }

    if (mode === 'confirm') {
      return (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#2A3241] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-[#0081FB] hover:bg-[#006ACC] text-white rounded-xl font-medium transition-colors"
          >
            {t('confirm_select_btn') || 'Ya, Gunakan File Ini'}
          </button>
        </div>
      )
    }

    if (mode === 'delete') {
      return (
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#2A3241] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
            {t('delete') || 'Delete'}
          </button>
        </div>
      )
    }

    return (
      <button
        onClick={onClose}
        className="flex-1 px-4 py-2.5 bg-[#0081FB] hover:bg-[#006ACC] text-white rounded-xl font-medium transition-colors"
      >
        {t('close')}
      </button>
    )
  }

  const renderContent = () => {
    if (mode === 'view') {
      return (
        <div className="space-y-4 p-5">
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#151921]">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0081FB]/10 text-[#0081FB]">
                <Icon icon={getIcon()} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
                  {name}
                </p>
                <p className="mt-1 text-xs font-medium tabular-nums text-[#0081FB]">
                  {formatSize(size)} {t('total_size') || 'total'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md border border-[#0081FB]/20 bg-[#0081FB]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#0081FB]">
                {isHalfLife2Vr
                  ? t('half_life_2_vr_badge') || 'SOURCEVR'
                  : hasObb
                    ? t('badge_apk_obb') || 'APK + OBB'
                    : t('badge_apk') || 'APK ONLY'}
              </span>
              <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                {type === 'folder' ? 'FOLDER' : name?.split('.').pop()?.toUpperCase()}
              </span>
            </div>
          </section>

          {fileData.manifestData && (
            <section className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                {fileData.manifestData.gameName || 'Game Info'}
              </p>
              {fileData.manifestData.packageName && (
                <p className="mt-1 break-all font-mono text-xs text-gray-500 dark:text-white/50">
                  {fileData.manifestData.packageName}
                </p>
              )}
            </section>
          )}

          {(fileData.apkName || type === 'apk') && (
            <section className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-white/70">
                  <Icon icon="mdi:android" className="size-4 text-[#0081FB]" /> APK
                </span>
                <span className="text-xs tabular-nums text-gray-500 dark:text-white/50">
                  {formatSize(fileData.apkSize || size)}
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-gray-600 dark:text-white/60">
                {fileData.apkName || name}
              </p>
            </section>
          )}

          {hasObb && (
            <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-white/70">
                  <Icon icon="mdi:folder-zip-outline" className="size-4 text-[#0081FB]" />
                  {t('obb_found') || 'OBB data'}
                </span>
                <span className="text-xs tabular-nums text-gray-500 dark:text-white/50">
                  {formatSize(obbSize)}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-white/40">
                  {t('target_folder') || 'Target OBB folder'}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-gray-700 dark:text-white/70">
                  /sdcard/Android/obb/{fileData.obbFolder || 'Folder Name'}
                </p>
              </div>
              {fileData.obbFiles?.length > 0 && (
                <div className="max-h-36 space-y-1 overflow-y-auto">
                  {fileData.obbFiles.map((entry, index) => (
                    <div
                      key={`${entry.name}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-md bg-gray-50 px-2 py-1.5 text-xs dark:bg-white/5"
                    >
                      <span className="break-all text-gray-600 dark:text-white/60">
                        {entry.name}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-gray-500 dark:text-white/40">
                        {formatSize(entry.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )
    }

    if (mode === 'clear-all') {
      return (
        <div className="p-6 space-y-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <Icon icon="mdi:alert" className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-700 dark:text-red-300">
              {t('delete_warning') || 'This action cannot be undone.'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-[#111520] rounded-xl p-4 space-y-3 border border-gray-200 dark:border-[#2A3241]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                <Icon icon="mdi:file-multiple-outline" className="text-base" />
                {t('total_files') || 'Total Files'}
              </span>
              <span className="text-gray-900 dark:text-white font-semibold">
                {fileData?.totalFiles ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                <Icon icon="mdi:harddisk" className="text-base" />
                {t('total_size') || 'Total Size'}
              </span>
              <span className="text-[#0081FB] font-semibold">
                {formatSize(fileData?.totalSize ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              isHalfLife2Vr
                ? 'bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-500/30'
                : hasObb
                  ? 'bg-[#0081FB]/20 text-[#0081FB] dark:text-[#0081FB] border border-[#0081FB]/30'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isHalfLife2Vr
              ? t('half_life_2_vr_badge') || 'SOURCEVR'
              : hasObb
                ? t('badge_apk_obb')
                : t('badge_apk')}
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
              name?.toLowerCase().endsWith('.rar')
                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
                : type === 'folder'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border border-yellow-500/30'
            }`}
          >
            {name?.toLowerCase().endsWith('.rar') ? 'RAR' : type === 'folder' ? 'FOLDER' : 'ZIP'}
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded font-bold tracking-wider text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600/30 border border-gray-300 dark:border-gray-500/30 sm:ml-auto">
            {formatSize(size)} TOTAL
          </span>
        </div>

        {mode === 'delete' && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
            <Icon icon="mdi:alert" className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-700 dark:text-red-300">
              {t('delete_warning') || 'This action cannot be undone.'}
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-[#111520] rounded-xl p-4 space-y-3 border border-gray-200 dark:border-[#2A3241]">
          {fileData.manifestData && (
            <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-[#2A3241]">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className="text-gray-600 dark:text-gray-400 font-medium text-xs flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <Icon icon="mdi:controller-classic" className="text-sm" />
                    Game Info
                  </span>
                  <span className="text-gray-900 dark:text-white font-bold text-base leading-tight">
                    {fileData.manifestData.gameName || 'Unknown Game'}
                  </span>
                </div>
                {fileData.manifestData.version && (
                  <span className="text-[#0081FB] font-bold text-xs px-2 py-0.5 rounded bg-[#0081FB]/10 border border-[#0081FB]/30 whitespace-nowrap">
                    {fileData.manifestData.version}
                  </span>
                )}
              </div>
              {fileData.manifestData.packageName && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-500 font-mono">
                  <Icon icon="mdi:package-variant-closed" />
                  {fileData.manifestData.packageName}
                </div>
              )}
            </div>
          )}

          {isHalfLife2Vr && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <Icon icon="mdi:source-branch" className="text-base" />
                {t('half_life_2_vr_install_method') || 'SourceVR install method'}
              </div>
              <p className="text-xs text-violet-800/80 dark:text-violet-200/80">
                {t('half_life_2_vr_target') || 'Target'}:{' '}
                <span className="font-mono">{specialInstallData?.targetPath}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {specialInstallData?.payloadDirs?.length > 0 ? (
                  specialInstallData.payloadDirs.map((payloadDir) => (
                    <div
                      key={payloadDir.name}
                      className="rounded-lg border border-violet-500/20 bg-white/40 p-2 dark:bg-black/10"
                    >
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        common/{payloadDir.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                        {payloadDir.fileCount} {t('files_found') || 'files'} ·{' '}
                        {formatSize(payloadDir.size)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 rounded-lg border border-violet-500/20 bg-white/40 p-2 dark:bg-black/10">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {specialInstallData?.payloadArchiveName || '_data.7z'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
                      {t('half_life_2_vr_data_archive') || 'Nested SourceVR data archive'} ·{' '}
                      {formatSize(
                        specialInstallData?.payloadArchiveSize || specialInstallData?.payloadSize
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-center mb-1 gap-2">
              <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5 shrink-0">
                <Icon icon="mdi:file-document-outline" className="text-base" />
                {t('file_name')}
              </span>
              <span className="text-[#0081FB] font-medium px-2 py-0.5 rounded bg-[#0081FB]/10 shrink-0">
                {formatSize(type === 'apk' ? size : fileData.apkSize || size)}
              </span>
            </div>
            <span className="text-gray-700 dark:text-gray-200 font-medium break-all">{name}</span>
          </div>

          {fileData.apkName && type !== 'folder' && (
            <div className="flex flex-col gap-1 text-sm mt-2 pt-3 border-t border-gray-200 dark:border-[#2A3241]">
              <div className="flex justify-between items-center mb-1 gap-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5 shrink-0">
                  <Icon icon="mdi:android" className="text-base" />
                  APK
                </span>
              </div>
              <span className="text-gray-700 dark:text-gray-200 font-medium break-all text-xs font-mono">
                {fileData.apkName}
              </span>
            </div>
          )}
          {hasObb && (
            <div className="flex flex-col text-sm gap-2 mt-2 pt-3 border-t border-gray-200 dark:border-[#2A3241]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                  <Icon icon="mdi:folder-zip-outline" className="text-base" />
                  {t('obb_found')}
                </span>
                <span className="text-[#0081FB] font-medium px-2 py-0.5 rounded bg-[#0081FB]/10">
                  {formatSize(obbSize)}
                </span>
              </div>
              <div className="bg-gray-100 dark:bg-[#1F2937]/50 rounded-lg p-3 space-y-2 border border-gray-200 dark:border-[#2A3241]/50">
                <div className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Icon icon="mdi:folder-outline" className="text-sm" />
                  {t('target_folder') || 'Target OBB Folder'}
                </div>
                <div className="text-xs text-green-700 dark:text-green-400 font-mono break-all mb-3 bg-green-500/10 p-2 rounded border border-green-500/20">
                  /sdcard/Android/obb/{fileData.obbFolder || 'Folder Name'}
                </div>

                <div className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-500 tracking-wider mt-3 flex items-center gap-1.5">
                  <Icon icon="mdi:file-tree" className="text-sm" />
                  {t('obb_files_list') || 'OBB Files'}
                </div>
                <div className="flex flex-col gap-1 mt-1 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {fileData.obbFiles?.length > 0 &&
                    fileData.obbFiles?.map((f, i) => (
                      <div
                        key={i}
                        className="text-xs text-gray-700 dark:text-gray-300 flex items-start justify-between bg-gray-50 dark:bg-[#111520] p-2 rounded gap-2"
                      >
                        <span className="break-all leading-relaxed">{f.name}</span>
                        <span className="text-gray-600 dark:text-gray-500 shrink-0 font-mono mt-0.5">
                          {formatSize(f.size)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      subtitle={getSubtitle()}
      icon={getIcon()}
      iconColor={getIconColor()}
      size="md"
      footer={getFooter()}
      closeOnBackdrop={true}
    >
      {hasRenderableContent ? renderContent() : null}
    </Modal>
  )
}

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['confirm', 'view', 'delete', 'clear-all']),
  fileData: PropTypes.shape({
    name: PropTypes.string,
    size: PropTypes.number,
    type: PropTypes.string,
    installMethod: PropTypes.string,
    specialInstallData: PropTypes.shape({
      packageName: PropTypes.string,
      apkName: PropTypes.string,
      payloadRoot: PropTypes.string,
      targetPath: PropTypes.string,
      payloadArchiveName: PropTypes.string,
      payloadArchiveSize: PropTypes.number,
      payloadSize: PropTypes.number,
      payloadFileCount: PropTypes.number,
      payloadDirs: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          size: PropTypes.number,
          fileCount: PropTypes.number
        })
      )
    }),
    hasObb: PropTypes.bool,
    obbSize: PropTypes.number,
    apkName: PropTypes.string,
    apkSize: PropTypes.number,
    obbFolder: PropTypes.string,
    obbEntries: PropTypes.array,
    obbFiles: PropTypes.array,
    manifestData: PropTypes.shape({
      gameName: PropTypes.string,
      version: PropTypes.string,
      packageName: PropTypes.string,
      sizeMB: PropTypes.string,
      rawGameName: PropTypes.string,
      rawReleaseName: PropTypes.string
    }),
    totalFiles: PropTypes.number,
    totalSize: PropTypes.number
  })
}

export default ConfirmationModal
