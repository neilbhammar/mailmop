import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  archiveSenders,
  batchArchiveMessages,
  buildArchiveQuery,
  isArchivableSenderEmail,
  ARCHIVE_MODIFY_BATCH_SIZE,
  type ArchiveSendersDeps,
} from './archiveSenders'

/**
 * Archiving in Gmail means removing the INBOX label. Nothing is deleted, but a
 * bad query here could quietly empty someone's whole inbox, so most of these
 * tests are about scoping: only this sender, only what is still in the inbox,
 * and never a query without a sender in it.
 */

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`)

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

describe('buildArchiveQuery', () => {
  it('targets only this sender and only mail still in the inbox', () => {
    expect(buildArchiveQuery('news@example.com')).toBe('-from:me from:news@example.com in:inbox')
  })

  it('trims surrounding whitespace', () => {
    expect(buildArchiveQuery('  news@example.com ')).toBe('-from:me from:news@example.com in:inbox')
  })

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['no @', 'newsletter'],
    ['inner space (would widen the search)', 'a b@example.com'],
    ['search operators smuggled in', 'a@example.com OR in:inbox'],
    ['parentheses', 'a@example.com)'],
    ['quotes', '"a"@example.com'],
    ['nothing before @', '@example.com'],
    ['nothing after @', 'a@'],
  ])('refuses a sender that is %s', (_label, email) => {
    expect(isArchivableSenderEmail(email)).toBe(false)
    expect(() => buildArchiveQuery(email)).toThrow()
  })

  it('accepts ordinary addresses, including plus and dotted ones', () => {
    for (const email of ['a@b.co', 'first.last+promo@mail.example.org', 'no-reply@x.io']) {
      expect(isArchivableSenderEmail(email)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// The Gmail write
// ---------------------------------------------------------------------------

describe('batchArchiveMessages', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  const ok = () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({}) })
  const fail = () => ({
    ok: false,
    status: 500,
    statusText: 'Backend Error',
    json: async () => ({ error: { message: 'Backend Error' } }),
  })

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('removes the INBOX label and adds nothing', async () => {
    fetchMock.mockResolvedValue(ok())
    await batchArchiveMessages('tok', ['m1', 'm2'])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify')
    expect(init.headers.Authorization).toBe('Bearer tok')
    const body = JSON.parse(init.body)
    expect(body).toEqual({ ids: ['m1', 'm2'], addLabelIds: [], removeLabelIds: ['INBOX'] })
  })

  it('splits at the 1,000-message API limit', async () => {
    fetchMock.mockResolvedValue(ok())
    await batchArchiveMessages('tok', ids('m', 2500))
    const sizes = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).ids.length)
    expect(sizes).toEqual([1000, 1000, 500])
  })

  it('does nothing for an empty list', async () => {
    await batchArchiveMessages('tok', [])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws when Gmail keeps refusing, instead of reporting success', async () => {
    fetchMock.mockResolvedValue(fail())
    const outcome = batchArchiveMessages('tok', ['m1']).then(
      () => 'resolved',
      (e: Error) => e
    )
    await vi.runAllTimersAsync()
    expect(await outcome).toBeInstanceOf(Error)
  })
})

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

type Pages = Record<string, string[][]> // query -> pages of ids

/** Fake Gmail: serves fixed pages per query and records every call in order. */
function fakeGmail(pages: Pages, opts: { failArchiveOnCall?: number; failListFor?: string } = {}) {
  const calls: string[] = []
  const archived: string[][] = []
  let archiveCalls = 0

  const listMessageIds: ArchiveSendersDeps['listMessageIds'] = vi.fn(async (token, query, pageToken) => {
    calls.push(`list:${query}:${pageToken ?? 'start'}:${token}`)
    if (opts.failListFor && query.includes(opts.failListFor)) throw new Error('list exploded')
    const forQuery = pages[query] ?? []
    const index = pageToken ? Number(pageToken) : 0
    const page = forQuery[index] ?? []
    const next = index + 1 < forQuery.length ? String(index + 1) : undefined
    return { messageIds: page, nextPageToken: next }
  })

  const archiveMessages: ArchiveSendersDeps['archiveMessages'] = vi.fn(async (token, batch) => {
    archiveCalls++
    calls.push(`archive:${batch.length}:${token}`)
    if (opts.failArchiveOnCall === archiveCalls) throw new Error('modify exploded')
    archived.push(batch)
  })

  return { calls, archived, listMessageIds, archiveMessages }
}

const q = (email: string) => buildArchiveQuery(email)

describe('archiveSenders', () => {
  it('archives every inbox email from each sender across pages', async () => {
    const gmail = fakeGmail({
      [q('a@x.com')]: [ids('a', 500), ids('a2', 120)],
      [q('b@y.com')]: [ids('b', 3)],
    })

    const result = await archiveSenders(['a@x.com', 'b@y.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.endType).toBe('success')
    expect(result.archivedCount).toBe(623)
    expect(result.perSender).toEqual({ 'a@x.com': 620, 'b@y.com': 3 })
    expect(gmail.archived.flat()).toHaveLength(623)
  })

  it('finds every ID before changing any labels', async () => {
    // Removing INBOX shrinks the in:inbox result set. Paging through it while
    // modifying would make page tokens skip mail, so listing must finish first.
    const gmail = fakeGmail({
      [q('a@x.com')]: [ids('a', 500), ids('a2', 500)],
      [q('b@y.com')]: [ids('b', 10)],
    })

    await archiveSenders(['a@x.com', 'b@y.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    const firstArchive = gmail.calls.findIndex(c => c.startsWith('archive'))
    const lastList = gmail.calls.map(c => c.startsWith('list')).lastIndexOf(true)
    expect(firstArchive).toBeGreaterThan(lastList)
  })

  it('writes in batches no larger than the API limit', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 500), ids('b', 500), ids('c', 500)] })

    await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(gmail.archived.map(b => b.length)).toEqual([ARCHIVE_MODIFY_BATCH_SIZE, 500])
  })

  it('does not count the same message twice if Gmail repeats it across pages', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [['m1', 'm2'], ['m2', 'm3']] })

    const result = await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.archivedCount).toBe(3)
    expect(gmail.archived.flat().sort()).toEqual(['m1', 'm2', 'm3'])
  })

  it('treats a sender with nothing left in the inbox as done, not an error', async () => {
    const gmail = fakeGmail({})

    const result = await archiveSenders(['gone@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result).toMatchObject({ endType: 'success', archivedCount: 0, perSender: { 'gone@x.com': 0 } })
    expect(gmail.archiveMessages).not.toHaveBeenCalled()
  })

  it('skips senders it cannot safely search for, and never sends a sender-less query', async () => {
    const gmail = fakeGmail({ [q('ok@x.com')]: [ids('ok', 2)] })

    const result = await archiveSenders(['', 'ok@x.com', 'bad address@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.endType).toBe('success')
    expect(result.archivedCount).toBe(2)
    expect(result.skippedSenders).toEqual(['', 'bad address@x.com'])
    for (const [, query] of (gmail.listMessageIds as any).mock.calls) {
      expect(query).toMatch(/ from:\S+@\S+ in:inbox$/)
    }
  })

  it('reports progress against the real total once it is known', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 500), ids('a2', 500), ids('a3', 200)] })
    const onProgress = vi.fn()

    await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
      onProgress,
    })

    const archivingCalls = onProgress.mock.calls.filter(([, total]) => total === 1200)
    expect(archivingCalls[0]).toEqual([0, 1200])
    expect(archivingCalls.at(-1)).toEqual([1200, 1200])
  })

  it('fetches a fresh token for every Gmail request so long runs survive expiry', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 500), ids('a2', 500), ids('a3', 500)] })
    let n = 0
    const getAccessToken = vi.fn(async () => `tok${++n}`)

    await archiveSenders(['a@x.com'], {
      getAccessToken,
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    // 3 list pages + 2 archive batches
    expect(getAccessToken).toHaveBeenCalledTimes(5)
    expect(gmail.calls.at(-1)).toBe('archive:500:tok5')
  })

  it('stops before touching anything if cancelled while listing', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 500), ids('a2', 500)] })
    let listed = 0
    const listMessageIds: ArchiveSendersDeps['listMessageIds'] = async (...args) => {
      listed++
      return gmail.listMessageIds!(...args)
    }

    const result = await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds,
      archiveMessages: gmail.archiveMessages,
      isCancelled: () => listed >= 1,
    })

    expect(result.endType).toBe('user_stopped')
    expect(result.archivedCount).toBe(0)
    expect(gmail.archiveMessages).not.toHaveBeenCalled()
  })

  it('stops between batches if cancelled while archiving, keeping an honest count', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 500), ids('b', 500), ids('c', 500)] })

    const result = await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
      isCancelled: () => gmail.archived.length >= 1,
    })

    expect(result.endType).toBe('user_stopped')
    expect(result.archivedCount).toBe(1000)
    expect(result.perSender).toEqual({ 'a@x.com': 1000 })
  })

  it('reports only the batches that succeeded when a write fails', async () => {
    const gmail = fakeGmail(
      { [q('a@x.com')]: [ids('a', 500), ids('b', 500), ids('c', 500)] },
      { failArchiveOnCall: 2 }
    )

    const result = await archiveSenders(['a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.endType).toBe('runtime_error')
    expect(result.archivedCount).toBe(1000)
    expect(result.error).toMatch(/modify exploded/)
  })

  it('archives nothing if a search fails partway through listing', async () => {
    const gmail = fakeGmail(
      { [q('a@x.com')]: [ids('a', 5)], [q('b@y.com')]: [ids('b', 5)] },
      { failListFor: 'b@y.com' }
    )

    const result = await archiveSenders(['a@x.com', 'b@y.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.endType).toBe('runtime_error')
    expect(result.archivedCount).toBe(0)
    expect(gmail.archiveMessages).not.toHaveBeenCalled()
  })

  it('reports a token failure as an error rather than throwing', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 5)] })

    const result = await archiveSenders(['a@x.com'], {
      getAccessToken: async () => {
        throw new Error('Gmail authentication failed')
      },
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.endType).toBe('runtime_error')
    expect(result.error).toMatch(/authentication/)
  })

  it('handles an empty sender list', async () => {
    const result = await archiveSenders([], { getAccessToken: async () => 'tok' })
    expect(result).toMatchObject({ endType: 'success', archivedCount: 0, skippedSenders: [] })
  })

  it('processes each sender once even if listed twice', async () => {
    const gmail = fakeGmail({ [q('a@x.com')]: [ids('a', 4)] })

    const result = await archiveSenders(['a@x.com', 'a@x.com'], {
      getAccessToken: async () => 'tok',
      listMessageIds: gmail.listMessageIds,
      archiveMessages: gmail.archiveMessages,
    })

    expect(result.archivedCount).toBe(4)
    expect(gmail.listMessageIds).toHaveBeenCalledTimes(1)
  })
})
