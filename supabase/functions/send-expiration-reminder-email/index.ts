import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailRequest {
  user_id: string;
  email: string;
  full_name: string;
  plan_expires_at: string;
  cancel_at_period_end: boolean;
  customer_id: string;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: EmailRequest = await req.json();
    
    const {
      user_id,
      email,
      full_name,
      plan_expires_at,
      cancel_at_period_end,
      customer_id
    } = payload;

    // Extract first name only (up to first space)
    const firstName = full_name.split(' ')[0];

    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!resendApiKey || !supabaseServiceRoleKey || !stripeSecretKey) {
      throw new Error('Missing required environment variables');
    }

    // Create Stripe customer portal session for the personalized link
    const stripe = new (await import('https://esm.sh/stripe@13.11.0')).default(
      stripeSecretKey,
      { apiVersion: '2023-10-16' }
    );

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: 'http://localhost:3000/dashboard',
    });

    const portalUrl = portalSession.url;
    
    // For canceled subscriptions, use our custom renewal flow instead of portal
    const renewalUrl = cancel_at_period_end 
      ? 'http://localhost:3000/dashboard?renew=true'  // Custom renewal page
      : portalUrl;  // Regular portal for active subscriptions

    // Calculate days until expiration using plan_expires_at from database
    const expirationDate = new Date(plan_expires_at);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Determine email content based on auto-renew status from database
    let subject: string;
    let htmlContent: string;

    if (cancel_at_period_end) {
      // Auto-renew is OFF - expiration warning
      subject = "Your MailMop Pro is expiring";
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your MailMop Pro is Expiring</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937;">
  <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%); padding:32px 24px;">
      <div style="font-size:22px; font-weight:600; color:#ffffff;">Don't lose your inbox superpowers</div>
    </div>
    <div style="padding:32px 24px;">
      <p style="font-size:15px; margin-bottom:24px;">
        Hey ${firstName}! Your MailMop Pro plan is set to expire on <strong>${expirationDate.toLocaleDateString('en-US', { 
          month: 'long',
          day: 'numeric'
        })}</strong>. You'll lose access to powerful tools like:
      </p>
      
      <ul style="list-style:none; padding:0; margin:0 0 24px 0;">
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px;">🧹</span> One-click unsubscribe
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px;">🗑️</span> Bulk delete by sender
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px;">🏷️</span> Auto-apply labels
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563;">
          <span style="margin-right:12px;">🚫</span> Block senders and more...
        </li>
      </ul>

      <div style="text-align:center; margin-bottom:24px;">
        <a href="${renewalUrl}" style="display:inline-block; background:#3b82f6; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:8px; font-size:14px; font-weight:500;">Renew Pro Now</a>
      </div>

      <div style="background:#fef3cd; border:1px solid #f59e0b; border-radius:8px; padding:16px;">
        <div style="font-size:14px; color:#92400e;">⚠️ This is your final reminder before your account downgrades to free. Don't lose your progress.</div>
      </div>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Auto-renew is ON - renewal reminder
      subject = "Your Pro plan renews in " + daysUntilExpiration + " days";
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your MailMop Pro Renews in ${daysUntilExpiration} Days</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f2937;">
  <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#3b82f6 100%); padding:32px 24px;">
      <div style="font-size:22px; font-weight:600; color:#ffffff;">Your Pro Plan Renews in ${daysUntilExpiration} Days</div>
    </div>
    <div style="padding:32px 24px;">
      <div style="background:#f8fafc; border-left:4px solid #3b82f6; border-radius:8px; padding:20px; margin-bottom:32px;">
        <div style="font-size:14px; color:#6b7280;">Next billing date</div>
        <div style="font-size:18px; font-weight:500; margin-bottom:8px;">${expirationDate.toLocaleDateString('en-US', { 
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })} • $9/month</div>
        <div style="font-size:14px; color:#059669; font-weight:500;">✓ Auto-renew is ON</div>
      </div>

      <p style="font-size:15px; margin-bottom:24px;">Hey ${firstName}! You're all set — no action needed. But just a heads up: your Pro plan renews in ${daysUntilExpiration === 1 ? 'a day' : daysUntilExpiration + ' days'}. Here's what you're keeping access to:</p>

      <ul style="list-style:none; padding:0; margin:0 0 32px 0;">
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px; font-weight:bold;">✓</span> One-click unsubscribe
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563; margin-bottom:12px;">
          <span style="margin-right:12px; font-weight:bold;">✓</span> Bulk delete actions
        </li>
        <li style="display:flex; align-items:center; font-size:14px; color:#4b5563;">
          <span style="margin-right:12px; font-weight:bold;">✓</span> Filtering, Blocking, and more...
        </li>
      </ul>

      <div style="display:flex; justify-content:center; gap:12px; margin-bottom:24px;">
        <a href="http://localhost:3000/dashboard" style="background:#3b82f6; color:#fff; text-decoration:none; padding:12px 18px; border-radius:8px; font-size:14px; font-weight:500;">Open MailMop</a>
        <a href="${portalUrl}" style="background:#f3f4f6; color:#374151; text-decoration:none; padding:12px 18px; border-radius:8px; font-size:14px; font-weight:500;">Manage Billing</a>
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
    }

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
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();

    // Log the action in Supabase and update last_reminder_sent
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(
      'https://ucoacqalcpqrjrrqkizf.supabase.co',
      supabaseServiceRoleKey
    );

    await supabase
      .from('user_actions')
      .insert({
        user_id: user_id,
        action_type: cancel_at_period_end ? 'expiration_reminder_sent' : 'renewal_reminder_sent',
        details: {
          email_id: emailResult.id,
          days_until_expiration: daysUntilExpiration,
          cancel_at_period_end: cancel_at_period_end
        }
      });

    // Update the last_reminder_sent timestamp in profiles
    await supabase
      .from('profiles')
      .update({ last_reminder_sent: new Date().toISOString() })
      .eq('user_id', user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${cancel_at_period_end ? 'Expiration' : 'Renewal'} reminder email sent successfully`,
        email_id: emailResult.id
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error sending expiration reminder email:', error);
    
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
