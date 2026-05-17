import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
import { Modal } from './ui/Modal'

export default function BrowseMethodModal({ isOpen, onClose, onSelectArchive, onSelectFolder }) {
  const { t } = useLanguage()

  const methods = [
    {
      id: 'archive',
      icon: 'mdi:zip-box',
      title: t('browse_method_archive') || 'Select ZIP/RAR File',
      desc: t('browse_method_archive_desc') || 'Auto-extract by app',
      color: '#0081FB',
      onClick: onSelectArchive,
      recommended: false
    },
    {
      id: 'folder',
      icon: 'mdi:folder-open',
      title: t('browse_method_folder') || 'Select Extracted Folder',
      desc: t('browse_method_folder_desc') || 'For manually extracted files',
      color: '#10B981',
      onClick: onSelectFolder,
      recommended: true
    }
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('browse_method_title') || 'Select Method'}
      icon="mdi:folder-search"
      iconColor="#0081FB"
      size="sm"
    >
      <div className="p-5 space-y-3">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => {
              method.onClick()
              onClose()
            }}
            className={`relative w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${
              method.recommended
                ? 'border-[#0081FB]/30 bg-[#0081FB]/5 hover:bg-[#0081FB]/10 hover:border-[#0081FB]/50'
                : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20'
            }`}
          >
            {method.recommended && (
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-[#0081FB] px-2 py-0.5 text-[10px] font-bold text-white shadow-lg">
                <Icon icon="mdi:star" className="h-3 w-3" />
                {t('recommended') || 'Recommended'}
              </span>
            )}
            <div
              className="shrink-0 rounded-xl p-3 transition-colors"
              style={{ backgroundColor: `${method.color}20` }}
            >
              <Icon icon={method.icon} className="h-6 w-6" style={{ color: method.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white">
                {method.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{method.desc}</p>
            </div>
            <Icon
              icon="mdi:chevron-right"
              className="h-5 w-5 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/60 transition-colors shrink-0"
            />
          </button>
        ))}
      </div>
    </Modal>
  )
}

BrowseMethodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectArchive: PropTypes.func.isRequired,
  onSelectFolder: PropTypes.func.isRequired
}
