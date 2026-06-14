"use client";

import dynamic from "next/dynamic";
import { use } from "react";

// three.js only runs in the browser — skip SSR for the whole scene.
const BoardExperience = dynamic(
  () => import("@/components/BoardExperience").then((m) => m.BoardExperience),
  { ssr: false }
);

export default function BoardByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // An additional board, fully editable (archived ones load read-only).
  return <BoardExperience boardId={id} />;
}
