function normalizeArchivePath(value) {
  const archivePath = String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
  const parts = archivePath.split('/').filter(Boolean)

  if (
    !archivePath ||
    archivePath.startsWith('/') ||
    /^[A-Za-z]:\//.test(archivePath) ||
    parts.some((part) => part === '..')
  ) {
    return null
  }

  return parts.filter((part) => part !== '.').join('/') || null
}

function isSplitApkName(fileName) {
  return /^(?:split[_-].*|config[._-].*)\.apk$/i.test(fileName)
}

function getDirectory(archivePath) {
  const separatorIndex = archivePath.lastIndexOf('/')
  return separatorIndex < 0 ? '' : archivePath.slice(0, separatorIndex)
}

function getSplitGroupKey(entry) {
  if (!entry.packageName || entry.versionCode === null || entry.versionCode === '') return null
  return `${getDirectory(entry.path)}\0${entry.packageName}\0${entry.versionCode}`
}

function comparePaths(left, right) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0
}

function createOption(entries, { isSplit = false, isSplitPart = false } = {}) {
  const apkPaths = entries.map((entry) => entry.path)
  const firstEntry = entries[0]

  return {
    id: firstEntry.path,
    name: firstEntry.path,
    apkName: firstEntry.path.split('/').at(-1),
    apkPaths,
    apkCount: entries.length,
    size: entries.reduce((total, entry) => total + entry.size, 0),
    packageName: firstEntry.packageName,
    versionCode: firstEntry.versionCode,
    versionName: firstEntry.versionName,
    splitName: firstEntry.splitName,
    isSplit,
    isSplitPart,
    installable: !isSplitPart
  }
}

export function buildApkInstallOptions(entries) {
  const apkEntriesByPath = new Map()

  for (const entry of entries) {
    const archivePath = normalizeArchivePath(entry?.file ?? entry?.path ?? entry?.relativePath)
    if (!archivePath || !archivePath.toLowerCase().endsWith('.apk')) continue

    const size = Number(entry.size)
    const metadata = entry.metadata || null
    const splitName = typeof metadata?.splitName === 'string' ? metadata.splitName.trim() : ''
    const isSplitPart =
      Boolean(splitName) || (!metadata && isSplitApkName(archivePath.split('/').at(-1)))
    apkEntriesByPath.set(archivePath, {
      path: archivePath,
      size: Number.isFinite(size) && size > 0 ? size : 0,
      packageName:
        typeof metadata?.packageName === 'string' ? metadata.packageName.trim() || null : null,
      versionCode:
        metadata?.versionCode === undefined || metadata?.versionCode === null
          ? null
          : String(metadata.versionCode),
      splitName: splitName || null,
      versionName:
        typeof metadata?.versionName === 'string' ? metadata.versionName.trim() || null : null,
      isSplitPart
    })
  }

  const splitGroups = new Map()
  for (const entry of apkEntriesByPath.values()) {
    if (!entry.isSplitPart || !entry.splitName) continue
    const key = getSplitGroupKey(entry)
    if (!key) continue
    const parts = splitGroups.get(key) || []
    parts.push(entry)
    splitGroups.set(key, parts)
  }

  const groupedPaths = new Set()
  const options = []

  for (const [key, splitApks] of splitGroups) {
    const [directory, packageName, versionCode] = key.split('\0')
    const baseApks = [...apkEntriesByPath.values()].filter(
      (entry) =>
        !entry.isSplitPart &&
        getDirectory(entry.path) === directory &&
        entry.packageName === packageName &&
        entry.versionCode === versionCode
    )
    const splitNames = new Set(splitApks.map((entry) => entry.splitName))

    if (baseApks.length !== 1 || splitNames.size !== splitApks.length) continue

    const groupedEntries = [baseApks[0], ...splitApks.sort(comparePaths)]
    groupedEntries.forEach((entry) => groupedPaths.add(entry.path))
    options.push(createOption(groupedEntries, { isSplit: true }))
  }

  for (const entry of apkEntriesByPath.values()) {
    if (groupedPaths.has(entry.path)) continue
    options.push(
      createOption([entry], {
        isSplitPart: entry.isSplitPart
      })
    )
  }

  return options.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
}

export function getSelectedApkInstallOption(options, selectedId) {
  if (!Array.isArray(options) || options.length === 0) return null
  if (options.length === 1) return options[0]
  return options.find((option) => option.id === selectedId) || null
}

export function requireApkInstallOption(options, selectedId) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new Error('No APK found to install.')
  }

  if (options.length > 1 && !selectedId) {
    throw new Error('Multiple APK packages found. Select one before installing.')
  }

  const option = getSelectedApkInstallOption(options, selectedId)
  if (!option) {
    throw new Error('Selected APK option is no longer available. Scan the archive again.')
  }

  if (!option.installable) {
    throw new Error('Incomplete split APK set: the base APK is missing.')
  }

  return option
}
