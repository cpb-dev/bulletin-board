# iOS & Android 📱

## Today: the PWA (zero extra work)

The site is a installable PWA — manifest, icons, full-screen display.
**Add to Home Screen** on both phones (see SETUP.md step 4) and you
have an "app" with the cork-and-heart icon that opens straight into
the room. This is the recommended way to use it while you're away.

## Later: proper store wrappers with Capacitor

As requested, the native apps are thin wrappers around the deployed
site — the web app stays the single codebase. Capacitor is the
standard tool for exactly this. When you're back at a computer:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Our Little Board" com.ourlittleboard.app
cp mobile/capacitor.config.json capacitor.config.json
# edit capacitor.config.json: set server.url to your real Vercel URL
mkdir -p mobile/www && echo '<html></html>' > mobile/www/index.html
npx cap add ios       # needs a Mac with Xcode
npx cap add android   # needs Android Studio
npx cap open ios      # build & run on your phone
```

Because `server.url` points at production, the wrapper always shows
the latest deploy — you never resubmit to the stores for app changes.

Notes:
- The generated `ios/` and `android/` folders are vendor projects; add
  them to the repo when you create them (Capacitor expects them
  committed).
- Personal use doesn't require the stores at all: sideload via Xcode
  (free Apple ID, re-sign weekly, or pay the $99/yr developer fee for
  TestFlight) and via APK install on Android.
- If you later want push notifications ("Kalli pinned a note!"), that's
  the moment the wrapper earns its keep: `@capacitor/push-notifications`
  + a small Supabase Edge Function webhook. Not built yet.
