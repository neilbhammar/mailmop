import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error - importing the ESM generator's gate function for test reuse
import { passesGate } from '../../scripts/sender-pages/generate.mjs'

/**
 * Quality gate for the programmatic "stop [Sender] emails" pages.
 * Ensures every published page is backed by real, unique per-sender data and that
 * no thin page (one that fails the gate) ever ships. Run:
 *   node scripts/sender-pages/generate.mjs && npx vitest run src/lib/sender-pages.test.ts
 */

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'scripts/sender-pages/senders.data.json')
const BLOG = path.join(ROOT, 'content/blog')

const data: any[] = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : []
const passing = data.filter(passesGate)
const failing = data.filter((s) => !passesGate(s))

describe('programmatic sender pages: quality gate', () => {
  it('has a researched data file', () => {
    expect(fs.existsSync(DATA), 'scripts/sender-pages/senders.data.json must exist').toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  it('publishes at least 8 senders that pass the gate (pilot target)', () => {
    expect(passing.length, `only ${passing.length} senders passed the gate`).toBeGreaterThanOrEqual(8)
  })

  it('every passing sender has a generated page with the required sections', () => {
    for (const s of passing) {
      const file = path.join(BLOG, `stop-${s.slug}-emails.mdx`)
      expect(fs.existsSync(file), `missing page for ${s.slug}`).toBe(true)
      const text = fs.readFileSync(file, 'utf8')
      expect(text, `${s.slug}: needs the stop-steps section`).toContain('How to stop')
      expect(text, `${s.slug}: needs the does-it-work section`).toContain('Does unsubscribing from')
      expect(text, `${s.slug}: needs a from: search`).toMatch(/from:/)
      expect(text, `${s.slug}: needs the MailMop link`).toContain('](/)')
      // "remove the brand name" uniqueness: the sender-specific behavior must be present
      expect(text, `${s.slug}: must contain its unique unsubscribeBehavior`).toContain(
        String(s.unsubscribeBehavior).slice(0, 25).replace(/[—–]/g, ', ')
      )
    }
  })

  it('never ships a thin page for a sender that fails the gate', () => {
    for (const s of failing) {
      if (!s.slug) continue
      const file = path.join(BLOG, `stop-${s.slug}-emails.mdx`)
      expect(fs.existsSync(file), `thin page shipped for failing sender ${s.slug}`).toBe(false)
    }
  })

  it('generates a hub page when senders pass', () => {
    if (passing.length > 0) {
      expect(fs.existsSync(path.join(BLOG, 'how-to-stop-unwanted-emails.mdx'))).toBe(true)
    }
  })
})
