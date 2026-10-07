import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsModal } from '../src/renderer/src/components/SettingsModal'

const toastError = vi.hoisted(() => vi.fn())

vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key) =>
      ({
        update_auto_download_title: 'Automatically download updates',
        update_auto_download_description: 'Ask before downloading updates when disabled.',
        update_preference_save_failed: 'Could not save the update preference. Try again.',
        settings_title: 'Settings'
      })[key] || key
  })
}))
vi.mock('../src/renderer/src/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() })
}))
vi.mock('../src/renderer/src/hooks/useToast', () => ({
  useToast: () => ({ info: vi.fn(), error: toastError })
}))
vi.mock('../src/renderer/src/components/ChangelogModal', () => ({ default: () => null }))
vi.mock('../src/renderer/src/components/ui/Modal', () => {
  const Modal = ({ isOpen, title, children }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null
  Modal.propTypes = {
    isOpen: PropTypes.bool,
    title: PropTypes.string,
    children: PropTypes.node
  }
  return { Modal }
})

describe('SettingsModal update preference', () => {
  beforeEach(() => {
    localStorage.setItem('autoUpdate', 'false')
    window.api = {
      getAutoDownload: vi.fn().mockResolvedValue(false),
      setAutoDownload: vi.fn().mockResolvedValue(true),
      getLatestRelease: vi.fn().mockResolvedValue({ version: '1.0.0' })
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('persists the selected automatic-download setting', async () => {
    render(<SettingsModal isOpen onClose={vi.fn()} appVersion={{ version: '1.0.0' }} />)

    const toggle = await screen.findByRole('checkbox', {
      name: /Automatically download updates/
    })
    await waitFor(() => expect(window.api.getAutoDownload).toHaveBeenCalledOnce())
    expect(toggle).not.toBeChecked()

    fireEvent.click(toggle)

    await waitFor(() => expect(window.api.setAutoDownload).toHaveBeenCalledWith(true))
    expect(toggle).toBeChecked()
    expect(localStorage.getItem('autoUpdate')).toBe('true')
  })

  it('reverts the toggle when saving the preference fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.api.setAutoDownload.mockRejectedValue(new Error('settings store unavailable'))
    render(<SettingsModal isOpen onClose={vi.fn()} appVersion={{ version: '1.0.0' }} />)

    const toggle = await screen.findByRole('checkbox', {
      name: /Automatically download updates/
    })
    fireEvent.click(toggle)

    await waitFor(() => expect(toastError).toHaveBeenCalledOnce())
    expect(toggle).not.toBeChecked()
    expect(localStorage.getItem('autoUpdate')).toBe('false')
  })
})
