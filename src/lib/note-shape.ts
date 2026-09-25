/**
 * Note shapes (BB-24): the silhouette of a sticky note, chosen separately
 * from its colour.
 *
 * Pure geometry, no renderer — the canvas texture, the 3D mesh and the
 * picker icons all draw from the outlines here, so the paper you see, the
 * area you can grab and the icon you picked are always the same shape.
 *
 * Storage: `items.shape` is nullable and only written when it differs from
 * what the row's `paper` already implies. Every note saved before BB-24
 * has no shape, and resolves exactly as it always rendered: `paper =
 * "heart"` is a heart, anything else is a square. Archived boards and
 * keepsake exports therefore look as they did when they were saved.
 */

export type NoteShape = "square" | "heart" | "circle" | "star" | "cloud" | "torn";

export interface NoteShapeOption {
  id: NoteShape;
  name: string;
}

/** The shapes offered in the composer and editor, in picker order. */
export const NOTE_SHAPES: readonly NoteShapeOption[] = [
  { id: "square", name: "Square" },
  { id: "heart", name: "Heart" },
  { id: "circle", name: "Circle" },
  { id: "cloud", name: "Cloud" },
  { id: "star", name: "Star" },
  { id: "torn", name: "Torn page" },
];

export function isNoteShape(value: unknown): value is NoteShape {
  return NOTE_SHAPES.some((s) => s.id === value);
}

/**
 * The shape a note had before shapes existed: the Rose Picnic "heart"
 * paper was drawn as a heart, and everything else as a square. Live rows
 * still depend on this, so it must never change.
 */
export function legacyShape(paper: string): NoteShape {
  return paper === "heart" ? "heart" : "square";
}

/** The shape a note renders as. Unknown or missing shapes fall back safely. */
export function resolveNoteShape(item: {
  paper: string;
  shape?: string | null;
}): NoteShape {
  return isNoteShape(item.shape) ? item.shape : legacyShape(item.paper);
}

/**
 * What to store in `items.shape` for a chosen shape and paper. Null when
 * the paper already implies the shape, so plain square notes and classic
 * heart notes are written exactly as they were before BB-24.
 */
export function shapeToStore(shape: NoteShape, paper: string): NoteShape | null {
  return shape === legacyShape(paper) ? null : shape;
}

/**
 * Shapes drawn from an outline. Square and heart keep their original
 * canvas drawing and full-plane mesh, untouched, so existing notes can't
 * drift by a pixel.
 */
export function isOutlinedShape(shape: NoteShape): boolean {
  return shape !== "square" && shape !== "heart";
}

/** A point in the unit square, canvas-style: (0,0) top-left, y down. */
export type Pt = readonly [number, number];

/** Deterministic seed from an item id, so a torn edge never re-tears. */
export function shapeSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Paper sits a touch inside the canvas, like the square note's 6px margin.
const INSET = 0.02;

function circle(): Pt[] {
  const pts: Pt[] = [];
  const n = 64;
  const r = 0.5 - INSET;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  }
  return pts;
}

/** A scalloped disc: a ring of soft bumps. */
function cloud(): Pt[] {
  const pts: Pt[] = [];
  const n = 120;
  const bumps = 9;
  const outer = 0.5 - INSET;
  const depth = 0.035;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    // |sin| gives round lobes that meet in small notches.
    const r = outer - depth + depth * Math.abs(Math.sin((a * bumps) / 2));
    pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  }
  return pts;
}

/** A plump five-point star, point up, with softened tips. */
function star(): Pt[] {
  const pts: Pt[] = [];
  const outer = 0.5 - INSET;
  const inner = outer * 0.58;
  const cy = 0.53; // the star's visual centre sits a little low
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([0.5 + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** A page torn from a notepad: straight sides, a ragged top edge. */
function torn(seed: number): Pt[] {
  const rand = prng(seed);
  const l = INSET;
  const r = 1 - INSET;
  const b = 1 - INSET;
  const top = 0.07;
  const pts: Pt[] = [
    [l, b],
    [r, b],
  ];
  const teeth = 22;
  for (let i = 0; i <= teeth; i++) {
    const x = r - ((r - l) * i) / teeth;
    const y = top + (i % 2 === 0 ? 0 : 0.025) + (rand() - 0.5) * 0.03;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * The outline of an outlined shape, as a closed polygon in the unit square
 * (canvas-style, y down). Returns null for square and heart, which keep
 * their original full-plane rendering.
 */
export function noteOutline(shape: NoteShape, seed = 0): Pt[] | null {
  switch (shape) {
    case "circle":
      return circle();
    case "cloud":
      return cloud();
    case "star":
      return star();
    case "torn":
      return torn(seed);
    default:
      return null;
  }
}

/** Even-odd point-in-polygon — the note's grab area, in unit-square space. */
export function pointInOutline(pts: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Where the writing goes on an outlined shape, as fractions of the canvas:
 * the text box (left/right/top/bottom) and the "posted by" stamp line.
 * Every corner of the box lies inside the outline (see the tests).
 */
export interface NoteLayout {
  left: number;
  right: number;
  top: number;
  bottom: number;
  footerY: number;
  footerWidth: number;
}

export function noteLayout(shape: NoteShape): NoteLayout | null {
  switch (shape) {
    case "circle":
      return { left: 0.2, right: 0.8, top: 0.2, bottom: 0.7, footerY: 0.79, footerWidth: 0.44 };
    case "cloud":
      return { left: 0.21, right: 0.79, top: 0.22, bottom: 0.69, footerY: 0.78, footerWidth: 0.42 };
    case "star":
      return { left: 0.34, right: 0.66, top: 0.4, bottom: 0.64, footerY: 0.7, footerWidth: 0.3 };
    case "torn":
      return { left: 0.09, right: 0.91, top: 0.16, bottom: 0.83, footerY: 0.9, footerWidth: 0.8 };
    default:
      return null;
  }
}

/**
 * Where the pin goes, as a y offset from the note's centre in units of its
 * half-size (1 = the top edge, y up). Null means the note floats free with
 * no pin, as hearts always have.
 */
export function pinAnchor(shape: NoteShape): number | null {
  switch (shape) {
    case "heart":
      return null;
    case "star":
      return 0.45; // in the top point, clear of the writing
    case "circle":
    case "cloud":
      return 0.78;
    default:
      return 0.8; // matches the square note's pin at size/2 - 0.05
  }
}

/**
 * An SVG path for the picker icon, in a 24×24 box. Outlined shapes use
 * their real outline; square and heart mirror their canvas drawing.
 */
export function shapeIconPath(shape: NoteShape): string {
  const s = 24;
  if (shape === "square") {
    return "M4 2H20A2 2 0 0 1 22 4V20A2 2 0 0 1 20 22H4A2 2 0 0 1 2 20V4A2 2 0 0 1 4 2Z";
  }
  if (shape === "heart") {
    const p = (x: number, y: number) => `${(x * s).toFixed(2)} ${(y * s).toFixed(2)}`;
    return (
      `M${p(0.5, 0.92)}` +
      `C${p(0.04, 0.6)} ${p(0.02, 0.26)} ${p(0.28, 0.12)}` +
      `C${p(0.42, 0.04)} ${p(0.5, 0.14)} ${p(0.5, 0.24)}` +
      `C${p(0.5, 0.14)} ${p(0.58, 0.04)} ${p(0.72, 0.12)}` +
      `C${p(0.98, 0.26)} ${p(0.96, 0.6)} ${p(0.5, 0.92)}Z`
    );
  }
  const pts = noteOutline(shape, 1) ?? [];
  return (
    pts
      .map(([x, y], i) => `${i ? "L" : "M"}${(x * s).toFixed(2)} ${(y * s).toFixed(2)}`)
      .join("") + "Z"
  );
}

/**
 * The shape to show after the colour changes in a picker. Until someone
 * picks a shape themselves it follows the paper, exactly as before BB-24
 * (Rose Picnic's "heart" paper is a heart, the rest square); once they've
 * picked one, changing colour leaves it alone.
 */
export function shapeAfterPaperChange(
  shape: NoteShape,
  shapeChosen: boolean,
  nextPaper: string
): NoteShape {
  return shapeChosen ? shape : legacyShape(nextPaper);
}
