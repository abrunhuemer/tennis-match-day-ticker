-- Allow match creator to insert correction events even when not the edit holder
-- (edit holder can insert any event; creator can only insert corrections)
drop policy if exists "score_events: only edit holder can insert" on public.score_events;

create policy "score_events: edit holder or creator for corrections"
  on public.score_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
      and (
        m.edit_holder_id = auth.uid()
        or (m.created_by = auth.uid() and event_type = 'correction')
      )
    )
  );
