import { Icon } from '@iconify/react'
import PropTypes from 'prop-types'

export function SystemLogModal({ isOpen, onClose, logHistory }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 py-6 sm:px-6">
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Icon icon="mdi:console-line" className="text-xl text-[#0081FB]" />
            System Logs
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 dark:text-white/50 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          >
            <Icon icon="mdi:close" className="text-xl" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 max-h-[60vh] bg-gray-50 dark:bg-black/50 rounded-b-2xl">
          <div className="space-y-1.5 font-mono text-xs">
            {logHistory.length > 0 ? (
              logHistory.map((entry, idx) => (
                <div key={idx} className="flex gap-3 text-gray-700 dark:text-white/80">
                  <span className="shrink-0 text-gray-400 dark:text-white/30">[{entry.time}]</span>
                  <span className="break-all">{entry.message}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 dark:text-white/30 py-8">No logs available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

SystemLogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  logHistory: PropTypes.array.isRequired
}
