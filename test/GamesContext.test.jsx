import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GamesProvider, useGames } from '../src/renderer/src/contexts/GamesContext'

const originalFetch = global.fetch

const wrapper = ({ children }) => <GamesProvider>{children}</GamesProvider>

afterEach(() => {
  cleanup()
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('GamesContext identity mapping', () => {
  it('preserves each catalog key when game data contains a blank id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          'First Game': { id: '', gameTitle: 'First Game' },
          'Second Game': { id: '', gameTitle: 'Second Game' }
        },
        pagination: { totalItems: 2, totalPages: 1 }
      })
    })

    const { result } = renderHook(() => useGames(), { wrapper })
    let response
    await act(async () => {
      response = await result.current.fetchGames({ page: 1, limit: 10 })
    })

    expect(response.games.map((game) => game.id)).toEqual(['First Game', 'Second Game'])
  })
})
