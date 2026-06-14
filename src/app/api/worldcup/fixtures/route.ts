import { NextResponse } from "next/server";
import { normalizeFootballData, type Fixture } from "@/lib/worldcup";
import { FALLBACK_FIXTURES } from "@/lib/worldcup-fixtures";

export const runtime = "nodejs";
// Cache for 5 minutes so we don't hammer the upstream free tier.
export const revalidate = 300;

const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || "WC";

/**
 * Live World Cup fixtures & results. Uses football-data.org when
 * FOOTBALL_DATA_TOKEN is set (kept server-side), otherwise returns the
 * built-in fallback schedule so the board still works. See
 * docs/WORLDCUP.md for the (free) token setup.
 */
export async function GET() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return NextResponse.json({ source: "fallback", fixtures: FALLBACK_FIXTURES });
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION}/matches`,
      {
        headers: { "X-Auth-Token": token },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const json = await res.json();
    const fixtures: Fixture[] = normalizeFootballData(json);
    if (fixtures.length === 0) {
      return NextResponse.json({ source: "fallback", fixtures: FALLBACK_FIXTURES });
    }
    return NextResponse.json({ source: "football-data", fixtures });
  } catch {
    // Upstream hiccup — never break the board.
    return NextResponse.json({ source: "fallback", fixtures: FALLBACK_FIXTURES });
  }
}
