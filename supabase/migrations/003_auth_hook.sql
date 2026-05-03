-- Tennis-Ticker: Invite-Only Auth Hook
--
-- This function runs as a Supabase Auth Hook (on_auth_user_created / before_user_created).
-- It checks whether the signing-up user's email is in the invitations table.
-- If not found (or not yet accepted), the signup is rejected.
--
-- Register this in: Supabase Dashboard → Authentication → Hooks → "Before user is created"

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

  -- Check if the email is in the invitations table and has been accepted
  select * into invite_record
  from public.invitations
  where lower(email) = lower(user_email)
    and accepted_at is not null
  limit 1;

  if not found then
    -- Reject the signup by returning an error
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'You need an invitation to join Tennis-Ticker. Please ask an existing member to invite you.'
      )
    );
  end if;

  -- Mark the invitation as accepted (if not already)
  update public.invitations
  set accepted_at = now()
  where lower(email) = lower(user_email)
    and accepted_at is null;

  -- Allow the signup to proceed
  return event;
end;
$$;

-- Note: register this function in Supabase Dashboard under:
-- Authentication → Hooks → "Custom Access Token Hook" or "Before user is created"
-- The hook URL format for a database function is: pg-functions://postgres/public/check_invitation_before_signup
