/**
 * World Cup feature — pure logic (dates, normalisation, grouping).
 * Kept separate from the rest of the app so it can be lifted out wholesale
 * when the tournament is over. Everything here is unit-tested.
 */

export interface WorldCupInfo {
  name: string;
  /** ISO date the tournament starts. */
  start: string;
  /** ISO date of the final. */
  end: string;
}

/**
 * FIFA World Cup 2026 (11 Jun – 19 Jul 2026). Adjust here if dates shift.
 * The board auto-retires ARCHIVE_GRACE_DAYS after `end`.
 */
export const WORLD_CUP: WorldCupInfo = {
  name: "World Cup 2026",
  start: "2026-06-11",
  end: "2026-07-19",
};

export const ARCHIVE_GRACE_DAYS = 2;

/** The exclusive theme id for the World Cup board (not user-selectable). */
export const WORLD_CUP_THEME_ID = "world-cup";

export type FixtureStatus = "scheduled" | "live" | "finished";

export interface Fixture {
  id: string;
  utcDate: string;
  status: FixtureStatus;
  /** e.g. "Group Stage", "Round of 16", "Final". */
  stage: string;
  group: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface FixtureGroup {
  label: string;
  fixtures: Fixture[];
}

/** When the board should be auto-archived (end + grace, end of that day). */
export function archiveCutoff(wc: WorldCupInfo = WORLD_CUP): Date {
  const d = new Date(`${wc.end}T23:59:59Z`);
  d.setUTCDate(d.getUTCDate() + ARCHIVE_GRACE_DAYS);
  return d;
}

/** Is the World Cup board still "live" (button shown, not yet archived)? */
export function isWorldCupActive(
  now: Date = new Date(),
  wc: WorldCupInfo = WORLD_CUP
): boolean {
  return now.getTime() <= archiveCutoff(wc).getTime();
}

/** Has the grace period passed, so the board should move to memories? */
export function worldCupArchiveDue(
  now: Date = new Date(),
  wc: WorldCupInfo = WORLD_CUP
): boolean {
  return !isWorldCupActive(now, wc);
}

// ---------- football-data.org normalisation ----------

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  stage?: string;
  group?: string | null;
  homeTeam?: { name?: string | null; shortName?: string | null };
  awayTeam?: { name?: string | null; shortName?: string | null };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function mapStatus(raw: string): FixtureStatus {
  const s = raw.toUpperCase();
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED" || s === "LIVE") return "live";
  return "scheduled";
}

/** Normalise the football-data.org /matches payload to our Fixture shape. */
export function normalizeFootballData(payload: unknown): Fixture[] {
  const matches =
    (payload as { matches?: FootballDataMatch[] })?.matches ?? [];
  return matches.map((m) => ({
    id: String(m.id),
    utcDate: m.utcDate,
    status: mapStatus(m.status ?? ""),
    stage: m.stage ? titleCase(m.stage) : "Fixtures",
    group: m.group ? titleCase(m.group) : null,
    home: m.homeTeam?.name ?? m.homeTeam?.shortName ?? "TBD",
    away: m.awayTeam?.name ?? m.awayTeam?.shortName ?? "TBD",
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  }));
}

// ---------- presentation helpers ----------

/** A scoreline ("2 – 1") for finished/live games, or the kickoff time. */
export function fixtureLine(f: Fixture): string {
  if (f.status !== "scheduled" && f.homeScore != null && f.awayScore != null) {
    return `${f.homeScore} – ${f.awayScore}`;
  }
  const d = new Date(f.utcDate);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Text used when a fixture is pinned to the board as a note. */
export function fixtureNoteText(f: Fixture): string {
  return `${f.home} ${fixtureLine(f)} ${f.away}`;
}

/** Group fixtures by stage (then sorted by kickoff) for the panel. */
export function groupFixtures(fixtures: Fixture[]): FixtureGroup[] {
  const order = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const arr = order.get(f.stage) ?? [];
    arr.push(f);
    order.set(f.stage, arr);
  }
  return Array.from(order.entries()).map(([label, fs]) => ({
    label,
    fixtures: fs
      .slice()
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
  }));
}
