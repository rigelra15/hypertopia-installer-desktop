import { Icon } from '@iconify/react'
import Markdown from 'react-markdown'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  fetchDesktopReleaseNotes,
  mergeDesktopReleaseNotes,
  releaseDateForDisplay
} from '../utils/releaseNotes'
import { Modal } from './ui/Modal'

const GITHUB_OWNER = 'rigelra15'
const GITHUB_REPO = 'hypertopia-installer-releases'

const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold leading-tight text-gray-900 dark:text-white">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold leading-snug text-gray-900 dark:text-white">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold leading-snug text-gray-900 dark:text-white">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 marker:text-[#0081FB]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 marker:text-[#0081FB]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#0081FB] pl-3 text-gray-600 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800 dark:bg-white/10 dark:text-gray-100">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs leading-5 text-gray-800 dark:bg-white/10 dark:text-gray-100">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#0081FB] underline underline-offset-2"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="border-gray-200 dark:border-white/10" />
}

export default function ChangelogModal({ isOpen, onClose }) {
  const { t, language } = useLanguage()
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sourceNotice, setSourceNotice] = useState(null)
  const requestId = useRef(0)

  const fetchReleases = useCallback(async () => {
    const activeRequestId = requestId.current + 1
    requestId.current = activeRequestId

    const [githubResult, notesResult] = await Promise.allSettled([
      fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=20`
      ).then(async (response) => {
        if (!response.ok) throw new Error('Installer release versions could not be loaded.')
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Installer release response was invalid.')
        return data
      }),
      fetchDesktopReleaseNotes()
    ])

    if (activeRequestId !== requestId.current) return

    const githubAvailable = githubResult.status === 'fulfilled'
    const notesAvailable = notesResult.status === 'fulfilled'
    const githubReleases = githubAvailable ? githubResult.value : []
    const notes = notesAvailable ? notesResult.value : []
    const merged = mergeDesktopReleaseNotes(githubReleases, notes, language)

    setReleases(merged)

    if (!githubAvailable && !notesAvailable) {
      setError(true)
    } else if (!githubAvailable) {
      setSourceNotice('github')
      if (merged.length === 0) {
        setError(true)
      }
    } else if (!notesAvailable) {
      setSourceNotice('api')
    }

    setLoading(false)
  }, [language])

  useEffect(() => {
    if (!isOpen) return
    // State updates in this request happen after the network responses settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchReleases()
  }, [isOpen, fetchReleases])

  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    setSourceNotice(null)
    void fetchReleases()
  }

  const formatDate = (dateString) => {
    const date = releaseDateForDisplay(dateString)
    if (!date) return dateString || ''
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const headerRight = (
    <button
      type="button"
      onClick={handleRefresh}
      aria-label={t('changelog_refresh') || (language === 'id' ? 'Muat ulang' : 'Refresh')}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10"
    >
      <Icon icon="mdi:refresh" className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        {t('changelog_refresh') || (language === 'id' ? 'Muat ulang' : 'Refresh')}
      </span>
    </button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('changelog_title') || (language === 'id' ? 'Catatan Rilis' : 'Release Notes')}
      subtitle={
        t('changelog_desc') ||
        (language === 'id'
          ? 'Perubahan terbaru HyperTopia Installer'
          : 'The latest HyperTopia Installer updates')
      }
      icon="line-md:clipboard-list"
      iconColor="#0081FB"
      size="lg"
      headerRight={headerRight}
    >
      <div className="p-6 pr-4">
        {loading && (
          <div
            className="flex items-center justify-center py-10"
            role="status"
            aria-label={t('changelog_loading') || 'Loading'}
          >
            <Icon
              icon="line-md:loading-loop"
              className="size-8 text-[#0081FB]"
              aria-hidden="true"
            />
          </div>
        )}

        {error && (
          <div role="alert" className="py-10 text-center">
            <Icon
              icon="mdi:alert-circle-outline"
              className="mx-auto mb-2 size-12 text-red-400"
              aria-hidden="true"
            />
            <p className="text-red-500 dark:text-red-400">
              {t('changelog_load_error') ||
                (language === 'id'
                  ? 'Riwayat rilis tidak dapat dimuat. Periksa koneksi lalu coba lagi.'
                  : 'Release history could not be loaded. Check your connection and try again.')}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
            >
              {t('changelog_retry') || (language === 'id' ? 'Coba lagi' : 'Try again')}
            </button>
          </div>
        )}

        {!loading && !error && sourceNotice && (
          <div
            role="status"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>
              {sourceNotice === 'api'
                ? t('changelog_notes_unavailable') ||
                  (language === 'id'
                    ? 'Catatan Admin belum dapat dimuat. Versi tetap ditampilkan tanpa deskripsi GitHub.'
                    : 'Admin notes could not be loaded. Versions are shown without GitHub descriptions.')
                : t('changelog_history_unavailable') ||
                  (language === 'id'
                    ? 'Riwayat GitHub tidak tersedia. Menampilkan catatan yang diterbitkan Admin.'
                    : 'GitHub history is unavailable. Showing notes published by Admin.')}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 self-start rounded-lg border border-current/20 px-3 py-2 font-semibold hover:bg-black/5 sm:self-auto dark:hover:bg-white/10"
            >
              {t('changelog_retry') || (language === 'id' ? 'Coba lagi' : 'Try again')}
            </button>
          </div>
        )}

        {!loading && !error && releases.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            {t('changelog_no_releases') ||
              (language === 'id' ? 'Belum ada versi yang tersedia.' : 'No releases available.')}
          </div>
        )}

        {!loading && !error && releases.length > 0 && (
          <div className="space-y-6">
            {releases.map((release, index) => {
              const version = release.tag_name || `release-${index}`
              const displayedTitle = release.releaseNoteTitle || version

              return (
                <div key={release.id || `release-${version}`} className="group flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="z-10 mt-2 size-2 rounded-full bg-[#0081FB] ring-4 ring-white dark:ring-[#111]" />
                    {index !== releases.length - 1 && (
                      <div className="my-1 w-0.5 flex-1 bg-gray-200 dark:bg-white/10" />
                    )}
                  </div>
                  <article className="min-w-0 flex-1 pb-4">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#0081FB]/10 px-2 py-0.5 font-mono text-sm font-semibold text-[#0081FB]">
                          {version}
                        </span>
                        {release.prerelease && (
                          <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-yellow-700 dark:text-yellow-400">
                            {t('changelog_prerelease') ||
                              (language === 'id' ? 'Pra-rilis' : 'Pre-release')}
                          </span>
                        )}
                      </div>
                      <time
                        dateTime={release.releaseNoteDate || release.published_at}
                        className="shrink-0 text-xs text-gray-500"
                      >
                        {formatDate(release.releaseNoteDate || release.published_at)}
                      </time>
                    </div>

                    {displayedTitle !== version && (
                      <h3 className="mb-2 text-balance font-medium text-gray-900 dark:text-white">
                        {displayedTitle}
                      </h3>
                    )}

                    {release.releaseNoteBody ? (
                      <div className="space-y-3 break-words">
                        <Markdown components={markdownComponents}>
                          {release.releaseNoteBody}
                        </Markdown>
                      </div>
                    ) : (
                      <p className="text-sm italic text-gray-500 dark:text-gray-400">
                        {t('changelog_no_notes') ||
                          (language === 'id'
                            ? 'Belum ada catatan untuk versi ini.'
                            : 'No release notes for this version yet.')}
                      </p>
                    )}
                  </article>
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
