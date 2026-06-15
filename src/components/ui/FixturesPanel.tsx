"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createNote } from "@/lib/api";
import { randomTilt, suggestPlacement } from "@/lib/board-geometry";
import { useBoardStore } from "@/lib/store";
import { fixtureLine, fixtureNoteText, groupFixtures, type Fixture } from "@/lib/worldcup";
import { Sheet } from "./Sheet";

/**
 * World Cup fixtures & results, grouped by stage. Each fixture can be
 * pinned to the board as a movable note so you can decorate the games
 * you watched with your own notes and photos.
 */
export function FixturesPanel({
  open,
  boardId,
  readOnly,
  onClose,
}: {
  open: boolean;
  boardId: string | undefined;
  readOnly: boolean;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  // Fixtures are polled live by the board and kept in the store.
  const fixturesMap = useBoardStore((s) => s.worldCupFixtures);
  const groups = useMemo(
    () => groupFixtures(Object.values(fixturesMap)),
    [fixturesMap]
  );
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  if (!open) return null;
  const loading = groups.length === 0;

  async function pin(f: Fixture) {
    if (!boardId || readOnly) return;
    setPinned(f.id);
    try {
      const items = useBoardStore.getState().items;
      const spot = suggestPlacement(items);
      const note = await createNote(supabase, {
        board_id: boardId,
        content: fixtureNoteText(f),
        paper: "pitch",
        x: spot.x,
        y: spot.y,
        rotation: randomTilt(),
        fixture_id: f.id,
      });
      useBoardStore.getState().upsertItem(note);
    } catch {
      setError("Could not pin that fixture.");
    } finally {
      setTimeout(() => setPinned(null), 1200);
    }
  }

  return (
    <Sheet title="World Cup fixtures ⚽" onClose={onClose}>
      {loading && <p className="opacity-75">loading fixtures…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-300 mb-2">
          {error}
        </p>
      )}

      {!loading && groups.length === 0 && !error && (
        <p className="opacity-75 text-sm">no fixtures to show yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <section key={g.label}>
            <h3 className="font-bold text-sm mb-1">{g.label}</h3>
            <ul className="flex flex-col gap-1.5">
              {g.fixtures.map((f) => {
                const done = f.status === "finished";
                const live = f.status === "live";
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        {f.home}{" "}
                        <span
                          className={
                            done || live ? "font-bold" : "opacity-70"
                          }
                        >
                          {fixtureLine(f)}
                        </span>{" "}
                        {f.away}
                        {live && <span className="text-red-300"> · live</span>}
                      </p>
                      {f.group && (
                        <p className="text-xs opacity-60">{f.group}</p>
                      )}
                    </div>
                    {!readOnly && boardId && (
                      <button
                        className="cute-button ghost !px-2 !py-1 text-xs shrink-0"
                        onClick={() => pin(f)}
                        disabled={pinned === f.id}
                        aria-label={`Pin ${f.home} v ${f.away} to the board`}
                      >
                        {pinned === f.id ? "pinned ✓" : "📌 pin"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
