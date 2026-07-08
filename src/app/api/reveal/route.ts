import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { buildRevealNotification, revealDue } from "@/lib/surprise";
import type { Board } from "@/lib/types";

// web-push relies on Node crypto — must not run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The reveal sweep: finds surprise boards whose reveal moment has
 * passed but whose notification hasn't been sent, pushes the personal
 * message to everyone except the creator, and stamps revealed_at so it
 * only ever fires once.
 *
 * Board VISIBILITY needs no job at all — RLS flips it by time. This
 * route only delivers the moment's notification. It's called by the
 * Vercel cron (vercel.json) and opportunistically whenever the app is
 * opened, so the push lands promptly either way. Idempotent and safe
 * to call from anywhere: it reveals nothing in its response and only
 * acts on boards that are genuinely due.
 */
export async function POST() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Due = private board whose reveal time has passed, not yet announced.
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .not("private_to", "is", null)
    .not("reveal_at", "is", null)
    .is("revealed_at", null)
    .lte("reveal_at", new Date().toISOString());

  const due = ((boards ?? []) as Board[]).filter((b) => revealDue(b));
  if (due.length === 0) return NextResponse.json({ ok: true, revealed: 0 });

  const canPush = !!(vapidPublic && vapidPrivate);
  if (canPush) {
    const rawSubject = process.env.VAPID_SUBJECT?.trim();
    const subject = rawSubject
      ? /^(mailto:|https:)/i.test(rawSubject)
        ? rawSubject
        : `mailto:${rawSubject}`
      : "mailto:hello@example.com";
    webpush.setVapidDetails(subject, vapidPublic!, vapidPrivate!);
  }

  let sent = 0;
  for (const board of due) {
    // Mark first (idempotency): if two sweeps race, only one row update
    // wins the null -> timestamp transition.
    const { data: claimed } = await supabase
      .from("boards")
      .update({ revealed_at: new Date().toISOString() })
      .eq("id", board.id)
      .is("revealed_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) continue; // another sweep got it

    if (!canPush) continue; // visible via RLS anyway; push not configured

    let authorName = "Someone lovely";
    if (board.private_to) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", board.private_to)
        .maybeSingle();
      if (profile?.display_name) authorName = profile.display_name;
    }

    const content = buildRevealNotification(board, authorName);
    let query = supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");
    if (board.private_to) query = query.neq("user_id", board.private_to);
    const { data: subs } = await query;

    const message = JSON.stringify(content);
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
          }
        }
      })
    );
  }

  return NextResponse.json({ ok: true, revealed: due.length, sent });
}

/** Vercel cron calls GET; treat it exactly like POST. */
export async function GET() {
  return POST();
}
