// File: supabase/functions/send-activation-nudge-email/index.ts
//
// Nudges people who created an account but never ran an analysis.
//
// Runs daily on pg_cron. Targets a rolling 24h-72h signup window on purpose:
// the welcome email fires within seconds of signup (before anyone could have
// activated), and then nothing follows. This fills that gap WITHOUT blasting the
// backlog of historical signups who never activated. Widening the window would mail
// all of them at once, which is a deliverability problem, not a growth one.
//
// Idempotency: an 'activation_nudge_sent' row in `actions` is the send record.
// Anyone with one is skipped, so re-running the function is safe.
//
// The targeting rules live in ../_shared/nudgeTargeting.ts and are unit tested.
// Keep decisions about WHO gets mailed there, not here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  computeWindow,
  selectActivationTargets,
  firstNameOf,
  exceedsCap,
} from '../_shared/nudgeTargeting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = 'Neil from MailMop <neil@notifications.mailmop.com>';
const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://mailmop.com';

// Safety rail: no single run should ever mail more than this. If a window bug or
// a backfill ever selects more, we stop and log instead of sending.
const MAX_SENDS_PER_RUN = 50;

const WINDOW_MIN_HOURS = 24;
const WINDOW_MAX_HOURS = 72;

const getEmailTemplate = (firstName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #24292e; margin: 0; padding: 0;">
<div style="max-width: 560px; margin: 0; padding: 20px 10px;">
  <p style="margin: 0 0 25px;">Hey ${firstName}, I noticed you signed up for MailMop but haven't run an analysis yet.</p>

  <p style="margin: 0 0 25px;">If something got in the way, I'd genuinely like to know. Just reply to this email and it comes straight to me.</p>

  <p style="margin: 0 0 25px;">If you just got busy, the first step takes about a minute. MailMop scans your inbox in your browser and shows you exactly which senders are responsible for the mess. Most people are surprised by what's at the top of the list.</p>

  <p style="margin: 0 0 25px;">
    <a href="${SITE_URL}/dashboard" style="display: inline-block; background: #4B0082; color: #ffffff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">Run your first analysis</a>
  </p>

  <p style="margin: 0 0 25px;">One thing worth repeating: the analysis happens entirely in your browser. I never see your emails, and MailMop doesn't store them anywhere.</p>

  <p style="margin: 0 0 25px;">Thanks,</p>

  <p style="margin: 0; color: #666;">Neil</p>

  <p style="margin: 30px 0 0; font-size: 13px; color: #999;">Don't want these? Just reply and I'll turn them off.</p>
</div>
</body>
</html>`;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !RESEND_API_KEY) {
      console.error('Missing environment variables', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasResend: !!RESEND_API_KEY,
      });
      return new Response(JSON.stringify({ error: 'Missing required environment variables' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } },
    });

    const { windowStart, windowEnd } = computeWindow(Date.now(), WINDOW_MIN_HOURS, WINDOW_MAX_HOURS);

    console.log(`[ActivationNudge] Window ${windowStart} .. ${windowEnd} (dryRun=${dryRun})`);

    const { data: candidates, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, name')
      .gte('created_at', windowStart)
      .lt('created_at', windowEnd);

    if (profileError) {
      console.error('[ActivationNudge] Failed to fetch profiles:', profileError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles', details: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!candidates || candidates.length === 0) {
      console.log('[ActivationNudge] No signups in window.');
      return new Response(JSON.stringify({ message: 'No candidates', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const candidateIds = candidates.map((c) => c.user_id);

    // One query for both disqualifiers: has already activated, or has already been nudged.
    const { data: actions, error: actionError } = await supabaseAdmin
      .from('actions')
      .select('user_id, type')
      .in('user_id', candidateIds)
      .in('type', ['analysis', 'activation_nudge_sent']);

    if (actionError) {
      console.error('[ActivationNudge] Failed to fetch actions:', actionError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch actions', details: actionError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const targets = selectActivationTargets(candidates, actions || []);

    console.log(`[ActivationNudge] ${candidates.length} in window, ${targets.length} need a nudge.`);

    if (exceedsCap(targets.length, MAX_SENDS_PER_RUN)) {
      console.error(`[ActivationNudge] ABORT: ${targets.length} targets exceeds MAX_SENDS_PER_RUN=${MAX_SENDS_PER_RUN}.`);
      return new Response(
        JSON.stringify({ error: 'Target count exceeds safety cap', targets: targets.length, cap: MAX_SENDS_PER_RUN }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({ message: 'Dry run', wouldSend: targets.length, emails: targets.map((t) => t.email) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const target of targets) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            reply_to: 'neil@mailmop.com',
            to: [target.email],
            subject: 'Did something get in the way?',
            html: getEmailTemplate(firstNameOf(target.name)),
            headers: {
              'List-Unsubscribe': '<mailto:neil@mailmop.com?subject=unsubscribe>',
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`[ActivationNudge] Resend error for ${target.email}: ${res.status}`, body);
          failed++;
          continue;
        }

        // Log the send. This is the idempotency record, so a failure here would
        // cause a duplicate on the next run. Log it loudly if that happens.
        const { error: logError } = await supabaseAdmin.from('actions').insert({
          user_id: target.user_id,
          type: 'activation_nudge_sent',
          status: 'completed',
          count: 1,
          notes: 'activation nudge, 24h no analysis',
        });

        if (logError) {
          console.error(`[ActivationNudge] SENT but FAILED TO LOG for ${target.user_id}:`, logError.message);
        }

        sent++;
      } catch (err) {
        console.error(`[ActivationNudge] Unexpected error for ${target.email}:`, err.message);
        failed++;
      }
    }

    console.log(`[ActivationNudge] Done. sent=${sent} failed=${failed}`);

    return new Response(JSON.stringify({ message: 'Activation nudge run complete', sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[ActivationNudge] Fatal:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
