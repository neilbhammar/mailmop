'use client'

import { useCallback } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/supabase/client'
import { createActionLog } from '@/supabase/actions/logAction'
import {
  evaluateFreeDelete,
  assignFreeDeleteVariant,
  type FreeDeleteDecision,
} from '@/lib/freeDeleteExperiment'

/**
 * Bridges the free-delete gate to the app.
 *
 * The decision logic itself lives in src/lib/freeDeleteExperiment.ts and is pure,
 * so it can be exhaustively tested without React. This hook only supplies the
 * inputs (profile, plan, quota) and performs the two side effects: consuming the
 * quota, and recording the exposure.
 *
 * CONSUMPTION IS ATOMIC AND SERVER-SIDE. `consume_free_delete` is a Postgres
 * function guarded by `free_delete_used_at IS NULL`, so two tabs racing produce
 * exactly one winner. Never replace it with a client-side read-then-write.
 *
 * See docs/experiments/2026-08-free-delete-ab-test.md
 */
export function useFreeDelete() {
  const { user, profile } = useAuth()

  /**
   * Would a free delete be allowed for this target? Pure, no side effects, safe
   * to call during render or in a handler before doing anything destructive.
   */
  const evaluate = useCallback(
    (targetSenders: string[], emailCount: number | null | undefined): FreeDeleteDecision =>
      evaluateFreeDelete({
        userId: user?.id,
        plan: profile?.plan,
        freeDeleteUsedAt: profile?.free_delete_used_at,
        targetSenders,
        emailCount,
      }),
    [user?.id, profile]
  )

  /**
   * Spends the free delete. Returns true only if THIS call won the quota.
   *
   * Callers must treat a false return as "do not delete". A false result means
   * either the quota was already spent (possibly by another tab a millisecond
   * ago) or the write failed, and in both cases proceeding would hand out a
   * second freebie.
   */
  const consume = useCallback(
    async (senderEmail: string, emailCount: number): Promise<boolean> => {
      if (!user?.id) return false

      try {
        const { data, error } = await supabase.rpc('consume_free_delete', {
          p_sender: senderEmail,
          p_count: emailCount,
        })

        if (error) {
          console.error('[FreeDelete] consume_free_delete failed:', error.message)
          return false
        }

        // The RPC returns a boolean. Anything other than an explicit true is a
        // denial: fail closed rather than assume success on an unexpected shape.
        if (data !== true) {
          console.warn('[FreeDelete] quota already spent or refused by server')
          return false
        }

        return true
      } catch (err) {
        console.error('[FreeDelete] consume threw:', (err as Error).message)
        return false
      }
    },
    [user?.id]
  )

  /**
   * Records that the user was exposed to this experiment, in whichever arm.
   * Both arms are recorded: without the control arm there is no denominator.
   * Best effort, and never blocks the delete.
   */
  const recordExposure = useCallback(
    async (outcome: string) => {
      if (!user?.id) return
      const variant = assignFreeDeleteVariant(user.id)

      try {
        await createActionLog({
          user_id: user.id,
          type: 'free_delete_exposure',
          status: 'completed',
          count: 1,
          notes: `variant=${variant};outcome=${outcome}`,
        })
      } catch (err) {
        console.error('[FreeDelete] failed to log exposure:', (err as Error).message)
      }

      try {
        await supabase
          .from('profiles')
          .update({ free_delete_variant: variant })
          .eq('user_id', user.id)
          .is('free_delete_variant', null)
      } catch (err) {
        console.error('[FreeDelete] failed to persist variant:', (err as Error).message)
      }
    },
    [user?.id]
  )

  return { evaluate, consume, recordExposure }
}
