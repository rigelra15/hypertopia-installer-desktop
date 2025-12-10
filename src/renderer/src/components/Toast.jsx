import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import PropTypes from 'prop-types'
import { ToastContext } from '../contexts/ToastContext'

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
        return 'border-green-500/30 bg-green-500/10 text-green-400'
      case 'error':
        return 'border-red-500/30 bg-red-500/10 text-red-400'
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
      default:
        return 'border-[#0081FB]/30 bg-[#0081FB]/10 text-[#0081FB]'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md pointer-events-auto ${getColors(toast.type)}`}
          >
            <Icon icon={getIcon(toast.type)} className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
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
