"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  pushSupported,
  subscriptionToRow,
  urlBase64ToUint8Array,
} from "./push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushStatus =
  | "unsupported" // browser can't do web push
  | "unconfigured" // app has no VAPID key set
  | "default" // not asked yet
  | "denied" // user blocked notifications
  | "subscribed"; // good to go

/**
 * Manage this device's push subscription. Notifications are opt-in per
 * device, so the UI shows a single 🔔 toggle driven by `status`.
 */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return setStatus("unsupported");
    if (!VAPID_PUBLIC_KEY) return setStatus("unconfigured");
    if (Notification.permission === "denied") return setStatus("denied");

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) =>
        setStatus(sub ? "subscribed" : "default")
      )
      .catch(() => setStatus("default"));
  }, []);

  const enable = useCallback(async () => {
    if (!pushSupported() || !VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY
        ) as BufferSource,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const row = subscriptionToRow(sub.toJSON(), user.id);
      if (!row) return;
      await supabase
        .from("push_subscriptions")
        .upsert(row, { onConflict: "endpoint" });
      setStatus("subscribed");
    } catch {
      // Permission prompt dismissed or registration failed — stay put.
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const supabase = createClient();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch {
      /* best effort */
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}
