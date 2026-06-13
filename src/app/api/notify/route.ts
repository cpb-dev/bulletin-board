import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { buildNotifyContent } from "@/lib/notify-content";

// web-push relies on Node crypto — must not run on the edge runtime.
export const runtime = "nodejs";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
}

/**
 * Called by a Supabase Database Webhook on INSERT into items / list_items.
 * Sends a web-push to the *other* member's devices. All config comes from
 * Vercel environment variables, so the whole feature can be turned on from
 * a phone (no CLI). See docs/NOTIFICATIONS.md.
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secret || !vapidPublic || !vapidPrivate || !serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  // Shared-secret check — the webhook sends this header.
  if (request.headers.get("x-notify-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  if (payload.type !== "INSERT" || !payload.record) {
    return NextResponse.json({ ok: true, skipped: "not an insert" });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@example.com",
    vapidPublic,
    vapidPrivate
  );
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const authorId = (payload.record.created_by as string | null) ?? null;

  let authorName = "Someone lovely";
  if (authorId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", authorId)
      .maybeSingle();
    if (profile?.display_name) authorName = profile.display_name;
  }

  const content = buildNotifyContent(payload.table, payload.record, authorName);
  if (!content) return NextResponse.json({ ok: true, skipped: "no content" });

  // Everyone except the author's own devices.
  let query = supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id");
  if (authorId) query = query.neq("user_id", authorId);
  const { data: subs } = await query;

  const message = JSON.stringify(content);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message
        );
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

  return NextResponse.json({ ok: true, sent: subs?.length ?? 0 });
}
