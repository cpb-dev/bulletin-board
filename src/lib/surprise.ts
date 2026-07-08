/**
 * Surprise boards — pure logic (unit-tested).
 *
 * A surprise board has `private_to` set (its creator). Database RLS
 * hides it — board, items and realtime — from everyone else until
 * `reveal_at` passes, at which point visibility flips automatically.
 * The reveal *notification* is sent by /api/reveal (cron + on-open
 * sweep), which stamps `revealed_at` so it's only ever sent once.
 *
 * Generic on purpose: birthdays now, anniversaries later.
 */
import type { Board } from "./types";

/** The exclusive theme for surprise boards (not user-selectable). */
export const SURPRISE_THEME_ID = "rose-picnic";

export function isSurpriseBoard(
  board: Pick<Board, "private_to"> | null | undefined
): boolean {
  return !!board?.private_to;
}

/** Still secret: reveal time not yet reached. */
export function isStillSecret(
  board: Pick<Board, "private_to" | "reveal_at">,
  now: Date = new Date()
): boolean {
  if (!board.private_to) return false;
  if (!board.reveal_at) return true; // no date yet = private indefinitely
  return new Date(board.reveal_at).getTime() > now.getTime();
}

/** The reveal moment has passed but the notification hasn't gone out. */
export function revealDue(
  board: Pick<Board, "private_to" | "reveal_at" | "revealed_at">,
  now: Date = new Date()
): boolean {
  if (!board.private_to || !board.reveal_at || board.revealed_at) return false;
  return new Date(board.reveal_at).getTime() <= now.getTime();
}

/** A reveal date must parse and be in the future. */
export function validateRevealDate(
  value: string,
  now: Date = new Date()
): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "That date doesn't look right.";
  if (d.getTime() <= now.getTime()) return "Pick a moment in the future.";
  return null;
}

export interface RevealNotification {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** The push sent to the other member the moment a surprise unlocks. */
export function buildRevealNotification(
  board: Pick<Board, "id" | "title" | "reveal_message">,
  authorName: string
): RevealNotification {
  const message = (board.reveal_message ?? "").trim();
  return {
    title: `🎁 ${authorName} made you something…`,
    body:
      message ||
      `“${board.title}” has just been unlocked for you. Come and see 💝`,
    url: `/board/${board.id}`,
    tag: `reveal-${board.id}`,
  };
}
