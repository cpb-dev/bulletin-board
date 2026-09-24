/**
 * The exported viewer's stand-in for `@/lib/supabase/client`.
 *
 * `scripts/build-viewer.mjs` aliases that module to this one, so the
 * board's own components — `PhotoMesh`, `HeldItem`, `useItemInteraction`
 * — run unchanged in the export without dragging Supabase, credentials
 * or a network call into it. That alias is the whole reason the offline
 * board is the *same* board: no forked copies of anything that draws.
 *
 * Every write is refused. The viewer is read-only twice over (the store
 * is put in read-only mode too), so nothing here should ever be reached.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { photoDataUrl } from "./memory";

const readOnly = { message: "This is an exported memory — it's read-only." };

/** A `.from(...)` chain that swallows whatever is called on it. */
function deadQuery(): unknown {
  const result = Promise.resolve({ data: null, error: readOnly });
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "order",
    "limit",
  ]) {
    chain[method] = () => chain;
  }
  chain.single = () => result;
  chain.maybeSingle = () => result;
  chain.then = result.then.bind(result);
  return chain;
}

export function createClient(): SupabaseClient {
  return {
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => {
          const url = photoDataUrl(path);
          return url
            ? { data: { signedUrl: url }, error: null }
            : {
                data: null,
                error: { message: "That photo isn't in this export." },
              };
        },
        upload: async () => ({ data: null, error: readOnly }),
        remove: async () => ({ data: null, error: readOnly }),
      }),
    },
    from: () => deadQuery(),
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: function () {
        return this;
      },
      unsubscribe: async () => "ok",
    }),
    removeChannel: async () => "ok",
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as SupabaseClient;
}
