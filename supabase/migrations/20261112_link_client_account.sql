create or replace function public.link_client_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  confirmed_email text;
  matching_count integer;
  matched_client_id uuid;
begin
  if current_user_id is null then
    raise exception 'Inicia sesión con tu cuenta de cliente.'
      using errcode = '28000';
  end if;

  select lower(btrim(u.email))
  into confirmed_email
  from auth.users u
  where u.id = current_user_id
    and u.email_confirmed_at is not null;

  if confirmed_email is null then
    raise exception 'Confirma tu correo electrónico y vuelve a iniciar sesión.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id and p.role = 'client'
  ) then
    raise exception 'Esta opción es solo para cuentas de cliente.'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.clients c
    where c.profile_id = current_user_id
  ) then
    return jsonb_build_object('status', 'already_linked');
  end if;

  select count(*)
  into matching_count
  from public.clients c
  where lower(btrim(c.email)) = confirmed_email
    and c.profile_id is null;

  if matching_count = 0 then
    return jsonb_build_object('status', 'waiting_for_trainer');
  end if;

  if matching_count > 1 then
    raise exception 'Este correo coincide con varios perfiles. Pide a tu entrenador una invitación individual.'
      using errcode = '23505';
  end if;

  select c.id
  into matched_client_id
  from public.clients c
  where lower(btrim(c.email)) = confirmed_email
    and c.profile_id is null
  order by c.created_at, c.id
  limit 1;

  update public.clients c
  set profile_id = current_user_id
  where c.id = matched_client_id and c.profile_id is null
  returning c.id into matched_client_id;

  if matched_client_id is null then
    if exists (
      select 1 from public.clients c
      where c.profile_id = current_user_id
    ) then
      return jsonb_build_object('status', 'already_linked');
    end if;
    raise exception 'El perfil cambió mientras se vinculaba. Inténtalo de nuevo.'
      using errcode = '40001';
  end if;

  return jsonb_build_object('status', 'linked');
end;
$$;

revoke all on function public.link_client_account() from public, anon;
grant execute on function public.link_client_account() to authenticated;

alter table public.workout_logs
  add column if not exists routine_day_title text not null default '',
  add column if not exists routine_day_focus text not null default '';

grant insert (id, client_id, assignment_id, routine_day_id, routine_day_title, routine_day_focus, completed_at, comments, exercise_results)
  on public.workout_logs to authenticated;

alter table public.profiles
  add column if not exists membership text not null default 'premium'
  constraint profiles_membership_check check (membership in ('basica', 'premium', 'premium_plus'));

alter table public.clients
  add column if not exists membership text not null default 'premium'
  constraint clients_membership_check check (membership in ('basica', 'premium', 'premium_plus'));

alter table public.exercises
  add column if not exists media_url text;

alter table public.routine_exercises
  add column if not exists media_url text;
