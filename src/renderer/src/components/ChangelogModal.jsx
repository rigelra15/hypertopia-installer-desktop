import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'

/* global __APP_CHANGELOG__, __COMMIT_COUNT__ */

export default function ChangelogModal({ isOpen, onClose }) {
  const { language, t } = useLanguage()
  const changelog =
    typeof __APP_CHANGELOG__ !== 'undefined' && __APP_CHANGELOG__.length > 0
      ? __APP_CHANGELOG__
      : []
  const totalCommits = typeof __COMMIT_COUNT__ !== 'undefined' ? parseInt(__COMMIT_COUNT__, 10) : 0

  const commitTypeTranslations = {
    id: {
      feat: 'FITUR',
      fix: 'PERBAIKAN',
      chore: 'TUGAS',
      docs: 'DOK',
      refactor: 'REFAKTOR',
      style: 'GAYA',
      test: 'TES',
      perf: 'PERFORMA',
      build: 'BUILD',
      ci: 'CI',
      revert: 'REVERT'
    },
    en: {
      feat: 'FEAT',
      fix: 'FIX',
      chore: 'CHORE',
      docs: 'DOCS',
      refactor: 'REFACTOR',
      style: 'STYLE',
      test: 'TEST',
      perf: 'PERF',
      build: 'BUILD',
      ci: 'CI',
      revert: 'REVERT'
    }
  }

  const getCommitTypeStyle = (type) => {
    switch (type?.toLowerCase()) {
      case 'feat':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'fix':
        return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'chore':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'docs':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'refactor':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'style':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'test':
        return 'bg-green-500/10 text-green-400 border-green-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const parseCommit = (message) => {
    const match = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/)
    if (match) {
      return {
        type: match[1],
        scope: match[2],
        subject: match[3],
        original: message,
        isConventional: true
      }
    }
    return {
      type: 'other',
      subject: message,
      original: message,
      isConventional: false
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col transform rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#0081FB]/10 p-3">
                  <Icon icon="line-md:clipboard-list" className="h-6 w-6 text-[#0081FB]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('changelog_title')}</h2>
                  <p className="text-sm text-white/60">{t('changelog_desc')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {/* Divider */}
            <div className="mb-4 h-px bg-white/10"></div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-4">
                {changelog.map((commit, index) => {
                  const parsed = parseCommit(commit.message)
                  const versionCode = `v1.0.${totalCommits - index}`

                  return (
                    <div key={commit.hash} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#0081FB] mt-2 ring-4 ring-[#111] z-10"></div>
                        {index !== changelog.length - 1 && (
                          <div className="w-0.5 flex-1 bg-white/10 my-1"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#0081FB] bg-[#0081FB]/10 px-2 py-0.5 rounded">
                              {versionCode}
                            </span>
                            {parsed.isConventional && (
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getCommitTypeStyle(
                                  parsed.type
                                )}`}
                              >
                                {commitTypeTranslations[language]?.[parsed.type.toLowerCase()] ||
                                  parsed.type}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{commit.date}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{parsed.subject}</p>
                      </div>
                    </div>
                  )
                })}
                {changelog.length === 0 && (
                  <div className="text-center py-10 text-gray-500">No changelog available.</div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}
