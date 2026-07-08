-- ============================================================
-- Surprise boards (private until a reveal date).
--
-- A board with private_to set is visible ONLY to that user until
-- reveal_at passes — enforced in the database with RLS, so the other
-- member cannot see the board, its items, or receive realtime events
-- for it, no matter what the client does. When reveal_at passes the
-- SELECT policies below start matching automatically (no job needed
-- for visibility); a custom push notification is sent by /api/reveal
-- (Vercel cron + on-app-open sweep) which then stamps revealed_at.
--
-- Generic on purpose: reusable for birthdays, anniversaries, etc.
-- Safe to run on existing data.
-- ============================================================

alter table public.boards
  add column if not exists private_to uuid references auth.users (id) on delete set null;
alter table public.boards
  add column if not exists reveal_at timestamptz;
alter table public.boards
  add column if not exists reveal_message text;
alter table public.boards
  add column if not exists revealed_at timestamptz;

-- A board is visible when it isn't private, it's yours, or its reveal
-- time has passed.
drop policy if exists "members read boards" on public.boards;
create policy "members read boards"
  on public.boards for select to authenticated
  using (
    private_to is null
    or private_to = auth.uid()
    or (reveal_at is not null and reveal_at <= now())
  );

-- Items follow their board's visibility.
drop policy if exists "members read items" on public.items;
create policy "members read items"
  on public.items for select to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = items.board_id
        and (
          b.private_to is null
          or b.private_to = auth.uid()
          or (b.reveal_at is not null and b.reveal_at <= now())
        )
    )
  );

-- Writing to a still-hidden board is creator-only too.
drop policy if exists "members create items" on public.items;
create policy "members create items"
  on public.items for insert to authenticated
  with check (
    exists (
      select 1 from public.boards b
      where b.id = items.board_id
        and (
          b.private_to is null
          or b.private_to = auth.uid()
          or (b.reveal_at is not null and b.reveal_at <= now())
        )
    )
  );

drop policy if exists "members update items" on public.items;
create policy "members update items"
  on public.items for update to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = items.board_id
        and (
          b.private_to is null
          or b.private_to = auth.uid()
          or (b.reveal_at is not null and b.reveal_at <= now())
        )
    )
  ) with check (true);

drop policy if exists "members delete items" on public.items;
create policy "members delete items"
  on public.items for delete to authenticated
  using (
    exists (
      select 1 from public.boards b
      where b.id = items.board_id
        and (
          b.private_to is null
          or b.private_to = auth.uid()
          or (b.reveal_at is not null and b.reveal_at <= now())
        )
    )
  );

-- Updating/deleting a still-hidden board is creator-only.
drop policy if exists "members update boards" on public.boards;
create policy "members update boards"
  on public.boards for update to authenticated
  using (
    private_to is null
    or private_to = auth.uid()
    or (reveal_at is not null and reveal_at <= now())
  ) with check (true);

drop policy if exists "members delete boards" on public.boards;
create policy "members delete boards"
  on public.boards for delete to authenticated
  using (
    private_to is null
    or private_to = auth.uid()
    or (reveal_at is not null and reveal_at <= now())
  );
