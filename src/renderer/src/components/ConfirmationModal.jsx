import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

import { AnimatePresence, motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

const ConfirmationModal = ({ isOpen, onClose, onConfirm, fileData, mode = 'confirm' }) => {
  const { t } = useLanguage()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!isOpen) return null
  // For clear-all mode, fileData may be { totalFiles, totalSize } — not a game file
  if (mode !== 'clear-all' && !fileData) return null

  const { name, size, type, hasObb, obbSize } = fileData || {}

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40 cursor-pointer"
          />
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={`fixed z-50 bg-white dark:bg-[#1F2937] flex flex-col shadow-2xl
              ${
                isMobile
                  ? 'bottom-0 left-0 right-0 rounded-t-2xl pb-safe max-h-[85vh]'
                  : 'top-[50%] left-[50%] w-full max-w-md rounded-2xl max-h-[90vh]'
              }`}
          >
            {isMobile && (
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-4 shrink-0" />
            )}

            <div className={`p-6 overflow-y-auto custom-scrollbar ${isMobile ? 'pt-4' : ''}`}>

              {/* ── Clear-All mode ── */}
              {mode === 'clear-all' && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                      <Icon icon="mdi:trash-can-outline" className="text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">
                        {t('clear_downloads_title') || 'Clear All Downloads?'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('clear_downloads_desc') || 'All files in the Downloads folder will be permanently deleted.'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <Icon icon="mdi:alert" className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {t('delete_warning') || 'This action cannot be undone.'}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-[#111520] rounded-xl p-4 space-y-3 mb-6 border border-gray-200 dark:border-[#2A3241]">
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
                </>
              )}

              {/* ── Normal file modes ── */}
              {mode !== 'clear-all' && (
              <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#0081FB]/10 flex items-center justify-center text-[#0081FB]">
                  <Icon
                    icon={
                      type === 'zip' || type === 'rar' || type === 'archive'
                        ? 'mdi:folder-zip'
                        : 'mdi:android'
                    }
                    className="text-2xl"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1">
                    {mode === 'delete'
                      ? t('delete_confirm_title') || 'Delete File?'
                      : mode === 'view'
                        ? t('view_details') || 'View Details'
                        : t('confirm_install_title')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Content Type Badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        hasObb
                          ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {hasObb ? t('badge_apk_obb') : t('badge_apk')}
                    </span>
                    {/* Upload Source Badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        type === 'zip' || type === 'archive'
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border border-yellow-500/30'
                          : type === 'rar'
                            ? 'bg-purple-500/20 text-purple-700 dark:text-purple-500 border border-purple-500/30'
                            : type === 'folder'
                              ? 'bg-[#0081FB]/20 text-[#0060cc] dark:text-[#0081FB] border border-[#0081FB]/30'
                              : 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {type === 'zip' || type === 'archive'
                        ? t('badge_zip') || 'ZIP'
                        : type === 'rar'
                          ? t('badge_rar') || 'RAR'
                          : type === 'folder'
                            ? 'FOLDER'
                            : 'FILE'}
                    </span>
                    {/* Total Size Badge */}
                    <span className="text-xs px-2.5 py-0.5 rounded font-bold tracking-wider text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600/30 border border-gray-300 dark:border-gray-500/30 sm:ml-auto">
                      {formatSize(size)} TOTAL
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {mode === 'delete' ? t('delete_confirm_desc') : t('confirm_install_desc')}
                  </p>
                </div>
              </div>

              {mode === 'delete' && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <Icon icon="mdi:alert" className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {t('delete_warning') || 'This action cannot be undone.'}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-[#111520] rounded-xl p-4 space-y-3 mb-6 border border-gray-200 dark:border-[#2A3241]">
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
                  <span className="text-gray-700 dark:text-gray-200 font-medium break-all">
                    {name}
                  </span>
                </div>
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
                        {type === 'folder' &&
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

              <div className="flex gap-3">
                {mode === 'confirm' ? (
                  <>
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
                  </>
                ) : mode === 'delete' ? (
                  <>
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
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-[#0081FB] hover:bg-[#006ACC] text-white rounded-xl font-medium transition-colors"
                  >
                    {t('close')}
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

import PropTypes from 'prop-types'

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['confirm', 'view', 'delete', 'clear-all']),
  fileData: PropTypes.shape({
    // File-mode fields
    name: PropTypes.string,
    size: PropTypes.number,
    type: PropTypes.string,
    hasObb: PropTypes.bool,
    obbSize: PropTypes.number,
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
    // Clear-all mode fields
    totalFiles: PropTypes.number,
    totalSize: PropTypes.number,
  })
}

export default ConfirmationModal
