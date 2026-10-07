export function createUpdateCheckMenuHandler({
  isPackaged,
  platform,
  checkForUpdatesMac,
  checkForUpdatesAndNotify,
  showDevelopmentNotice
}) {
  return () => {
    if (!isPackaged) {
      showDevelopmentNotice()
      return
    }

    if (platform === 'darwin') {
      checkForUpdatesMac()
      return
    }

    checkForUpdatesAndNotify()
  }
}
