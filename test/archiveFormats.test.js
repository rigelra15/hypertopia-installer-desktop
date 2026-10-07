import { describe, expect, it } from 'vitest'
import { getArchiveFormat } from '../src/shared/archiveFormats'

describe('getArchiveFormat', () => {
  it.each([
    ['game.zip', '7z'],
    ['game.7z', '7z'],
    ['game.RAR', 'rar'],
    ['C:\\Games\\Quest\\game.7z', '7z'],
    ['/games/game.zip', '7z']
  ])('routes %s to the correct extractor', (filePath, expectedFormat) => {
    expect(getArchiveFormat(filePath)).toBe(expectedFormat)
  })

  it.each(['game.apk', 'game.zip.bak', '', null])(
    'rejects unsupported archive path %s',
    (filePath) => {
      expect(getArchiveFormat(filePath)).toBeNull()
    }
  )
})
