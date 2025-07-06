import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline CORS headers to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = 'Neil from MailMop <neil@notifications.mailmop.com>';

console.log('send-welcome-email function initializing...');

const getEmailTemplate = (firstName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #24292e; margin: 0; padding: 0;">
<div style="max-width: 560px; margin: 0; padding: 20px 10px;">
  <p style="margin: 0 0 25px;">Hey ${firstName}! Thanks for signing up for MailMop.</p>

  <p style="margin: 0 0 25px;">I built MailMop because my personal inbox was a disaster - 98,000 unread emails and overflowing Gmail storage, but no tool that let me clean it up without handing over full access to all my data.</p>

  <p style="margin: 0 0 15px;">I made MailMop because I wanted a tool that:</p>

  <div style="margin: 0 0 25px;">
    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• Runs entirely in your browser</strong>
    </p>

    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• Never sees or stores your email data</strong>
    </p>

    <p style="margin: 0 0 15px; padding-left: 20px;">
      <strong style="color: #4B0082;">• And helps you identify and clear inbox clutter in seconds</strong>
    </p>
  </div>

  <p style="margin: 0 0 25px;">You're all set! You can now start analyzing and cleaning your inbox right away. Just head to your dashboard to get started.</p>

  <p style="margin: 0 0 25px;">Also, MailMop is source-available! You can check out all the code here: <a href="https://github.com/neilbhammar/mailmop" style="color: #4B0082; text-decoration: underline;">github.com/neilbhammar/mailmop</a></p>

  <p style="margin: 0 0 25px;">Thanks again! I'm excited to help you reclaim your inbox.</p>

  <p style="margin: 0; color: #666;">Neil</p>
</div>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const payload = await req.json();
    console.log('Received payload for welcome email:', JSON.stringify(payload, null, 2));

    const user = payload.record;

    if (!user || !user.email) {
      console.error('User data or email missing in payload:', user);
      return new Response(JSON.stringify({ error: 'User email not found in payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const recipientEmail = user.email;
    const fullName = user.user_metadata?.full_name || user.name || 'there';
    // Extract first name only (up to first space)
    const firstName = fullName.split(' ')[0];

    console.log(`Attempting to send welcome email to: ${recipientEmail}`);

    const emailPayload = {
      from: SENDER_EMAIL,
      reply_to: 'neil@mailmop.com',
      to: [recipientEmail],
      subject: 'Welcome to MailMop!',
      html: getEmailTemplate(firstName),
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
    console.log(`Welcome email sent successfully to ${recipientEmail}. Resend ID:`, data.id);

    return new Response(JSON.stringify({ message: 'Welcome email sent successfully', resendResponse: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-welcome-email function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 