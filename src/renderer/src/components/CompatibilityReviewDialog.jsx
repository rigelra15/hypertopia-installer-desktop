import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import PropTypes from 'prop-types'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { apiFetch } from '../utils/apiClient'

const tags = [
  ['perfectly_compatible', 'Sangat kompatibel'],
  ['mostly_playable', 'Sebagian besar bisa dimainkan'],
  ['some_issues', 'Ada beberapa masalah'],
  ['unplayable', 'Tidak bisa dimainkan']
]
const devices = [
  ['quest1', 'Meta Quest 1'],
  ['quest2', 'Meta Quest 2'],
  ['quest3', 'Meta Quest 3'],
  ['quest3s', 'Meta Quest 3S'],
  ['questPro', 'Meta Quest Pro']
]

export default function CompatibilityReviewDialog({
  isOpen,
  onClose,
  gameId,
  gameTitle,
  testedVersion,
  summary,
  selectedDevice
}) {
  const { user } = useAuth()
  const { language } = useLanguage()
  const [reviews, setReviews] = useState([])
  const [form, setForm] = useState({
    rating: 0,
    compatibilityTag: '',
    questModel: '',
    testedVersion: testedVersion || '',
    feedback: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setForm((current) => ({
      ...current,
      questModel: selectedDevice || current.questModel,
      testedVersion: testedVersion || current.testedVersion
    }))
    setLoading(true)
    apiFetch(
      `/api/v1/compatibility-reviews?gameType=standalone&gameId=${encodeURIComponent(gameId)}`
    )
      .then((response) => response.json())
      .then((data) => setReviews(Array.isArray(data.reviews) ? data.reviews : []))
      .catch(() =>
        setError(language === 'en' ? 'Reviews unavailable.' : 'Review belum dapat dimuat.')
      )
      .finally(() => setLoading(false))
  }, [gameId, isOpen, language, selectedDevice, testedVersion])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const submit = async (event) => {
    event.preventDefault()
    if (!user)
      return setError(
        language === 'en' ? 'Please login to submit a review.' : 'Login untuk mengirim review.'
      )
    if (!form.rating || !form.compatibilityTag || !form.questModel || !form.feedback.trim())
      return setError(
        language === 'en' ? 'Complete the required fields.' : 'Lengkapi semua field wajib.'
      )
    setSubmitting(true)
    setError('')
    try {
      const response = await apiFetch('/api/v1/compatibility-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'standalone',
          gameId,
          rating: form.rating,
          compatibilityTag: form.compatibilityTag,
          questModel: form.questModel,
          testedVersion: form.testedVersion.trim(),
          feedback: form.feedback.trim()
        })
      })
      if (!response.ok) throw new Error('submit failed')
      const data = await response.json()
      if (data.review) setReviews((current) => [data.review, ...current])
      setForm((current) => ({ ...current, rating: 0, compatibilityTag: '', feedback: '' }))
    } catch {
      setError(language === 'en' ? 'Could not submit review.' : 'Review gagal dikirim.')
    } finally {
      setSubmitting(false)
    }
  }

  const average = summary?.reviewCount ? Number(summary.averageRating || 0).toFixed(1) : '—'
  const deviceOptions = selectedDevice
    ? devices.filter(([value]) => value === selectedDevice)
    : devices
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="installer-review-title"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/10">
              <div>
                <h2
                  id="installer-review-title"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  Compatibility Reviews
                </h2>
                <p className="text-xs text-gray-500 dark:text-white/50">
                  {gameTitle} · ★ {average}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/10"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </p>
              )}
              <div className="mb-5 space-y-3">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading reviews…</p>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {language === 'en' ? 'No reviews yet.' : 'Belum ada review.'}
                  </p>
                ) : (
                  reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
                    >
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-bold text-amber-500">
                          {'★'.repeat(Number(review.rating || 0))}
                        </span>
                        <span className="text-xs text-gray-500">{review.questModel}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 dark:text-white/80">
                        {review.feedback}
                      </p>
                    </article>
                  ))
                )}
              </div>
              <form
                onSubmit={submit}
                className="space-y-3 border-t border-gray-200 pt-4 dark:border-white/10"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {language === 'en' ? 'Share your experience' : 'Bagikan pengalamanmu'}
                </p>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={form.rating === value}
                      onClick={() => setForm({ ...form, rating: value })}
                      className="min-h-11 min-w-11 text-2xl text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0081FB]"
                    >
                      {value <= form.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tags.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, compatibilityTag: value })}
                      className={`min-h-11 rounded-lg border px-3 text-left text-sm ${form.compatibilityTag === value ? 'border-[#0081FB] bg-[#0081FB]/10 text-[#006bcf]' : 'border-gray-200 text-gray-700 dark:border-white/10 dark:text-white/70'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <select
                  value={form.questModel || selectedDevice || ''}
                  onChange={(event) => setForm({ ...form, questModel: event.target.value })}
                  className="min-h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                  required
                >
                  <option value="">Pilih model Meta Quest</option>
                  {deviceOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={form.testedVersion}
                  onChange={(event) => setForm({ ...form, testedVersion: event.target.value })}
                  placeholder="Tested version (optional)"
                  className="min-h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                />
                <textarea
                  value={form.feedback}
                  onChange={(event) =>
                    setForm({ ...form, feedback: event.target.value.slice(0, 500) })
                  }
                  placeholder={
                    language === 'en'
                      ? 'Share your gameplay experience'
                      : 'Bagikan pengalaman bermain'
                  }
                  className="min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-transparent p-3 text-sm dark:border-white/10 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-11 w-full rounded-lg bg-[#0081FB] px-4 font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit review'}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

CompatibilityReviewDialog.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  gameId: PropTypes.string.isRequired,
  gameTitle: PropTypes.string.isRequired,
  testedVersion: PropTypes.string,
  summary: PropTypes.object,
  selectedDevice: PropTypes.string
}
