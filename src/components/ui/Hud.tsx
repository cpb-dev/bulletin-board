"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/api";
import { useBoardStore } from "@/lib/store";

/** Top bar: board title, memories link, sign out. */
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
    <header className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 p-4 pointer-events-none">
      <div className="pointer-events-auto">
        <h1 className="hand text-2xl leading-none drop-shadow-sm">
          {readOnly ? (board?.title ?? "A memory") : APP_NAME}
        </h1>
        {readOnly && board?.archived_at && (
          <p className="text-xs opacity-75">
            saved {new Date(board.archived_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <nav className="pointer-events-auto flex items-center gap-2">
        <Link href="/memories" className="cute-button ghost !px-3 !py-2 text-sm">
          {readOnly ? "← memories" : "📦 memories"}
        </Link>
        {!readOnly && (
          <button
            className="cute-button ghost !px-3 !py-2 text-sm"
            onClick={signOut}
            aria-label="Sign out"
          >
            👋
          </button>
        )}
      </nav>
    </header>
  );
}
