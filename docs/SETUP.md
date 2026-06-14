# Go live from your phone 📱

Everything below works in a mobile browser — no laptop needed. Budget
about 15 minutes. You'll set up the database first, then the website,
then install it on both phones.

## 1. Create the Supabase project (~5 min)

1. Go to [supabase.com](https://supabase.com) → sign in (GitHub login
   is easiest) → **New project**.
2. Pick any name (e.g. `bulletin-board`), set a strong database
   password (you won't need it day-to-day), choose the region closest
   to home, and create the project on the **Free** plan.
3. While it spins up, open this repo on GitHub and view
   [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
   Tap **Raw** and copy the whole file.
4. In Supabase, open **SQL Editor** (left menu) → **New query** →
   paste the file.
5. **Important:** near the bottom, replace the two placeholder emails
   with your email and Kalli's email. These are the only two addresses
   that will ever be allowed to create an account.
6. Tap **Run**. You should see "Success. No rows returned".
7. Make sign-in instant (no confirmation emails to wait for on
   holiday): go to **Authentication → Sign In / Up → Email** and turn
   **off** "Confirm email".

## 2. Deploy to Vercel (~5 min)

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub →
   **Add New → Project** → import the `bulletin-board` repo.
2. Before deploying, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase: **Settings → API →
     Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page, the **anon public**
     key
   - `NEXT_PUBLIC_APP_NAME` — optional, whatever you want the app to be
     called (e.g. `Kalli & Me`)
3. Tap **Deploy**. Two minutes later you'll have a URL like
   `https://bulletin-board-xxxx.vercel.app`.

## 3. Sign up, both of you (~2 min)

1. Open the URL → **First time here? Create your account** → enter
   your name, email and a password. You'll land in the room. 🎉
2. Send Kalli the URL so she can do the same with her email.
3. Anyone else who tries gets told the board is private.

## 4. Put it on your home screens (~1 min)

- **iPhone:** open the URL in Safari → Share button → **Add to Home
  Screen**. It gets the cute cork icon and opens full-screen like a
  native app.
- **Android:** open it in Chrome → ⋮ menu → **Add to Home screen** (or
  the "Install app" prompt).

That's the "app" for now — the proper App Store / Play Store wrappers
use the exact same site later (see [MOBILE.md](MOBILE.md)).

## Already set up? Run the newer migrations

If your Supabase project predates a feature, open the SQL Editor and run
the migrations it's missing, in order — they only add tables/columns and
are safe on existing data:

- [`0002_lists_resize_push.sql`](../supabase/migrations/0002_lists_resize_push.sql) — lists, note resizing, notifications
- [`0003_created_by_defaults.sql`](../supabase/migrations/0003_created_by_defaults.sql) — stamps notes with their author, stops self-notifications
- [`0004_multiple_boards.sql`](../supabase/migrations/0004_multiple_boards.sql) — multiple named boards (the 🗂️ Boards dropdown)
- [`0005_worldcup_board.sql`](../supabase/migrations/0005_worldcup_board.sql) — the temporary World Cup board (see [docs/WORLDCUP.md](WORLDCUP.md))

(Fresh setups run `0001` through `0005` in order.)

## Optional: turn on phone notifications

Want a buzz when the other person pins a note or adds to a list? Follow
[docs/NOTIFICATIONS.md](NOTIFICATIONS.md) — it needs a couple of extra
keys and an edge function. The app works fine without it; the 🔔 button
just stays hidden until it's configured.

## Troubleshooting

- **"That email isn't on the guest list"** — the email you typed
  doesn't match a row in `allowed_members`. Fix it in Supabase →
  **Table Editor → allowed_members** (matching is case-insensitive).
- **"Check your email to confirm"** — you skipped step 1.7; either
  confirm via the email Supabase sent, or turn off email confirmation
  and sign in.
- **Photos don't appear** — make sure the SQL ran fully (it creates a
  private `photos` storage bucket at the end).
- **Changed your mind about a setting?** All env vars can be edited in
  Vercel → Project → Settings → Environment Variables (redeploy after).
