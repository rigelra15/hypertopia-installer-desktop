import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StandaloneGameMetaOverview, {
  StandaloneGameMetaIdentity
} from '../src/renderer/src/components/StandaloneGameMetaOverview'

const game = {
  gameTitle: 'Click Clack Mixed Reality',
  metaStore: {
    description: 'A mixed reality game.',
    rating: { value: 3.1, count: 7 },
    publisher: 'Example Publisher',
    categories: ['Action'],
    ageRating: '18+',
    releaseDate: '2025-01-02',
    spaceRequired: '534.2 MB',
    platforms: ['Quest 2', 'Quest 3']
  }
}

describe('StandaloneGameMetaOverview', () => {
  it('renders store rating, description, and technical metadata', () => {
    render(
      <>
        <StandaloneGameMetaIdentity game={game} />
        <StandaloneGameMetaOverview game={game} />
      </>
    )

    expect(screen.getByText('3.1 (7 ratings)')).toBeInTheDocument()
    expect(screen.getByText('A mixed reality game.')).toBeInTheDocument()
    expect(screen.getByText('534.2 MB')).toBeInTheDocument()
    expect(screen.getByText('18+')).toBeInTheDocument()
  })
})
