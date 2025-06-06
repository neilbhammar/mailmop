import { supabase } from './client';
import { logger } from '@/lib/utils/logger';

// Base function to fetch actions - keeps it reusable for different purposes
export async function getUserActions(userId: string) {
  const { data, error } = await supabase
    .from('actions')
    .select('*')
    .eq('user_id', userId);
    
  if (error) throw error;
  return data || [];
}

// Specific aggregation function for stats
export async function getActionStats(userId: string) {
  logger.debug('Fetching stats for user', { 
    component: 'actions',
    userId 
  });
  
  const { data, error } = await supabase
    .from('actions')
    .select('type, count')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    logger.error('Error fetching stats', { 
      component: 'actions',
      userId,
      error: error.message 
    });
    throw error;
  }

  logger.debug('Raw action data retrieved', { 
    component: 'actions',
    dataCount: data?.length || 0 
  });

  // Aggregate counts by type
  const result = (data || []).reduce((acc, action) => {
    acc[action.type] = (acc[action.type] || 0) + (action.count || 1);
    return acc;
  }, {} as Record<string, number>);

  logger.debug('Aggregated stats calculated', { 
    component: 'actions',
    result 
  });
  return result;
} 