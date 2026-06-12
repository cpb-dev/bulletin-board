/** Max edge for uploaded photos — keeps Supabase storage tiny. */
export const MAX_PHOTO_EDGE = 1600;

/** Compute resized dimensions preserving aspect, never upscaling. */
export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_PHOTO_EDGE
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Downscale + re-encode a photo in the browser before upload.
 * Returns a JPEG blob plus its pixel dimensions.
 */
export async function compressImage(
  file: File
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = targetDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the photo for upload.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86)
  );
  if (!blob) throw new Error("Could not prepare the photo for upload.");
  return { blob, width, height };
}
