// Supabase Edge Function: send a web-push notification to the *other*
// member whenever a note/photo or list item is added.
//
// Triggered by Database Webhooks (Database -> Webhooks) on INSERT into
// public.items and public.list_items. See docs/NOTIFICATIONS.md.
//
// Required function secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (provided automatically)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com)

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, unknown> | null;
}

interface Content {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Decide what the notification says based on what was just inserted. */
function buildContent(
  table: string,
  record: Record<string, unknown>,
  authorName: string
): Content | null {
  if (table === "items") {
    const kind = record.kind === "photo" ? "photo" : "note";
    const caption = String(record.content ?? "").trim();
    if (kind === "photo") {
      return {
        title: `${authorName} pinned a photo 📷`,
        body: caption || "Come see what they shared 💛",
        url: "/board",
        tag: "board-update",
      };
    }
    return {
      title: `${authorName} left you a note 💌`,
      body: caption.length > 80 ? caption.slice(0, 79) + "…" : caption || "♡",
      url: "/board",
      tag: "board-update",
    };
  }
  if (table === "list_items") {
    const text = String(record.content ?? "").trim();
    return {
      title: `${authorName} added to a list 📝`,
      body: text || "A new little thing to do together",
      url: "/lists",
      tag: "list-update",
    };
  }
  return null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response("ignored", { status: 200 });
    }

    const authorId = payload.record.created_by as string | null;

    // Author's display name (fallback to a sweet default).
    let authorName = "Someone lovely";
    if (authorId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", authorId)
        .maybeSingle();
      if (profile?.display_name) authorName = profile.display_name;
    }

    const content = buildContent(payload.table, payload.record, authorName);
    if (!content) return new Response("no content", { status: 200 });

    // Everyone *except* the author's own devices.
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
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            message
          );
        } catch (err) {
          // 404/410 means the subscription is dead — clean it up.
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

    return new Response(JSON.stringify({ sent: subs?.length ?? 0 }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(`error: ${(err as Error).message}`, { status: 500 });
  }
});
