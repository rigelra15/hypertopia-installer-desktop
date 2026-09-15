import { useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BLOCKQUOTE', 'BR', 'DIV', 'EM', 'H2', 'H3', 'H4', 'I', 'IMG', 'LI', 'OL', 'P', 'SOURCE', 'SPAN', 'STRONG', 'U', 'UL', 'VIDEO'
])
const BLOCKED_TAGS = new Set(['BUTTON', 'CANVAS', 'EMBED', 'FORM', 'IFRAME', 'NOSCRIPT', 'OBJECT', 'SCRIPT', 'STYLE', 'SVG'])
const BLOCK_TAGS = new Set(['BLOCKQUOTE', 'H2', 'H3', 'H4', 'IMG', 'LI', 'OL', 'P', 'UL', 'VIDEO'])

const isSafeMediaUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'res.cloudinary.com'
  } catch {
    return false
  }
}

const isSafeLink = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const hasRichDescriptionBlock = (element) => {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
  if (BLOCK_TAGS.has(element.tagName)) return true
  return Array.from(element.children).some(hasRichDescriptionBlock)
}

const appendRichDescriptionInlineContent = (node, fragment) => {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent.trim()) fragment.appendChild(child.cloneNode(true))
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return

    if (child.tagName === 'DIV') {
      appendRichDescriptionInlineContent(child, fragment)
      return
    }

    if (!hasRichDescriptionBlock(child)) fragment.appendChild(child.cloneNode(true))
  })
}

const normalizeRichDescriptionBlocks = (container) => {
  const normalized = document.createElement('div')

  const appendTextBlock = (fragment, forceNew = false) => {
    if (!fragment.textContent || !fragment.textContent.trim()) return
    const trimmedText = fragment.textContent.trim().toLowerCase()
    const trailingMore = /more\.\.\.\s*$/i.test(fragment.textContent) && trimmedText !== 'more...'
    if (trailingMore) {
      const wrapper = document.createElement('div')
      wrapper.append(...Array.from(fragment.childNodes))
      const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT)
      const textNodes = []
      let textNode = walker.nextNode()
      while (textNode) {
        textNodes.push(textNode)
        textNode = walker.nextNode()
      }
      const trailingText = textNodes[textNodes.length - 1]
      const match = trailingText?.nodeValue.match(/more\.\.\.\s*$/i)
      if (trailingText && match) {
        trailingText.nodeValue = trailingText.nodeValue.slice(0, match.index).replace(/\s+$/, '')
        if (!trailingText.nodeValue) trailingText.remove()
        const contentFragment = document.createDocumentFragment()
        contentFragment.append(...Array.from(wrapper.childNodes))
        appendTextBlock(contentFragment, forceNew)
        const moreFragment = document.createDocumentFragment()
        moreFragment.appendChild(document.createTextNode('more...'))
        appendTextBlock(moreFragment, true)
        return
      }
    }
    forceNew = forceNew || trimmedText === 'more...'
    const previous = normalized.lastElementChild
    const fragmentChildren = Array.from(fragment.childNodes)
    if (!forceNew && previous?.tagName === 'P' && previous.classList.contains('meta-rich-description__text')) {
      if (
        previous.textContent.trimEnd() &&
        fragment.textContent.trimStart() &&
        !/\s$/.test(previous.textContent) &&
        !/^\s/.test(fragment.textContent)
      ) {
        previous.appendChild(document.createTextNode(' '))
      }
      previous.append(...fragmentChildren)
      return
    }

    const paragraph = document.createElement('p')
    paragraph.className = 'meta-rich-description__text'
    paragraph.append(...fragmentChildren)
    normalized.appendChild(paragraph)
  }

  const collect = (node) => {
    let inlineContent = document.createDocumentFragment()
    const flushInlineContent = () => {
      appendTextBlock(inlineContent)
      inlineContent = document.createDocumentFragment()
    }

    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent.trim()) inlineContent.appendChild(child.cloneNode(true))
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return

      const tagName = child.tagName
      if (tagName === 'BR') {
        inlineContent.appendChild(child.cloneNode(true))
        return
      }

      if (BLOCK_TAGS.has(tagName)) {
        flushInlineContent()
        if (tagName === 'P' && hasRichDescriptionBlock(child)) collect(child)
        else normalized.appendChild(child.cloneNode(true))
        return
      }

      if (hasRichDescriptionBlock(child)) {
        flushInlineContent()
        collect(child)
        return
      }

      if (tagName === 'DIV' || tagName === 'SPAN') {
        flushInlineContent()
        const textBlock = document.createDocumentFragment()
        appendRichDescriptionInlineContent(child, textBlock)
        appendTextBlock(textBlock)
        return
      }

      inlineContent.appendChild(child.cloneNode(true))
    })

    flushInlineContent()
  }

  collect(container)
  return normalized.innerHTML
}

function sanitizeStandaloneDescriptionHtml(value) {
  if (typeof value !== 'string' || !value.trim() || typeof document === 'undefined') return ''

  const container = document.createElement('div')
  container.innerHTML = value
  let videoIndex = 0

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove()
      return
    }

    const element = node
    const tag = element.tagName
    if (BLOCKED_TAGS.has(tag)) {
      element.remove()
      return
    }

    Array.from(element.childNodes).forEach(walk)

    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode
      if (!parent) return
      while (element.firstChild) parent.insertBefore(element.firstChild, element)
      element.remove()
      return
    }

    if (tag === 'IMG') {
      const src = element.getAttribute('src') || ''
      if (!isSafeMediaUrl(src)) {
        element.remove()
        return
      }
      const alt = (element.getAttribute('alt') || '').slice(0, 300)
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
      element.setAttribute('src', src)
      if (alt) element.setAttribute('alt', alt)
      element.setAttribute('loading', 'lazy')
      return
    }

    if (tag === 'SOURCE') {
      const src = element.getAttribute('src') || ''
      if (!isSafeMediaUrl(src)) element.remove()
      else {
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
        element.setAttribute('src', src)
      }
      return
    }

    if (tag === 'VIDEO') {
      const poster = element.getAttribute('poster') || ''
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
      if (poster && isSafeMediaUrl(poster)) element.setAttribute('poster', poster)
      element.setAttribute('autoplay', '')
      element.setAttribute('loop', '')
      element.setAttribute('muted', '')
      element.setAttribute('playsinline', '')
      element.setAttribute('preload', 'metadata')
      element.setAttribute('aria-label', `Meta Store description video ${videoIndex + 1}`)
      element.setAttribute('data-testid', `standalone-rich-description-video-${videoIndex}`)
      videoIndex += 1
      return
    }

    if (tag === 'A') {
      const href = element.getAttribute('href') || ''
      Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
      if (isSafeLink(href)) {
        element.setAttribute('href', href)
        element.setAttribute('target', '_blank')
        element.setAttribute('rel', 'noreferrer')
      }
      return
    }

    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
  }

  Array.from(container.childNodes).forEach(walk)
  return normalizeRichDescriptionBlocks(container)
}

export default function StandaloneGameDescription({ html }) {
  const containerRef = useRef(null)
  const sanitizedHtml = useMemo(() => sanitizeStandaloneDescriptionHtml(html), [html])

  useEffect(() => {
    const videos = containerRef.current?.querySelectorAll('video') || []
    videos.forEach((video) => {
      video.autoplay = true
      video.loop = true
      video.muted = true
      video.defaultMuted = true
      video.controls = false
      video.playsInline = true
      const playPromise = video.play?.()
      playPromise?.catch?.(() => {})
    })
  }, [sanitizedHtml])

  if (!sanitizedHtml) return null

  return (
    <section className="standalone-detail-copy standalone-detail-rich-description" aria-label="Deskripsi">
      <div ref={containerRef} data-testid="standalone-rich-description" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </section>
  )
}

StandaloneGameDescription.propTypes = {
  html: PropTypes.string
}
