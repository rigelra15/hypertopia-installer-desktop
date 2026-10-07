import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SetupModal } from '../src/renderer/src/components/SetupModal'

vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) =>
      ({
        update_auto_download_title: 'Automatically download updates',
        update_auto_download_description: 'Ask before downloading updates when disabled.'
      })[key] || key
  })
}))
vi.mock('../src/renderer/src/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() })
}))
vi.mock('../src/renderer/src/components/ui/Modal', () => {
  const Modal = ({ isOpen, title, subtitle, footer, children }) =>
    isOpen ? (
      <section role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
        {footer}
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

describe('SetupModal update preference', () => {
  beforeEach(() => {
    localStorage.removeItem('autoUpdate')
    window.api = {
      selectExtractFolder: vi.fn().mockResolvedValue('/tmp/Quest'),
      getDiskSpace: vi
        .fn()
        .mockResolvedValue({ free: '20 GB', total: '100 GB', used: '80 GB', percent: 80 }),
      ensureExtractFolder: vi.fn().mockResolvedValue({ success: true }),
      setAutoDownload: vi.fn().mockResolvedValue(true),
      storeRead: vi.fn().mockResolvedValue({}),
      storeWrite: vi.fn().mockResolvedValue({ ok: true })
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('defaults automatic downloads off and saves the setup choice', async () => {
    const onComplete = vi.fn()
    render(<SetupModal isOpen onComplete={onComplete} />)

    const toggle = screen.getByRole('checkbox', { name: /Automatically download updates/ })
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)

    fireEvent.click(screen.getByRole('button', { name: 'setup_browse' }))
    expect(await screen.findByText('/tmp/Quest')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'setup_continue' }))

    await waitFor(() => expect(window.api.setAutoDownload).toHaveBeenCalledWith(true))
    expect(localStorage.getItem('autoUpdate')).toBe('true')
    expect(onComplete).toHaveBeenCalledWith('/tmp/Quest')
  })
})
