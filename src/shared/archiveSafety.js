export const MAX_ARCHIVE_ENTRY_COUNT = 50000
export const MAX_ARCHIVE_APK_COUNT = 512
export const MAX_ARCHIVE_ENTRY_SIZE_BYTES = 16 * 1024 ** 3
export const MAX_ARCHIVE_EXPANDED_SIZE_BYTES = 32 * 1024 ** 3
export const MAX_ARCHIVE_LISTING_BYTES = 64 * 1024 ** 2
export const MAX_ARCHIVE_PATH_DEPTH = 128
export const MAX_ARCHIVE_PATH_BYTES = 4096

function getEntryType(entry) {
  return String(entry?.type || entry?.kind || '')
    .trim()
    .toLowerCase()
}

function isDirectoryEntry(entry) {
  return (
    entry?.isDirectory === true ||
    getEntryType(entry) === 'directory' ||
    getEntryType(entry) === 'dir' ||
    String(entry?.attributes || '')
      .toUpperCase()
      .includes('D')
  )
}

function isLinkEntry(entry) {
  const type = getEntryType(entry)
  return (
    entry?.isLink === true ||
    type.includes('link') ||
    type.includes('symbolic') ||
    String(entry?.attributes || '')
      .toUpperCase()
      .includes('L')
  )
}

function hasControlCharacter(value) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

function normalizeSafeArchivePath(value, isDirectory) {
  const input = String(value || '').replace(/\\/g, '/')
  if (!input || hasControlCharacter(input) || input.startsWith('/') || /^[A-Za-z]:/.test(input)) {
    throw new Error('Archive contains an absolute or invalid path.')
  }

  const parts = input.split('/').filter((part) => part && part !== '.')
  if (
    parts.some(
      (part) =>
        part === '..' ||
        part.includes(':') ||
        part.includes('*') ||
        part.includes('?') ||
        part.includes('[') ||
        part.includes(']') ||
        part.startsWith('-') ||
        /[. ]$/.test(part)
    )
  ) {
    throw new Error('Archive contains a path that escapes or cannot be extracted safely.')
  }
  if (parts.length === 0) {
    if (isDirectory) return null
    throw new Error('Archive contains a file with an empty path.')
  }
  if (
    parts.length > MAX_ARCHIVE_PATH_DEPTH ||
    Buffer.byteLength(parts.join('/'), 'utf8') > MAX_ARCHIVE_PATH_BYTES
  ) {
    throw new Error('Archive contains an excessively long path.')
  }

  for (const part of parts) {
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part)) {
      throw new Error('Archive contains a reserved filesystem path.')
    }
  }

  return parts.join('/')
}

export function validateArchiveEntries(entries, limits = {}) {
  if (!Array.isArray(entries)) throw new Error('Archive entry listing is invalid.')

  const maxEntryCount = limits.maxEntryCount ?? MAX_ARCHIVE_ENTRY_COUNT
  const maxApkCount = limits.maxApkCount ?? MAX_ARCHIVE_APK_COUNT
  const maxEntrySize = limits.maxEntrySizeBytes ?? MAX_ARCHIVE_ENTRY_SIZE_BYTES
  const maxExpandedSize = limits.maxExpandedSizeBytes ?? MAX_ARCHIVE_EXPANDED_SIZE_BYTES

  if (entries.length > maxEntryCount) {
    throw new Error(`Archive contains too many entries (limit: ${maxEntryCount}).`)
  }

  const safeEntries = []
  const seenPaths = new Map()
  let apkCount = 0
  let expandedSize = 0

  for (const entry of entries) {
    const isDirectory = isDirectoryEntry(entry)
    if (isLinkEntry(entry)) {
      throw new Error('Archive contains a symbolic or hard link; links are not supported.')
    }
    const type = getEntryType(entry)
    if (type && !['file', 'regular file', 'directory', 'dir', 'folder'].includes(type)) {
      throw new Error(`Archive contains an unsupported entry type: ${type}`)
    }

    const archivePath = String(entry?.file ?? entry?.path ?? '')
    const file = normalizeSafeArchivePath(archivePath, isDirectory)

    const normalizedKey = file.toLowerCase()
    const previousEntryIsDirectory = seenPaths.get(normalizedKey)
    if (previousEntryIsDirectory !== undefined && (!isDirectory || !previousEntryIsDirectory)) {
      throw new Error(`Archive contains duplicate file paths: ${file}`)
    }
    seenPaths.set(normalizedKey, isDirectory)

    const size = Number(entry?.size ?? 0)
    if (!Number.isSafeInteger(size) || size < 0 || (isDirectory && size !== 0)) {
      throw new Error(`Archive entry has an invalid size: ${file}`)
    }
    if (size > maxEntrySize) {
      throw new Error(`Archive entry exceeds the expanded-size limit: ${file}`)
    }
    if (!isDirectory) {
      expandedSize += size
      if (!Number.isSafeInteger(expandedSize) || expandedSize > maxExpandedSize) {
        throw new Error(`Archive exceeds the expanded-size limit (${maxExpandedSize} bytes).`)
      }
      if (file.toLowerCase().endsWith('.apk')) apkCount++
    }

    safeEntries.push({ ...entry, archivePath, file, size, isDirectory })
  }

  if (apkCount > maxApkCount) {
    throw new Error(`Archive contains too many APK files (limit: ${maxApkCount}).`)
  }

  return { entries: safeEntries, expandedSize, apkCount }
}
