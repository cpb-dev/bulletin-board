"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/api";
import { useBoardStore } from "@/lib/store";
import { isWorldCupActive } from "@/lib/worldcup";
import { NotificationBell } from "./NotificationBell";
import { BoardMenu } from "./BoardMenu";

/** Top bar: board title, lists, memories, notifications, sign out. */
export function Hud({ readOnly }: { readOnly: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const board = useBoardStore((s) => s.board);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="absolute top-0 inset-x-0 flex items-start justify-between gap-2 p-4 pointer-events-none">
      <div className="pointer-events-auto">
        <h1 className="hand text-2xl leading-none drop-shadow-sm">
          {readOnly
            ? (board?.title ?? "A memory")
            : board && !board.is_primary
              ? board.title
              : APP_NAME}
        </h1>
        {readOnly && board?.archived_at && (
          <p className="text-xs opacity-75">
            saved {new Date(board.archived_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <nav className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
        {readOnly ? (
          <Link href="/memories" className="cute-button ghost !px-3 !py-2 text-sm">
            ← memories
          </Link>
        ) : (
          <>
            {isWorldCupActive() && board?.kind !== "worldcup" && (
              <Link
                href="/worldcup"
                className="cute-button ghost !px-3 !py-2 text-sm"
                aria-label="World Cup board"
                title="World Cup board"
              >
                ⚽
              </Link>
            )}
            <Link href="/lists" className="cute-button ghost !px-3 !py-2 text-sm">
              📝 lists
            </Link>
            <BoardMenu />
            <NotificationBell />
            <button
              className="cute-button ghost !px-3 !py-2 text-sm"
              onClick={signOut}
              aria-label="Sign out"
            >
              👋
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
