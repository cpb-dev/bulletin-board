import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The /dev model harness is a local-only tool. It never exists in a
  // production build (the page itself 404s there too), so this only
  // ever opens a hole while running `next dev`.
  if (
    process.env.NODE_ENV !== "production" &&
    request.nextUrl.pathname.startsWith("/dev/")
  ) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and PWA files.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
