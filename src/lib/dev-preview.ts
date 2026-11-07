/**
 * Dev mode (BB-36): look at any theme on a real board without saving it.
 *
 * The developer (whoever's email is in the server-only `DEV_EMAILS` env
 * var) gets a Dev section in the theme picker. Picking a theme there only
 * changes what this one device shows. It never writes `boards.theme` or
 * `secondary_theme`, so the other person's view, realtime sync and
 * archived boards are untouched. The same goes for the phase override and
 * the sample notes: both are local to this device and never saved.
 *
 * Everything here is pure (storage is passed in), so it's tested without a
 * browser — the same pattern as `theme-view.ts`.
 */

import type { DayCycle, DayPhase } from "./day-cycle";
import { resolvePhase } from "./day-cycle";
import type { BoardItem } from "./types";
import type { BoardTheme } from "@/themes/types";
import { browserStorage, type ThemeViewStorage } from "./theme-view";

/** What the developer is previewing on this device. */
export interface DevPreview {
  /** A theme to show instead of the board's own, or null for the real one. */
  themeId: string | null;
  /** Force a day-cycle phase, or null to follow the clock. */
  phase: DayPhase | null;
  /** Pin one note of every shape and paper (shown, never saved). */
  sampleNotes: boolean;
}

export const NO_PREVIEW: DevPreview = {
  themeId: null,
  phase: null,
  sampleNotes: false,
};

const PHASES: readonly DayPhase[] = ["day", "evening", "night"];

/** localStorage key for the preview. One per device, not per board. */
export const DEV_PREVIEW_KEY = "bb:dev-preview";

// ---- who is the developer -------------------------------------------------

/** `DEV_EMAILS` is a comma- or space-separated list; case doesn't matter. */
export function parseDevEmails(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Whether this signed-in email is a developer. No email, no dev mode. */
export function isDevEmail(
  email: string | null | undefined,
  raw: string | null | undefined
): boolean {
  if (!email) return false;
  return parseDevEmails(raw).includes(email.trim().toLowerCase());
}

// ---- what is being previewed ----------------------------------------------

/** True when the preview changes anything on screen. */
export function isPreviewing(preview: DevPreview): boolean {
  return (
    preview.themeId !== null || preview.phase !== null || preview.sampleNotes
  );
}

/**
 * The theme id to put on screen. A preview only applies to a developer;
 * for everyone else this is exactly the theme they'd see without dev mode.
 */
export function previewThemeId(
  realThemeId: string | undefined,
  preview: DevPreview,
  isDev: boolean
): string | undefined {
  return isDev && preview.themeId ? preview.themeId : realThemeId;
}

/**
 * The day/night phase to render. Without a dev override this is the
 * normal rule: a theme's cycle decides, and a memory keeps its daylight.
 * With one, the override is pinned on the theme's own cycle — so a
 * two-phase theme asked for "evening" still shows day, as it would live —
 * and a theme with no cycle stays "day".
 */
export function previewPhase(
  cycle: DayCycle | undefined,
  when: Date,
  archived: boolean,
  preview: DevPreview,
  isDev: boolean
): DayPhase {
  if (isDev && preview.phase) {
    return resolvePhase(cycle && { ...cycle, pin: preview.phase }, when);
  }
  return archived ? "day" : resolvePhase(cycle, when);
}

// ---- remembered on this device --------------------------------------------

/** Anything unreadable — no storage, bad JSON, stale shape — is no preview. */
export function readDevPreview(
  storage: ThemeViewStorage | null = browserStorage()
): DevPreview {
  try {
    const raw = storage?.getItem(DEV_PREVIEW_KEY);
    if (!raw) return NO_PREVIEW;
    const v = JSON.parse(raw) as Partial<DevPreview> | null;
    if (!v || typeof v !== "object") return NO_PREVIEW;
    return {
      themeId: typeof v.themeId === "string" && v.themeId ? v.themeId : null,
      phase: PHASES.includes(v.phase as DayPhase) ? (v.phase as DayPhase) : null,
      sampleNotes: v.sampleNotes === true,
    };
  } catch {
    return NO_PREVIEW;
  }
}

/** Remember the preview on this device. Best effort: never throws. */
export function writeDevPreview(
  preview: DevPreview,
  storage: ThemeViewStorage | null = browserStorage()
): void {
  try {
    storage?.setItem(DEV_PREVIEW_KEY, JSON.stringify(preview));
  } catch {
    // Storage full or blocked — the preview still works for this visit.
  }
}

// ---- sample notes ---------------------------------------------------------

/** Ids of sample notes start with this, so they're never mistaken for rows. */
export const SAMPLE_NOTE_PREFIX = "sample-";

/**
 * One note of every shape (BB-24) in the theme's papers, plus a pre-BB-24
 * row (no shape column) for each paper, so a render shows old notes and
 * new shapes side by side. Shared by `/dev/scene?notes=1` and dev mode on
 * a real board. These are never saved.
 */
export function sampleNotes(theme: BoardTheme): BoardItem[] {
  const shapes = [null, "heart", "circle", "cloud", "star", "torn"];
  const note = (
    i: number,
    paper: string,
    shape: string | null,
    x: number,
    y: number
  ): BoardItem => ({
    id: `${SAMPLE_NOTE_PREFIX}${i}`,
    board_id: "dev",
    kind: "note",
    content: shape ?? `old ${paper}`,
    photo_path: null,
    paper,
    ...(shape ? { shape } : {}),
    x,
    y,
    rotation: ((i % 3) - 1) * 0.05,
    scale: 1,
    fixture_id: null,
    created_by: null,
    created_at: "2026-09-25T12:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
  });
  const papers = theme.papers.map((p) => p.id);
  return [
    ...shapes.map((shape, i) =>
      note(i, papers[(i + 1) % papers.length], shape, -0.8 + i * 0.32, 0.45)
    ),
    ...papers.map((paper, i) =>
      note(10 + i, paper, null, -0.8 + i * 0.32, -0.4)
    ),
  ];
}
