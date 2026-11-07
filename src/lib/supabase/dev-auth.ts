import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isDevEmail } from "@/lib/dev-preview";

/**
 * Server-only: is the person making this request the developer (BB-36)?
 *
 * Reads the session from the request cookies and checks its email
 * against the server-only `DEV_EMAILS` env var, so the list of dev
 * emails never reaches a browser. Signed out, unconfigured or not listed
 * all answer false.
 */
export async function isDevRequest(): Promise<boolean> {
  const devEmails = process.env.DEV_EMAILS;
  if (!devEmails) return false;

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
    return isDevEmail(data.user?.email, devEmails);
  } catch {
    return false;
  }
}
