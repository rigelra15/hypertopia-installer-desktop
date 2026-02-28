import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.hypertopia.store'

export function RedeemModal({ isOpen, onClose, user, onSuccess }) {
  const { t } = useLanguage()
  const { accessTypes } = useAuth()
  const [orderNumber, setOrderNumber] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('search') // search | found | success | error
  const [orderData, setOrderData] = useState(null)
  const [error, setError] = useState('')
  const [successCategories, setSuccessCategories] = useState([])

  // Cooldown state (like website)
  const [lastSearchTime, setLastSearchTime] = useState(0)
  const [cooldownTime, setCooldownTime] = useState(0)

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownTime])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOrderNumber('')
      setAccessToken('')
      setStep('search')
      setOrderData(null)
      setError('')
      setSuccessCategories([])
    }
  }, [isOpen])

  // Check if user has all access
  const allCategories = ['standalone', 'pcvr', 'qgo']
  const hasAllAccess = allCategories.every((cat) =>
    accessTypes.some((t) => t.toLowerCase() === cat.toLowerCase())
  )

  const handleSearch = async () => {
    // Check if user already has all access
    if (hasAllAccess) {
      setError(
        'Anda sudah memiliki akses lengkap ke semua kategori VR. Penukaran tidak diperlukan.'
      )
      setStep('error')
      return
    }

    if (!orderNumber.trim()) {
      setError('Nomor pesanan harus diisi!')
      setStep('error')
      return
    }

    // Check for spam (3 second cooldown)
    const now = Date.now()
    if (now - lastSearchTime < 3000) {
      const remainingTime = Math.ceil((3000 - (now - lastSearchTime)) / 1000)
      setCooldownTime(remainingTime)
      setError('Terlalu banyak permintaan. Mohon tunggu sebelum mencari lagi.')
      setStep('error')
      return
    }

    setLoading(true)
    setError('')
    setLastSearchTime(now)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/redeem-vr-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          action: 'search'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Terjadi kesalahan saat mencari pesanan')
        setStep('error')
        return
      }

      if (data.success && data.order) {
        setOrderData(data.order)
        setStep('found')
      } else {
        setError(data.error || 'Pesanan tidak ditemukan')
        setStep('error')
      }
    } catch (err) {
      console.error('Error searching order:', err)
      setError('Terjadi kesalahan saat mencari pesanan')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (hasAllAccess) {
      setError(
        'Anda sudah memiliki akses lengkap ke semua kategori VR. Penukaran tidak diperlukan.'
      )
      setStep('error')
      return
    }

    if (!accessToken.trim()) {
      setError('Token akses harus diisi!')
      setStep('error')
      return
    }

    if (!user?.email) {
      setError('Anda harus login terlebih dahulu!')
      setStep('error')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/redeem-vr-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          accessToken: accessToken.trim(),
          userEmail: user.email,
          action: 'redeem'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Terjadi kesalahan saat memproses redeem')
        setStep('error')
        return
      }

      if (data.success) {
        setSuccessCategories(data.categories || [])
        setStep('success')

        // Callback to refresh access
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(data.error || 'Gagal melakukan redeem')
        setStep('error')
      }
    } catch (err) {
      console.error('Error redeeming order:', err)
      setError('Terjadi kesalahan saat memproses redeem')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const resetToSearch = () => {
    setStep('search')
    setOrderNumber('')
    setAccessToken('')
    setOrderData(null)
    setError('')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative h-20 bg-[#0081FB] flex items-center justify-center flex-shrink-0">
            <Icon icon="mdi:ticket-confirmation" className="h-10 w-10 text-white" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-black/20 rounded-full p-1.5"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 pt-4 overflow-y-auto flex-1">
            <h2 className="text-xl font-bold text-white text-center mb-2">
              {t('redeem_title') || 'Redeem Akses VR'}
            </h2>
            <p className="text-sm text-white/50 text-center mb-4">
              {t('redeem_desc') || 'Tukarkan nomor pesanan Shopee untuk mendapatkan akses'}
            </p>

            {/* Current Access Display (like website) */}
            <div className="mb-4">
              <div className="text-xs text-white/50 mb-2">Akses yang sudah dimiliki:</div>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((cat) => {
                  const hasAccess = accessTypes.some((t) => t.toLowerCase() === cat.toLowerCase())
                  return (
                    <span
                      key={cat}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        hasAccess
                          ? 'bg-[#0081FB]/20 text-[#0081FB] border-[#0081FB]/30'
                          : 'bg-white/5 text-white/30 border-white/10'
                      }`}
                    >
                      {cat.toUpperCase()}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Full Access Message */}
            {hasAllAccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                <Icon icon="mdi:check-circle" className="inline h-4 w-4 mr-1" />
                Akses Anda sudah lengkap (Standalone, PCVR, QGO). Tidak perlu melakukan penukaran
                lagi.
              </div>
            )}

            {/* Cooldown Warning */}
            {cooldownTime > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                <Icon icon="mdi:clock-outline" className="inline h-4 w-4 mr-1" />
                Tunggu {cooldownTime} detik sebelum mencari lagi...
              </div>
            )}

            {/* Search Step */}
            {step === 'search' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('order_number') || 'Nomor Pesanan'}
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="Contoh: 240101ABC123XYZ"
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#0081FB]/50 ${hasAllAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loading || hasAllAccess}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading || hasAllAccess || cooldownTime > 0}
                  className="w-full py-3 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon icon="mdi:magnify" className="h-5 w-5" />
                  )}
                  {loading
                    ? 'Mencari...'
                    : cooldownTime > 0
                      ? `Tunggu ${cooldownTime}s`
                      : 'Cari Pesanan'}
                </button>
              </div>
            )}

            {/* Found Step */}
            {step === 'found' && orderData && (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                    <Icon icon="mdi:clipboard-text" className="h-4 w-4" />
                    Informasi Pesanan
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">Kategori</span>
                    <span className="text-white text-sm font-medium">{orderData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">Varian</span>
                    <span className="text-white text-sm font-medium">
                      {orderData.orderName?.join(', ') || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">Jumlah</span>
                    <span className="text-white text-sm font-medium">
                      {orderData.quantity || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50 text-sm">Tanggal</span>
                    <span className="text-white text-sm font-medium">
                      {orderData.date ? new Date(orderData.date).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Status</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        orderData.isRedeemed
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {orderData.isRedeemed ? 'Sudah Diklaim' : 'Belum Diklaim'}
                    </span>
                  </div>
                </div>

                {/* Access Token Input (only if not redeemed) */}
                {!orderData.isRedeemed && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Token Akses <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Masukkan token dari admin"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#0081FB]/50"
                      disabled={loading}
                    />
                    <p className="text-xs text-white/40 mt-1">
                      💡 Token akses diberikan oleh admin untuk keamanan
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetToSearch}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl font-medium transition-colors"
                  >
                    Kembali
                  </button>
                  {!orderData.isRedeemed && (
                    <button
                      onClick={handleRedeem}
                      disabled={loading}
                      className="flex-1 py-3 bg-[#0081FB] hover:bg-[#0070E0] text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                      ) : (
                        <Icon icon="mdi:check" className="h-5 w-5" />
                      )}
                      {loading ? 'Memproses...' : 'Proses'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <Icon icon="mdi:check-circle" className="h-10 w-10 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Berhasil!</h3>
                <p className="text-sm text-white/60">
                  Email berhasil ditambahkan ke kategori terkait:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {successCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1.5 bg-[#0081FB]/20 text-[#0081FB] rounded-lg text-sm font-medium uppercase"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors mt-4"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Error Step */}
            {step === 'error' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                  <Icon icon="mdi:alert-circle" className="h-10 w-10 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Error</h3>
                <p className="text-sm text-white/60">{error}</p>
                <button
                  onClick={resetToSearch}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

RedeemModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.shape({
    email: PropTypes.string
  }),
  onSuccess: PropTypes.func
}

export default RedeemModal
