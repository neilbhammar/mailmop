// File: supabase/functions/send-paywall-nudge-email/index.ts
//
// Nudges people who hit the Pro paywall, did not buy, and are still on free a day later.
//
// Runs daily on pg_cron over a rolling 24h-72h window of `premium_attempt` actions.
// The window is deliberate: it catches fresh intent without mailing everyone who
// hit a paywall months ago and moved on.
//
// This is distinct from send-premium-upsell-email, which fires immediately off a
// DB trigger on the premium_attempt itself. This one is the follow-up a day later.
//
// DISCOUNT EXPERIMENT: the offer in this email is driven by profiles.discount_variant
// so the email and the in-app toast always agree. Users with no assignment get no
// discount mentioned. See docs/experiments/2026-08-discount-ab-test.md
//
// STATS: every number in this email is computed live from the actions table. Do not
// replace these with estimates. They are real and they are already impressive.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  computeWindow,
  selectPaywallTargets,
  uniqueUserIds,
  firstNameOf,
  roundStats,
  offerForVariant,
  exceedsCap,
} from '../_shared/nudgeTargeting.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = 'Neil from MailMop <neil@notifications.mailmop.com>';
const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://mailmop.com';

const MAX_SENDS_PER_RUN = 50;
const WINDOW_MIN_HOURS = 24;
const WINDOW_MAX_HOURS = 72;

// Fallback only, used if the live stats query fails. Snapshot taken 2026-08-30.
const FALLBACK_STATS = { totalDeleted: 2_356_927, avgPerProUser: 36_630 };

const getEmailTemplate = (
  firstName: string,
  stats: { totalDeleted: number; avgPerProUser: number },
  offer: { code: string; label: string } | null
) => {
  const fmt = (n: number) => n.toLocaleString('en-US');

  const offerBlock = offer
    ? `<p style="margin: 0 0 25px;">If it helps, here's ${offer.label}. Use code <strong style="color: #4B0082;">${offer.code}</strong> at checkout.</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 1.6; color: #24292e; margin: 0; padding: 0;">
<div style="max-width: 560px; margin: 0; padding: 20px 10px;">
  <p style="margin: 0 0 25px;">Hey ${firstName}, you ran into the Pro wall yesterday. I wanted to give you the honest pitch rather than let it sit there.</p>

  <p style="margin: 0 0 25px;">MailMop users have deleted <strong>${fmt(stats.totalDeleted)}</strong> emails so far. The average Pro user has cleared about <strong>${fmt(stats.avgPerProUser)}</strong> of them from their own inbox. Not over months of tidying, but in a handful of sessions, because deleting by sender is just faster than deleting one message at a time.</p>

  <p style="margin: 0 0 25px;">Pro is $22.68 for the year. That is the whole price. No per-seat cost, no upsell after this one.</p>

  ${offerBlock}

  <p style="margin: 0 0 25px;">
    <a href="${SITE_URL}/dashboard" style="display: inline-block; background: #4B0082; color: #ffffff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade to Pro</a>
  </p>

  <p style="margin: 0 0 25px;">And if it's not worth it to you, that's a completely fine answer. The free analysis stays free, and you can keep using it. If there's something specific that stopped you, reply and tell me. I read all of these.</p>

  <p style="margin: 0 0 25px;">Thanks,</p>

  <p style="margin: 0; color: #666;">Neil</p>

  <p style="margin: 30px 0 0; font-size: 13px; color: #999;">Don't want these? Just reply and I'll turn them off.</p>
</div>
</body>
</html>`;
};

/**
 * Live aggregate stats for the email copy.
 *
 * Uses the get_mailmop_stats() RPC rather than selecting rows and summing here.
 * The first version of this did the sum in JS over a PostgREST select, which
 * silently truncated at the default 1000-row page limit and reported 560,000
 * a total roughly 4x below the real figure. An aggregate computed in the database
 * cannot be half-read.
 */
async function computeStats(supabaseAdmin: any) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_mailmop_stats').single();

    if (error || !data) throw new Error(error?.message || 'no stats returned');

    const totalDeleted = Number(data.total_deleted) || 0;
    const avgPerProUser = Number(data.avg_per_pro_user) || 0;

    if (totalDeleted <= 0 || avgPerProUser <= 0) {
      throw new Error(`implausible stats: total=${totalDeleted} avg=${avgPerProUser}`);
    }

    // Round down so the copy does not imply false precision. See roundStats tests.
    return roundStats(totalDeleted, avgPerProUser);
  } catch (err) {
    console.error('[PaywallNudge] Stats query failed, using fallback:', (err as Error).message);
    return roundStats(FALLBACK_STATS.totalDeleted, FALLBACK_STATS.avgPerProUser);
  }
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry_run') === 'true';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !RESEND_API_KEY) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Missing required environment variables' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } },
    });

    const { windowStart, windowEnd } = computeWindow(Date.now(), WINDOW_MIN_HOURS, WINDOW_MAX_HOURS);

    console.log(`[PaywallNudge] Window ${windowStart} .. ${windowEnd} (dryRun=${dryRun})`);

    // Who hit a paywall in the window?
    const { data: attempts, error: attemptError } = await supabaseAdmin
      .from('actions')
      .select('user_id')
      .eq('type', 'premium_attempt')
      .gte('created_at', windowStart)
      .lt('created_at', windowEnd);

    if (attemptError) {
      console.error('[PaywallNudge] Failed to fetch premium_attempts:', attemptError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch attempts', details: attemptError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const attemptIds = uniqueUserIds(attempts || []);

    if (attemptIds.length === 0) {
      console.log('[PaywallNudge] No paywall hits in window.');
      return new Response(JSON.stringify({ message: 'No candidates', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Still on free, and has an email.
    const { data: candidates, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, name, discount_variant')
      .in('user_id', attemptIds)
      .eq('plan', 'free');

    if (profileError) {
      console.error('[PaywallNudge] Failed to fetch profiles:', profileError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles', details: profileError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Already nudged?
    const { data: alreadySent, error: sentError } = await supabaseAdmin
      .from('actions')
      .select('user_id')
      .in('user_id', attemptIds)
      .eq('type', 'paywall_nudge_sent');

    if (sentError) {
      console.error('[PaywallNudge] Failed to fetch prior sends:', sentError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch prior sends', details: sentError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const targets = selectPaywallTargets(candidates || [], alreadySent || []);

    console.log(`[PaywallNudge] ${attemptIds.length} hit paywall, ${targets.length} need a nudge.`);

    if (exceedsCap(targets.length, MAX_SENDS_PER_RUN)) {
      console.error(`[PaywallNudge] ABORT: ${targets.length} targets exceeds MAX_SENDS_PER_RUN=${MAX_SENDS_PER_RUN}.`);
      return new Response(
        JSON.stringify({ error: 'Target count exceeds safety cap', targets: targets.length, cap: MAX_SENDS_PER_RUN }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (dryRun) {
      const stats = await computeStats(supabaseAdmin);
      return new Response(
        JSON.stringify({
          message: 'Dry run',
          wouldSend: targets.length,
          stats,
          recipients: targets.map((t) => ({ email: t.email, variant: t.discount_variant, offer: offerForVariant(t.discount_variant) })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const stats = await computeStats(supabaseAdmin);
    let sent = 0;
    let failed = 0;

    for (const target of targets) {
      const firstName = firstNameOf(target.name);
      const offer = offerForVariant(target.discount_variant);

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
            subject: 'About that Pro wall',
            html: getEmailTemplate(firstName, stats, offer),
            headers: {
              'List-Unsubscribe': '<mailto:neil@mailmop.com?subject=unsubscribe>',
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`[PaywallNudge] Resend error for ${target.email}: ${res.status}`, body);
          failed++;
          continue;
        }

        const { error: logError } = await supabaseAdmin.from('actions').insert({
          user_id: target.user_id,
          type: 'paywall_nudge_sent',
          status: 'completed',
          count: 1,
          notes: `paywall nudge, variant=${target.discount_variant || 'unassigned'}`,
        });

        if (logError) {
          console.error(`[PaywallNudge] SENT but FAILED TO LOG for ${target.user_id}:`, logError.message);
        }

        sent++;
      } catch (err) {
        console.error(`[PaywallNudge] Unexpected error for ${target.email}:`, err.message);
        failed++;
      }
    }

    console.log(`[PaywallNudge] Done. sent=${sent} failed=${failed}`);

    return new Response(JSON.stringify({ message: 'Paywall nudge run complete', sent, failed, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[PaywallNudge] Fatal:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
