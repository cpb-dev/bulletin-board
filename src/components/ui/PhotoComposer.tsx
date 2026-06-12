"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPhotoItem, uploadPhoto } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { randomTilt, suggestPlacement } from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import { Sheet } from "./Sheet";

export function PhotoComposer() {
  const supabase = useMemo(() => createClient(), []);
  const open = useBoardStore((s) => s.composer === "photo");
  const board = useBoardStore((s) => s.board);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open || !board) return null;

  async function pinIt() {
    if (!board || !file) return;
    setBusy(true);
    setError(null);
    try {
      const { blob } = await compressImage(file);
      const path = await uploadPhoto(supabase, board.id, blob);
      const store = useBoardStore.getState();
      const spot = suggestPlacement(store.items);
      const item = await createPhotoItem(supabase, {
        board_id: board.id,
        photo_path: path,
        content: caption.trim(),
        x: spot.x,
        y: spot.y,
        rotation: randomTilt(),
      });
      store.upsertItem(item);
      store.setComposer(null);
      store.walkUp({ x: item.x, y: item.y });
      setFile(null);
      setCaption("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not pin the photo."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Pin a photo"
      onClose={() => useBoardStore.getState().setComposer(null)}
    >
      <label className="block">
        <span className="sr-only">Choose a photo</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span
          className="cute-button ghost w-full cursor-pointer"
          role="button"
        >
          {file ? "choose a different photo" : "choose a photo 🖼️"}
        </span>
      </label>

      {preview && (
        <div className="mt-3 rounded-xl overflow-hidden bg-white p-2 pb-6 shadow-lg max-w-60 mx-auto rotate-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview of your photo"
            className="w-full rounded-sm"
          />
        </div>
      )}

      <input
        className="cute-input hand !text-lg mt-3"
        placeholder="a little caption… (optional)"
        value={caption}
        maxLength={60}
        onChange={(e) => setCaption(e.target.value)}
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        className="cute-button mt-4 w-full"
        onClick={pinIt}
        disabled={busy || !file}
      >
        {busy ? "pinning…" : "pin it to the board 📌"}
      </button>
    </Sheet>
  );
}
