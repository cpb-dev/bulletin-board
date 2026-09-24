/**
 * Entry point for the standalone memory viewer.
 *
 * Compiled by `scripts/build-viewer.mjs` into a single classic script
 * that `index.html` inlines — classic, not a module, because a module
 * script cannot load from `file://`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryViewer } from "./MemoryViewer";
import { readMemory } from "./memory";

const root = document.getElementById("root");
const memory = readMemory();

if (root) {
  if (memory) {
    createRoot(root).render(
      <StrictMode>
        <MemoryViewer memory={memory} />
      </StrictMode>
    );
  } else {
    root.innerHTML =
      '<p class="viewer-fallback">This memory has lost its data. ' +
      "The board is still in <code>board.json</code> beside this file.</p>";
  }
}
