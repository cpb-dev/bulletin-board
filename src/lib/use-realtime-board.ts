"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useBoardStore } from "./store";
import type { Board, BoardItem } from "./types";

/**
 * Live sync: when one of you pins, moves, edits or removes something
 * (or redecorates with a new theme), it appears on the other's board
 * within a moment. Applying our own echoed changes is harmless —
 * upserts are idempotent.
 */
export function useRealtimeBoard(
  supabase: SupabaseClient,
  boardId: string | undefined
) {
  const upsertItem = useBoardStore((s) => s.upsertItem);
  const removeItem = useBoardStore((s) => s.removeItem);
  const setBoard = useBoardStore((s) => s.setBoard);

  useEffect(() => {
    if (!boardId) return;
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<BoardItem>;
            if (old.id) removeItem(old.id);
          } else {
            const item = payload.new as BoardItem;
            // Never clobber an item mid-drag on this device.
            const { draggingId } = useBoardStore.getState();
            if (draggingId !== item.id) upsertItem(item);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "boards",
          filter: `id=eq.${boardId}`,
        },
        (payload) => {
          setBoard(payload.new as Board);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, boardId, upsertItem, removeItem, setBoard]);
}
