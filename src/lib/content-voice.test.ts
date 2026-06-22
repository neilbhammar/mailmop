import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Content voice audit (TDD gate for "must not sound like AI").
 *
 * Every blog post must pass:
 *  1. No em-dashes or en-dashes (— or –). Use periods, commas, parentheses, or "to".
 *  2. No high-signal AI-tell phrases.
 *
 * Run just this suite:  npx vitest run src/lib/content-voice.test.ts
 */

const BLOG_DIR = path.join(process.cwd(), 'content/blog')
const files = fs.existsSync(BLOG_DIR)
  ? fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))
  : []

// High-signal AI tells. Curated to avoid false positives on normal prose.
const BANNED: RegExp[] = [
  /\bdelve\b/i,
  /\b(let'?s |we'?ll )?dive in(to)?\b/i,
  /\bin today'?s (digital|fast-paced|modern|connected)\b/i,
  /\bever-(evolving|changing)\b/i,
  /\b(digital|email|ever-changing) landscape\b/i,
  /\brealm of\b/i,
  /\btreasure trove\b/i,
  /\bplethora\b/i,
  /\bmyriad\b/i,
  /\bseamless(ly)?\b/i,
  /\b(harness|unlock|supercharge|elevate|unleash) (the |your )?/i,
  /\bgame[- ]chang(er|ing)\b/i,
  /\bcutting[- ]edge\b/i,
  /\bstate[- ]of[- ]the[- ]art\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\blook no further\b/i,
  /\bsay goodbye to\b/i,
  /\brest assured\b/i,
  /\bneedless to say\b/i,
  /\bit'?s (worth|important) (noting|to note)\b/i,
  /\bin conclusion\b/i,
  /\bwhen it comes to\b/i,
  /\bat the end of the day\b/i,
  /\bthe bottom line is\b/i,
  /\bbuckle up\b/i,
  /\blet'?s face it\b/i,
  /\bhere'?s the (thing|kicker)\b/i,
  /\bmore than just\b/i,
  /\bnavigat(e|ing) (the|your)\b/i,
  /\bfirst and foremost\b/i,
  /\bin essence\b/i,
  /\b(moreover|furthermore)\b/i,
  /\ba testament to\b/i,
  /\bpeace of mind\b/i,
  /\beffortless(ly)?\b/i,
  /\btailored to\b/i,
  /\bboasts?\b/i,
  /\bwhether you'?re a\b/i,
]

function locate(text: string, regex: RegExp): string[] {
  const lines = text.split('\n')
  const hits: string[] = []
  lines.forEach((line, i) => {
    const m = line.match(regex)
    if (m) hits.push(`  line ${i + 1}: ...${line.trim().slice(Math.max(0, (m.index || 0) - 20), (m.index || 0) + 40)}...`)
  })
  return hits
}

describe('blog content voice audit', () => {
  it('has blog posts to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const text = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')

    it(`${file}: no em/en dashes`, () => {
      const hits = locate(text, /[—–]/)
      expect(hits, `${file} contains em/en dashes:\n${hits.join('\n')}`).toEqual([])
    })

    it(`${file}: no AI-tell phrases`, () => {
      const found: string[] = []
      for (const re of BANNED) {
        const hits = locate(text, re)
        if (hits.length) found.push(`  ${re}:\n${hits.join('\n')}`)
      }
      expect(found, `${file} contains AI-tell phrases:\n${found.join('\n')}`).toEqual([])
    })
  }
})
