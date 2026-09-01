#!/usr/bin/env node
/*
 * Reads the two live experiments out of Supabase. Dependency-free, same shape as
 * scripts/seo/*.js: reads .env.local, talks to PostgREST.
 *
 *   node scripts/experiments/read.js
 *
 * Why this exists rather than the SQL in the docs: the arm columns on `profiles`
 * are only a cache. Assignment is a pure salted hash of user_id, so the truth is
 * recomputable here, which matters because the free-delete experiment did not
 * record its control arm before 2026-09-01. Grouping by the stored column alone
 * silently drops the control users written before then.
 *
 * Revenue per exposure is the number that actually decides the discount
 * experiment and it needs Stripe, which this does not touch. See §5 of
 * docs/experiments/2026-08-discount-ab-test.md.
 */
const fs = require('fs')
const path = require('path')

const FREE_DELETE_START = '2026-08-30'
const DISCOUNT_START = '2026-08-30'
/* Before this date the control arm was not logged. See §6 of the free-delete doc. */
const CONTROL_LOGGING_FIXED = '2026-09-01'

const env = {}
for (const line of fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

/*
 * Accounts to leave out of the results, comma-separated in
 * EXPERIMENT_EXCLUDE_EMAILS. This repo is public, so the list lives in
 * .env.local rather than here.
 *
 * Set it to your own test accounts. Testing the free delete takes a freebie and
 * testing checkout buys a Pro subscription, and both otherwise read as a real
 * user doing a real thing.
 */
const EXCLUDE_EMAILS = new Set(
  (env.EXPERIMENT_EXCLUDE_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
)

async function get(query) {
  const rows = []
  // PostgREST caps a page at 1000 rows and silently truncates, which has bitten
  // this codebase before (see the get_mailmop_stats migration comment).
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${URL}/rest/v1/${query}`, {
      headers: { ...H, Range: `${offset}-${offset + 999}` },
    })
    if (!res.ok) throw new Error(`${query}: ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

/* Must stay byte-identical to fnv1a in src/lib/{freeDelete,discount}Experiment.ts. */
function fnv1a(input) {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}
const freeDeleteArm = (userId) =>
  fnv1a(`free-delete-2026-08:${userId}`) % 100 < 50 ? 'free_delete' : 'control'
function discountArm(userId) {
  const b = fnv1a(`discount-abc-2026-08:${userId}`) % 100
  return b < 34 ? 'control' : b < 67 ? 'none' : 'early25'
}

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '-')

function table(rows) {
  const cols = Object.keys(rows[0] || {})
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)))
  const line = (cells) => cells.map((c, i) => String(c).padEnd(w[i])).join('  ')
  console.log('  ' + line(cols))
  console.log('  ' + line(w.map((n) => '-'.repeat(n))))
  for (const r of rows) console.log('  ' + line(cols.map((c) => r[c])))
}

;(async () => {
  const profiles = await get(
    'profiles?select=user_id,email,plan,created_at,plan_updated_at,discount_variant,discount_variant_assigned_at,free_delete_variant,free_delete_used_at,free_delete_count'
  )
  const byId = new Map(profiles.map((p) => [p.user_id, p]))
  const excluded = (id) => {
    const p = byId.get(id)
    return !p || EXCLUDE_EMAILS.has((p.email || '').toLowerCase())
  }

  console.log(`\nRead at ${new Date().toISOString()}`)
  console.log(
    EXCLUDE_EMAILS.size
      ? `Excluding ${EXCLUDE_EMAILS.size} own account(s), per EXPERIMENT_EXCLUDE_EMAILS`
      : 'Excluding nothing: set EXPERIMENT_EXCLUDE_EMAILS in .env.local to drop your own test accounts'
  )

  // ---------------------------------------------------------------- discount
  console.log('\n=== DISCOUNT A/B/C ===')
  const exposedD = profiles.filter(
    (p) =>
      p.discount_variant &&
      p.discount_variant_assigned_at >= DISCOUNT_START &&
      !EXCLUDE_EMAILS.has((p.email || '').toLowerCase())
  )
  const armsD = ['control', 'none', 'early25'].map((arm) => {
    const inArm = exposedD.filter((p) => p.discount_variant === arm)
    // Only a purchase after exposure can have been caused by it.
    const conv = inArm.filter(
      (p) => p.plan === 'pro' && p.plan_updated_at >= p.discount_variant_assigned_at
    )
    return { arm, exposures: inArm.length, converted: conv.length, conv_rate: pct(conv.length, inArm.length) }
  })
  table(armsD)
  const mismatchD = exposedD.filter((p) => p.discount_variant !== discountArm(p.user_id))
  console.log(
    mismatchD.length
      ? `  !! ${mismatchD.length} rows where the stored arm does not match the hash: ${mismatchD.map((p) => p.email).join(', ')}`
      : '  stored arm matches the hash on every row'
  )
  console.log('  revenue per exposure needs Stripe invoices; that is the number that decides this one')

  // ------------------------------------------------------------- free delete
  console.log('\n=== ONE FREE DELETE ===')
  /*
   * Denominator: everyone who hit a delete paywall by any route, in either arm.
   * Two sources, unioned, because neither is complete on its own:
   *   - free_delete_exposure  : treatment throughout, control only after the fix
   *   - premium_attempt/delete: every gated user, but a treatment user who is
   *                             GRANTED the freebie returns before the paywall
   *                             gate runs and so never logs one
   */
  const exposures = await get(
    `actions?select=user_id,notes,created_at&type=eq.free_delete_exposure&created_at=gte.${FREE_DELETE_START}`
  )
  const attempts = (
    await get(
      `actions?select=user_id,notes,created_at&type=eq.premium_attempt&created_at=gte.${FREE_DELETE_START}`
    )
  ).filter((a) => a.notes === 'delete')

  const firstSeen = new Map()
  for (const a of [...exposures, ...attempts]) {
    if (excluded(a.user_id)) continue
    const prev = firstSeen.get(a.user_id)
    if (!prev || a.created_at < prev) firstSeen.set(a.user_id, a.created_at)
  }

  const armsF = ['free_delete', 'control'].map((arm) => {
    const ids = [...firstSeen.keys()].filter((id) => freeDeleteArm(id) === arm)
    const used = ids.filter((id) => byId.get(id).free_delete_used_at)
    const conv = ids.filter(
      (id) => byId.get(id).plan === 'pro' && byId.get(id).plan_updated_at >= firstSeen.get(id)
    )
    return {
      arm,
      exposed: ids.length,
      used_freebie: arm === 'free_delete' ? used.length : '-',
      converted: conv.length,
      conv_rate: pct(conv.length, ids.length),
    }
  })
  table(armsF)
  console.log(
    `  arms are recomputed from user_id, so control users from before ${CONTROL_LOGGING_FIXED} are included`
  )

  const outcomes = {}
  for (const e of exposures) {
    if (excluded(e.user_id)) continue
    outcomes[e.notes] = (outcomes[e.notes] || 0) + 1
  }
  console.log('\n  exposure outcomes (rows, not users):')
  for (const [k, v] of Object.entries(outcomes).sort((a, b) => b[1] - a[1])) console.log(`    ${v}\t${k}`)

  const freebies = profiles
    .filter((p) => p.free_delete_used_at && !EXCLUDE_EMAILS.has((p.email || '').toLowerCase()))
    .sort((a, b) => a.free_delete_used_at.localeCompare(b.free_delete_used_at))
  console.log(`\n  freebies taken: ${freebies.length}`)
  for (const p of freebies) {
    console.log(
      `    ${p.free_delete_used_at.slice(0, 16)}  ${String(p.free_delete_count).padStart(6)} emails  ${p.email}  (now ${p.plan})`
    )
  }
  const counts = freebies.map((p) => p.free_delete_count).sort((a, b) => a - b)
  if (counts.length) {
    const total = counts.reduce((a, b) => a + b, 0)
    console.log(`    given away: ${total.toLocaleString()} emails, median ${counts[Math.floor(counts.length / 2)].toLocaleString()}, max ${counts[counts.length - 1].toLocaleString()}`)
  }

  // ------------------------------------------------------------------ nudges
  console.log('\n=== LIFECYCLE NUDGES ===')
  for (const type of ['activation_nudge_sent', 'paywall_nudge_sent']) {
    const sent = (await get(`actions?select=user_id,created_at&type=eq.${type}`)).filter(
      (a) => !excluded(a.user_id)
    )
    if (!sent.length) {
      console.log(`  ${type}: none sent yet`)
      continue
    }
    // Did the nudge move anyone? Cheap proxy: any action at all afterwards.
    const acted = []
    for (const s of sent) {
      const after = await get(
        `actions?select=type&user_id=eq.${s.user_id}&created_at=gt.${s.created_at}&limit=1`
      )
      if (after.length) acted.push(s.user_id)
    }
    const converted = sent.filter((s) => {
      const p = byId.get(s.user_id)
      return p && p.plan === 'pro' && p.plan_updated_at >= s.created_at
    })
    console.log(
      `  ${type}: ${sent.length} sent, ${acted.length} came back (${pct(acted.length, sent.length)}), ${converted.length} converted`
    )
  }
  console.log()
})().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})
