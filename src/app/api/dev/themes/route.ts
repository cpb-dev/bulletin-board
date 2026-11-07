import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDevRequest } from "@/lib/supabase/dev-auth";
import { parseStatusChange } from "@/lib/theme-status";
import { THEMES } from "@/themes";

export const dynamic = "force-dynamic";

/**
 * Mark a theme live or under construction (BB-36).
 *
 * `theme_status` has no write policies, so the browser can't change it.
 * This route is the only writer: it checks the caller is in DEV_EMAILS,
 * accepts only theme ids in the catalogue, and writes with the service
 * role key. Changing a theme's status only changes what the picker
 * offers; boards already using the theme render exactly as before.
 *
 *   POST { themeId: "christmas", status: "live" | "draft" }
 */
export async function POST(request: Request) {
  if (!(await isDevRequest())) {
    return NextResponse.json({ error: "not allowed" }, { status: 403 });
  }

  const change = parseStatusChange(
    await request.json().catch(() => null),
    THEMES.map((t) => t.id)
  );
  if (!change) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("theme_status").upsert({
    theme_id: change.themeId,
    status: change.status,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...change });
}
