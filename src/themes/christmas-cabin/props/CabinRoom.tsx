"use client";

import { Floor } from "./room/Floor";
import { Walls } from "./room/Walls";
import { Ceiling } from "./room/Ceiling";
import { Rug } from "./room/Rug";

/**
 * The Christmas Cabin's room (BB-35), modern and cosy: wide-plank oak
 * underfoot, a deep Berber shag rug, warm ivory limewash over oak slat
 * panelling, and a light oak ceiling under dark walnut beams with warm
 * downlights. Its own room — it never uses the shared indoor `Room`.
 *
 * Each surface lives in `props/room/`; their textures are drawn on
 * canvases in `room/textures.ts`, from layouts in `lib/planks.ts` and
 * `lib/rug.ts`.
 */
export function CabinRoom() {
  return (
    <group>
      <Floor />
      <Rug />
      <Walls />
      <Ceiling />
    </group>
  );
}
