import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchStandaloneGame } = vi.hoisted(() => ({
  fetchStandaloneGame: vi.fn()
}))

vi.mock('../src/renderer/src/contexts/GamesContext', () => ({
  useGames: () => ({ fetchStandaloneGame })
}))

vi.mock('../src/renderer/src/components/GameDetailModal', () => ({
  default: ({ game }) => <div data-testid="page-detail-content">{game.gameTitle}</div>
}))

import StandaloneGameDetailPage from '../src/renderer/src/components/StandaloneGameDetailPage'

const listGame = { id: 'click-clack', gameTitle: 'List title' }
const fullGame = {
  id: 'click-clack',
  gameTitle: 'Click Clack Mixed Reality',
  metaStore: { description: 'Full page description' }
}

describe('StandaloneGameDetailPage', () => {
  beforeEach(() => {
    fetchStandaloneGame.mockReset()
  })

  it('loads full detail instead of rendering the list object', async () => {
    fetchStandaloneGame.mockResolvedValue(fullGame)
    const onBack = vi.fn()

    render(<StandaloneGameDetailPage game={listGame} onBack={onBack} />)

    expect(screen.getByTestId('standalone-detail-loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('page-detail-content')).toHaveTextContent(fullGame.gameTitle))
    expect(screen.getByTestId('standalone-detail-page')).toHaveClass('standalone-detail-page')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(fullGame.gameTitle)
    expect(fetchStandaloneGame).toHaveBeenCalledWith('click-clack')

    fireEvent.click(screen.getByRole('button', { name: /kembali ke game standalone/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('shows an error and retries the detail fetch', async () => {
    fetchStandaloneGame.mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(fullGame)
    render(<StandaloneGameDetailPage game={listGame} onBack={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('standalone-detail-error')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    await waitFor(() => expect(screen.getByTestId('page-detail-content')).toBeInTheDocument())
    expect(fetchStandaloneGame).toHaveBeenCalledTimes(2)
  })
})
