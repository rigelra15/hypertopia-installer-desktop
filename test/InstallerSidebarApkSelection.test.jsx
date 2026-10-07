import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key) =>
      ({
        installer_choose_apk: 'Multiple APK packages were found. Choose which one to install.',
        installer_choose_apk_placeholder: 'Select an APK package',
        installer_split_apk_badge: 'SPLIT APK',
        installer_split_apk_parts: 'split APKs',
        installer_split_missing_base_label: 'missing base APK',
        installer_split_base_missing: 'This split APK is missing its base APK.',
        btn_apk: 'Install APK',
        btn_install: 'Install',
        badge_apk: 'APK ONLY',
        install_apk: 'Installing APK...',
        install_success: 'Installation succeeded',
        install_failed: 'Installation failed: ',
        change_method: 'Change Method',
        browse_files: 'Browse Files',
        browse_method_folder: 'Select Extracted Folder'
      })[key] || key
  })
}))
vi.mock('../src/renderer/src/contexts/DownloadContext', () => ({
  useDownload: () => ({ unseenCount: 0, isDownloading: false })
}))
vi.mock('../src/renderer/src/components/DeviceSelector', () => ({ DeviceSelector: () => null }))
vi.mock('../src/renderer/src/components/UpdateNotification', () => ({ default: () => null }))
vi.mock('../src/renderer/src/components/Tooltip', () => ({ Tooltip: ({ children }) => children }))
vi.mock('../src/renderer/src/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('../src/renderer/src/components/BrowseMethodModal', () => ({
  default: ({ isOpen, onSelectFolder }) =>
    isOpen ? <button onClick={onSelectFolder}>Select Extracted Folder</button> : null
}))

import { InstallerSidebar } from '../src/renderer/src/components/InstallerSidebar'

const scannedArchive = {
  hasApk: true,
  hasObb: false,
  apkName: 'base.apk',
  apkSize: 300,
  apkOptions: [
    {
      id: 'bundle/base.apk',
      name: 'bundle/base.apk',
      apkName: 'base.apk',
      apkSize: 300,
      apkCount: 2,
      isSplit: true,
      isSplitPart: false,
      installable: true,
      hasObb: false,
      obbFolder: null,
      obbSize: 0,
      obbFiles: []
    },
    {
      id: 'games/other.apk',
      name: 'games/other.apk',
      apkName: 'other.apk',
      apkSize: 120,
      apkCount: 1,
      isSplit: false,
      isSplitPart: false,
      installable: true,
      hasObb: false,
      obbFolder: null,
      obbSize: 0,
      obbFiles: []
    }
  ]
}

describe('InstallerSidebar archive APK selection', () => {
  beforeEach(() => {
    window.api = {
      getFilePath: vi.fn().mockReturnValue('/tmp/multi-game.zip'),
      scanZip: vi.fn().mockResolvedValue(scannedArchive),
      getAppVersion: vi.fn().mockResolvedValue({ version: '1.0.0', build: 'test' }),
      listDevices: vi.fn().mockResolvedValue([]),
      storeRead: vi.fn().mockResolvedValue(null),
      storeWrite: vi.fn().mockResolvedValue(true),
      onInstallProgress: vi.fn(() => () => {}),
      installGame: vi.fn().mockResolvedValue(true),
      selectGameFolder: vi.fn().mockResolvedValue('/games/folder'),
      scanFolder: vi.fn().mockResolvedValue(scannedArchive),
      installGameFolder: vi.fn().mockResolvedValue(true)
    }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('requires an explicit package choice and passes that choice to installation', async () => {
    const { container } = render(
      <InstallerSidebar
        selectedDevice="quest-123"
        onDeviceSelect={vi.fn()}
        extractPath="/tmp"
        onExtractPathChange={vi.fn()}
        onCollapsedChange={vi.fn()}
        onNavigateToTab={vi.fn()}
      />
    )
    const file = new File(['archive'], 'multi-game.zip')
    const fileInput = container.querySelector('input[type="file"]')
    fireEvent.change(fileInput, { target: { files: [file] } })

    const selector = await screen.findByLabelText(
      'Multiple APK packages were found. Choose which one to install.'
    )
    const installButton = screen.getByRole('button', { name: 'Install APK' })

    expect(selector).toHaveValue('')
    expect(
      screen.getByRole('option', { name: /bundle\/base\.apk \(\+1 split APKs\)/ })
    ).toBeInTheDocument()
    expect(installButton).toBeDisabled()

    fireEvent.change(selector, { target: { value: 'games/other.apk' } })
    expect(installButton).toBeEnabled()
    fireEvent.click(installButton)

    await waitFor(() =>
      expect(window.api.installGame).toHaveBeenCalledWith(
        '/tmp/multi-game.zip',
        'apk',
        'quest-123',
        'games/other.apk'
      )
    )
  })

  it('requires the same package choice for extracted-folder installs', async () => {
    render(
      <InstallerSidebar
        selectedDevice="quest-123"
        onDeviceSelect={vi.fn()}
        extractPath="/tmp"
        onExtractPathChange={vi.fn()}
        onCollapsedChange={vi.fn()}
        onNavigateToTab={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Browse Files' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select Extracted Folder' }))

    const selector = await screen.findByLabelText(
      'Multiple APK packages were found. Choose which one to install.'
    )
    const installButton = screen.getByRole('button', { name: 'Install APK' })
    expect(selector).toHaveValue('')
    expect(installButton).toBeDisabled()

    fireEvent.change(selector, { target: { value: 'games/other.apk' } })
    fireEvent.click(installButton)

    await waitFor(() =>
      expect(window.api.installGameFolder).toHaveBeenCalledWith(
        '/games/folder',
        'apk',
        'quest-123',
        'games/other.apk'
      )
    )
  })
})
