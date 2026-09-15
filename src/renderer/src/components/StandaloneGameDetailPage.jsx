import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Icon } from '@iconify/react'
import { useGames } from '../contexts/GamesContext'
import GameDetailModal from './GameDetailModal'

export default function StandaloneGameDetailPage({
  game,
  onBack,
  selectedDevice,
  connectedDevice
}) {
  const { fetchStandaloneGame } = useGames()
  const [detailGame, setDetailGame] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const gameKey = game?.id

  const loadDetail = useCallback(async () => {
    if (!gameKey) {
      setError(new Error('Game key is missing'))
      setStatus('error')
      return
    }

    setStatus('loading')
    setError(null)
    try {
      const result = await fetchStandaloneGame(gameKey)
      setDetailGame(result)
      setStatus('success')
    } catch (loadError) {
      setError(loadError)
      setStatus('error')
    }
  }, [fetchStandaloneGame, gameKey])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      await loadDetail()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [loadDetail])

  if (status === 'loading') {
    return (
      <div
        data-testid="standalone-detail-loading"
        className="standalone-detail-page standalone-detail-page--desktop"
      >
        <DetailPageHeader title={game?.gameTitle || game?.name || 'Game'} onBack={onBack} loading />
        <div className="standalone-detail-page__inner space-y-5">
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
          <div className="h-8 w-72 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        data-testid="standalone-detail-error"
        className="standalone-detail-page standalone-detail-page--desktop"
      >
        <DetailPageHeader title={game?.gameTitle || game?.name || 'Game'} onBack={onBack} loading />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center">
            <Icon icon="mdi:cloud-alert-outline" className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              Unable to load game detail
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/50">
              {error?.message || 'Please try again.'}
            </p>
            <button
              type="button"
              onClick={loadDetail}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0081FB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#006fd6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0081FB] focus-visible:ring-offset-2"
            >
              <Icon icon="mdi:refresh" className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="standalone-detail-page"
      className="standalone-detail-page standalone-detail-page--desktop"
    >
      <DetailPageHeader
        title={detailGame?.gameTitle || detailGame?.name || 'Game'}
        onBack={onBack}
        headerActionsTargetId="standalone-detail-header-actions"
      />
      <div className="standalone-detail-page__inner">
        <GameDetailModal
          isOpen
          presentation="page"
          onClose={onBack}
          game={detailGame}
          selectedDevice={selectedDevice}
          connectedDevice={connectedDevice}
          headerActionsTargetId="standalone-detail-header-actions"
        />
      </div>
    </div>
  )
}

function DetailPageHeader({ title, onBack, loading = false, headerActionsTargetId = null }) {
  return (
    <header className="standalone-detail-page__header">
      <div className="standalone-detail-page__header-inner">
        <div className="standalone-detail-page__header-row">
          <div className="standalone-detail-page__header-copy">
            <button
              type="button"
              aria-label="Kembali"
              className="standalone-detail-page__header-link"
              onClick={onBack}
            >
              <Icon icon="mdi:arrow-left" aria-hidden="true" />
              <span>Kembali</span>
            </button>
            <h1 className="standalone-detail-page__header-title">{title}</h1>
          </div>
          {headerActionsTargetId ? (
            <div id={headerActionsTargetId} data-testid="standalone-detail-header-actions" />
          ) : (
            <div className="standalone-detail-header-actions" aria-hidden="true">
              {loading && <span className="standalone-detail-header-skeleton" />}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

StandaloneGameDetailPage.propTypes = {
  game: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
  selectedDevice: PropTypes.string,
  connectedDevice: PropTypes.string
}

DetailPageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  headerActionsTargetId: PropTypes.string
}
