#!/usr/bin/env node

/**
 * Custom Changelog Generator
 * Generates formatted changelog from git commits between two tags
 *
 * Usage: node scripts/generate-changelog.js [fromTag] [toTag]
 */

const { execSync } = require('child_process')

// Category mapping with emojis
const CATEGORIES = {
  feat: { title: '## ✨ New Features', order: 1 },
  feature: { title: '## ✨ New Features', order: 1 },
  fix: { title: '## 🐛 Bug Fixes', order: 2 },
  bug: { title: '## 🐛 Bug Fixes', order: 2 },
  perf: { title: '## 🚀 Improvements', order: 3 },
  refactor: { title: '## 🚀 Improvements', order: 3 },
  style: { title: '## 🚀 Improvements', order: 3 },
  chore: { title: '## 📦 Maintenance', order: 4 },
  build: { title: '## 📦 Maintenance', order: 4 },
  ci: { title: '## 📦 Maintenance', order: 4 },
  docs: { title: '## 📝 Documentation', order: 5 },
  test: { title: '## 🧪 Tests', order: 6 }
}

const DEFAULT_CATEGORY = { title: '## 🔄 Other Changes', order: 7 }

function getCommitsBetweenTags(fromTag, toTag) {
  try {
    // Get commits with full message (subject + body)
    const range = fromTag ? `${fromTag}..${toTag}` : toTag
    const format = '%H|||%s|||%b|||END_COMMIT'
    const output = execSync(`git log ${range} --pretty=format:"${format}"`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    })

    const commits = []
    const rawCommits = output.split('|||END_COMMIT').filter((c) => c.trim())

    for (const raw of rawCommits) {
      const parts = raw.trim().split('|||')
      if (parts.length >= 2) {
        const hash = parts[0].trim()
        const subject = parts[1].trim()
        const body = (parts[2] || '').trim()

        commits.push({ hash, subject, body })
      }
    }

    return commits
  } catch (error) {
    console.error('Error getting commits:', error.message)
    return []
  }
}

function categorizeCommit(subject) {
  // Match conventional commit format: type(scope): message or type: message
  const match = subject.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)$/)

  if (match) {
    const type = match[1].toLowerCase()
    const message = match[2]
    const category = CATEGORIES[type] || DEFAULT_CATEGORY
    return { category, cleanSubject: `${type}: ${message}` }
  }

  return { category: DEFAULT_CATEGORY, cleanSubject: subject }
}

function formatCommit(commit) {
  const lines = []

  // Add subject as bold
  lines.push(`**${commit.subject}**`)

  // Add body if exists
  if (commit.body) {
    // Split body into lines and format as bullet points if they start with -
    const bodyLines = commit.body.split('\n').filter((l) => l.trim())
    for (const line of bodyLines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('-')) {
        lines.push(trimmed)
      } else if (trimmed) {
        lines.push(`- ${trimmed}`)
      }
    }
  }

  return lines.join('\n')
}

function generateChangelog(fromTag, toTag) {
  const commits = getCommitsBetweenTags(fromTag, toTag)

  if (commits.length === 0) {
    return 'No notable changes in this release.'
  }

  // Group commits by category
  const grouped = {}

  for (const commit of commits) {
    const { category } = categorizeCommit(commit.subject)
    const key = category.title

    if (!grouped[key]) {
      grouped[key] = { order: category.order, commits: [] }
    }

    grouped[key].commits.push({
      ...commit,
      subject: commit.subject // Keep original subject
    })
  }

  // Sort categories by order and generate output
  const sortedCategories = Object.entries(grouped).sort((a, b) => a[1].order - b[1].order)

  const output = []

  for (const [title, data] of sortedCategories) {
    output.push(title)
    output.push('')

    for (const commit of data.commits) {
      output.push(formatCommit(commit))
      output.push('')
    }
  }

  return output.join('\n').trim()
}

// Main execution
const args = process.argv.slice(2)
const fromTag = args[0] || ''
const toTag = args[1] || 'HEAD'

const changelog = generateChangelog(fromTag, toTag)
console.log(changelog)
