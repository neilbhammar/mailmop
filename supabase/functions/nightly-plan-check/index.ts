// File: supabase/functions/nightly-plan-check/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline CORS headers to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('Nightly plan check function initializing...');

Deno.serve(async (req) => {
  try {
    console.log('Nightly plan check invoked.');
    
    // Validate environment variables early
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables',
        details: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } } }
    );

    const now = new Date().toISOString();
    const sevenDaysFromNow = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();

    console.log('Checking for expired pro plans...');

    // 1. Check for expired pro plans and downgrade them
    const { data: expiredProfiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, plan_expires_at')
      .eq('plan', 'pro')
      .lt('plan_expires_at', now);

    if (fetchError) {
      console.error('Error fetching expired profiles:', fetchError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles', details: fetchError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let successfullyDowngraded = 0;
    let failedDowngrades = 0;

    if (expiredProfiles && expiredProfiles.length > 0) {
      console.log(`Found ${expiredProfiles.length} expired pro profile(s) to downgrade.`);

      for (const profile of expiredProfiles) {
        console.log(`Attempting to downgrade user: ${profile.user_id} (Email: ${profile.email}, Expired: ${profile.plan_expires_at})`);
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'free',
            plan_expires_at: null,
            plan_updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error(`Failed to downgrade user ${profile.user_id}:`, updateError.message);
          failedDowngrades++;
        } else {
          console.log(`Successfully downgraded user ${profile.user_id}.`);
          successfullyDowngraded++;
        }
      }
    } else {
      console.log('No expired pro plans found.');
    }

    console.log('Checking for subscriptions expiring in 7 days...');

    // 2. Check for subscriptions expiring in 7 days and send reminder emails
    const { data: expiringProfiles, error: expiringFetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, name as full_name, plan_expires_at, stripe_customer_id, cancel_at_period_end, last_upsell_nudge_sent')
      .eq('plan', 'pro')
      .gte('plan_expires_at', now) // Not expired yet
      .lte('plan_expires_at', sevenDaysFromNow) // But expiring within 7 days
      .not('stripe_customer_id', 'is', null);

    if (expiringFetchError) {
      console.error('Error fetching expiring profiles:', expiringFetchError.message);
      // Continue execution, don't fail completely
    }

    let remindersSent = 0;
    let remindersFailed = 0;

    if (expiringProfiles && expiringProfiles.length > 0) {
      console.log(`Found ${expiringProfiles.length} subscription(s) expiring in 7 days.`);

      for (const profile of expiringProfiles) {
        try {
          // Check if we've already sent a reminder recently using last_upsell_nudge_sent
          if (profile.last_upsell_nudge_sent) {
            const lastReminderDate = new Date(profile.last_upsell_nudge_sent);
            const daysSinceLastReminder = (Date.now() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastReminder < 30) {
              console.log(`Skipping reminder for ${profile.email} - last reminder sent ${Math.round(daysSinceLastReminder)} days ago`);
              continue;
            }
          }

          // Call the expiration reminder email function with database values
          const emailPayload = {
            user_id: profile.user_id,
            email: profile.email,
            full_name: profile.full_name || 'there',
            plan_expires_at: profile.plan_expires_at,
            cancel_at_period_end: profile.cancel_at_period_end || false,
            customer_id: profile.stripe_customer_id
          };

          console.log(`Sending expiration reminder for ${profile.email} (cancel_at_period_end: ${profile.cancel_at_period_end})`);

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-expiration-reminder-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify(emailPayload)
          });

          if (emailResponse.ok) {
            console.log(`Successfully sent expiration reminder to ${profile.email}`);
            remindersSent++;
          } else {
            const errorText = await emailResponse.text();
            console.error(`Failed to send expiration reminder to ${profile.email}:`, errorText);
            remindersFailed++;
          }

        } catch (error) {
          console.error(`Error processing expiration reminder for ${profile.email}:`, error.message);
          remindersFailed++;
        }
      }
    } else {
      console.log('No subscriptions expiring in 7 days found.');
    }

    const summary = {
      message: 'Nightly plan check completed.',
      expiredPlans: {
        found: expiredProfiles?.length || 0,
        successfullyDowngraded,
        failedDowngrades,
      },
      expirationReminders: {
        found: expiringProfiles?.length || 0,
        remindersSent,
        remindersFailed,
      }
    };
    
    console.log('Summary:', summary);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in nightly plan check function:', error.message);
    console.error('Stack trace:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      details: error.message,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 