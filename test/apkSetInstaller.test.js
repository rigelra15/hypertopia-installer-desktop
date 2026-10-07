import { describe, expect, it, vi } from 'vitest'
import { installApkSetWithAdb } from '../src/main/apkSetInstaller.js'

const apkPaths = ['/tmp/base.apk', '/tmp/config.arm64_v8a.apk']
const remotePaths = [
  '/data/local/tmp/hypertopia_1234_0.apk',
  '/data/local/tmp/hypertopia_1234_1.apk'
]

function createInstaller(overrides = {}) {
  const commands = []
  const runFakeAdb = overrides.runAdbCommand
  const runAdbCommand = vi.fn(async (args) => {
    commands.push(args)
    return runFakeAdb ? runFakeAdb(args) : 'Success'
  })
  const validateApk = overrides.validateApk || vi.fn(async () => {})
  const installer = (options = {}) =>
    installApkSetWithAdb({
      ...overrides,
      ...options,
      deviceFlag: ['-s', 'quest-test'],
      apkPaths,
      validateApk,
      runAdbCommand,
      isCancelled: options.isCancelled || overrides.isCancelled || (() => false),
      installId: 1234
    })

  return { commands, runAdbCommand, validateApk, installer }
}

describe('installApkSetWithAdb', () => {
  it('validates all APKs, pushes them in order, installs the set, and cleans remote files', async () => {
    const { commands, runAdbCommand, validateApk, installer } = createInstaller()

    await expect(installer()).resolves.toBe('Success')

    expect(validateApk.mock.calls).toEqual([['/tmp/base.apk'], ['/tmp/config.arm64_v8a.apk']])
    expect(commands).toEqual([
      ['-s', 'quest-test', 'push', apkPaths[0], remotePaths[0]],
      ['-s', 'quest-test', 'push', apkPaths[1], remotePaths[1]],
      ['-s', 'quest-test', 'shell', 'pm', 'install-multiple', '-r', ...remotePaths],
      ['-s', 'quest-test', 'shell', 'rm', '-f', ...remotePaths]
    ])
    expect(runAdbCommand).toHaveBeenCalledTimes(4)
  })

  it('does not start ADB if any selected APK fails validation', async () => {
    const validationError = new Error('invalid split APK')
    const { commands, runAdbCommand, installer } = createInstaller({
      validateApk: vi.fn(async (apkPath) => {
        if (apkPath === apkPaths[1]) throw validationError
      })
    })

    await expect(installer()).rejects.toBe(validationError)
    expect(commands).toEqual([])
    expect(runAdbCommand).not.toHaveBeenCalled()
  })

  it('falls back to adb install-multiple and removes pushed files after a remote install failure', async () => {
    const { commands, installer } = createInstaller({
      runAdbCommand: vi.fn(async (args) => {
        if (args.includes('shell') && args.includes('pm')) {
          throw new Error('pm install-multiple unavailable')
        }
        return 'fallback success'
      })
    })

    await expect(installer()).resolves.toBe('fallback success')
    expect(commands).toEqual([
      ['-s', 'quest-test', 'push', apkPaths[0], remotePaths[0]],
      ['-s', 'quest-test', 'push', apkPaths[1], remotePaths[1]],
      ['-s', 'quest-test', 'shell', 'pm', 'install-multiple', '-r', ...remotePaths],
      ['-s', 'quest-test', 'install-multiple', '-r', '--no-incremental', ...apkPaths],
      ['-s', 'quest-test', 'shell', 'rm', '-f', ...remotePaths]
    ])
  })

  it('retries the direct install without --no-incremental only when unsupported', async () => {
    const { commands, installer } = createInstaller({
      runAdbCommand: vi.fn(async (args) => {
        if (args.includes('shell') && args.includes('pm')) {
          throw new Error('remote install failed')
        }
        if (args.includes('--no-incremental')) {
          throw new Error('unknown option --no-incremental')
        }
        return 'fallback success'
      })
    })

    await expect(installer()).resolves.toBe('fallback success')
    expect(commands).toContainEqual(['-s', 'quest-test', 'install-multiple', '-r', ...apkPaths])
  })

  it('cleans up remote files and reports a failed direct fallback', async () => {
    const { commands, installer } = createInstaller({
      runAdbCommand: vi.fn(async (args) => {
        if (args.includes('shell') && args.includes('pm')) {
          throw new Error('remote install failed')
        }
        if (args.includes('install-multiple')) {
          throw new Error('direct install failed')
        }
        return 'cleanup'
      }),
      getReadableInstallError: (error) => new Error(`readable: ${error.message}`)
    })

    await expect(installer()).rejects.toThrow('readable: direct install failed')
    expect(commands.at(-1)).toEqual(['-s', 'quest-test', 'shell', 'rm', '-f', ...remotePaths])
  })

  it('does not fallback after cancellation and still attempts remote cleanup', async () => {
    let cancelled = false
    const { commands, installer, runAdbCommand } = createInstaller({
      runAdbCommand: vi.fn(async (args) => {
        if (args.includes('push')) {
          cancelled = true
          return 'pushed'
        }
        return 'cleanup'
      }),
      isCancelled: () => cancelled
    })

    await expect(installer()).rejects.toThrow('Installation cancelled')
    expect(commands).toEqual([
      ['-s', 'quest-test', 'push', apkPaths[0], remotePaths[0]],
      ['-s', 'quest-test', 'shell', 'rm', '-f', ...remotePaths]
    ])
    expect(runAdbCommand.mock.calls.at(-1)[2]).toEqual({ allowWhenCancelled: true })
  })
})
