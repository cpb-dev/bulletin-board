# Dev mode

Look at any theme on a real board, on any device, without changing the
board. Built for making themes (BB-36).

## Turning it on

Set `DEV_EMAILS` in Vercel (Production and Preview) to the email you sign
in with. Separate several with commas. It's server-only: never prefix it
`NEXT_PUBLIC_`. Redeploy, open a board, and the theme picker (🎨) has a
**🛠️ Dev** section at the bottom. Unset it to turn dev mode off for
everyone.

Locally, put it in `.env.local`.

## What it does

All of it is **on this device only, and nothing is saved**. The other
person keeps seeing the board as it is, and archived boards aren't touched.

- **Preview a theme.** Tap any theme in the Dev section to see the board
  in it. Tap it again, or **exit** on the banner, to go back.
- **Draft themes.** A theme with `status: "draft"` in its `palette.ts` is
  hidden from the normal picker and only shows up here. Delete the field
  to release it.
- **Time of day.** Force day, evening or night to check a theme's
  day/night cycle (BB-21). "Clock" goes back to the real time. A theme
  with no cycle stays in daylight, and a two-phase theme has no evening,
  just as it would live.
- **Sample notes.** Pin one note of every shape and paper, like
  `/dev/scene?notes=1`. They're for looking at: taps go straight through.

While anything is being previewed, a banner says so.

## Things to know

- You can still use the board normally while previewing. Notes you write
  use the board's **real** theme's papers, and you can only drag notes
  where the real theme has a board. So nothing saved can depend on a
  theme you were only previewing.
- The preview is remembered on the device until you exit it.
- `/dev/scene` and `/dev/model` are unchanged. They're still local-only and
  still the place for camera angles and screenshots.
