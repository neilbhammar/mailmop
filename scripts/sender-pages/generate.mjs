#!/usr/bin/env node
/**
 * Programmatic generator for "How to stop [Sender] emails" pages.
 *
 * Source of truth: scripts/sender-pages/senders.data.json (researched, verified facts).
 * Output: content/blog/stop-<slug>-emails.mdx (one per sender that PASSES the quality gate)
 *         + content/blog/how-to-stop-unwanted-emails.mdx (hub).
 *
 * Quality gate (prevents thin/duplicate pages that hurt the domain): a sender is only
 * published if it has >=2 emailTypes, a real preference path (url or steps), and a
 * non-empty sender-specific unsubscribeBehavior. Pass the "remove the brand name and
 * it's still useful" test. Run `node scripts/sender-pages/generate.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const DATA = path.join(__dirname, 'senders.data.json')
const OUT = path.join(ROOT, 'content/blog')

// Normalize researched fact strings: decode HTML entities and strip the punctuation
// the voice audit forbids (em/en dashes and spaced-hyphen dashes), just in case.
const decode = (s) => String(s)
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
const clean = (s) => (s == null ? s : decode(String(s))
  .replace(/\s*[—–]\s*/g, ', ')
  .replace(/ - /g, ', ')
  .replace(/\s+,/g, ',')
  .replace(/,\s*,/g, ', '))

export function passesGate(s) {
  return Boolean(
    s && s.name && s.slug &&
    Array.isArray(s.emailTypes) && s.emailTypes.length >= 2 &&
    (s.preferenceUrl || s.preferenceSteps) &&
    s.unsubscribeBehavior && String(s.unsubscribeBehavior).trim().length > 20
  )
}

function faqsYaml(s) {
  const settings = s.preferenceUrl ? `your ${s.name} notification settings (${s.preferenceUrl})` : `your ${s.name} notification settings`
  const faqs = [
    { q: `How do I stop ${s.name} emails?`, a: `Open a recent ${s.name} email and use its unsubscribe link, then go to ${settings} and turn off the categories you don't want. A single unsubscribe usually stops just one type of email, so set them all at once. To remove the ones already in your inbox, search ${fromQuery(s)} in Gmail and bulk delete.` },
    { q: `Why am I getting so many emails from ${s.name}?`, a: `${s.name} sends ${listTypes(s)}. Each of these is often a separate setting, which is why turning off one type does not stop the others.` },
    { q: `Can I stop all ${s.name} emails, or only marketing?`, a: `You can turn off marketing and most notification emails, but account, security, and transactional emails (confirmations, password changes, policy notices) usually cannot be disabled while your account is open. ${s.name} is no exception.` },
    { q: `How do I delete the ${s.name} emails already in my inbox?`, a: `In Gmail on desktop, search ${fromQuery(s)}, click the select-all checkbox, then "Select all conversations that match this search", and press delete. Empty Trash afterward. MailMop can do this across every sender in your inbox at once.` },
  ]
  return faqs.map((f) => `  - question: ${JSON.stringify(clean(f.q))}\n    answer: ${JSON.stringify(clean(f.a))}`).join('\n')
}

const listTypes = (s) => {
  const t = s.emailTypes.map(clean)
  if (t.length === 1) return t[0]
  return t.slice(0, -1).join(', ') + ', and ' + t[t.length - 1]
}
const fromQuery = (s) => {
  const dom = (s.fromAddresses && s.fromAddresses[0] && s.fromAddresses[0].includes('@'))
    ? s.fromAddresses[0].split('@')[1]
    : (s.fromAddresses && s.fromAddresses[0]) || `${s.slug}`
  return '`from:' + dom + '`'
}

function render(s) {
  const fromAddrLine = s.fromAddresses && s.fromAddresses.length
    ? `Its email comes from ${s.fromAddresses.map((a) => '`' + clean(a) + '`').join(', ')}.`
    : ''
  const oneClickLine = s.oneClick === 'yes'
    ? `${s.name} supports Gmail's one-click unsubscribe, so you can also use the Unsubscribe link Gmail shows next to the sender name.`
    : ''
  const prefStep = s.preferenceUrl
    ? `Open ${s.name}'s email or notification settings at [${s.preferenceUrl}](${s.preferenceUrl})${s.preferenceSteps ? ` (${clean(s.preferenceSteps)})` : ''} and turn off the categories you don't want.`
    : `Open ${s.name}'s settings (${clean(s.preferenceSteps)}) and turn off the categories you don't want.`
  const tipsSection = s.tips && s.tips.length
    ? `\n## A couple of ${s.name}-specific tips\n\n${s.tips.map((t) => `- ${clean(t)}`).join('\n')}\n`
    : ''

  const quick = `To stop ${s.name} emails, open a recent ${s.name} email and unsubscribe, then go to your ${s.name} notification settings${s.preferenceUrl ? ` at ${s.preferenceUrl}` : ''} and switch off the categories you don't want. ${s.name} controls its email by category, so one unsubscribe click usually stops only a single type. To clear the backlog, search ${fromQuery(s)} in Gmail and bulk delete.`

  return `---
title: ${JSON.stringify(`How to Stop ${s.name} Emails: Unsubscribe for Good (2026)`)}
description: ${JSON.stringify(`Getting too many ${s.name} emails? Here's how to stop ${s.name} emails for good: unsubscribe, fix the settings that keep them coming, and clear out the ones already in your inbox.`)}
date: "2026-06-22"
updated: "2026-06-22"
author: "MailMop"
tags: ["unsubscribe", "gmail-cleanup", ${JSON.stringify(s.slug)}]
featured: false
faqs:
${faqsYaml(s)}
---

# How to Stop ${s.name} Emails

**Quick answer:** ${quick}

## What ${s.name} actually sends you

${s.name} sends ${listTypes(s)}. ${fromAddrLine} The reason your inbox fills up is that these are often separate lists or notification types, so switching off one doesn't stop the rest.

## How to stop ${s.name} emails, step by step

1. **Unsubscribe from a recent email.** Open a recent ${s.name} email and use its unsubscribe link. ${oneClickLine}
2. **Turn it off at the source.** ${prefStep}

## Does unsubscribing from ${s.name} actually work?

${clean(s.unsubscribeBehavior)} That's the part most "how to unsubscribe" guides miss, and it's why ${s.name} email often keeps arriving after people think they've opted out.

## Clear out the ${s.name} emails already in your inbox

Unsubscribing stops new mail. It doesn't remove what's already there. On desktop Gmail, search ${fromQuery(s)}, click the select-all checkbox, then click **"Select all conversations that match this search"**, and hit the trash icon. Empty Trash to reclaim the storage.

If ${s.name} is just one of many senders crowding your inbox, [MailMop](/) ranks every sender by volume so you can bulk delete and unsubscribe across all of them in one pass, in your browser. MailMop users have cleared [over 2 million emails](/blog/email-clutter-statistics-2026) this way.
${tipsSection}
## Related guides

- [How to unsubscribe from Gmail emails](/blog/how-to-unsubscribe-gmail-2026)
- [How to delete all emails from one sender in Gmail](/blog/delete-emails-from-one-sender-gmail)
- [The complete guide to cleaning up Gmail](/blog/clean-up-gmail)
`
}

function renderHub(senders) {
  const links = senders.map((s) => `- [How to stop ${s.name} emails](/blog/stop-${s.slug}-emails)`).join('\n')
  return `---
title: "How to Stop Unwanted Emails From Common Senders (2026)"
description: "Step-by-step guides to stop emails from the senders that crowd inboxes most, from LinkedIn and Amazon to Uber and Spotify, plus how to clear them out of Gmail fast."
date: "2026-06-22"
updated: "2026-06-22"
author: "MailMop"
tags: ["unsubscribe", "gmail-cleanup"]
featured: false
faqs:
  - question: "What's the fastest way to stop emails from a specific sender?"
    answer: "Unsubscribe from a recent email, then turn off the matching notification setting in that sender's account, since many senders keep sending notifications even after you unsubscribe from marketing. To clear the backlog, search from:thesender in Gmail and bulk delete."
  - question: "How do I stop emails from many senders at once?"
    answer: "Gmail makes you handle one sender at a time. MailMop ranks your whole inbox by sender so you can unsubscribe from and delete many senders in one pass, in your browser."
---

# How to Stop Unwanted Emails From Common Senders

Most inbox clutter comes from a small number of high-volume senders. Below are step-by-step guides for stopping the ones people ask about most. Each covers the catch that trips people up: unsubscribing from marketing often doesn't stop a sender's notification emails, which live in separate settings.

${links}

## Stop them all at once

Going sender by sender works, but it's slow. [MailMop](/) analyzes your whole Gmail inbox in your browser and ranks every sender by how much they send, so you can bulk unsubscribe and delete across all of them in a couple of minutes. See [the complete guide to cleaning up Gmail](/blog/clean-up-gmail) for the full approach.
`
}

function main() {
  if (!fs.existsSync(DATA)) { console.error('Missing senders.data.json'); process.exit(1) }
  const senders = JSON.parse(fs.readFileSync(DATA, 'utf8'))
  const passed = [], skipped = []
  for (const s of senders) {
    if (passesGate(s)) {
      fs.writeFileSync(path.join(OUT, `stop-${s.slug}-emails.mdx`), render(s))
      passed.push(s.slug)
    } else {
      skipped.push(s.slug || s.name)
    }
  }
  if (passed.length) {
    const passedSenders = senders.filter((s) => passed.includes(s.slug))
    fs.writeFileSync(path.join(OUT, 'how-to-stop-unwanted-emails.mdx'), renderHub(passedSenders))
  }
  console.log(`Generated ${passed.length} sender pages + hub. Passed: ${passed.join(', ')}`)
  if (skipped.length) console.log(`SKIPPED (failed quality gate, not published): ${skipped.join(', ')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
