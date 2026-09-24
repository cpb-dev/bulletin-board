/**
 * The shape of a board theme.
 *
 * A theme restyles the whole 3D scene (environment, board, lighting,
 * decorations) plus the 2D overlay UI, so switching themes feels like
 * redecorating the room rather than just swapping a colour.
 *
 * This module holds types only. It must never import the catalogue, so
 * scenes and props can type themselves without an import cycle.
 */

import type { ComponentType } from "react";
import type { Texture } from "three";

export interface PaperColor {
  id: string;
  name: string;
  bg: string;
  ink: string;
}

/**
 * Which section of the theme picker a theme is filed under. Set by hand
 * in the theme's own palette — themes are added by the developer, so
 * there is no in-app way to re-file one.
 */
export type ThemeGroupId = "basic" | "special" | "seasonal" | "tv";

export interface BoardTheme {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  /** The picker section this theme belongs to. */
  group: ThemeGroupId;
  room: {
    wall: string;
    wallTrim: string;
    floor: string;
    rug: string;
    accent: string;
  };
  board: {
    surface: string;
    surfaceSpeckle: string;
    frame: string;
  };
  light: {
    sky: string;
    ambientIntensity: number;
    key: string;
    keyIntensity: number;
    lamp: string;
  };
  /** Pin head colours, cycled per item. */
  pins: string[];
  /** Note paper choices offered in the editor. */
  papers: PaperColor[];
  /** Colour of the fairy-light string draped over the board. */
  garland: string;
  decorations: "cabin" | "cottage" | "night" | "meadow" | "summer";
  /** A second, smaller pannable board beside the main one. */
  miniBoard?: { label: string };
  /** Indoor wall treatment. Defaults to flat painted walls. */
  wallStyle?: "flat" | "logs";
  /** The feature on the back wall. Defaults to a window. */
  roomFeature?: "window" | "fireplace";
  /** What the window looks out onto. Defaults to the sky colour. */
  windowView?: "sky" | "garden";
  /** The plant by the window. Defaults to a leafy pot plant. */
  plantStyle?: "leaves" | "flowerbush";
  ui: {
    bg: string;
    panel: string;
    accent: string;
    text: string;
  };
}

/** The environment a theme's board lives in — its whole 3D world. */
export type ThemeScene = ComponentType<{ theme: BoardTheme }>;

/**
 * What's strung across the top of the board. A theme that doesn't name
 * one gets the default fairy lights in its garland colour.
 */
export type ThemeBoardDecor = ComponentType<{
  theme: BoardTheme;
  gradient: Texture;
}>;

/**
 * Everything one theme contributes, and the only thing the catalogue
 * knows about it. A theme's folder exports exactly one of these from its
 * `index.ts`, which is the bridge to its palette, scene, props and logic.
 */
export interface ThemeModule {
  palette: BoardTheme;
  Scene: ThemeScene;
  BoardDecor?: ThemeBoardDecor;
}
