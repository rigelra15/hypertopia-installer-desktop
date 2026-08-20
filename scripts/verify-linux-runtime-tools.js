const fs = require('node:fs')
const path = require('node:path')

const outputRoots = ['dist/linux-unpacked', 'dist/linux-x64-unpacked', 'dist/linux-arm64-unpacked']
const resourcePaths = [
  path.join('resources', '7zip-bin', 'linux', 'x64', '7za'),
  path.join('resources', 'app.asar.unpacked', 'node_modules', '7zip-bin', 'linux', 'x64', '7za'),
  path.join('resources', 'platform-tools-linux', 'adb')
]

const validRoot = outputRoots.find((outputRoot) =>
  resourcePaths.every((resourcePath) => {
    try {
      const filePath = path.join(outputRoot, resourcePath)
      const stats = fs.statSync(filePath)
      return stats.isFile() && stats.size > 0
    } catch {
      return false
    }
  })
)

if (!validRoot) {
  console.error('Linux runtime tool verification failed.')
  outputRoots.forEach((outputRoot) => {
    resourcePaths.forEach((resourcePath) =>
      console.error(`- ${path.join(outputRoot, resourcePath)}`)
    )
  })
  process.exit(1)
}

console.log(`Linux runtime tools verified in ${validRoot}:`)
resourcePaths.forEach((resourcePath) => console.log(`- ${path.join(validRoot, resourcePath)}`))
