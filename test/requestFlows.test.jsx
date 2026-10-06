import PropTypes from 'prop-types'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../src/renderer/src/utils/apiClient'
import { RequestGameModal } from '../src/renderer/src/components/RequestGameModal'
import { ReportGameDialog } from '../src/renderer/src/components/ReportGameDialog'
import { RequestGameList } from '../src/renderer/src/components/RequestGameList'
import { UpdateGameDialog } from '../src/renderer/src/components/UpdateGameDialog'

const mocks = vi.hoisted(() => ({
  auth: { user: { email: 'tester@example.com' } },
  toast: { success: vi.fn(), error: vi.fn() }
}))

vi.mock('../src/renderer/src/utils/apiClient', () => ({ apiFetch: vi.fn() }))
vi.mock('../src/renderer/src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.auth.user })
}))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key) => (key === 'cancel' ? 'Cancel' : key) })
}))
vi.mock('../src/renderer/src/hooks/useToast', () => ({ useToast: () => mocks.toast }))
vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('framer-motion', () => {
  const MotionElement = ({ children, ...props }) => {
    const domProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => !['initial', 'animate', 'exit', 'transition'].includes(key))
    )
    return <div {...domProps}>{children}</div>
  }
  MotionElement.propTypes = { children: PropTypes.node }

  const AnimatePresence = ({ children }) => children
  AnimatePresence.propTypes = { children: PropTypes.node }

  return {
    AnimatePresence,
    motion: { div: MotionElement, span: MotionElement }
  }
})
vi.mock('../src/renderer/src/components/ui/Modal', () => {
  const Modal = ({ isOpen, title, subtitle, children, footer }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
        {footer}
      </div>
    ) : null

  Modal.propTypes = {
    isOpen: PropTypes.bool,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    children: PropTypes.node,
    footer: PropTypes.node
  }

  return { Modal }
})

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body
})

const requestRecord = (overrides = {}) => ({
  gameTitle: 'Example Game',
  gameType: 'standalone',
  requestType: 'new',
  status: 'Pending',
  requestedBy: 'tester@example.com',
  timeRequested: '2026-09-01T00:00:00.000Z',
  ...overrides
})

const originalFetch = global.fetch

afterEach(() => {
  cleanup()
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

beforeEach(() => {
  mocks.auth.user = { email: 'tester@example.com' }
  mocks.toast.success.mockReset()
  mocks.toast.error.mockReset()
  apiFetch.mockReset()
  global.fetch = vi.fn().mockResolvedValue(jsonResponse({}))
})

describe('request forms', () => {
  it('offers only API-supported report types in the request form', async () => {
    render(<RequestGameModal isOpen onClose={vi.fn()} />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'report' } })

    const issueType = document.querySelector('select[name="report"]')
    expect(Array.from(issueType.options, (option) => option.value)).toEqual([
      '',
      'file_no_longer',
      'game_not_launching'
    ])
  })

  it('removes blank and repeated catalog versions before rendering options', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        'Example Game': { versions: ['v1.0', '', '', 'v1.0', 'v1.1'] }
      })
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<RequestGameModal isOpen onClose={vi.fn()} />)
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'report' } })
    fireEvent.change(await screen.findByPlaceholderText('Enter game title...'), {
      target: { value: 'Example Game' }
    })

    expect(await screen.findByText('Game found!')).toBeInTheDocument()
    const versions = document.querySelector('select[name="version"]')
    expect(Array.from(versions.options, (option) => option.value)).toEqual(['v1.0', 'v1.1'])
    expect(
      consoleError.mock.calls.some(([message]) =>
        message?.includes('Encountered two children with the same key')
      )
    ).toBe(false)
  })

  it('creates a request through the authenticated API and preserves notification mail', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ success: true }, true, 201))
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(<RequestGameModal isOpen onClose={onClose} onSuccess={onSuccess} />)
    fireEvent.change(await screen.findByPlaceholderText('Enter game title...'), {
      target: { value: 'Unpublished Example' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }))

    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('Request submitted successfully!'))
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/web/games/requests',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      gameTitle: 'Unpublished Example',
      gameType: 'standalone',
      requestType: 'new',
      reason: ''
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://email.hypertopia.web.id/api/request-game',
      expect.objectContaining({ method: 'POST' })
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('submits a game issue through the API and invokes the callback on success', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ success: true }, true, 201))
    const onClose = vi.fn()
    const onSubmit = vi.fn()

    render(
      <ReportGameDialog
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        gameTitle="Example Game"
        gameVersion="v1.2.3"
      />
    )
    const fileIssue = screen.getByRole('button', { name: /File No Longer Available/ })
    fireEvent.click(fileIssue)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('Report submitted successfully!'))
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/web/games/requests',
      expect.objectContaining({ method: 'POST' })
    )
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      gameTitle: 'Example Game',
      gameType: 'standalone',
      requestType: 'report',
      report: 'file_no_longer',
      version: 'v1.2.3'
    })
    expect(onSubmit).toHaveBeenCalledWith('file_no_longer')
    expect(onClose).toHaveBeenCalled()
  })

  it('keeps the request form open when the request API rejects a submission', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ error: 'Duplicate request' }, false, 409))
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<RequestGameModal isOpen onClose={onClose} onSuccess={onSuccess} />)
    fireEvent.change(await screen.findByPlaceholderText('Enter game title...'), {
      target: { value: 'Unpublished Example' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }))

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('Failed to submit request'))
    expect(screen.getByDisplayValue('Unpublished Example')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('keeps a passive community report read-only when the report API rejects it', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ error: 'Conflict' }, false, 409))
    const onClose = vi.fn()
    const onSubmit = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ReportGameDialog
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        gameTitle="Example Game"
        gameVersion="v1.2.3"
      />
    )

    const issueChoices = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'))
    expect(issueChoices.map((button) => button.textContent.trim())).toEqual([
      'File No Longer Available / Link Error',
      'Game Not Launching'
    ])

    fireEvent.click(issueChoices[1])
    expect(screen.getByRole('status')).toHaveTextContent(/community report only/i)
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('Failed to submit report'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  it('loads matching update history and blocks normalized duplicate versions', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({
        requests: {
          target: {
            gameTitle: 'Example Game',
            requestType: 'update',
            previousVersion: 'v1.0',
            newVersion: 'v1.1',
            timeRequested: '2026-09-01T00:00:00.000Z',
            status: 'Pending'
          },
          unrelated: {
            gameTitle: 'Another Game',
            requestType: 'update',
            previousVersion: 'v9.8',
            newVersion: 'v9.9'
          }
        }
      })
    )

    render(
      <UpdateGameDialog
        isOpen
        onClose={vi.fn()}
        gameTitle="Example Game"
        currentVersion="v1.1"
      />
    )

    expect(await screen.findByText('Existing Requests')).toBeInTheDocument()
    expect(screen.getByText('v1.0')).toBeInTheDocument()
    expect(screen.queryByText('v9.9')).not.toBeInTheDocument()

    const newVersion = screen.getByLabelText(/New Version/)
    fireEvent.change(newVersion, { target: { value: '1.1' } })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The new version must differ from the previous version.'
    )
    expect(screen.getByRole('button', { name: 'Send Request' })).toBeDisabled()

    fireEvent.change(newVersion, { target: { value: 'v1.2' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Request' })).toBeEnabled()
  })

  it('prefills and saves an existing request through the edit UI', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ success: true }))
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const gameData = {
      id: 'Example Game',
      gameTitle: 'Example Game',
      gameType: 'standalone',
      requestType: 'update',
      previousVersion: 'v1.0',
      newVersion: 'v1.1',
      reason: 'New release'
    }

    render(
      <RequestGameModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        gameData={gameData}
      />
    )

    expect(await screen.findByDisplayValue('v1.1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() =>
      expect(mocks.toast.success).toHaveBeenCalledWith('Request updated successfully!')
    )
    expect(onSuccess).toHaveBeenCalled()
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/web/games/requests/Example%20Game',
      expect.objectContaining({ method: 'PUT' })
    )
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({
      gameTitle: 'Example Game',
      requestType: 'update',
      previousVersion: 'v1.0',
      newVersion: 'v1.1',
      reason: 'New release'
    })
    expect(onClose).toHaveBeenCalled()
  })

})

describe('request list permissions and status updates', () => {
  it('reflects an admin status change after the API reloads requests', async () => {
    let status = 'Pending'
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/api/v1/web/games/requests' && (!options.method || options.method === 'GET')) {
        return jsonResponse({
          requests: {
            'Example Game': requestRecord({ status, reason: 'Keep this note' })
          }
        })
      }
      if (path.endsWith('/status') && options.method === 'PATCH') {
        status = JSON.parse(options.body).status
        return jsonResponse({ success: true })
      }
      throw new Error(`Unexpected API request: ${path}`)
    })
    mocks.auth.user = { email: 'hypertopiaid@gmail.com' }

    render(<RequestGameList />)
    expect(await screen.findByText('Example Game')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Pending/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument())
    expect(mocks.toast.success).toHaveBeenCalledWith('Status updated!')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/web/games/requests/Example%20Game/status',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'Done', reason: 'Keep this note' })
      })
    )
  })

  it('deletes an admin request through the canonical API and reloads the list', async () => {
    let exists = true
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/api/v1/web/games/requests' && (!options.method || options.method === 'GET')) {
        return jsonResponse({
          requests: exists ? { 'Example Game': requestRecord() } : {}
        })
      }
      if (path === '/api/v1/web/games/requests/Example%20Game' && options.method === 'DELETE') {
        exists = false
        return jsonResponse({ success: true })
      }
      throw new Error(`Unexpected API request: ${path}`)
    })
    mocks.auth.user = { email: 'hypertopiaid@gmail.com' }
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<RequestGameList />)
    expect(await screen.findByText('Example Game')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('Request deleted!'))
    await waitFor(() => expect(screen.queryByText('Example Game')).not.toBeInTheDocument())
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/v1/web/games/requests/Example%20Game',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('allows an owner to edit their request but not delete it', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({ requests: { 'Example Game': requestRecord({ requestedBy: 'Owner@example.com' }) } })
    )
    mocks.auth.user = { email: 'owner@example.com' }

    render(<RequestGameList onEdit={vi.fn()} />)
    expect(await screen.findByText('Example Game')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('uses request database keys when stored records contain blank ids', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({
        requests: {
          first: requestRecord({ id: '', gameTitle: 'First Game' }),
          second: requestRecord({ id: '', gameTitle: 'Second Game' })
        }
      })
    )
    mocks.auth.user = { email: 'hypertopiaid@gmail.com' }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<RequestGameList />)
    expect(await screen.findByText('First Game')).toBeInTheDocument()
    expect(screen.getByText('Second Game')).toBeInTheDocument()
    expect(
      consoleError.mock.calls.some(([message]) =>
        message?.includes('Encountered two children with the same key')
      )
    ).toBe(false)
  })

  it('does not expose status, edit, or delete actions for passive reports', async () => {
    apiFetch.mockResolvedValue(
      jsonResponse({
        requests: {
          'Example Game': requestRecord({
            requestType: 'report',
            report: 'game_not_launching',
            status: undefined
          })
        }
      })
    )
    mocks.auth.user = { email: 'hypertopiaid@gmail.com' }

    render(<RequestGameList onEdit={vi.fn()} />)
    expect(await screen.findByText('Example Game')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Unknown' }))
    expect(screen.queryByRole('button', { name: 'In Process' })).not.toBeInTheDocument()
  })
})
