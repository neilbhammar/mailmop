import { useEffect, useState } from 'react'
import { getSenderActions, ACTION_CHANGE_EVENT, SenderAction } from '@/lib/storage/actionStorage'

interface ActionMeta {
  queued: boolean
  queuedAt?: number
  completed?: boolean
  completedAt?: number
  lastAction?: SenderAction
}

export function useSenderActionMeta(email: string, type?: SenderAction['type']): ActionMeta {
  const [meta, setMeta] = useState<ActionMeta>(() => calcMeta(email, type))

  useEffect(() => {
    const handler = () => setMeta(calcMeta(email, type))
    window.addEventListener(ACTION_CHANGE_EVENT, handler as EventListener)
    return () => window.removeEventListener(ACTION_CHANGE_EVENT, handler as EventListener)
  }, [email, type])

  return meta
}

function calcMeta(email: string, type?: SenderAction['type']): ActionMeta {
  const actions = getSenderActions(email)
  const relevant = type ? actions.filter(a => a.type === type) : actions
  let queued = false
  let queuedAt: number | undefined
  let completed = false
  let completedAt: number | undefined
  let lastAction: SenderAction | undefined

  if (relevant.length) {
    relevant.sort((a, b) => a.timestamp - b.timestamp)
    lastAction = relevant[relevant.length - 1]
    const pending = relevant.find(a => a.status === 'pending')
    if (pending) {
      queued = true
      queuedAt = pending.timestamp
    }
    const done = relevant.slice().reverse().find(a => a.status === 'completed')
    if (done) {
      completed = true
      completedAt = done.timestamp
    }
  }

  return { queued, queuedAt, completed, completedAt, lastAction }
} 