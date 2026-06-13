/** Small, pure formatting helpers (unit-tested). */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Short date like "13 Jun" for a note's little stamp. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * The text for the little "posted by" stamp at the foot of a note,
 * e.g. "Kalli · 13 Jun". Degrades gracefully if either part is missing.
 */
export function noteStamp(
  authorName: string | null | undefined,
  iso: string | null | undefined
): string {
  const name = (authorName ?? "").trim();
  const date = shortDate(iso);
  if (name && date) return `${name} · ${date}`;
  return name || date || "";
}
