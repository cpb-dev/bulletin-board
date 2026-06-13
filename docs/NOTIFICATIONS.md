# Phone notifications 🔔

When one of you pins a note or photo (or adds something to a list), the
other gets a phone notification. It's built on **Web Push**, which works
on:

- Android (Chrome/Edge) — installed PWA or browser tab
- iOS 16.4+ — **only when the app is installed** to the home screen
  (Add to Home Screen first, then open it and tap 🔔)
- Desktop Chrome/Edge/Firefox

It's opt-in per device: tap the 🔔 button in the top bar and allow
notifications. You can turn it off again any time with the same button.

## How it fits together

```
someone pins a note
   → row inserted into items / list_items
   → Database Webhook fires  ──POST──►  edge function `notify`
                                         → looks up everyone else's devices
                                         → sends a web-push to each
   → service worker (public/sw.js) shows the notification on the phone
```

The web app only ever holds the **public** VAPID key. The **private**
key lives exclusively in the edge function's secrets, so notifications
can't be spoofed from the browser.

## One-time setup (~10 min, needs a computer with the Supabase CLI)

### 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Keep the `Public Key` and `Private Key` it prints.

### 2. Add the public key to the web app

In Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = <the public key>
```

Redeploy. The 🔔 button will now appear in the app.

### 3. Deploy the edge function

```bash
# from the repo root, with the Supabase CLI installed & logged in
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy notify --no-verify-jwt

supabase secrets set \
  VAPID_PUBLIC_KEY="<public key>" \
  VAPID_PRIVATE_KEY="<private key>" \
  VAPID_SUBJECT="mailto:you@example.com"
```

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the
function automatically.)

### 4. Create the Database Webhooks

In the Supabase dashboard → **Database → Webhooks → Create a new hook**,
make **two** hooks (one each for the two tables):

- **Table:** `items` (then a second one for `list_items`)
- **Events:** Insert
- **Type:** Supabase Edge Functions → `notify`
- Method `POST`, default headers are fine.

That's it. Pin a note from one phone and the other should buzz. 🎉

## Notes & troubleshooting

- **iOS shows no 🔔 / nothing happens** — make sure you opened the app
  from the home-screen icon, not Safari. iOS only allows web push for
  installed PWAs.
- **Nothing arrives** — check the function logs in Supabase → Edge
  Functions → `notify` → Logs. Dead subscriptions (404/410) are pruned
  automatically.
- **You don't get notified of your own notes** — by design; the author's
  own devices are skipped.
- The whole feature is optional — the app works perfectly without any of
  this set up; the 🔔 button simply stays hidden until the public key is
  present.
