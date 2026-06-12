"use client";

import dynamic from "next/dynamic";
import { use } from "react";

const BoardExperience = dynamic(
  () =>
    import("@/components/BoardExperience").then((m) => m.BoardExperience),
  { ssr: false }
);

export default function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BoardExperience boardId={id} readOnly />;
}
