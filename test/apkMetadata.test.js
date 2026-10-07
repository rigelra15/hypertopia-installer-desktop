import { describe, expect, it } from 'vitest'
import { parseAndroidManifestMetadata } from '../src/shared/apkMetadata.js'

function encodeLength8(length) {
  if (length < 0x80) return Buffer.from([length])
  return Buffer.from([0x80 | (length >> 8), length & 0xff])
}

function createStringPool(strings) {
  const encodedStrings = []
  const offsets = []
  let stringDataSize = 0

  for (const value of strings) {
    const bytes = Buffer.from(value, 'utf8')
    const encoded = Buffer.concat([
      encodeLength8(value.length),
      encodeLength8(bytes.length),
      bytes,
      Buffer.from([0])
    ])
    offsets.push(stringDataSize)
    encodedStrings.push(encoded)
    stringDataSize += encoded.length
  }

  const headerSize = 28
  const stringsStart = headerSize + strings.length * 4
  const chunkSize = stringsStart + stringDataSize
  const chunk = Buffer.alloc(chunkSize)
  chunk.writeUInt16LE(0x0001, 0)
  chunk.writeUInt16LE(headerSize, 2)
  chunk.writeUInt32LE(chunkSize, 4)
  chunk.writeUInt32LE(strings.length, 8)
  chunk.writeUInt32LE(0, 12)
  chunk.writeUInt32LE(0x00000100, 16)
  chunk.writeUInt32LE(stringsStart, 20)
  chunk.writeUInt32LE(0, 24)
  offsets.forEach((offset, index) => chunk.writeUInt32LE(offset, headerSize + index * 4))
  Buffer.concat(encodedStrings).copy(chunk, stringsStart)
  return chunk
}

function createStartElement(strings) {
  const attributes = [
    { name: 'package', raw: 'com.example.game', type: 0x03, value: 'com.example.game' },
    { name: 'split', raw: 'config.arm64_v8a', type: 0x03, value: 'config.arm64_v8a' },
    { name: 'versionCode', raw: null, type: 0x10, value: 42 },
    { name: 'versionName', raw: '2.4.1', type: 0x03, value: '2.4.1' }
  ]
  const headerSize = 16
  const extensionSize = 20
  const attributeSize = 20
  const chunkSize = headerSize + extensionSize + attributes.length * attributeSize
  const chunk = Buffer.alloc(chunkSize)
  chunk.writeUInt16LE(0x0102, 0)
  chunk.writeUInt16LE(headerSize, 2)
  chunk.writeUInt32LE(chunkSize, 4)
  chunk.writeUInt32LE(1, 8)
  chunk.writeUInt32LE(0xffffffff, 12)
  const extensionOffset = headerSize
  chunk.writeUInt32LE(0xffffffff, extensionOffset)
  chunk.writeUInt32LE(strings.indexOf('manifest'), extensionOffset + 4)
  chunk.writeUInt16LE(extensionSize, extensionOffset + 8)
  chunk.writeUInt16LE(attributeSize, extensionOffset + 10)
  chunk.writeUInt16LE(attributes.length, extensionOffset + 12)

  attributes.forEach((attribute, index) => {
    const offset = headerSize + extensionSize + index * attributeSize
    chunk.writeUInt32LE(0xffffffff, offset)
    chunk.writeUInt32LE(strings.indexOf(attribute.name), offset + 4)
    chunk.writeUInt32LE(
      attribute.raw === null ? 0xffffffff : strings.indexOf(attribute.raw),
      offset + 8
    )
    chunk.writeUInt16LE(8, offset + 12)
    chunk[offset + 14] = 0
    chunk[offset + 15] = attribute.type
    chunk.writeUInt32LE(
      attribute.type === 0x03 ? strings.indexOf(attribute.value) : attribute.value,
      offset + 16
    )
  })
  return chunk
}

function createBinaryManifest() {
  const strings = [
    'manifest',
    'package',
    'com.example.game',
    'split',
    'config.arm64_v8a',
    'versionCode',
    'versionName',
    '2.4.1'
  ]
  const stringPool = createStringPool(strings)
  const startElement = createStartElement(strings)
  const header = Buffer.alloc(8)
  header.writeUInt16LE(0x0003, 0)
  header.writeUInt16LE(8, 2)
  header.writeUInt32LE(header.length + stringPool.length + startElement.length, 4)
  return Buffer.concat([header, stringPool, startElement])
}

describe('parseAndroidManifestMetadata', () => {
  it('extracts package, split, version code, and version name from binary Android XML', () => {
    expect(parseAndroidManifestMetadata(createBinaryManifest())).toEqual({
      packageName: 'com.example.game',
      splitName: 'config.arm64_v8a',
      versionCode: '42',
      versionName: '2.4.1',
      manifestFormat: 'binary'
    })
  })

  it('reads metadata from text manifests and handles quoted tag delimiters', () => {
    const xml = Buffer.from(
      '<manifest package="com.example &amp; game" split="feature.main" android:versionCode="12" android:versionName="1.2 > beta">'
    )

    expect(parseAndroidManifestMetadata(xml)).toMatchObject({
      packageName: 'com.example &amp; game',
      splitName: 'feature.main',
      versionCode: '12',
      versionName: '1.2 > beta',
      manifestFormat: 'xml'
    })
  })

  it('returns null for empty, unsupported, oversized, or manifest-free data', () => {
    expect(parseAndroidManifestMetadata(Buffer.alloc(0))).toBeNull()
    expect(parseAndroidManifestMetadata(Buffer.from('not a manifest'))).toBeNull()
    expect(parseAndroidManifestMetadata(Buffer.from('<manifest/>'))?.packageName).toBeNull()
    expect(parseAndroidManifestMetadata(Buffer.alloc(4 * 1024 * 1024 + 1))).toBeNull()
  })
})
