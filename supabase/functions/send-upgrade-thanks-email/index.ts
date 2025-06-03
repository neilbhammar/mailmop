import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = 'Neil from MailMop <neil@notifications.mailmop.com>';

console.log('send-upgrade-thanks-email function initializing...');

const getEmailTemplate = (firstName: string, expirationDate: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #24292e; margin: 0; padding: 0;">
<div style="max-width: 560px; margin: 0; padding: 20px 10px;">
  <p style="margin: 0 0 25px;">Hey ${firstName}! Thanks for upgrading to MailMop Pro!</p>

  <p style="margin: 0 0 25px; color: #4B0082;">I'm excited to help you get the most out of your inbox. Your Pro access is active until ${expirationDate}.</p>

  <p style="margin: 0 0 15px;">Here are my favorite Pro features that I use daily:</p>

  <div style="margin: 0 0 25px;">
    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• Bulk Delete:</strong> Mass delete thousands of emails in seconds with one click
    </p>

    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• One-Click Unsubscribe:</strong> Mass unsubscribe from senders with the touch of a button
    </p>

    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• Exceptions:</strong> Don't want to delete all your emails from JetBlue? Great, only delete ones from over a year ago that have the word "deal" - easy! Custom filters for every situation.
    </p>

    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• Block Senders:</strong> Senders not respecting your unsubscribe preferences? Boom. Blocked!
    </p>
  </div>

  <p style="margin: 0 0 25px;">Pro tip: You can select multiple senders at once to take actions across your entire inbox.</p>

  <p style="margin: 0 0 25px;">Have questions or need help getting started? Just reply to this email, and I'll help out.</p>

  <p style="margin: 0 0 25px;">Thanks again for your support! MailMop is source-available, so you can check out the code or contribute to the project here: <a href="https://github.com/neilbhammar/mailmop" style="color: #4B0082; text-decoration: underline;">github.com/neilbhammar/mailmop</a></p>

  <p style="margin: 0; color: #666;">Neil</p>
</div>
</body>
</html>`;

Deno.serve(async (req) => {
  // This function expects to be called by a Supabase Database Webhook
  // triggered on UPDATE of the 'profiles' table where plan becomes 'pro'.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const payload = await req.json();
    console.log('Received payload for upgrade thanks email:', JSON.stringify(payload, null, 2));

    // Database webhook payload for an UPDATE:
    // payload.type === 'UPDATE'
    // payload.table === 'profiles'
    // payload.record === new row data
    // payload.old_record === old row data (if enabled in webhook config)

    if (payload.type !== 'UPDATE' || !payload.record || !payload.old_record) {
      console.warn('Invalid payload type or missing record/old_record for upgrade email.', payload.type);
      return new Response(JSON.stringify({ error: 'Invalid payload for upgrade trigger' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newProfile = payload.record;
    const oldProfile = payload.old_record;

    // Check if the plan actually changed to 'pro' from something else
    if (newProfile.plan !== 'pro' || oldProfile.plan === 'pro') {
      console.log(`No actual upgrade to pro detected. Old plan: ${oldProfile.plan}, New plan: ${newProfile.plan}. Skipping email.`);
      return new Response(JSON.stringify({ message: 'No relevant plan change to pro.' }), {
        status: 200, // Not an error, just no action needed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newProfile.email) {
      console.error('User email missing in new profile data:', newProfile);
      return new Response(JSON.stringify({ error: 'User email not found in profile' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const recipientEmail = newProfile.email;
    const fullName = newProfile.name || 'there';
    // Extract first name only (up to first space)
    const firstName = fullName.split(' ')[0];
    
    const formattedDate = new Date(newProfile.plan_expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log(`Attempting to send upgrade thanks email to: ${recipientEmail}`);

    const emailPayload = {
      from: SENDER_EMAIL,
      reply_to: 'neil@mailmop.com',
      to: [recipientEmail],
      subject: 'Welcome to MailMop Pro! Here\'s how to get started',
      html: getEmailTemplate(firstName, formattedDate),
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Resend API error for ${recipientEmail}: ${res.status} ${res.statusText}`, errorBody);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: errorBody }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: res.status,
      });
    }

    const data = await res.json();
    console.log(`Upgrade thanks email sent successfully to ${recipientEmail}. Resend ID:`, data.id);

    return new Response(JSON.stringify({ message: 'Upgrade thanks email sent successfully', resendResponse: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-upgrade-thanks-email function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 