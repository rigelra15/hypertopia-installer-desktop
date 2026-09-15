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
    expect(screen.getByAltText('Rating IARC 18+')).toBeInTheDocument()
  })

  it('renders Quest support labels without repeating the Meta brand', () => {
    render(
      <StandaloneGameMetaOverview
        game={game}
        questSupport={[
          { key: 'supportMetaQuest2', label: 'Quest 2', isSelected: false },
          { key: 'supportMetaQuest3', label: 'Quest 3', isSelected: true }
        ]}
      />
    )

    expect(screen.getByText('Quest 2')).toBeInTheDocument()
    expect(screen.getByText('Quest 3')).toBeInTheDocument()
    expect(screen.queryByText('Meta Quest 2', { exact: true })).not.toBeInTheDocument()
  })
})
