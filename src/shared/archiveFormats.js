export function getArchiveFormat(filePath) {
  const fileName =
    String(filePath ?? '')
      .split(/[\\/]/)
      .pop() || ''
  const extensionIndex = fileName.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : ''

  if (extension === '.rar') return 'rar'
  if (extension === '.zip' || extension === '.7z') return '7z'
  return null
}
