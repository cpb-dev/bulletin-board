import type { ThemeGroupId } from "./types";

export interface ThemeGroup {
  id: ThemeGroupId;
  label: string;
  blurb: string;
}

/**
 * The sections of the theme picker, in the order they're shown.
 *
 * Every theme names its group in its own palette, so adding a theme to a
 * section is a one-line change in that theme's folder. Adding a whole new
 * section means a new id here and in `ThemeGroupId`.
 */
export const THEME_GROUPS: ThemeGroup[] = [
  { id: "basic", label: "Everyday", blurb: "the rooms we live in" },
  { id: "special", label: "Special", blurb: "for the big occasions" },
  { id: "seasonal", label: "Seasonal", blurb: "here for a while" },
  { id: "tv", label: "TV", blurb: "places from the shows we love" },
];
