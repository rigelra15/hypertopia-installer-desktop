const fs = require('fs')
const path = require('path')

const SOURCE_ROOT = path.join(__dirname, '../src/renderer/src')
const OUTPUT_FILE = path.join(SOURCE_ROOT, 'utils/iconSubset.js')
const ICON_ATTR_PATTERN = /icon=\{?['"]([^'"]+)['"]\}?/g
const IGNORE_DIRS = new Set(['node_modules', 'out', '.git'])

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
    } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function collectIcons() {
  const iconsByPrefix = new Map()

  for (const file of walk(SOURCE_ROOT)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(ICON_ATTR_PATTERN)) {
      const icon = match[1]
      const split = icon.indexOf(':')
      if (split <= 0) continue
      const prefix = icon.slice(0, split)
      const name = icon.slice(split + 1)
      if (!iconsByPrefix.has(prefix)) iconsByPrefix.set(prefix, new Set())
      iconsByPrefix.get(prefix).add(name)
    }
  }

  return [...iconsByPrefix.entries()]
    .map(([prefix, names]) => [prefix, [...names].sort()])
    .sort(([a], [b]) => a.localeCompare(b))
}

async function fetchCollection(prefix, names) {
  const icons = {}
  const aliases = {}
  let info = null
  let width
  let height

  for (let index = 0; index < names.length; index += 100) {
    const chunk = names.slice(index, index + 100)
    const url = `https://api.iconify.design/${prefix}.json?icons=${encodeURIComponent(chunk.join(','))}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${prefix}: ${response.status}`)
    }

    const data = await response.json()
    info ||= data.info
    width ||= data.width
    height ||= data.height
    Object.assign(icons, data.icons || {})
    Object.assign(aliases, data.aliases || {})
  }

  const collection = { prefix }
  if (info) collection.info = info
  if (width) collection.width = width
  if (height) collection.height = height
  collection.icons = icons
  if (Object.keys(aliases).length > 0) collection.aliases = aliases
  return collection
}

async function main() {
  const requestedIcons = collectIcons()
  const collections = []

  for (const [prefix, names] of requestedIcons) {
    console.log(`Fetching ${prefix}: ${names.length} icon(s)`)
    collections.push(await fetchCollection(prefix, names))
  }

  const iconCount = collections.reduce(
    (total, collection) => total + Object.keys(collection.icons || {}).length,
    0
  )
  const content = `import { addCollection } from '@iconify/react'\n\nconst iconCollections = ${JSON.stringify(collections, null, 2)}\n\nfor (const collection of iconCollections) {\n  addCollection(collection)\n}\n\nexport const offlineIconCount = ${iconCount}\n`

  fs.writeFileSync(OUTPUT_FILE, content)
  console.log(`Generated ${path.relative(process.cwd(), OUTPUT_FILE)} (${iconCount} icons)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
