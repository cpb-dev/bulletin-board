# Phone notifications 🔔

When one of you pins a note or photo (or adds something to a list), the
other gets a phone notification. Built on **Web Push**, which works on:

- Android (Chrome/Edge) — installed PWA or browser tab
- iOS 16.4+ — **only when the app is installed** to the home screen
  (Add to Home Screen first, then open it and tap 🔔)
- Desktop Chrome/Edge/Firefox

It's opt-in per device: tap 🔔 in the top bar and allow notifications.

## How it works (no computer needed)

The notification sender is a normal API route that ships with the site
(`/api/notify` on Vercel), so there's **no CLI and nothing to deploy by
hand**. Every setting below is a form field in the Vercel or Supabase
dashboard — all doable from your phone.

```
someone pins a note
  → row inserted into items / list_items
  → Supabase Database Webhook  ──POST──►  https://your-app.vercel.app/api/notify
                                           → looks up the other person's devices
                                           → sends a web-push to each
  → service worker (public/sw.js) shows the notification
```

The browser only ever holds the **public** VAPID key; the private key
lives only in Vercel's server env, so pushes can't be spoofed.

## Setup, all from your phone (~10 min)

### 1. Generate VAPID keys

You don't need to — a fresh pair was generated for you (see the chat
where you asked). If you ever want your own, any "VAPID key generator"
web page works, or run `npx web-push generate-vapid-keys` on a computer.

You need three secret values handy:

- `VAPID_PUBLIC_KEY` — the public key
- `VAPID_PRIVATE_KEY` — the private key
- `NOTIFY_WEBHOOK_SECRET` — any long random string (a password)

### 2. Add environment variables in Vercel

Vercel → your project → **Settings → Environment Variables**. Add these
(scope them to Production + Preview + Development):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | your VAPID **public** key |
| `VAPID_PUBLIC_KEY` | the same public key |
| `VAPID_PRIVATE_KEY` | your VAPID **private** key |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `NOTIFY_WEBHOOK_SECRET` | your random secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → **service_role** key |

> The `service_role` key is powerful — it's only ever used server-side
> in the API route, never sent to the browser. Keep it out of any
> `NEXT_PUBLIC_` variable.

Then **redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the new
values take effect. The 🔔 button will now appear in the app.

### 3. Create the Database Webhooks in Supabase

Supabase dashboard → **Database → Webhooks → Create a new hook**. Make
**two** (one per table):

- **Name:** `notify-items` (then `notify-list-items`)
- **Table:** `items` (then `list_items`)
- **Events:** Insert
- **Type:** **HTTP Request**
- **Method:** `POST`
- **URL:** `https://YOUR-APP.vercel.app/api/notify`
- **HTTP Headers:** add one — `x-notify-secret` = your
  `NOTIFY_WEBHOOK_SECRET`

Save both. That's it. 🎉

### 4. Turn it on

Open the app on each phone, tap 🔔, allow notifications. Pin a note from
one phone — the other should buzz.

## Troubleshooting

- **No 🔔 button** — `NEXT_PUBLIC_VAPID_PUBLIC_KEY` isn't set, or you
  haven't redeployed since adding it.
- **iOS gets nothing** — open the app from the home-screen icon, not
  Safari; iOS only allows web push for installed PWAs.
- **Nothing arrives on Android either** — check the webhook fired:
  Supabase → Database → Webhooks → your hook → it logs each delivery and
  the response. A `401` means the `x-notify-secret` header doesn't match
  your env var; a `503` means a Vercel env var is missing.
- **You get pinged for your *own* notes** — run migration
  `0003_created_by_defaults.sql`. Until it's applied, new rows have no
  author, so the route can't tell which devices to skip. After it,
  authors are excluded automatically (and notes get their stamp).
- **iPhone gets nothing while Android works** — work through these in
  order; it's almost always one of them:
  1. **You're testing with your own account.** The author's own devices
     are skipped on purpose, so posting from the same account your
     iPhone is logged into will *never* notify that iPhone. Post from the
     **other person's** account (or a second account) to test it.
  2. **The iPhone never actually subscribed.** Open Supabase → Table
     Editor → `push_subscriptions`. There should be a row whose
     `endpoint` contains `apple` (`web.push.apple.com`). If it's missing,
     open the app **from the home-screen icon** (not Safari) and tap 🔔
     again — iOS only registers push for the installed PWA.
  3. **Apple is rejecting the push.** Open the webhook's delivery log
     (Supabase → Database → Webhooks → your hook) or Vercel → Functions
     logs. The `/api/notify` response now lists each device with its
     `host` and, on failure, the `statusCode`/`body` Apple returned. A
     `403`/`400` from `web.push.apple.com` almost always means the
     `VAPID_SUBJECT` env var is wrong — it must be `mailto:you@example.com`
     (a bare email is rejected by Apple; the route now auto-prefixes
     `mailto:` but re-deploy after fixing the var).
- The feature is fully optional — without these keys the 🔔 button simply
  stays hidden and everything else works.
