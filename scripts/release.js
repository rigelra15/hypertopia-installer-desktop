const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Config
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json')
const DRY_RUN = process.argv.includes('--dry-run')

// Parse custom suffix from CLI args (e.g. "npm run release rev1" => suffix = "rev1")
// Skip arguments that start with "--" (those are flags like --dry-run)
const customSuffix = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || ''

function run(command) {
  console.log(`> ${command}`)
  if (!DRY_RUN) {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'inherit' })
    } catch {
      console.error(`Command failed: ${command}`)
      process.exit(1)
    }
  }
}

function runOutput(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    console.error(`Command failed: ${command}`)
    process.exit(1)
  }
}

// Check for uncommitted changes
console.log('Checking for uncommitted changes...')
const status = runOutput('git status --porcelain')
if (status && !status.includes('package.json')) {
  console.error('ERROR: You have uncommitted changes. Please commit your work first!')
  console.error(status)
  process.exit(1)
}

// 1. Get current commit count
console.log('Calculating new version...')
const commitCount = runOutput('git rev-list --count HEAD')

// 2. Get last tag to find commits since last release
let lastTag = ''
try {
  lastTag = runOutput('git describe --tags --abbrev=0 2>/dev/null || echo ""')
} catch {
  lastTag = ''
}

// 3. Parse commits since last tag to detect if it's a fix-only release
console.log('Analyzing commits for release type...')
let hasFeatures = false
let hasFixes = false

const commitRange = lastTag ? `${lastTag}..HEAD` : 'HEAD'
const commits = runOutput(`git log ${commitRange} --pretty=format:"%s"`)

if (commits) {
  const commitLines = commits.split('\n').filter((line) => line.trim())
  commitLines.forEach((commit) => {
    if (commit.startsWith('feat')) {
      hasFeatures = true
    }
    if (commit.startsWith('fix')) {
      hasFixes = true
    }
  })
}

// 4. Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'))
const currentVersion = packageJson.version

let newVersion
// Check if the argument is a full version string (e.g. "v1.0.213-rev1" or "1.0.213-rev1")
const isManualVersion = customSuffix && (customSuffix.includes('.') || customSuffix.startsWith('v'))
if (isManualVersion) {
  // Manual version mode: use the provided version as-is (strip leading 'v' if present)
  newVersion = customSuffix.startsWith('v') ? customSuffix.slice(1) : customSuffix
  console.log(`Manual version:  ${newVersion}`)
} else if (customSuffix === 'rev') {
  // Rev mode: auto-increment rev number
  // e.g. "1.0.213" => "1.0.213-rev1", "1.0.213-rev1" => "1.0.213-rev2"
  const revMatch = currentVersion.match(/^(.+)-rev(\d+)$/)
  if (revMatch) {
    const baseVersion = revMatch[1]
    const nextRev = parseInt(revMatch[2], 10) + 1
    newVersion = `${baseVersion}-rev${nextRev}`
  } else {
    const baseVersion = currentVersion.replace(/-.*$/, '')
    newVersion = `${baseVersion}-rev1`
  }
  console.log(`Rev mode:        auto-increment`)
} else if (customSuffix) {
  // Other custom suffix: keep current base version, append suffix
  const baseVersion = currentVersion.replace(/-.*$/, '')
  newVersion = `${baseVersion}-${customSuffix}`
  console.log(`Custom suffix:   -${customSuffix}`)
} else {
  // Normal mode: bump patch version based on commit count, strip any suffix
  const releaseType = hasFeatures ? 'release' : hasFixes ? 'fix-only' : 'release'
  const suffix = releaseType === 'fix-only' ? '-fix' : ''
  const cleanVersion = currentVersion.replace(/-.*$/, '')
  const [major, minor] = cleanVersion.split('.')
  newVersion = `${major}.${minor}.${commitCount}${suffix}`
  console.log(`Release Type:    ${releaseType}`)
}

const tagName = `v${newVersion}`

console.log(`Current Version: ${currentVersion}`)
console.log(`New Version:     ${newVersion}`)
console.log(`Tag Name:        ${tagName}`)

if (DRY_RUN) {
  console.log('[DRY RUN] Skipping actual changes.')
  process.exit(0)
}

// 3. Update package.json
console.log('Updating package.json...')
packageJson.version = newVersion
fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n')

// 4. Amend the last commit to include version bump (no new commit message polluting changelog)
console.log('Amending last commit with version bump...')
try {
  run(`git add package.json`)
  run(`git commit --amend --no-edit`)
  run(`git tag ${tagName}`)

  // 5. Push (force-with-lease because we amended)
  console.log('Pushing changes...')
  run(`git push origin HEAD --force-with-lease`)
  run(`git push origin ${tagName}`)

  console.log(`\n✅ SUCCESS! Released version ${newVersion}`)
  console.log(`\n📝 Your last commit now includes the version bump.`)
  console.log(`   The changelog will show your actual commit message, not "chore: bump version"!`)
} catch (e) {
  console.error('Failed versioning process:', e)
}
