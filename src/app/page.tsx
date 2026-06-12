import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles auth; signed-in folks live on /board.
  redirect("/board");
}
