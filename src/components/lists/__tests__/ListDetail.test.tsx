import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListDetail } from "../ListDetail";
import type { List, ListItem } from "@/lib/types";

// Realtime channel is irrelevant to these tests — stub the client.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}));

const listListItemsMock = vi.hoisted(() => vi.fn());
const setListItemDoneMock = vi.hoisted(() => vi.fn());
const addListItemMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lists-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lists-api")>();
  return {
    ...actual,
    listListItems: listListItemsMock,
    setListItemDone: setListItemDoneMock,
    addListItem: addListItemMock,
  };
});

const list: List = {
  id: "l1",
  title: "Shopping",
  status: "active",
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
  archived_at: null,
};

function item(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: "li-1",
    list_id: "l1",
    content: "milk",
    done: false,
    position: 0,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  listListItemsMock.mockReset().mockResolvedValue([item()]);
  setListItemDoneMock.mockReset().mockResolvedValue(undefined);
  addListItemMock.mockReset();
});

describe("ListDetail", () => {
  it("shows the list's items", async () => {
    render(<ListDetail list={list} onBack={() => {}} />);
    expect(await screen.findByDisplayValue("milk")).toBeInTheDocument();
  });

  it("ticks an item off optimistically and persists it", async () => {
    render(<ListDetail list={list} onBack={() => {}} />);
    await screen.findByDisplayValue("milk");
    await userEvent.click(screen.getByRole("button", { name: /mark done/i }));
    await waitFor(() =>
      expect(setListItemDoneMock).toHaveBeenCalledWith(
        expect.anything(),
        "li-1",
        true
      )
    );
  });

  it("an archived list is read-only", async () => {
    listListItemsMock.mockResolvedValue([item()]);
    render(
      <ListDetail list={{ ...list, status: "archived" }} onBack={() => {}} />
    );
    await screen.findByDisplayValue("milk");
    expect(screen.queryByPlaceholderText(/add an item/i)).toBeNull();
    expect(screen.getByText(/this list is archived/i)).toBeInTheDocument();
  });

  it("calls back out to the lists index", async () => {
    const onBack = vi.fn();
    render(<ListDetail list={list} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /← lists/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
