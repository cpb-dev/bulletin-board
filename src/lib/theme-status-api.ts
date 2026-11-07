/**
 * Reading and changing theme status (BB-36). Kept out of `api.ts` so
 * pages that don't show a theme picker (memories, say) don't carry it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ThemeStatus, ThemeStatusRow } from "./theme-status";
/**
 * Every theme's live/draft row. Never throws: if the table can't be read
 * (not migrated yet, offline) this is null, and the picker falls back to
 * offering every theme — see `draftThemeIds`.
 */
export async function listThemeStatuses(
  supabase: SupabaseClient
): Promise<ThemeStatusRow[] | null> {
  try {
    const { data, error } = await supabase
      .from("theme_status")
      .select("theme_id, status");
    return error ? null : ((data ?? []) as ThemeStatusRow[]);
  } catch {
    return null;
  }
}

/**
 * Mark a theme live or under construction. Goes through /api/dev/themes,
 * which checks the caller is the developer — the table itself can't be
 * written from a browser.
 */
export async function setThemeStatus(
  themeId: string,
  status: ThemeStatus
): Promise<void> {
  const res = await fetch("/api/dev/themes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ themeId, status }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not change the theme's status.");
  }
}
