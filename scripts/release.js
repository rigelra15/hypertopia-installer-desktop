const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Config
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json')
const DRY_RUN = process.argv.includes('--dry-run')

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

// 2. Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'))
const [major, minor] = packageJson.version.split('.')

const newVersion = `${major}.${minor}.${commitCount}`
const tagName = `v${newVersion}`

console.log(`Current Version: ${packageJson.version}`)
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
