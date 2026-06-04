-- Allow any authenticated user to update a match when edit_status = 'free'
-- (so they can claim it). Previously the USING clause only allowed the
-- current holder or creator, which blocked the claim API route for others.
--
-- WITH CHECK also allows edit_status = 'free' so that the holder can release
-- their rights (set edit_holder_id = null, edit_status = 'free') even when
-- they are not the match creator.
drop policy if exists "matches: edit holder or creator can update" on public.matches;

create policy "matches: edit holder, creator, or free match can update"
  on public.matches for update
  to authenticated
  using (
    edit_holder_id = auth.uid()
    or created_by = auth.uid()
    or edit_status = 'free'
  )
  with check (
    edit_holder_id = auth.uid()
    or created_by = auth.uid()
    or edit_status = 'free'
  );
