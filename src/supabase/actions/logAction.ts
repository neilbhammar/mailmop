import { supabase } from '../client';
import { 
  SupabaseActionLog, 
  CreateActionLogParams, 
  ActionStatus, 
  ActionEndType 
} from '@/types/actions';

/**
 * Creates a new action log entry in Supabase
 * @param params The action log parameters
 * @returns The created action log with its Supabase ID
 */
export async function createActionLog(params: CreateActionLogParams): Promise<SupabaseActionLog> {
  const actionLog: Omit<SupabaseActionLog, 'id'> = {
    ...params,
    created_at: new Date().toISOString(),
    completed_at: null,
    end_type: null
  };

  const { data, error } = await supabase
    .from('actions')
    .insert(actionLog)
    .select()
    .single();

  if (error) {
    console.error('Failed to create action log:', error);
    throw error;
  }

  return data;
}

/**
 * Updates an existing action log in Supabase
 * @param id The Supabase action log ID
 * @param updates The fields to update
 */
export async function updateActionLog(
  id: string,
  updates: Partial<{
    status: ActionStatus;
    count: number;
    completed_at: string;
    end_type: ActionEndType;
    notes: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to update action log:', error);
    throw error;
  }
}

/**
 * Completes an action log with final status and metadata
 * @param id The Supabase action log ID
 * @param endType Why the action ended
 * @param count Optional final count
 * @param notes Optional notes about completion
 */
export async function completeActionLog(
  id: string,
  endType: ActionEndType,
  count?: number,
  notes?: string
): Promise<void> {
  await updateActionLog(id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    end_type: endType,
    ...(count !== undefined && { count }),
    ...(notes !== undefined && { notes })
  });
} 