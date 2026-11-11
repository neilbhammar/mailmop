/**
 * The toast shown when an archive run ends, as a pure function of its result.
 */
import type { ArchiveSendersResult } from './archiveSenders'

export interface ArchiveMessage {
  kind: 'success' | 'info' | 'warning' | 'error'
  title: string
  description: string
}

const fmt = (n: number) => n.toLocaleString('en-US')
const emails = (n: number) => `${fmt(n)} ${n === 1 ? 'email' : 'emails'}`
const senders = (n: number) => `${fmt(n)} ${n === 1 ? 'sender' : 'senders'}`

export function describeArchiveResult(r: ArchiveSendersResult): ArchiveMessage {
  if (r.endType === 'user_stopped') {
    return {
      kind: 'info',
      title: 'Archive stopped',
      description: `Archived ${emails(r.archivedCount)} before stopping.`,
    }
  }

  if (r.endType === 'runtime_error') {
    const partial = r.archivedCount > 0 ? ` ${emails(r.archivedCount)} were archived before it stopped.` : ''
    return {
      kind: 'error',
      title: 'Archive failed',
      description: `${r.error || 'Something went wrong.'}${partial}`,
    }
  }

  const searched = Object.keys(r.perSender).length
  const skipped = r.skippedSenders.length
  const skippedNote = skipped > 0 ? ` Skipped ${senders(skipped)} with an unusual address.` : ''

  if (r.archivedCount === 0) {
    return {
      kind: skipped > 0 ? 'warning' : 'info',
      title: 'Nothing to archive',
      description: `No emails from ${searched === 1 ? 'this sender' : 'these senders'} are in your inbox.${skippedNote}`,
    }
  }

  const sendersWithMail = Object.values(r.perSender).filter(n => n > 0).length
  return {
    kind: skipped > 0 ? 'warning' : 'success',
    title: `Archived ${emails(r.archivedCount)}`,
    description: `From ${senders(sendersWithMail)}. They're out of your inbox and still in All Mail.${skippedNote}`,
  }
}
