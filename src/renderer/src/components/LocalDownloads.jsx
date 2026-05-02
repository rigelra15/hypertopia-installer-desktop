import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import ConfirmationModal from './ConfirmationModal'

export default function LocalDownloads({ onFileCountChange }) {
  const { t } = useLanguage()

  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [confirmModalMode, setConfirmModalMode] = useState('confirm') // 'confirm', 'delete', or 'clear-all'
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [isClearingAll, setIsClearingAll] = useState(false)

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.listDownloadedFiles()
      if (result.success) {
        setFiles(result.files)
        onFileCountChange?.(result.files.length)
      } else {
        setError(result.error || 'Failed to list files')
      }
    } catch (err) {
      console.error('Error loading downloaded files:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [onFileCountChange])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const processFileAction = async (file, mode) => {
    if (isProcessingFile) return
    setIsProcessingFile(true)

    let fileDataObj = {
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      hasObb: false
    }

    try {
      if (file.type === 'archive') {
        const result = await window.api.scanZip(file.path)
        fileDataObj = {
          ...fileDataObj,
          hasObb: result.hasObb,
          obbSize: result.obbEntries ? result.obbEntries.reduce((sum, f) => sum + f.size, 0) : 0,
          apkSize: result.apkFile ? result.apkFile.size : file.size,
          obbFolder: result.obbFolder,
          obbEntries: result.obbEntries,
          manifestData: result.manifestData
        }
      }
    } catch (err) {
      console.warn('Failed to parse archive for metadata:', err.message)
    } finally {
      setIsProcessingFile(false)
      setSelectedFile(fileDataObj)
      setConfirmModalMode(mode)
      setConfirmModalOpen(true)
    }
  }

  const handleDeleteClick = (file) => processFileAction(file, 'delete')

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0)

  const handleClearAllClick = () => {
    setSelectedFile({ totalFiles: files.length, totalSize })
    setConfirmModalMode('clear-all')
    setConfirmModalOpen(true)
  }

  const handleConfirmAction = async () => {
    setConfirmModalOpen(false)
    if (!selectedFile) return

    if (confirmModalMode === 'clear-all') {
      setIsClearingAll(true)
      try {
        await window.api.clearDownloadsFolder()
        loadFiles()
      } catch (err) {
        console.error('Failed to clear downloads folder:', err)
      } finally {
        setIsClearingAll(false)
      }
    } else if (confirmModalMode === 'delete') {
      try {
        await window.api.deleteDownloadedFile(selectedFile.name)
        // Reload list
        loadFiles()
      } catch (err) {
        console.error('Failed to delete file:', err)
      }
    }
    setSelectedFile(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white dark:bg-[#111]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-[#191919] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0081FB] to-[#00C2FF] shadow-lg shadow-[#0081FB]/20">
              <Icon icon="mdi:folder-download" className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('tab_downloads') || 'Downloads'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-white/50">
                {isLoading
                  ? t('standalone_games_loading') || 'Loading...'
                  : `${files.length} ${t('files_found') || 'files found'} \u2022 ${formatSize(totalSize)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.api.openDownloadsFolder()}
              className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 text-sm text-gray-500 dark:text-white/70 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
              title={t('settings_open_downloads') || 'Open Downloads Folder'}
            >
              <Icon icon="mdi:folder-open-outline" className="h-4 w-4" />
              <span className="hidden sm:inline">{t('open_folder') || 'Open Folder'}</span>
            </button>
            {files.length > 0 && (
              <button
                onClick={handleClearAllClick}
                disabled={isLoading || isClearingAll}
                className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-50"
                title={t('clear_downloads_title') || 'Clear Downloads Folder'}
              >
                <Icon
                  icon={isClearingAll ? 'mdi:loading' : 'mdi:trash-can-outline'}
                  className={`h-4 w-4 ${isClearingAll ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">{t('clear_all_btn') || 'Clear All'}</span>
              </button>
            )}
            <button
              onClick={loadFiles}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-white/5 px-3 py-2 text-sm text-gray-500 dark:text-white/70 transition-all hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              <Icon
                icon={isLoading ? 'mdi:loading' : 'mdi:refresh'}
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{t('refresh_btn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-[#0081FB]" />
            <p className="mt-4 text-sm text-gray-500 dark:text-white/50">
              {t('standalone_games_loading') || 'Loading files...'}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Icon icon="mdi:alert-circle-outline" className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('standalone_games_error') || 'Error loading files'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
              <Icon
                icon="mdi:folder-download-outline"
                className="h-8 w-8 text-gray-300 dark:text-white/30"
              />
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-white/70">
              {t('downloads_empty') || 'No files downloaded yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="group flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] overflow-hidden transition-all hover:border-[#0081FB]/50 hover:shadow-lg hover:shadow-[#0081FB]/10"
              >
                {/* Visual Header */}
                <div className="flex items-center justify-center h-24 bg-gray-100 dark:bg-[#0a0a0a] relative">
                  <Icon
                    icon={
                      file.type === 'archive'
                        ? 'mdi:folder-zip'
                        : file.type === 'apk'
                          ? 'mdi:android'
                          : 'mdi:file-document-outline'
                    }
                    className={`h-12 w-12 ${
                      file.type === 'archive'
                        ? 'text-yellow-500/70'
                        : file.type === 'apk'
                          ? 'text-emerald-500/70'
                          : 'text-gray-300 dark:text-white/30'
                    }`}
                  />

                  {/* Extension Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/60">
                    {file.name.split('.').pop()}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col p-4 flex-1">
                  <h3
                    className="text-gray-900 dark:text-white font-medium text-sm truncate mb-1"
                    title={file.name}
                  >
                    {file.name}
                  </h3>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="text-xs text-gray-400 dark:text-white/40 font-mono">
                      {formatSize(file.size)}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-white/30">
                      {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4">
                    <button
                      onClick={() => handleDeleteClick(file)}
                      disabled={isProcessingFile}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Icon
                        icon={isProcessingFile ? 'mdi:loading' : 'mdi:trash-can-outline'}
                        className={`w-3.5 h-3.5 ${isProcessingFile ? 'animate-spin' : ''}`}
                      />
                      {t('delete_btn') || 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmAction}
        fileData={selectedFile}
        mode={confirmModalMode}
      />
    </div>
  )
}

LocalDownloads.propTypes = {
  onFileCountChange: PropTypes.func
}
