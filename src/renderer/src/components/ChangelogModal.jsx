import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'

// GitHub repo info
const GITHUB_OWNER = 'rigelra15'
const GITHUB_REPO = 'hypertopia-installer-desktop'

export default function ChangelogModal({ isOpen, onClose }) {
  const { t } = useLanguage()
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchReleases()
    }
  }, [isOpen])

  const fetchReleases = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=20`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch releases')
      }
      const data = await response.json()
      setReleases(data)
    } catch (err) {
      console.error('Failed to fetch releases:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Clean commit title: remove conventional commit prefix and capitalize
  const cleanTitle = (title) => {
    // Remove conventional commit prefix (feat:, fix:, etc.)
    const cleaned = title.replace(
      /^(feat|fix|chore|perf|refactor|style|build|ci|docs|test)(\(.+?\))?:\s*/i,
      ''
    )
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  // Parse release body to extract structured content
  const parseReleaseBody = (body) => {
    if (!body) return { categories: [], hasStructure: false }

    const lines = body.split('\n')
    const categories = []
    let currentCategory = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Check for category header (## with emoji)
      if (trimmed.startsWith('##')) {
        const categoryName = trimmed.replace(/^#+\s*/, '').trim()
        currentCategory = {
          name: categoryName,
          commits: []
        }
        categories.push(currentCategory)
      }
      // Check for bold text (commit title) - **text**
      else if (trimmed.startsWith('**') && trimmed.endsWith('**') && currentCategory) {
        const rawTitle = trimmed.replace(/\*\*/g, '').trim()
        const title = cleanTitle(rawTitle)
        // Start a new commit entry
        currentCategory.commits.push({
          title,
          details: []
        })
      }
      // Check for list items (only lines starting with -)
      else if (trimmed.startsWith('-') && currentCategory && currentCategory.commits.length > 0) {
        const text = trimmed.replace(/^-\s*/, '').trim()
        if (text) {
          // Add to the last commit's details
          const lastCommit = currentCategory.commits[currentCategory.commits.length - 1]
          lastCommit.details.push(text)
        }
      }
    }

    return {
      categories,
      hasStructure: categories.length > 0
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <Icon icon="line-md:loading-loop" className="h-8 w-8 text-[#0081FB]" />
                </div>
              )}

              {error && (
                <div className="text-center py-10">
                  <Icon
                    icon="mdi:alert-circle-outline"
                    className="h-12 w-12 text-red-400 mx-auto mb-2"
                  />
                  <p className="text-red-400">{error}</p>
                  <button
                    onClick={fetchReleases}
                    className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white/70 hover:bg-white/20 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !error && releases.length === 0 && (
                <div className="text-center py-10 text-gray-500">No releases available.</div>
              )}

              {!loading && !error && releases.length > 0 && (
                <div className="space-y-6">
                  {releases.map((release, index) => {
                    const parsed = parseReleaseBody(release.body)

                    return (
                      <div key={release.id || `release-${index}`} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-[#0081FB] mt-2 ring-4 ring-[#111] z-10"></div>
                          {index !== releases.length - 1 && (
                            <div className="w-0.5 flex-1 bg-white/10 my-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-baseline justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-[#0081FB] bg-[#0081FB]/10 px-2 py-0.5 rounded font-semibold">
                                {release.tag_name}
                              </span>
                              {release.prerelease && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                  Pre-release
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(release.published_at)}
                            </span>
                          </div>

                          {/* Release name if different from tag */}
                          {release.name && release.name !== release.tag_name && (
                            <h3 className="text-white font-medium mb-2">{release.name}</h3>
                          )}

                          {/* Release body - structured with categories */}
                          {parsed.hasStructure ? (
                            <div className="space-y-3">
                              {parsed.categories.map((category, catIdx) => (
                                <div key={catIdx}>
                                  {/* Category header */}
                                  <h4 className="text-sm font-semibold text-white/80 mb-1.5">
                                    {category.name}
                                  </h4>
                                  {/* Category commits */}
                                  <div className="space-y-2">
                                    {category.commits.map((commit, commitIdx) => (
                                      <div key={commitIdx}>
                                        {/* Commit title (bold, no bullet) */}
                                        <p className="text-sm font-semibold text-white mb-1">
                                          {commit.title}
                                        </p>
                                        {/* Commit details (with bullets) */}
                                        {commit.details.length > 0 && (
                                          <ul className="space-y-0.5 ml-2">
                                            {commit.details.map((detail, detailIdx) => (
                                              <li
                                                key={detailIdx}
                                                className="flex items-start gap-2 text-sm text-gray-300"
                                              >
                                                <span className="text-[#0081FB] mt-1">•</span>
                                                <span>{detail}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : release.body ? (
                            <p className="text-sm text-gray-400 whitespace-pre-wrap">
                              {release.body.slice(0, 300)}
                              {release.body.length > 300 ? '...' : ''}
                            </p>
                          ) : release.name && release.name !== release.tag_name ? (
                            <p className="text-sm text-gray-300">{release.name}</p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No release notes</p>
                          )}

                          {/* View on GitHub link */}
                          <a
                            href={release.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-white/40 hover:text-[#0081FB] transition-colors"
                          >
                            <Icon icon="mdi:open-in-new" className="h-3 w-3" />
                            View on GitHub
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
