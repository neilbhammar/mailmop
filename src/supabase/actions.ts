import { supabase } from './client';

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
  console.log('Fetching stats for user:', userId);
  
  const { data, error } = await supabase
    .from('actions')
    .select('type, count')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }

  console.log('Raw action data:', data);

  // Aggregate counts by type
  const result = (data || []).reduce((acc, action) => {
    acc[action.type] = (acc[action.type] || 0) + (action.count || 1);
    return acc;
  }, {} as Record<string, number>);

  console.log('Aggregated stats:', result);
  return result;
} 