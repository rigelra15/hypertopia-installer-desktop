import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import PropTypes from 'prop-types'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'

const FIREBASE_DB_URL = 'https://hypertopia-id-bc-default-rtdb.asia-southeast1.firebasedatabase.app'
const REQUEST_API_URL = 'https://email.hypertopia.web.id/api/request-game'

const reportOptions = [
  {
    value: 'file_no_longer',
    labelEn: 'File no longer available',
    labelId: 'File tidak tersedia lagi'
  },
  { value: 'game_not_launching', labelEn: 'Game not launching', labelId: 'Game tidak bisa dibuka' },
  {
    value: 'game_stuck_loading',
    labelEn: 'Game stuck on loading screen',
    labelId: 'Game macet di layar loading'
  },
  { value: 'game_crashing', labelEn: 'Game crashing', labelId: 'Game crash' },
  { value: 'game_performance_issues', labelEn: 'Performance issues', labelId: 'Masalah performa' },
  { value: 'game_visual_glitches', labelEn: 'Visual glitches', labelId: 'Glitch visual' },
  { value: 'others', labelEn: 'Others', labelId: 'Lainnya' }
]

export function RequestGameModal({ isOpen, onClose, onSuccess }) {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()

  const [formData, setFormData] = useState({
    gameTitle: '',
    gameType: 'standalone',
    requestType: 'new',
    version: '',
    previousVersion: '',
    newVersion: '',
    report: '',
    customReport: '',
    description: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingGames, setExistingGames] = useState({})
  const [titleSuggestions, setTitleSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [titleExists, setTitleExists] = useState(false)
  const [availableVersions, setAvailableVersions] = useState([])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      fetchExistingGames(formData.gameType)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, formData.gameType])

  const fetchExistingGames = async (gameType) => {
    try {
      const typePath = gameType === 'pcvr' ? 'vrGames/pcvr' : 'vrGames/standalone'
      const res = await fetch(`${FIREBASE_DB_URL}/${typePath}.json`)
      const data = await res.json()
      if (data) {
        setExistingGames(data)
      }
    } catch (err) {
      console.error('Error fetching existing games:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    let newValue = value

    if (name === 'version' || name === 'previousVersion' || name === 'newVersion') {
      if (/^[\d.]+\+?$/.test(value)) {
        newValue = 'v' + value
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      ...(name === 'report' && value !== 'others' ? { customReport: '' } : {})
    }))

    if (name === 'gameTitle') {
      const typed = value.trim().toLowerCase()
      if (!typed) {
        setTitleSuggestions([])
        setTitleExists(false)
        return
      }

      const matches = Object.keys(existingGames)
        .filter((key) => key.toLowerCase().includes(typed))
        .slice(0, 8)

      setTitleSuggestions(matches)
      setTitleExists(!!existingGames[value.trim()])

      if (existingGames[value.trim()]) {
        const gameData = existingGames[value.trim()]
        const versions = gameData.versions || gameData.availableVersions || []
        setAvailableVersions(versions)
        if (versions.length > 0) {
          setFormData((prev) => ({
            ...prev,
            previousVersion: versions[0],
            version: versions[0]
          }))
        }
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user?.email) {
      toast.error(t('login_required'))
      return
    }

    if (!formData.gameTitle.trim()) {
      toast.error(language === 'en' ? 'Game title is required!' : 'Judul game wajib diisi!')
      return
    }

    if (formData.requestType === 'new' && titleExists) {
      toast.error(language === 'en' ? 'This game already exists!' : 'Game sudah ada!')
      return
    }

    if ((formData.requestType === 'update' || formData.requestType === 'report') && !titleExists) {
      toast.error(
        language === 'en' ? 'Please select an existing game!' : 'Pilih game yang sudah ada!'
      )
      return
    }

    if (formData.requestType === 'update' && !formData.newVersion.trim()) {
      toast.error(language === 'en' ? 'New version is required!' : 'Versi baru wajib diisi!')
      return
    }

    if (formData.requestType === 'report' && !formData.report) {
      toast.error(language === 'en' ? 'Please select a report type!' : 'Pilih tipe laporan!')
      return
    }

    if (formData.report === 'others' && !formData.customReport.trim()) {
      toast.error(language === 'en' ? 'Please describe the issue!' : 'Jelaskan masalahnya!')
      return
    }

    setIsSubmitting(true)

    try {
      const requestData = {
        gameTitle: formData.gameTitle.trim(),
        gameType: formData.gameType,
        requestType: formData.requestType,
        version: formData.version || null,
        previousVersion: formData.previousVersion || null,
        newVersion: formData.newVersion || null,
        report: formData.report === 'others' ? formData.customReport : formData.report,
        description: formData.description || null,
        requestedBy: user.email,
        status: 'Pending',
        timeRequested: new Date().toISOString()
      }

      await fetch(`${FIREBASE_DB_URL}/requestedVRGames/${formData.gameTitle}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      try {
        await fetch(REQUEST_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            game: formData.gameTitle,
            requestType: formData.requestType,
            requestedBy: user.email
          })
        })
      } catch (err) {
        console.warn('Failed to send notification email:', err)
      }

      toast.success(
        language === 'en' ? 'Request submitted successfully!' : 'Request berhasil dikirim!'
      )
      onSuccess?.()
      onClose()
      resetForm()
    } catch (err) {
      console.error('Error submitting request:', err)
      toast.error(language === 'en' ? 'Failed to submit request' : 'Gagal mengirim request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      gameTitle: '',
      gameType: 'standalone',
      requestType: 'new',
      version: '',
      previousVersion: '',
      newVersion: '',
      report: '',
      customReport: '',
      description: ''
    })
    setTitleSuggestions([])
    setTitleExists(false)
    setAvailableVersions([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-[#111] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="relative p-6 bg-[#0081FB] rounded-t-2xl text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Icon icon="material-symbols:close" className="text-xl" />
          </button>
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:gamepad" className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">
                {language === 'en' ? 'Request VR Game' : 'Request Game VR'}
              </h2>
              <p className="text-sm text-blue-100">
                {language === 'en'
                  ? 'Submit a new game request or report an issue'
                  : 'Kirim request game baru atau lapor masalah'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-100 dark:border-blue-500/20 flex items-center gap-2">
              <Icon icon="material-symbols:person" className="text-blue-500 text-lg" />
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {language === 'en' ? 'Requested by: ' : 'Direquest oleh: '}
                <span className="font-bold">{user?.email}</span>
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                {language === 'en' ? 'Game Title' : 'Judul Game'} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="gameTitle"
                  value={formData.gameTitle}
                  onChange={handleInputChange}
                  onFocus={() => formData.requestType !== 'new' && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={language === 'en' ? 'Enter game title...' : 'Masukkan judul game...'}
                  className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  required
                />
                {showSuggestions && titleSuggestions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {titleSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onMouseDown={() => {
                          setFormData((prev) => ({ ...prev, gameTitle: suggestion }))
                          setTitleExists(true)
                          setShowSuggestions(false)
                          const gameData = existingGames[suggestion]
                          const versions = gameData?.versions || gameData?.availableVersions || []
                          setAvailableVersions(versions)
                          if (versions.length > 0) {
                            setFormData((prev) => ({
                              ...prev,
                              previousVersion: versions[0],
                              version: versions[0]
                            }))
                          }
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/5 text-sm text-gray-900 dark:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {titleExists && formData.requestType === 'new' && (
                <p className="text-sm text-red-500 mt-2">
                  {language === 'en'
                    ? 'This game already exists in the store!'
                    : 'Game sudah ada di toko!'}
                </p>
              )}
              {titleExists && formData.requestType !== 'new' && (
                <p className="text-sm text-green-500 mt-2">
                  {language === 'en' ? 'Game found!' : 'Game ditemukan!'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  {language === 'en' ? 'Game Type' : 'Tipe Game'}
                </label>
                <select
                  name="gameType"
                  value={formData.gameType}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                >
                  <option value="standalone">Standalone</option>
                  <option value="pcvr">PC VR</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  {language === 'en' ? 'Request Type' : 'Tipe Request'}
                </label>
                <select
                  name="requestType"
                  value={formData.requestType}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                >
                  <option value="new">
                    {language === 'en' ? 'New Game Request' : 'Request Game Baru'}
                  </option>
                  <option value="update">
                    {language === 'en' ? 'Update Request' : 'Request Update'}
                  </option>
                  <option value="report">
                    {language === 'en' ? 'Report Issue' : 'Lapor Masalah'}
                  </option>
                </select>
              </div>
            </div>

            {formData.requestType === 'new' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                  {language === 'en' ? 'Version (Optional)' : 'Versi (Opsional)'}
                </label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  placeholder={
                    language === 'en' ? 'e.g., v1.2.3 or Terbaru' : 'contoh: v1.2.3 atau Terbaru'
                  }
                  className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-blue-500 mt-1.5 flex items-center gap-1">
                  <Icon icon="material-symbols:info" className="text-sm" />
                  {language === 'en'
                    ? 'Leave empty to get the latest available version'
                    : 'Kosongkan untuk mendapat versi terbaru'}
                </p>
              </div>
            )}

            {formData.requestType === 'update' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    {language === 'en' ? 'Current Version' : 'Versi Sekarang'}
                  </label>
                  <input
                    type="text"
                    name="previousVersion"
                    value={formData.previousVersion}
                    readOnly
                    className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    {language === 'en' ? 'New Version' : 'Versi Baru'} *
                  </label>
                  <input
                    type="text"
                    name="newVersion"
                    value={formData.newVersion}
                    onChange={handleInputChange}
                    placeholder={language === 'en' ? 'e.g., v1.2.0' : 'contoh: v1.2.0'}
                    className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
            )}

            {formData.requestType === 'report' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    {language === 'en' ? 'Game Version' : 'Versi Game'}
                  </label>
                  <select
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    disabled={!titleExists || availableVersions.length === 0}
                    className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {availableVersions.length > 0 ? (
                      availableVersions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {language === 'en' ? 'No versions available' : 'Tidak ada versi'}
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                    {language === 'en' ? 'Issue Type' : 'Tipe Masalah'} *
                  </label>
                  <select
                    name="report"
                    value={formData.report}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">
                      {language === 'en' ? 'Select issue type...' : 'Pilih tipe masalah...'}
                    </option>
                    {reportOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {language === 'en' ? opt.labelEn : opt.labelId}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.report === 'others' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                      {language === 'en' ? 'Describe the Issue' : 'Jelaskan Masalahnya'} *
                    </label>
                    <textarea
                      name="customReport"
                      value={formData.customReport}
                      onChange={handleInputChange}
                      placeholder={
                        language === 'en'
                          ? 'Describe the issue in detail...'
                          : 'Jelaskan masalahnya secara detail...'
                      }
                      rows={3}
                      className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white resize-none"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">
                {language === 'en' ? 'Additional Notes (Optional)' : 'Catatan Tambahan (Opsional)'}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={
                  language === 'en' ? 'Any additional information...' : 'Informasi tambahan...'
                }
                rows={2}
                className="w-full p-3 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white/70 rounded-xl font-medium transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#0081FB] hover:bg-[#006fd6] text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {language === 'en' ? 'Submitting...' : 'Mengirim...'}
                  </>
                ) : (
                  <>
                    <Icon icon="material-symbols:send" className="text-lg" />
                    {language === 'en' ? 'Submit Request' : 'Kirim Request'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

RequestGameModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
}

export default RequestGameModal
