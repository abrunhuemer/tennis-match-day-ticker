-- Tennis-Ticker: Row-Level Security Policies

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.encounters enable row level security;
alter table public.matches enable row level security;
alter table public.sets enable row level security;
alter table public.score_events enable row level security;
alter table public.edit_requests enable row level security;
alter table public.subscriptions enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- invitations
-- ============================================================
create policy "invitations: authenticated users can read"
  on public.invitations for select
  to authenticated
  using (true);

create policy "invitations: authenticated users can invite"
  on public.invitations for insert
  to authenticated
  with check (true);

-- ============================================================
-- encounters
-- ============================================================
create policy "encounters: anyone can read"
  on public.encounters for select
  using (true);

create policy "encounters: authenticated users can create"
  on public.encounters for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "encounters: authenticated users can update"
  on public.encounters for update
  to authenticated
  using (auth.uid() is not null);

create policy "encounters: only creator can delete"
  on public.encounters for delete
  to authenticated
  using (created_by = auth.uid());

-- ============================================================
-- matches
-- ============================================================
create policy "matches: anyone can read"
  on public.matches for select
  using (true);

create policy "matches: authenticated users can create"
  on public.matches for insert
  to authenticated
  with check (created_by = auth.uid());

-- Update allowed for: edit holder OR match creator
-- Claiming (setting edit_holder_id to self) only allowed when edit_status = 'free'
create policy "matches: edit holder or creator can update"
  on public.matches for update
  to authenticated
  using (
    edit_holder_id = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    -- If changing edit_holder_id to self, require edit_status = 'free' or already be holder/creator
    (
      edit_holder_id = auth.uid()
      or created_by = auth.uid()
    )
    -- When claiming: the OLD row must have edit_status = 'free'
    -- This is enforced by the USING clause above requiring holder or creator;
    -- for non-holders claiming, use an API route that checks edit_status atomically
  );

-- ============================================================
-- sets
-- ============================================================
create policy "sets: anyone can read"
  on public.sets for select
  using (true);

create policy "sets: edit holder can insert/update sets"
  on public.sets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.edit_holder_id = auth.uid() or m.created_by = auth.uid())
    )
  );

create policy "sets: edit holder can update sets"
  on public.sets for update
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (m.edit_holder_id = auth.uid() or m.created_by = auth.uid())
    )
  );

-- ============================================================
-- score_events
-- ============================================================
create policy "score_events: anyone can read"
  on public.score_events for select
  using (true);

-- Only the current edit holder can insert score events
create policy "score_events: only edit holder can insert"
  on public.score_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and m.edit_holder_id = auth.uid()
    )
  );

-- Only the edit holder can mark events as undone
create policy "score_events: only edit holder can update"
  on public.score_events for update
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and m.edit_holder_id = auth.uid()
    )
  );

-- ============================================================
-- edit_requests
-- ============================================================
create policy "edit_requests: authenticated users can read"
  on public.edit_requests for select
  to authenticated
  using (true);

create policy "edit_requests: authenticated users can request"
  on public.edit_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Only the current edit holder can accept/reject requests
create policy "edit_requests: only edit holder can update"
  on public.edit_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and m.edit_holder_id = auth.uid()
    )
  );

-- ============================================================
-- subscriptions
-- ============================================================
create policy "subscriptions: users can read own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "subscriptions: anyone can subscribe (including anonymous)"
  on public.subscriptions for insert
  with check (true);

create policy "subscriptions: users can update own subscriptions"
  on public.subscriptions for update
  to authenticated
  using (user_id = auth.uid());

create policy "subscriptions: users can delete own subscriptions"
  on public.subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- Allow anonymous deletion by push_endpoint (for unsubscribe)
create policy "subscriptions: anonymous can delete by endpoint"
  on public.subscriptions for delete
  using (user_id is null);
