import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/**
 * BrowseMethodModal Component
 * Allows user to choose between ZIP/RAR file or extracted folder
 */
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-5 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                {t('browse_method_title') || 'Select Method'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Icon icon="mdi:close" className="h-4 w-4" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
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
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Recommended Badge */}
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
                    <Icon
                      icon={method.icon}
                      className="h-6 w-6"
                      style={{ color: method.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-white">
                      {method.title}
                    </p>
                    <p className="text-xs text-white/50 mt-0.5">{method.desc}</p>
                  </div>
                  <Icon
                    icon="mdi:chevron-right"
                    className="h-5 w-5 text-white/30 group-hover:text-white/60 transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

BrowseMethodModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectArchive: PropTypes.func.isRequired,
  onSelectFolder: PropTypes.func.isRequired
}
