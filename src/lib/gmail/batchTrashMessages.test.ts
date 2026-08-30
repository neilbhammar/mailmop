import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { batchTrashMessages } from './batchTrashMessages'

/**
 * The deletion loop in useDeleteWithExceptions counts a batch as processed the
 * moment the call it awaits returns without throwing, and then decrements the
 * sender's cached email count by that many. `batchDeleteMessages` throws on
 * failure, so that accounting holds. `processBatchModifyLabels` does NOT throw —
 * it returns a list of failed batch indices. Swapping one for the other
 * naively would silently report un-trashed mail as trashed.
 *
 * These tests exist mainly to pin the throwing contract.
 */

const TOKEN = 'ya29.test-token'
const ids = (n: number) => Array.from({ length: n }, (_, i) => `msg-${i}`)

let fetchMock: ReturnType<typeof vi.fn>

const okResponse = () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({}) })
const failResponse = (status = 500, message = 'Backend Error') => ({
  ok: false,
  status,
  statusText: message,
  json: async () => ({ error: { message } }),
})

/** Runs an operation to settlement while flushing the retry backoff sleeps. */
async function settle<T>(promise: Promise<T>): Promise<T | Error> {
  const captured = promise.then(
    (value) => value,
    (error: Error) => error
  )
  await vi.runAllTimersAsync()
  return captured
}

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

describe('batchTrashMessages request shape', () => {
  it('adds the TRASH label via the batchModify endpoint', async () => {
    fetchMock.mockResolvedValue(okResponse())

    await settle(batchTrashMessages(TOKEN, ['a', 'b', 'c']))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)

    const body = JSON.parse(init.body)
    expect(body.ids).toEqual(['a', 'b', 'c'])
    expect(body.addLabelIds).toEqual(['TRASH'])
  })

  it('removes no labels, so read state and every user label survive the move', async () => {
    // Gmail's own trash action only adds TRASH. Stripping UNREAD or INBOX here
    // would silently mark mail read, and would make an untrash land the message
    // somewhere the user did not leave it.
    fetchMock.mockResolvedValue(okResponse())

    await settle(batchTrashMessages(TOKEN, ['a']))

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.removeLabelIds).toEqual([])
  })

  it('makes no request at all for an empty id list', async () => {
    await settle(batchTrashMessages(TOKEN, []))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('batchTrashMessages chunking', () => {
  it('splits past the 1000-id API limit instead of dropping the overflow', async () => {
    // batchDeleteMessages truncates at 1000 and moves on. Doing that here would
    // report 1500 emails trashed while leaving 500 in the inbox.
    fetchMock.mockResolvedValue(okResponse())

    await settle(batchTrashMessages(TOKEN, ids(1500)))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const sent = fetchMock.mock.calls.flatMap(
      ([, init]) => JSON.parse(init.body).ids as string[]
    )
    expect(sent).toHaveLength(1500)
    expect(new Set(sent).size).toBe(1500)
    for (const [, init] of fetchMock.mock.calls) {
      expect(JSON.parse(init.body).ids.length).toBeLessThanOrEqual(1000)
    }
  })

  it('sends exactly one request at the limit', async () => {
    fetchMock.mockResolvedValue(okResponse())
    await settle(batchTrashMessages(TOKEN, ids(1000)))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('batchTrashMessages failure contract', () => {
  it('throws when a batch never succeeds', async () => {
    fetchMock.mockResolvedValue(failResponse())

    const result = await settle(batchTrashMessages(TOKEN, ['a', 'b']))

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toMatch(/trash/i)
  })

  it('throws when only one chunk of several fails', async () => {
    // Partial failure is the dangerous case: 1000 ids moved, 500 did not, and a
    // non-throwing helper would let the caller bank all 1500.
    fetchMock.mockImplementation((_url: string, init: any) => {
      const first = JSON.parse(init.body).ids[0]
      return Promise.resolve(first === 'msg-1000' ? failResponse() : okResponse())
    })

    const result = await settle(batchTrashMessages(TOKEN, ids(1500)))

    expect(result).toBeInstanceOf(Error)
  })

  it('throws when the network call itself rejects', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    const result = await settle(batchTrashMessages(TOKEN, ['a']))

    expect(result).toBeInstanceOf(Error)
  })

  it('surfaces an insufficient-scope 403 as an error rather than a silent no-op', async () => {
    fetchMock.mockResolvedValue(failResponse(403, 'insufficient authentication scopes'))

    const result = await settle(batchTrashMessages(TOKEN, ['a']))

    expect(result).toBeInstanceOf(Error)
  })

  it('retries a transient failure and resolves when the retry succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(failResponse(503, 'Service Unavailable'))
      .mockResolvedValue(okResponse())

    const result = await settle(batchTrashMessages(TOKEN, ['a']))

    expect(result).not.toBeInstanceOf(Error)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
  })

  it('resolves quietly on a clean run', async () => {
    fetchMock.mockResolvedValue(okResponse())
    const result = await settle(batchTrashMessages(TOKEN, ['a']))
    expect(result).toBeUndefined()
  })
})
