import type { Fixture } from "./worldcup";

/**
 * A tiny built-in fallback so the World Cup board isn't empty before a
 * live API is configured. Only the confirmed host openers are included
 * (opponents shown as TBD); connect football-data.org for the full,
 * live fixture list and results. See docs/WORLDCUP.md.
 */
export const FALLBACK_FIXTURES: Fixture[] = [
  {
    id: "wc-open-1",
    utcDate: "2026-06-11T19:00:00Z",
    status: "scheduled",
    stage: "Group Stage",
    group: "Group A",
    home: "Mexico",
    away: "TBD",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "wc-open-2",
    utcDate: "2026-06-12T19:00:00Z",
    status: "scheduled",
    stage: "Group Stage",
    group: "Group B",
    home: "Canada",
    away: "TBD",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "wc-open-3",
    utcDate: "2026-06-12T22:00:00Z",
    status: "scheduled",
    stage: "Group Stage",
    group: "Group D",
    home: "USA",
    away: "TBD",
    homeScore: null,
    awayScore: null,
  },
  {
    id: "wc-final",
    utcDate: "2026-07-19T19:00:00Z",
    status: "scheduled",
    stage: "Final",
    group: null,
    home: "TBD",
    away: "TBD",
    homeScore: null,
    awayScore: null,
  },
];
