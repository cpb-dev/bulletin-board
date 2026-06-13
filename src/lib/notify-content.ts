/**
 * Pure builder for notification text, shared by the /api/notify route
 * and unit tests. Decides what the push says based on the row that was
 * just inserted (a board item or a list item).
 */

export interface NotifyContent {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export function buildNotifyContent(
  table: string,
  record: Record<string, unknown>,
  authorName: string
): NotifyContent | null {
  if (table === "items") {
    const caption = String(record.content ?? "").trim();
    if (record.kind === "photo") {
      return {
        title: `${authorName} pinned a photo 📷`,
        body: caption || "Come see what they shared 💛",
        url: "/board",
        tag: "board-update",
      };
    }
    return {
      title: `${authorName} left you a note 💌`,
      body:
        caption.length > 80 ? caption.slice(0, 79) + "…" : caption || "♡",
      url: "/board",
      tag: "board-update",
    };
  }
  if (table === "list_items") {
    const text = String(record.content ?? "").trim();
    return {
      title: `${authorName} added to a list 📝`,
      body: text || "A new little thing to do together",
      url: "/lists",
      tag: "list-update",
    };
  }
  return null;
}
