const fs = require('node:fs')
const path = require('node:path')

const [outputDir = 'dist/win-unpacked', architecture = 'x64'] = process.argv.slice(2)
const resourceRoot = path.join(outputDir, 'resources')
const expectedPaths = [
  path.join(resourceRoot, '7zip-bin', 'win', architecture, '7za.exe'),
  path.join(
    resourceRoot,
    'app.asar.unpacked',
    'node_modules',
    '7zip-bin',
    'win',
    architecture,
    '7za.exe'
  )
]

const missingPaths = expectedPaths.filter((filePath) => {
  try {
    const stats = fs.statSync(filePath)
    return !stats.isFile() || stats.size === 0
  } catch {
    return true
  }
})

if (missingPaths.length > 0) {
  console.error('Windows runtime tool verification failed. Missing 7za.exe:')
  missingPaths.forEach((filePath) => console.error(`- ${filePath}`))
  process.exit(1)
}

console.log(`Windows ${architecture} runtime tools verified:`)
expectedPaths.forEach((filePath) => console.log(`- ${filePath}`))
