const fs = require('node:fs')
const path = require('node:path')

const metadataNames = {
  win: 'latest.yml',
  mac: 'latest-mac.yml',
  linux: 'latest-linux.yml'
}

const platform = process.argv[2]
const metadataName = metadataNames[platform]

if (!metadataName) {
  console.error('Usage: node scripts/verify-update-metadata.js <win|mac|linux>')
  process.exit(1)
}

const metadataPath = path.join('dist', metadataName)
if (!fs.existsSync(metadataPath)) {
  console.error(`Update metadata not found: ${metadataPath}`)
  process.exit(1)
}

const metadata = fs.readFileSync(metadataPath, 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const versionMatch = metadata.match(/^version:\s*(.+)$/m)
const metadataVersion = versionMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '')

if (metadataVersion !== packageJson.version) {
  console.error(
    `Update metadata version mismatch: ${metadataVersion || '(missing)'} vs ${packageJson.version}`
  )
  process.exit(1)
}

const artifactNames = [...metadata.matchAll(/^\s+- url:\s*(.+)$/gm)].map(([, value]) =>
  value.trim().replace(/^['"]|['"]$/g, '')
)

if (artifactNames.length === 0) {
  console.error(`No artifacts listed in ${metadataPath}`)
  process.exit(1)
}

const missingArtifacts = artifactNames.filter((artifactName) => {
  const localPath = path.join('dist', decodeURIComponent(artifactName))
  return !fs.existsSync(localPath)
})

if (missingArtifacts.length > 0) {
  console.error(`Update metadata points to missing artifacts in ${metadataPath}:`)
  missingArtifacts.forEach((artifactName) => console.error(`- dist/${artifactName}`))
  process.exit(1)
}

console.log(`${metadataName} verified for ${platform}: v${metadataVersion}`)
artifactNames.forEach((artifactName) => console.log(`- dist/${artifactName}`))
