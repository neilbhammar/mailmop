import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline CORS headers to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpsellEmailRequest {
  user_id: string;
  email: string;
  full_name: string;
  action_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: corsHeaders,
      status: 405,
    });
  }

  try {
    const payload: UpsellEmailRequest = await req.json();
    
    const {
      user_id,
      email,
      full_name,
      action_type
    } = payload;

    // Extract first name only (up to first space)
    const firstName = full_name.split(' ')[0];

    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePriceId = Deno.env.get('STRIPE_PRICE_ID');
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://mailmop.com';

    if (!resendApiKey || !supabaseServiceRoleKey || !stripeSecretKey || !stripePriceId) {
      throw new Error('Missing required environment variables');
    }

    // Create Stripe checkout session for one-click upgrade
    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'customer_email': email,
        'success_url': `${siteUrl}/dashboard?upgrade=success`,
        'cancel_url': `${siteUrl}/dashboard?upgrade=cancelled`,
        'line_items[0][price]': stripePriceId,
        'line_items[0][quantity]': '1',
        'allow_promotion_codes': 'true',
        'metadata[user_id]': user_id,
        'metadata[upgrade_source]': 'premium_upsell_email',
        'metadata[action_type]': action_type,
      }).toString(),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Stripe checkout session creation failed:', errorText);
      throw new Error(`Failed to create checkout session: ${errorText}`);
    }

    const checkoutSession = await checkoutResponse.json();
    const upgradeUrl = checkoutSession.url;

    // Determine action-specific messaging
    let actionMessage = '';
    let featureList = '';
    
    switch (action_type) {
      case 'bulk_delete':
        actionMessage = 'Tried to bulk delete emails? Smart move!';
        featureList = 'Bulk delete thousands of emails in seconds';
        break;
      case 'unsubscribe':
        actionMessage = 'Wanted to mass unsubscribe? Great idea!';
        featureList = 'One-click unsubscribe from multiple senders';
        break;
      case 'block_sender':
        actionMessage = 'Tried to block a sender? Perfect!';
        featureList = 'Block senders and auto-delete their emails';
        break;
      default:
        actionMessage = 'Tried a Pro feature? Good taste!';
        featureList = 'Unlock all premium inbox management tools';
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Unlock MailMop Pro Features</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937;">
  <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); padding:32px 24px;">
      <div style="font-size:22px; font-weight:600; color:#ffffff;">${actionMessage}</div>
    </div>
    <div style="padding:32px 24px;">
      <p style="font-size:15px; margin-bottom:24px;">
        Hey ${firstName}! I saw you tried to use a premium feature. You've got excellent taste – MailMop Pro is exactly what you need to take control of your inbox.
      </p>
      
      <div style="background:linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%); border-left:4px solid #6366f1; border-radius:8px; padding:20px; margin-bottom:24px;">
        <div style="font-size:16px; font-weight:500; margin-bottom:12px; color:#1e293b;">✨ ${featureList}</div>
        <div style="font-size:14px; color:#64748b;">Plus bulk actions, custom filters, sender blocking, and more...</div>
      </div>

      <ul style="list-style:none; padding:0; margin:0 0 32px 0;">
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px; font-weight:bold; color:#6366f1;">✓</span> Delete thousands of emails in seconds
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px; font-weight:bold; color:#6366f1;">✓</span> One-click mass unsubscribe
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px; font-weight:bold; color:#6366f1;">✓</span> Advanced filtering and exceptions
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563;">
          <span style="margin-right:12px; font-weight:bold; color:#6366f1;">✓</span> Block senders automatically
        </li>
      </ul>

      <div style="text-align:center; margin-bottom:24px;">
        <a href="${upgradeUrl}" style="display:inline-block; background:#6366f1; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-size:16px; font-weight:600; box-shadow:0 2px 4px rgba(99,102,241,0.2);">Upgrade to Pro - $1.89/mo</a>
      </div>

      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px;">
        <div style="font-size:14px; color:#166534;">
          🔒 MailMop runs 100% in your browser. We never see or store your emails.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Neil from MailMop <neil@notifications.mailmop.com>',
        reply_to: 'neil@mailmop.com',
        to: [email],
        subject: 'Unlock your inbox superpowers with MailMop Pro',
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();

    // Log the action in Supabase 
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      supabaseServiceRoleKey
    );

    await supabase
      .from('actions')
      .insert({
        user_id: user_id,
        type: 'premium_upsell_email_sent',
        status: 'completed',
        notes: `Upsell email sent for attempted ${action_type}. Checkout session: ${checkoutSession.id}`,
        count: 1
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Premium upsell email sent successfully',
        email_id: emailResult.id,
        checkout_session_id: checkoutSession.id,
        checkout_url: upgradeUrl
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error sending premium upsell email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 