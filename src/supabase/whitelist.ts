import { supabase } from './client';

export async function isWhitelisted(email: string): Promise<boolean> {
  // TODO: Remove whitelist entirely - for now, allow all authenticated users
  // This effectively disables the beta waitlist system
  console.log('[Whitelist] Bypassing whitelist check - allowing all users');
  return true;
  
  /* Original whitelist logic (commented out):
  try {
    // Query the whitelist_emails table
    const { data, error } = await supabase
      .from('whitelist_emails')
      .select('email')
      .eq('email', email.toLowerCase());

    if (error) throw error;
    
    // If we found any rows, the email is whitelisted
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error('[Whitelist] Database query error:', error);
    return false;
  }
  */
} 