function isNoIncrementalUnsupported(error) {
  const message = error?.message || String(error)
  return (
    message.includes('--no-incremental') &&
    /unknown|unrecognized|illegal option|invalid option/i.test(message)
  )
}

export async function installApkSetWithAdb({
  deviceFlag,
  apkPaths,
  validateApk,
  runAdbCommand,
  isCancelled,
  getReadableInstallError = (error) => error,
  installId = Date.now()
}) {
  if (isCancelled()) throw new Error('Installation cancelled')
  for (const apkPath of apkPaths) {
    await validateApk(apkPath)
  }
  if (isCancelled()) throw new Error('Installation cancelled')

  const runCancellableAdbCommand = async (args) => {
    if (isCancelled()) throw new Error('Installation cancelled')
    return runAdbCommand(args)
  }

  const remoteApks = apkPaths.map(
    (_, index) => `/data/local/tmp/hypertopia_${installId}_${index}.apk`
  )

  try {
    for (let index = 0; index < apkPaths.length; index++) {
      await runCancellableAdbCommand([...deviceFlag, 'push', apkPaths[index], remoteApks[index]])
    }

    return await runCancellableAdbCommand([
      ...deviceFlag,
      'shell',
      'pm',
      'install-multiple',
      '-r',
      ...remoteApks
    ])
  } catch (error) {
    if (isCancelled() || error?.message === 'Installation cancelled') throw error

    try {
      return await installDirectly(deviceFlag, apkPaths, runCancellableAdbCommand)
    } catch (fallbackError) {
      throw getReadableInstallError(fallbackError)
    }
  } finally {
    await runAdbCommand([...deviceFlag, 'shell', 'rm', '-f', ...remoteApks], undefined, {
      allowWhenCancelled: true
    }).catch(() => {})
  }
}

async function installDirectly(deviceFlag, apkPaths, runAdbCommand) {
  try {
    return await runAdbCommand([
      ...deviceFlag,
      'install-multiple',
      '-r',
      '--no-incremental',
      ...apkPaths
    ])
  } catch (error) {
    if (!isNoIncrementalUnsupported(error)) throw error
    return runAdbCommand([...deviceFlag, 'install-multiple', '-r', ...apkPaths])
  }
}
