/**
 * Turning a saved board into a folder on someone's device.
 *
 * The glue between the data layer, the pure bundle builder and the
 * browser's download plumbing. The shape of the export lives in
 * `export-bundle.ts` (pure, unit-tested); what's here is only the parts
 * that need a network and a DOM.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_NAME,
  fetchBoardPhotos,
  getProfiles,
  listItems,
} from "./api";
import { buildExportBundle } from "./export-bundle";
import type { Board } from "./types";
import { buildZip } from "./zip";

/** Where the compiled offline viewer is served from. */
export const VIEWER_SCRIPT_URL = "/export/viewer.js";

/** Progress for the little line of text under the download button. */
export type ExportStage = "items" | "photos" | "viewer" | "packing";

export interface ExportProgress {
  stage: ExportStage;
  /** Photos downloaded so far (photos stage only). */
  done?: number;
  total?: number;
}

export interface ExportResult {
  fileName: string;
  bytes: number;
  photoCount: number;
  /** Photos that couldn't be downloaded, so the caller can say so. */
  missing: string[];
}

/**
 * Build the keepsake archive for a board: its rows, its photos and a
 * self-contained page that renders the whole thing offline.
 */
export async function buildBoardExportZip(
  supabase: SupabaseClient,
  board: Board,
  onProgress?: (progress: ExportProgress) => void
): Promise<{ blob: Blob; result: ExportResult }> {
  onProgress?.({ stage: "items" });
  const [items, profiles] = await Promise.all([
    listItems(supabase, board.id),
    getProfiles(supabase),
  ]);

  onProgress?.({ stage: "photos", done: 0, total: 0 });
  const { photos, missing } = await fetchBoardPhotos(
    supabase,
    items,
    (done, total) => onProgress?.({ stage: "photos", done, total })
  );

  onProgress?.({ stage: "viewer" });
  const viewerScript = await loadViewerScript();

  onProgress?.({ stage: "packing" });
  const bundle = buildExportBundle({
    board,
    items,
    profiles,
    photos,
    viewerScript,
    appName: APP_NAME,
  });
  const zip = buildZip(bundle.entries);

  return {
    blob: new Blob([zip as BlobPart], { type: "application/zip" }),
    result: {
      fileName: bundle.fileName,
      bytes: zip.length,
      photoCount: photos.length,
      missing,
    },
  };
}

/**
 * The offline viewer, built by `npm run build:viewer`. If it isn't there
 * the export is still worth having — the data and photos are the backup —
 * so the page says so instead of failing.
 */
async function loadViewerScript(): Promise<string> {
  const response = await fetch(VIEWER_SCRIPT_URL);
  if (!response.ok) {
    throw new Error(
      "The offline board viewer is missing from this deployment."
    );
  }
  return response.text();
}

/** Hand the archive to the browser as a download. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Build and download in one go. */
export async function downloadBoardExport(
  supabase: SupabaseClient,
  board: Board,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  const { blob, result } = await buildBoardExportZip(
    supabase,
    board,
    onProgress
  );
  saveBlob(blob, result.fileName);
  return result;
}

/** Human-readable size for the "all done" line. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The line of text shown while an export is being put together. */
export function progressLabel(progress: ExportProgress): string {
  switch (progress.stage) {
    case "items":
      return "gathering the board…";
    case "photos":
      return progress.total
        ? `collecting photos… ${progress.done ?? 0}/${progress.total}`
        : "looking for photos…";
    case "viewer":
      return "packing the little 3D room…";
    case "packing":
      return "zipping it all up…";
  }
}
