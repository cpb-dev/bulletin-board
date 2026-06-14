"use client";

import dynamic from "next/dynamic";

// three.js only runs in the browser — skip SSR for the whole scene.
const BoardExperience = dynamic(
  () => import("@/components/BoardExperience").then((m) => m.BoardExperience),
  { ssr: false }
);

export default function WorldCupPage() {
  return <BoardExperience worldCup />;
}
