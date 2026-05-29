import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { Modal } from './ui/Modal'
import helpImage from '../assets/allow_usb_debugging.jpg'

export function AuthHelpModal({ isOpen, onClose, isAuthorized }) {
  const { t } = useLanguage()

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isAuthorized) onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
    }
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose, isAuthorized])

  useEffect(() => {
    if (isAuthorized && isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isAuthorized, isOpen, onClose])

  const footer = isAuthorized ? (
    <button
      onClick={onClose}
      className="w-full rounded-xl bg-[#0081FB] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#0070e0] focus:outline-none focus:ring-2 focus:ring-[#0081FB]/50"
    >
      {t('auth_help_understand') || 'Mengerti'}
    </button>
  ) : undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAuthorized
          ? t('auth_help_success_title') || 'Perangkat Terotorisasi!'
          : t('auth_help_title') || 'Authorize Device'
      }
      subtitle={
        isAuthorized
          ? t('auth_help_success_desc') ||
            'Perangkat Quest Anda sudah terhubung dan siap digunakan.'
          : t('auth_help_desc') || 'Tekan "Allow" pada headset Quest Anda'
      }
      icon={isAuthorized ? 'mdi:check-circle' : 'mdi:headset-vr'}
      iconColor={isAuthorized ? '#10B981' : '#0081FB'}
      size="md"
      footer={footer}
      closeOnBackdrop={!isAuthorized}
    >
      <div className="p-6">
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 shadow-lg">
          <img
            src={helpImage}
            alt="Allow USB Debugging"
            className="w-full h-auto object-cover opacity-90"
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          {isAuthorized ? (
            <div className="flex items-center justify-center gap-2 text-green-500">
              <Icon icon="mdi:check-circle" className="h-5 w-5" />
              <span className="text-sm font-medium">{t('auth_help_connected') || 'Terhubung'}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0081FB]/30 border-t-[#0081FB]"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-white/70">
                  {t('auth_help_waiting') || 'Menunggu Otorisasi...'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-white/40 text-center">
                {t('auth_help_waiting_desc') || 'Tekan "Allow" pada headset Quest Anda'}
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

AuthHelpModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAuthorized: PropTypes.bool
}
