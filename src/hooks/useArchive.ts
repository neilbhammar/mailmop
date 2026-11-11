/**
 * useArchive.ts
 *
 * Archives every inbox email from one or more senders, run through the job queue.
 * The Gmail work lives in lib/gmail/archiveSenders (tested on its own); this hook
 * adds what needs React: the Pro check, token refresh and reauth prompt, action
 * logging, the wake lock and the toasts.
 *
 * Logged to Supabase as `modify_label` (removing INBOX) with `archive: true` in
 * the filters, because the actions table only accepts a fixed set of types.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

import { useAuth } from '@/context/AuthProvider'
import { useGmailPermissions } from '@/context/GmailPermissionsProvider'

import { archiveSenders, ArchiveSendersResult } from '@/lib/gmail/archiveSenders'
import { describeArchiveResult } from '@/lib/gmail/archiveCopy'
import { createActionLog, updateActionLog, completeActionLog } from '@/supabase/actions/logAction'
import {
  createActionLog as createLocalActionLog,
  updateSupabaseLogId,
  completeActionLog as completeLocalActionLog,
  clearCurrentActionLog,
} from '@/lib/storage/actionLog'
import { logger } from '@/lib/utils/logger'
import { acquireWakeLock, releaseWakeLock } from '@/lib/utils/wakeLock'
import { refreshStatsAfterAction } from '@/lib/utils/updateStats'
import { playSuccessMp3, playBigSuccessMp3 } from '@/lib/utils/sounds'

import { ArchiveJobPayload, ExecutorResult, ProgressCallback } from '@/types/queue'

const TWO_MINUTES_MS = 2 * 60 * 1000

interface ReauthModalState {
  isOpen: boolean
  type: 'expired'
  eta?: string
}

const showToast = (r: ArchiveSendersResult) => {
  const msg = describeArchiveResult(r)
  toast[msg.kind](msg.title, { description: msg.description })
}

export function useArchive() {
  const { user, plan } = useAuth()
  const {
    getAccessToken,
    forceRefreshAccessToken,
    peekAccessToken,
    tokenTimeRemaining,
    hasRefreshToken: isGmailConnected,
    isClientLoaded,
  } = useGmailPermissions()

  const [reauthModal, setReauthModal] = useState<ReauthModalState>({ isOpen: false, type: 'expired' })
  const closeReauthModal = useCallback(() => setReauthModal(prev => ({ ...prev, isOpen: false })), [])

  const runArchive = useCallback(
    async (
      senderEmails: string[],
      onProgress?: ProgressCallback,
      abortSignal?: AbortSignal
    ): Promise<ExecutorResult> => {
      const fail = (error: string): ExecutorResult => ({ success: false, error, processedCount: 0 })

      if (plan !== 'pro') {
        toast.error('Upgrade to Pro', { description: 'Archive is a Pro feature.' })
        return fail('Archive is a Pro feature')
      }
      if (!user?.id) {
        toast.error('You must be logged in to modify emails.')
        return fail('Not logged in')
      }
      if (!senderEmails.length) {
        toast.warning('No senders selected.')
        return fail('No senders selected')
      }
      if (!isClientLoaded) {
        toast.error('Gmail client not ready', { description: 'Please wait a moment and try again.' })
        return fail('Gmail client not loaded')
      }

      // How many inbox emails each sender has isn't known until we search, so
      // there is no up-front ETA for the reauth prompt.
      if (!isGmailConnected) {
        setReauthModal({ isOpen: true, type: 'expired' })
        return fail('Gmail not connected. Please reconnect.')
      }
      try {
        await getAccessToken()
      } catch {
        setReauthModal({ isOpen: true, type: 'expired' })
        return fail('Gmail authentication failed. Please reconnect.')
      }

      // Refreshes a little early so a token never expires mid-request, and asks
      // the user to reconnect if refreshing fails outright.
      const freshToken = async (): Promise<string> => {
        try {
          if (peekAccessToken() && tokenTimeRemaining() < TWO_MINUTES_MS) {
            return await forceRefreshAccessToken()
          }
          return await getAccessToken()
        } catch {
          setReauthModal({ isOpen: true, type: 'expired' })
          throw new Error('Gmail authentication failed. Please reconnect.')
        }
      }

      // --- Logging ---
      createLocalActionLog({
        clientActionId: uuidv4(),
        type: 'modify_label',
        estimatedRuntimeMs: 0,
        totalEmails: 0,
        totalEstimatedBatches: 0,
        query: `Archiving inbox emails from ${senderEmails.length} senders`,
      })
      let logId: string | undefined
      try {
        const log = await createActionLog({
          user_id: user.id,
          type: 'modify_label',
          status: 'started',
          filters: {
            archive: true,
            labelIds: ['INBOX'],
            actionType: 'remove',
            senderCount: senderEmails.length,
          },
        })
        logId = log.id
        if (logId) updateSupabaseLogId(logId)
      } catch (error) {
        logger.error('Failed to create action log', { component: 'useArchive', error })
        toast.error('Failed to start archiving.')
        clearCurrentActionLog()
        return fail('Failed to log action start')
      }

      let result: ArchiveSendersResult
      try {
        await acquireWakeLock()
        // 'marking' is the in-progress status the actions table accepts for
        // label changes ('modifying' is in the TS type but not the DB check).
        // Logging is bookkeeping: it must never stop the archive itself.
        if (logId) {
          await updateActionLog(logId, { status: 'marking' }).catch(error =>
            logger.error('Failed to update action log', { component: 'useArchive', error })
          )
        }

        result = await archiveSenders(senderEmails, {
          getAccessToken: freshToken,
          isCancelled: () => !!abortSignal?.aborted,
          onProgress,
        })
      } finally {
        await releaseWakeLock()
      }

      try {
        if (logId) await completeActionLog(logId, result.endType, result.archivedCount, result.error)
        completeLocalActionLog(result.endType, result.error)
      } catch (error) {
        logger.error('Failed to complete action log', { component: 'useArchive', error })
      }

      showToast(result)
      if (result.endType === 'success' && result.archivedCount > 0) {
        if (result.archivedCount > 100) playBigSuccessMp3()
        else playSuccessMp3()
        await refreshStatsAfterAction('modify_label')
      }

      return {
        success: result.endType === 'success',
        processedCount: result.archivedCount,
        error:
          result.endType === 'user_stopped'
            ? 'Operation cancelled by user'
            : result.error,
      }
    },
    [
      plan,
      user?.id,
      isClientLoaded,
      isGmailConnected,
      getAccessToken,
      forceRefreshAccessToken,
      peekAccessToken,
      tokenTimeRemaining,
    ]
  )

  // Keep the registered executor pointing at the latest closure without
  // re-registering on every render.
  const runRef = useRef(runArchive)
  useEffect(() => {
    runRef.current = runArchive
  }, [runArchive])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const executor = (payload: ArchiveJobPayload, onProgress: ProgressCallback, abortSignal: AbortSignal) =>
      runRef.current(
        payload.senders.map(s => s.email),
        onProgress,
        abortSignal
      )
    ;(window as any).__queueRegisterExecutor?.('archive', executor)
  }, [])

  return { reauthModal, closeReauthModal }
}
