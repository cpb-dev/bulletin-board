"use client";

import { usePush } from "@/lib/use-push";

/**
 * One-tap toggle for phone notifications on this device. Hidden
 * entirely when the browser can't do web push or the app hasn't been
 * given VAPID keys, so it never shows a dead control.
 */
export function NotificationBell() {
  const { status, busy, enable, disable } = usePush();

  if (status === "unsupported" || status === "unconfigured") return null;

  if (status === "subscribed") {
    return (
      <button
        className="cute-button ghost !px-3 !py-2 text-sm"
        onClick={disable}
        disabled={busy}
        aria-label="Turn off notifications on this device"
        title="Notifications on"
      >
        🔔
      </button>
    );
  }

  if (status === "denied") {
    return (
      <button
        className="cute-button ghost !px-3 !py-2 text-sm opacity-60"
        onClick={() =>
          alert(
            "Notifications are blocked in your browser settings for this site. Enable them there to get pinged when a new note lands 💌"
          )
        }
        aria-label="Notifications blocked"
        title="Notifications blocked"
      >
        🔕
      </button>
    );
  }

  return (
    <button
      className="cute-button !px-3 !py-2 text-sm"
      onClick={enable}
      disabled={busy}
      aria-label="Turn on notifications"
    >
      {busy ? "…" : "🔔 notify me"}
    </button>
  );
}
