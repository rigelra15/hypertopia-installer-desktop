import { describe, expect, it } from 'vitest'
import {
  MAX_ARCHIVE_APK_COUNT,
  MAX_ARCHIVE_ENTRY_COUNT,
  MAX_ARCHIVE_ENTRY_SIZE_BYTES,
  MAX_ARCHIVE_EXPANDED_SIZE_BYTES,
  validateArchiveEntries
} from '../src/shared/archiveSafety.js'

describe('validateArchiveEntries', () => {
  it('accepts safe file and directory entries and returns a checked expansion total', () => {
    const result = validateArchiveEntries([
      { file: 'game/', type: 'directory', size: 0 },
      { file: 'game/base.apk', type: 'file', size: 100 },
      { file: 'game/data.obb', type: 'file', size: 200 }
    ])

    expect(result.expandedSize).toBe(300)
    expect(result.apkCount).toBe(1)
    expect(result.entries.map(({ file }) => file)).toEqual([
      'game',
      'game/base.apk',
      'game/data.obb'
    ])
  })

  it('retains the original archive selector path after canonicalizing validation paths', () => {
    const [entry] = validateArchiveEntries([{ file: 'game\\base.apk', size: 10 }]).entries

    expect(entry).toMatchObject({
      archivePath: 'game\\base.apk',
      file: 'game/base.apk'
    })
  })

  it.each([
    '../outside.apk',
    '/absolute.apk',
    'C:\\outside.apk',
    '\\\\server\\share\\file',
    'bad\nname.apk'
  ])('rejects unsafe archive path %s', (file) => {
    expect(() => validateArchiveEntries([{ file, size: 10 }])).toThrow(/path/i)
  })

  it('rejects links, duplicate file names, and invalid sizes', () => {
    expect(() =>
      validateArchiveEntries([{ file: 'game/link.apk', type: 'symbolic link', size: 10 }])
    ).toThrow(/link/i)
    expect(() => validateArchiveEntries([{ file: 'game/fifo', type: 'fifo', size: 0 }])).toThrow(
      /unsupported entry type/i
    )
    expect(() =>
      validateArchiveEntries([
        { file: 'game/base.apk', size: 10 },
        { file: 'GAME/BASE.APK', size: 12 }
      ])
    ).toThrow(/duplicate/i)
    expect(() => validateArchiveEntries([{ file: 'game/file', size: -1 }])).toThrow(/size/i)
  })

  it('enforces the default entry and APK count caps', () => {
    const entries = Array.from({ length: MAX_ARCHIVE_ENTRY_COUNT + 1 }, (_, index) => ({
      file: `file-${index}`,
      size: 0
    }))
    const apks = Array.from({ length: MAX_ARCHIVE_APK_COUNT + 1 }, (_, index) => ({
      file: `game-${index}.apk`,
      size: 0
    }))

    expect(() => validateArchiveEntries(entries)).toThrow(/too many entries/i)
    expect(() => validateArchiveEntries(apks)).toThrow(/too many APK/i)
  })

  it('rejects entry count, APK count, single-file, and total expanded-size overages', () => {
    expect(() =>
      validateArchiveEntries(
        [
          { file: 'one', size: 0 },
          { file: 'two', size: 0 }
        ],
        {
          maxEntryCount: 1
        }
      )
    ).toThrow(/too many entries/i)
    expect(() =>
      validateArchiveEntries(
        [
          { file: 'one.apk', size: 1 },
          { file: 'two.apk', size: 1 }
        ],
        { maxApkCount: 1 }
      )
    ).toThrow(/too many APK/i)
    expect(() =>
      validateArchiveEntries([{ file: 'large', size: MAX_ARCHIVE_ENTRY_SIZE_BYTES + 1 }])
    ).toThrow(/entry exceeds/i)
    expect(() =>
      validateArchiveEntries(
        [
          { file: 'one', size: MAX_ARCHIVE_EXPANDED_SIZE_BYTES / 2 },
          { file: 'two', size: MAX_ARCHIVE_EXPANDED_SIZE_BYTES / 2 + 1 }
        ],
        { maxEntrySizeBytes: MAX_ARCHIVE_EXPANDED_SIZE_BYTES }
      )
    ).toThrow(/expanded-size/i)
  })
})
