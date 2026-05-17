import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'

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

  const cleanTitle = (title) => {
    const cleaned = title.replace(
      /^(feat|fix|chore|perf|refactor|style|build|ci|docs|test)(\(.+?\))?:\s*/i,
      ''
    )
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const parseReleaseBody = (body) => {
    if (!body) return { categories: [], hasStructure: false }

    const lines = body.split('\n')
    const categories = []
    let currentCategory = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('##')) {
        const categoryName = trimmed.replace(/^#+\s*/, '').trim()
        currentCategory = { name: categoryName, commits: [] }
        categories.push(currentCategory)
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**') && currentCategory) {
        const rawTitle = trimmed.replace(/\*\*/g, '').trim()
        const title = cleanTitle(rawTitle)
        currentCategory.commits.push({ title, details: [] })
      } else if (trimmed.startsWith('-') && currentCategory && currentCategory.commits.length > 0) {
        const text = trimmed.replace(/^-\s*/, '').trim()
        if (text) {
          const lastCommit = currentCategory.commits[currentCategory.commits.length - 1]
          lastCommit.details.push(text)
        }
      }
    }

    return { categories, hasStructure: categories.length > 0 }
  }

  const headerRight = (
    <button
      onClick={fetchReleases}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
    >
      <Icon icon="mdi:refresh" className="h-4 w-4" />
      <span className="hidden sm:inline">{t('changelog_refresh') || 'Refresh'}</span>
    </button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('changelog_title') || 'Changelog'}
      subtitle={t('changelog_desc') || 'View release history and updates'}
      icon="line-md:clipboard-list"
      iconColor="#0081FB"
      size="lg"
      headerRight={headerRight}
    >
      <div className="p-6 pr-4">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Icon icon="line-md:loading-loop" className="h-8 w-8 text-[#0081FB]" />
          </div>
        )}

        {error && (
          <div className="text-center py-10">
            <Icon icon="mdi:alert-circle-outline" className="h-12 w-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchReleases}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
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
                    <div className="w-2 h-2 rounded-full bg-[#0081FB] mt-2 ring-4 ring-white dark:ring-[#111] z-10"></div>
                    {index !== releases.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/10 my-1"></div>
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

                    {release.name && release.name !== release.tag_name && (
                      <h3 className="text-gray-900 dark:text-white font-medium mb-2">
                        {release.name}
                      </h3>
                    )}

                    {parsed.hasStructure ? (
                      <div className="space-y-3">
                        {parsed.categories.map((category, catIdx) => (
                          <div key={catIdx}>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-white/80 mb-1.5">
                              {category.name}
                            </h4>
                            <div className="space-y-2">
                              {category.commits.map((commit, commitIdx) => (
                                <div key={commitIdx}>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    {commit.title}
                                  </p>
                                  {commit.details.length > 0 && (
                                    <ul className="space-y-0.5 ml-2">
                                      {commit.details.map((detail, detailIdx) => (
                                        <li
                                          key={detailIdx}
                                          className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {release.name}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No release notes</p>
                    )}

                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-white/40 hover:text-[#0081FB] transition-colors"
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
    </Modal>
  )
}

ChangelogModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}
