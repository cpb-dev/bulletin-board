/**
 * Web Push helpers. The pure functions here are unit-tested; the React
 * hook lives in use-push.ts and the actual delivery in the Supabase
 * edge function (supabase/functions/notify).
 */
import type { PushSubscriptionRow } from "./types";

/** A browser PushSubscription serialised via `.toJSON()`. */
export interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/**
 * VAPID public keys are URL-safe base64; the browser's
 * `pushManager.subscribe` wants a Uint8Array.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Flatten a browser subscription into the row we store. Returns null if
 * the subscription is missing the bits we need (so callers can bail
 * cleanly rather than write a broken row).
 */
export function subscriptionToRow(
  sub: PushSubscriptionJSON,
  userId: string
): PushSubscriptionRow | null {
  const endpoint = sub.endpoint;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (!endpoint || !p256dh || !auth) return null;
  return { user_id: userId, endpoint, p256dh, auth };
}

/** True if this browser can do Web Push at all. */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
