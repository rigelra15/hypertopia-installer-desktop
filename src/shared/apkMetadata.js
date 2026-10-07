const UTF8_FLAG = 0x00000100
const XML_CHUNK_TYPE = 0x0003
const STRING_POOL_CHUNK_TYPE = 0x0001
const START_ELEMENT_CHUNK_TYPE = 0x0102
const TYPE_STRING = 0x03
const TYPE_INT_DEC = 0x10
const TYPE_INT_HEX = 0x11
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024

function readLength8(buffer, offset, limit) {
  if (offset >= limit) throw new Error('Invalid Android string pool length.')
  const first = buffer[offset]
  if ((first & 0x80) === 0) return { length: first, nextOffset: offset + 1 }
  if (offset + 1 >= limit) throw new Error('Invalid Android string pool length.')
  return {
    length: ((first & 0x7f) << 8) | buffer[offset + 1],
    nextOffset: offset + 2
  }
}

function readLength16(buffer, offset, limit) {
  if (offset + 2 > limit) throw new Error('Invalid Android string pool length.')
  const first = buffer.readUInt16LE(offset)
  if ((first & 0x8000) === 0) return { length: first, nextOffset: offset + 2 }
  if (offset + 4 > limit) throw new Error('Invalid Android string pool length.')
  return {
    length: ((first & 0x7fff) << 16) | buffer.readUInt16LE(offset + 2),
    nextOffset: offset + 4
  }
}

function parseStringPool(buffer, chunkOffset, chunkSize, headerSize) {
  const chunkEnd = chunkOffset + chunkSize
  if (headerSize < 28 || chunkEnd > buffer.length) {
    throw new Error('Invalid Android string pool chunk.')
  }

  const stringCount = buffer.readUInt32LE(chunkOffset + 8)
  const flags = buffer.readUInt32LE(chunkOffset + 16)
  const stringsStart = buffer.readUInt32LE(chunkOffset + 20)
  const offsetsStart = chunkOffset + headerSize
  const stringDataStart = chunkOffset + stringsStart
  if (
    stringCount > 100000 ||
    offsetsStart + stringCount * 4 > chunkEnd ||
    stringDataStart < offsetsStart + stringCount * 4 ||
    stringDataStart > chunkEnd
  ) {
    throw new Error('Invalid Android string pool bounds.')
  }

  const isUtf8 = (flags & UTF8_FLAG) !== 0
  const strings = []
  for (let index = 0; index < stringCount; index++) {
    const relativeOffset = buffer.readUInt32LE(offsetsStart + index * 4)
    let cursor = stringDataStart + relativeOffset
    if (cursor >= chunkEnd) throw new Error('Invalid Android string offset.')

    if (isUtf8) {
      cursor = readLength8(buffer, cursor, chunkEnd).nextOffset
      const byteLength = readLength8(buffer, cursor, chunkEnd)
      cursor = byteLength.nextOffset
      if (cursor + byteLength.length > chunkEnd) throw new Error('Invalid Android string bounds.')
      strings.push(buffer.toString('utf8', cursor, cursor + byteLength.length))
    } else {
      const charLength = readLength16(buffer, cursor, chunkEnd)
      cursor = charLength.nextOffset
      const byteLength = charLength.length * 2
      if (cursor + byteLength > chunkEnd) throw new Error('Invalid Android string bounds.')
      strings.push(buffer.toString('utf16le', cursor, cursor + byteLength))
    }
  }

  return strings
}

function parseInteger(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = /^0x[\da-f]+$/i.test(text) ? Number.parseInt(text.slice(2), 16) : Number(text)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function createMetadata(attributes, manifestFormat) {
  const versionCode = parseInteger(attributes.versionCode)
  const versionCodeMajor = parseInteger(attributes.versionCodeMajor)
  const longVersionCode =
    versionCode === null
      ? null
      : ((BigInt(versionCodeMajor || 0) << 32n) | BigInt(versionCode)).toString()

  return {
    packageName: typeof attributes.package === 'string' ? attributes.package.trim() || null : null,
    splitName: typeof attributes.split === 'string' ? attributes.split.trim() || null : null,
    versionCode: longVersionCode,
    versionName:
      typeof attributes.versionName === 'string' ? attributes.versionName.trim() || null : null,
    manifestFormat
  }
}

function parseTextManifest(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
  const openingTagStart = text.search(/<manifest\b/i)
  if (openingTagStart < 0) return null

  let quote = null
  let tagEnd = -1
  for (let index = openingTagStart + 1; index < text.length; index++) {
    const character = text[index]
    if (quote) {
      if (character === quote) quote = null
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      tagEnd = index
      break
    }
  }
  if (tagEnd < 0) return null

  const tagContent = text.slice(openingTagStart + '<manifest'.length, tagEnd)
  const attributes = {}
  const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  for (const match of tagContent.matchAll(attributePattern)) {
    const name = match[1].split(':').at(-1)
    attributes[name] = match[2] ?? match[3] ?? ''
  }
  return createMetadata(attributes, 'xml')
}

function parseBinaryManifest(buffer) {
  if (buffer.length < 8 || buffer.readUInt16LE(0) !== XML_CHUNK_TYPE) return null
  const xmlSize = buffer.readUInt32LE(4)
  if (xmlSize < 8 || xmlSize > buffer.length) throw new Error('Invalid Android binary XML size.')

  let strings = null
  let offset = buffer.readUInt16LE(2)
  while (offset + 8 <= xmlSize) {
    const chunkType = buffer.readUInt16LE(offset)
    const headerSize = buffer.readUInt16LE(offset + 2)
    const chunkSize = buffer.readUInt32LE(offset + 4)
    const chunkEnd = offset + chunkSize
    if (headerSize < 8 || chunkSize < headerSize || chunkEnd > xmlSize) {
      throw new Error('Invalid Android binary XML chunk.')
    }

    if (chunkType === STRING_POOL_CHUNK_TYPE) {
      strings = parseStringPool(buffer, offset, chunkSize, headerSize)
    } else if (chunkType === START_ELEMENT_CHUNK_TYPE && strings) {
      const extensionOffset = offset + headerSize
      if (extensionOffset + 20 > chunkEnd) throw new Error('Invalid Android start-element chunk.')
      const elementName = strings[buffer.readUInt32LE(extensionOffset + 4)]
      if (elementName === 'manifest') {
        const attributeStart = buffer.readUInt16LE(extensionOffset + 8)
        const attributeSize = buffer.readUInt16LE(extensionOffset + 10)
        const attributeCount = buffer.readUInt16LE(extensionOffset + 12)
        const attributesOffset = extensionOffset + attributeStart
        if (
          attributeSize < 20 ||
          attributesOffset + attributeCount * attributeSize > chunkEnd ||
          attributeCount > 4096
        ) {
          throw new Error('Invalid Android manifest attributes.')
        }

        const attributes = {}
        for (let index = 0; index < attributeCount; index++) {
          const attributeOffset = attributesOffset + index * attributeSize
          const nameIndex = buffer.readUInt32LE(attributeOffset + 4)
          const rawValueIndex = buffer.readUInt32LE(attributeOffset + 8)
          const valueType = buffer[attributeOffset + 15]
          const typedValue = buffer.readUInt32LE(attributeOffset + 16)
          const name = strings[nameIndex]
          if (!name) continue

          const rawValue = rawValueIndex === 0xffffffff ? null : strings[rawValueIndex]
          let value = rawValue
          if (value === null && valueType === TYPE_STRING) value = strings[typedValue] ?? null
          if (value === null && (valueType === TYPE_INT_DEC || valueType === TYPE_INT_HEX)) {
            value = typedValue
          }
          attributes[name.split(':').at(-1)] = value
        }

        return createMetadata(attributes, 'binary')
      }
    }

    offset = chunkEnd
  }

  return null
}

export function parseAndroidManifestMetadata(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || [])
  if (buffer.length === 0 || buffer.length > MAX_MANIFEST_BYTES) return null

  const firstContentByte = buffer.find((byte) => byte > 0x20)
  if (firstContentByte === 0x3c) return parseTextManifest(buffer)
  return parseBinaryManifest(buffer)
}
