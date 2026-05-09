import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'

export function ErrorModal({ isOpen, onClose, error }) {
  const { t } = useLanguage()
  const errorRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  let friendlyMessage = error
  if (error && error.includes('no devices/emulators found')) {
    friendlyMessage = t('err_no_device') || 'No device found. Please connect your headset.'
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(friendlyMessage || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = friendlyMessage || ''
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Icon icon="line-md:alert-twotone" className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('error_title') || 'Oops! Something went wrong'}
              </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4">
              <pre
                ref={errorRef}
                className="whitespace-pre-wrap break-words text-xs leading-relaxed font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111] rounded-lg p-4 border border-gray-200 dark:border-gray-800 select-text"
              >
                {friendlyMessage}
              </pre>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon icon={copied ? 'line-md:check-all' : 'line-md:clipboard'} className="h-4 w-4" />
                {copied ? (t('copied') || 'Copied!') : (t('btn_copy_error') || 'Copy Error')}
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                {t('btn_close') || 'Close'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

ErrorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  error: PropTypes.string
}
