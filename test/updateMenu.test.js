import { describe, expect, it, vi } from 'vitest'
import { createUpdateCheckMenuHandler } from '../src/main/updateMenu.js'

describe('createUpdateCheckMenuHandler', () => {
  it('uses the manual release checker for packaged macOS', () => {
    const checkForUpdatesMac = vi.fn()
    const checkForUpdatesAndNotify = vi.fn()
    const showDevelopmentNotice = vi.fn()
    const checkForUpdates = createUpdateCheckMenuHandler({
      isPackaged: true,
      platform: 'darwin',
      checkForUpdatesMac,
      checkForUpdatesAndNotify,
      showDevelopmentNotice
    })

    checkForUpdates()

    expect(checkForUpdatesMac).toHaveBeenCalledOnce()
    expect(checkForUpdatesAndNotify).not.toHaveBeenCalled()
    expect(showDevelopmentNotice).not.toHaveBeenCalled()
  })

  it.each(['win32', 'linux'])('uses electron-updater for packaged %s', (platform) => {
    const checkForUpdatesMac = vi.fn()
    const checkForUpdatesAndNotify = vi.fn()
    const showDevelopmentNotice = vi.fn()
    const checkForUpdates = createUpdateCheckMenuHandler({
      isPackaged: true,
      platform,
      checkForUpdatesMac,
      checkForUpdatesAndNotify,
      showDevelopmentNotice
    })

    checkForUpdates()

    expect(checkForUpdatesAndNotify).toHaveBeenCalledOnce()
    expect(checkForUpdatesMac).not.toHaveBeenCalled()
    expect(showDevelopmentNotice).not.toHaveBeenCalled()
  })

  it('shows the development notice without checking for updates', () => {
    const checkForUpdatesMac = vi.fn()
    const checkForUpdatesAndNotify = vi.fn()
    const showDevelopmentNotice = vi.fn()
    const checkForUpdates = createUpdateCheckMenuHandler({
      isPackaged: false,
      platform: 'darwin',
      checkForUpdatesMac,
      checkForUpdatesAndNotify,
      showDevelopmentNotice
    })

    checkForUpdates()

    expect(showDevelopmentNotice).toHaveBeenCalledOnce()
    expect(checkForUpdatesMac).not.toHaveBeenCalled()
    expect(checkForUpdatesAndNotify).not.toHaveBeenCalled()
  })
})
