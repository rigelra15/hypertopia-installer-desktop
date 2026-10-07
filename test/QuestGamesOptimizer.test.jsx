import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => {
  const translations = {
    qgo_latest: 'LATEST',
    qgo_download: 'Download',
    qgo_title: 'Quest Games Optimizer',
    qgo_versions: 'versions available',
    refresh_btn: 'Refresh',
    downloads: 'downloads'
  }
  const t = (key) => translations[key] || key
  return { useLanguage: () => ({ t }) }
})
vi.mock('../src/renderer/src/contexts/AuthContext', () => {
  const user = { email: 'qgo@example.com' }
  const accessTypes = ['qgo']
  return { useAuth: () => ({ user, accessTypes }) }
})
vi.mock('../src/renderer/src/contexts/DownloadContext', () => {
  const startDownload = vi.fn()
  const showDownloadWidget = vi.fn()
  const cancelDownload = vi.fn()
  const downloadInfo = { status: 'idle' }
  return {
    useDownload: () => ({
      isDownloading: false,
      downloadInfo,
      startDownload,
      showDownloadWidget,
      cancelDownload
    })
  }
})
vi.mock('../src/renderer/src/contexts/GamesContext', () => {
  const qgoLinks = [
    {
      id: 'older-qgo',
      url: 'https://example.test/qgo-9.9.9.apk',
      description: 'Quest Games Optimizer v9.9.9',
      fileSize: 1024
    },
    {
      id: 'latest-qgo',
      url: 'https://example.test/qgo-10.0.0.apk',
      description: 'Quest Games Optimizer v10.0.0',
      fileSize: 2 * 1024 * 1024
    }
  ]
  const qgoDownloadStats = { total: 0, byVersion: { '10.0.0': 1234 } }
  const fetchQgoLinks = vi.fn()
  const fetchDownloadUrl = vi.fn()
  return {
    useGames: () => ({
      qgoLinks,
      qgoDownloadStats,
      qgoLoading: false,
      fetchQgoLinks,
      fetchDownloadUrl
    })
  }
})
vi.mock('../src/renderer/src/hooks/useToast', () => {
  const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() }
  return { useToast: () => toast }
})

import { QuestGamesOptimizer } from '../src/renderer/src/components/QuestGamesOptimizer'

describe('QuestGamesOptimizer latest release', () => {
  beforeEach(() => {
    window.api = {
      onInstallApkProgress: vi.fn(() => vi.fn()),
      checkDownloadedFiles: vi.fn().mockResolvedValue({ success: true, downloadedFiles: {} })
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('shows only the numerically newest release and keeps its download action', async () => {
    render(
      <QuestGamesOptimizer
        selectedDevice={null}
        pendingDeepLinkDownload={null}
        onDeepLinkProcessed={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Quest Games Optimizer v10.0.0')).toBeInTheDocument()
    })

    expect(screen.queryByText('Quest Games Optimizer v9.9.9')).not.toBeInTheDocument()
    expect(screen.getByText('LATEST')).toBeInTheDocument()
    expect(screen.getByText('2 MB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled()
    expect(screen.queryByPlaceholderText('Search version...')).not.toBeInTheDocument()
  })
})
