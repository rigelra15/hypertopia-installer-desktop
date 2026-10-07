import { describe, expect, it } from 'vitest'
import {
  buildApkInstallOptions,
  getSelectedApkInstallOption,
  requireApkInstallOption
} from '../src/shared/apkInstallOptions.js'

const metadata = (packageName, splitName = null, versionCode = '42') => ({
  packageName,
  splitName,
  versionCode
})

describe('buildApkInstallOptions', () => {
  it('groups APKs with matching package, split, and version metadata', () => {
    const options = buildApkInstallOptions([
      { file: 'bundle/app-main.apk', size: 100, metadata: metadata('com.example.game') },
      {
        file: 'bundle/language.apk',
        size: 20,
        metadata: metadata('com.example.game', 'config.en')
      },
      {
        file: 'bundle/feature.apk',
        size: 10,
        metadata: metadata('com.example.game', 'feature.home')
      }
    ])

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      id: 'bundle/app-main.apk',
      apkPaths: ['bundle/app-main.apk', 'bundle/feature.apk', 'bundle/language.apk'],
      apkCount: 3,
      size: 130,
      packageName: 'com.example.game',
      versionCode: '42',
      isSplit: true,
      isSplitPart: false,
      installable: true
    })
  })

  it('keeps different packages separate even when split-like filenames are siblings', () => {
    const options = buildApkInstallOptions([
      { file: 'bundle/base.apk', size: 100, metadata: metadata('com.example.game') },
      {
        file: 'bundle/config.arm64_v8a.apk',
        size: 20,
        metadata: metadata('com.example.tool')
      }
    ])

    expect(
      options.map(({ id, packageName, isSplit, installable }) => ({
        id,
        packageName,
        isSplit,
        installable
      }))
    ).toEqual([
      {
        id: 'bundle/base.apk',
        packageName: 'com.example.game',
        isSplit: false,
        installable: true
      },
      {
        id: 'bundle/config.arm64_v8a.apk',
        packageName: 'com.example.tool',
        isSplit: false,
        installable: true
      }
    ])
  })

  it('does not group split APKs with a different package or version', () => {
    const options = buildApkInstallOptions([
      { file: 'bundle/base.apk', size: 100, metadata: metadata('com.example.game') },
      {
        file: 'bundle/feature.apk',
        size: 20,
        metadata: metadata('com.other.game', 'feature.home')
      },
      {
        file: 'bundle/config.apk',
        size: 10,
        metadata: metadata('com.example.game', 'config.en', '43')
      }
    ])

    expect(options).toHaveLength(3)
    expect(options.find((option) => option.id.endsWith('base.apk')).installable).toBe(true)
    expect(options.filter((option) => option.isSplitPart)).toHaveLength(2)
    expect(
      options.filter((option) => option.isSplitPart).every((option) => !option.installable)
    ).toBe(true)
  })

  it('marks metadata-identified orphan splits as non-installable', () => {
    const options = buildApkInstallOptions([
      {
        file: 'bundle/feature-any-name.apk',
        size: 20,
        metadata: metadata('com.example.game', 'feature.home')
      }
    ])

    expect(options[0]).toMatchObject({ isSplitPart: true, installable: false })
    expect(() => requireApkInstallOption(options)).toThrow(/base APK is missing/)
  })

  it('marks filename-only split candidates as incomplete when manifest metadata is unavailable', () => {
    const options = buildApkInstallOptions([{ file: 'bundle/config.arm64_v8a.apk', size: 20 }])

    expect(options[0]).toMatchObject({ isSplitPart: true, installable: false })
  })

  it('keeps unrelated APKs as separate choices and requires an explicit selection', () => {
    const options = buildApkInstallOptions([
      { file: 'games/first.apk', size: 100, metadata: metadata('com.example.first') },
      { file: 'tools/second.apk', size: 200, metadata: metadata('com.example.second') }
    ])

    expect(options.map(({ id, apkPaths, isSplit }) => ({ id, apkPaths, isSplit }))).toEqual([
      { id: 'games/first.apk', apkPaths: ['games/first.apk'], isSplit: false },
      { id: 'tools/second.apk', apkPaths: ['tools/second.apk'], isSplit: false }
    ])
    expect(getSelectedApkInstallOption(options)).toBeNull()
    expect(() => requireApkInstallOption(options)).toThrow(/Select one/)
    expect(requireApkInstallOption(options, 'tools/second.apk').apkName).toBe('second.apk')
  })

  it('ignores unsafe and non-APK archive paths', () => {
    expect(
      buildApkInstallOptions([
        { file: '../outside.apk', size: 100 },
        { file: '/absolute.apk', size: 100 },
        { file: 'game.apk/backup.txt', size: 10 }
      ])
    ).toEqual([])
  })

  it('selects a lone APK option without a user selection', () => {
    const options = buildApkInstallOptions([
      { file: 'game.apk', size: 100, metadata: metadata('com.example.game') }
    ])

    expect(getSelectedApkInstallOption(options)).toBe(options[0])
    expect(requireApkInstallOption(options)).toBe(options[0])
  })
})
