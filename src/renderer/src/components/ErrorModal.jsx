import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { Modal } from './ui/Modal'

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

  const footer = (
    <>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon icon={copied ? 'line-md:check-all' : 'line-md:clipboard'} className="h-4 w-4" />
        {copied ? t('copied') || 'Copied!' : t('btn_copy_error') || 'Copy Error'}
      </button>
      <div className="flex-1" />
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
      >
        {t('btn_close') || 'Close'}
      </button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('error_title') || 'Oops! Something went wrong'}
      icon="line-md:alert-twotone"
      iconColor="#EF4444"
      size="md"
      footer={footer}
    >
      <div className="p-5">
        <pre
          ref={errorRef}
          className="whitespace-pre-wrap break-words text-xs leading-relaxed font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#111] rounded-lg p-4 border border-gray-200 dark:border-gray-800 select-text"
        >
          {friendlyMessage}
        </pre>
      </div>
    </Modal>
  )
}

ErrorModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  error: PropTypes.string
}
