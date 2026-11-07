import { NextResponse } from "next/server";
import { isDevRequest } from "@/lib/supabase/dev-auth";

export const dynamic = "force-dynamic";

/**
 * Is the signed-in person the developer? (BB-36)
 *
 * Decided on the server (see `isDevRequest`), so nobody else can switch
 * dev mode on from their browser. It only ever answers about the caller.
 */
export async function GET() {
  return NextResponse.json(
    { dev: await isDevRequest() },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
