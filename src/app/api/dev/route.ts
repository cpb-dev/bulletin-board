import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isDevEmail } from "@/lib/dev-preview";

export const dynamic = "force-dynamic";

/**
 * Is the signed-in person the developer? (BB-36)
 *
 * The answer is decided here, on the server, from the session cookie and
 * the server-only `DEV_EMAILS` env var, so the list of dev emails never
 * reaches a browser and nobody else can switch dev mode on from theirs.
 * It only ever answers about the caller: signed out, unconfigured or not
 * listed all read as `{ dev: false }`.
 *
 * What dev mode can do is deliberately harmless anyway — it changes what
 * one device shows and writes nothing — so this gate is about keeping the
 * tools out of the other person's way, not about protecting data.
 */
export async function GET() {
  const devEmails = process.env.DEV_EMAILS;
  if (!devEmails) return NextResponse.json({ dev: false });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // A read-only check: middleware already refreshes the session.
        setAll: () => {},
      },
    }
  );

  try {
    const { data } = await supabase.auth.getUser();
    return NextResponse.json(
      { dev: isDevEmail(data.user?.email, devEmails) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ dev: false });
  }
}
