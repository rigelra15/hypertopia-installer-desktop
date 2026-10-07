import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UpdateNotification from '../src/renderer/src/components/UpdateNotification'

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, ...props }) => {
    const filteredProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) => !['initial', 'animate', 'exit', 'transition'].includes(key)
      )
    )
    return <div {...filteredProps}>{children}</div>
  }
  MotionDiv.propTypes = { children: PropTypes.node }
  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: MotionDiv }
  }
})
vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) =>
      ({
        update_new_version: 'New Version Available!',
        update_download_prompt: 'A new version is available. Download it now or later.',
        update_download_now: 'Download Now',
        update_later: 'Later',
        update_available: 'Update Available',
        update_downloading: 'Downloading update...'
      })[key] || key
  })
}))
vi.mock('../src/renderer/src/components/ui/Modal', () => {
  const Modal = ({ isOpen, title, subtitle, footer, children }) =>
    isOpen ? (
      <section role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
        <footer>{footer}</footer>
      </section>
    ) : null
  Modal.propTypes = {
    isOpen: PropTypes.bool,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    footer: PropTypes.node,
    children: PropTypes.node
  }
  return { Modal }
})
vi.mock('../src/renderer/src/components/DownloadProgressWidget', () => ({
  default: ({ isVisible }) => (isVisible ? <div data-testid="download-progress-widget" /> : null)
}))

let updateAvailable

const publishUpdate = async (info) => {
  await waitFor(() => expect(updateAvailable).toEqual(expect.any(Function)))
  await act(async () => {
    updateAvailable(info)
    await import('../src/renderer/src/components/UpdateModal')
  })
}

describe('UpdateNotification download preference', () => {
  beforeEach(() => {
    localStorage.setItem('autoUpdate', 'false')
    updateAvailable = null
    window.api = {
      getAppVersion: vi.fn().mockResolvedValue({ version: '1.0.0' }),
      onUpdateAvailable: vi.fn((callback) => {
        updateAvailable = callback
        return vi.fn()
      }),
      onUpdateAvailableMac: vi.fn(() => vi.fn()),
      onUpdateDownloadProgress: vi.fn(() => vi.fn()),
      onUpdateDownloaded: vi.fn(() => vi.fn()),
      downloadUpdate: vi.fn(),
      installUpdate: vi.fn()
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('asks before downloading when automatic downloads are disabled', async () => {
    render(<UpdateNotification />)
    await publishUpdate({ version: '2.0.0', autoDownloadEnabled: false })

    const dialog = await screen.findByRole('dialog', { name: 'New Version Available!' })
    expect(dialog).toHaveTextContent('A new version is available. Download it now or later.')
    expect(within(dialog).getByRole('button', { name: 'Download Now' })).toBeInTheDocument()
    expect(window.api.downloadUpdate).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Later' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.api.downloadUpdate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Download Now' }))
    const reopenedDialog = await screen.findByRole('dialog', { name: 'New Version Available!' })
    fireEvent.click(within(reopenedDialog).getByRole('button', { name: 'Download Now' }))

    expect(window.api.downloadUpdate).toHaveBeenCalledOnce()
    expect(await screen.findByTestId('download-progress-widget')).toBeInTheDocument()
  })

  it('shows download progress when main enables automatic downloading', async () => {
    render(<UpdateNotification />)
    await publishUpdate({ version: '2.0.0', autoDownloadEnabled: true })

    const dialog = await screen.findByRole('dialog', { name: 'New Version Available!' })
    expect(dialog).toHaveTextContent('Downloading update...')
    expect(within(dialog).queryByRole('button', { name: 'Download Now' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('download-progress-widget')).toBeInTheDocument()
    expect(window.api.downloadUpdate).not.toHaveBeenCalled()
  })
})
