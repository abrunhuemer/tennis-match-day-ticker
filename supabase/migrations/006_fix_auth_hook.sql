-- Fix invite check: previously required accepted_at IS NOT NULL, but
-- accepted_at is only written AFTER the hook allows the signup through —
-- so first-time invitees were always rejected. Now we just check that the
-- email exists in the invitations table at all.
create or replace function public.check_invitation_before_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
  invite_record record;
begin
  user_email := event->'user'->>'email';

  select * into invite_record
  from public.invitations
  where lower(email) = lower(user_email)
  limit 1;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'You need an invitation to join Tennis-Ticker.'
      )
    );
  end if;

  -- Record when the invitee actually signed up
  update public.invitations
  set accepted_at = now()
  where lower(email) = lower(user_email)
    and accepted_at is null;

  return event;
end;
$$;
