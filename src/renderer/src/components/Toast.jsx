import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import PropTypes from 'prop-types'
import { ToastContext } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    info: (message, duration) => addToast(message, 'info', duration),
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration)
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
}

function ToastContainer({ toasts, onRemove }) {
  const { language } = useLanguage()
  const copyLabel = language === 'id' ? 'Salin' : 'Copy'

  const copyError = (message) => {
    navigator.clipboard?.writeText(message).catch(() => {})
  }

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return 'line-md:confirm-circle'
      case 'error':
        return 'line-md:close-circle'
      case 'warning':
        return 'line-md:alert-circle'
      default:
        return 'line-md:bell-loop'
    }
  }

  const getColors = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-[#0d2818] text-green-600 dark:text-green-400'
      case 'error':
        return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-[#2d1212] text-red-600 dark:text-red-400'
      case 'warning':
        return 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-[#2d2412] text-yellow-600 dark:text-yellow-400'
      default:
        return 'border-blue-300 dark:border-[#0066cc] bg-blue-50 dark:bg-[#0a1929] text-[#0081FB]'
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-9999 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex min-w-0 items-start gap-3 overflow-hidden rounded-xl border p-3 shadow-lg pointer-events-auto ${getColors(toast.type)}`}
          >
            <Icon icon={getIcon(toast.type)} className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p
                className="whitespace-pre-wrap text-sm font-medium leading-relaxed"
                style={{ overflowWrap: 'anywhere' }}
              >
                {toast.message}
              </p>
              {toast.type === 'error' && (
                <button
                  onClick={() => copyError(toast.message)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-current/20 px-2 py-1 text-xs font-semibold transition-colors hover:bg-white/20 dark:hover:bg-white/10"
                >
                  <Icon icon="mdi:content-copy" className="h-3.5 w-3.5" />
                  {copyLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
            >
              <Icon icon="mdi:close" className="h-4 w-4 opacity-50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      message: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired
    })
  ).isRequired,
  onRemove: PropTypes.func.isRequired
}
