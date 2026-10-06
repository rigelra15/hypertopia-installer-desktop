import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../src/renderer/src/utils/apiClient'
import ChangelogModal from '../src/renderer/src/components/ChangelogModal'

const languageState = vi.hoisted(() => ({ value: 'id' }))

vi.mock('../src/renderer/src/utils/apiClient', () => ({ apiFetch: vi.fn() }))
vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: languageState.value,
    t: (key) =>
      ({
        changelog_title: 'Release Notes',
        changelog_desc: 'The latest HyperTopia Installer updates',
        changelog_refresh: 'Refresh',
        changelog_retry: 'Try Again',
        changelog_no_notes: 'No release notes for this version yet.',
        changelog_notes_unavailable:
          'Admin notes could not be loaded. Versions are shown without GitHub descriptions.',
        changelog_history_unavailable:
          'GitHub history is unavailable. Showing notes published by Admin.'
      })[key] || key
  })
}))
vi.mock('../src/renderer/src/components/ui/Modal', () => {
  const Modal = ({ isOpen, title, subtitle, headerRight, children }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {headerRight}
        {children}
      </div>
    ) : null

  Modal.propTypes = {
    isOpen: PropTypes.bool,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    headerRight: PropTypes.node,
    children: PropTypes.node
  }

  return { Modal }
})

const githubRelease = {
  id: 14,
  tag_name: '1.2.3',
  name: 'GitHub title',
  body: 'GitHub fallback body',
  published_at: '2026-09-01T00:00:00Z',
  html_url: 'https://github.com/rigelra15/hypertopia-installer-releases/releases/tag/1.2.3',
  assets: [{ id: 27, name: 'installer.exe' }]
}

const note = {
  id: 'desktop-1-2-3',
  platform: 'desktop',
  version: 'v1.2.3',
  releaseDate: '2026-09-02',
  title: { id: 'Pembaruan Admin', en: 'Admin release title' },
  body: { id: 'Catatan dari Admin', en: 'Admin-authored release details' },
  status: 'published'
}

const setGithubResponse = (releases = [githubRelease]) => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => releases })
}

const setApiResponse = (notes = [note]) => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, notes }) })
}

describe('ChangelogModal', () => {
  beforeEach(() => {
    languageState.value = 'id'
    setGithubResponse()
    setApiResponse()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('merges the public Admin note with the matching GitHub release', async () => {
    render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('Pembaruan Admin')).toBeInTheDocument()
    expect(screen.getByText('Catatan dari Admin')).toBeInTheDocument()
    expect(screen.queryByText('GitHub title')).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/rigelra15/hypertopia-installer-releases/releases?per_page=20'
    )
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/release-notes?platform=desktop')
  })

  it('shows release versions without GitHub descriptions when notes are unavailable', async () => {
    setApiResponse([])
    render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('1.2.3')).toBeInTheDocument()
    expect(screen.getByText('No release notes for this version yet.')).toBeInTheDocument()
    expect(screen.queryByText('GitHub fallback body')).not.toBeInTheDocument()
  })

  it('keeps release versions visible and offers a retry when Admin notes fail', async () => {
    languageState.value = 'en'
    apiFetch.mockRejectedValue(new Error('API offline'))
    render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('1.2.3')).toBeInTheDocument()
    expect(screen.getByText('No release notes for this version yet.')).toBeInTheDocument()
    expect(screen.queryByText('GitHub fallback body')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/admin notes could not be loaded/i)
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('shows authored notes when GitHub release history is unavailable', async () => {
    languageState.value = 'en'
    global.fetch = vi.fn().mockRejectedValue(new Error('GitHub offline'))
    render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('Admin release title')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/github history is unavailable/i)
  })

  it('uses the other language when selected-language title text is blank', async () => {
    languageState.value = 'en'
    setApiResponse([{ ...note, title: { id: 'Judul lokal', en: '' } }])
    render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('Judul lokal')).toBeInTheDocument()
    expect(screen.getByText('Admin-authored release details')).toBeInTheDocument()
  })

  it('renders authored HTML-like text literally', async () => {
    setApiResponse([
      {
        ...note,
        title: { id: '<b>Judul</b>', en: '' },
        body: { id: '<script>alert(1)</script>', en: '' }
      }
    ])
    const { container } = render(<ChangelogModal isOpen onClose={vi.fn()} />)

    expect(await screen.findByText('<b>Judul</b>')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  it('refreshes both sources without losing an empty-feed GitHub release', async () => {
    setApiResponse([])
    render(<ChangelogModal isOpen onClose={vi.fn()} />)
    expect(await screen.findByText('1.2.3')).toBeInTheDocument()
    expect(screen.getByText('No release notes for this version yet.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(screen.getByText('No release notes for this version yet.')).toBeInTheDocument()
    expect(screen.queryByText('GitHub fallback body')).not.toBeInTheDocument()
  })
})
