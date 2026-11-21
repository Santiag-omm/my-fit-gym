-- Existing customers keep their current access; new customers start pending.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'membership_status'
  ) then
    alter table public.clients add column membership_status text not null default 'active'
      check (membership_status in ('active', 'pending', 'expired', 'suspended'));
    update public.clients set membership_status = 'suspended' where status = 'inactive';
  end if;
end;
$$;
alter table public.clients alter column membership_status set default 'pending';
alter table public.exercises add column if not exists media_url text;
alter table public.routine_exercises add column if not exists media_url text;
alter table public.exercises drop constraint if exists exercises_media_url_check;
alter table public.exercises add constraint exercises_media_url_check
  check (media_url is null or media_url ~* '^https?://' or media_url ~ '^/exercises/[a-z0-9-]+[.]webp$') not valid;
alter table public.routine_exercises drop constraint if exists routine_exercises_media_url_check;
alter table public.routine_exercises add constraint routine_exercises_media_url_check
  check (media_url is null or media_url ~* '^https?://' or media_url ~ '^/exercises/[a-z0-9-]+[.]webp$') not valid;

grant insert (membership, membership_status), update (membership, membership_status) on public.clients to authenticated;
grant insert (media_url), update (media_url) on public.exercises, public.routine_exercises to authenticated;

create or replace function public.has_active_membership()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    join public.profiles p on p.id = c.profile_id
    where c.profile_id = (select auth.uid())
      and p.role = 'client'
      and c.membership_status = 'active'
  );
$$;
revoke all on function public.has_active_membership() from public, anon;
grant execute on function public.has_active_membership() to authenticated;

drop policy if exists "Membership gates exercise reads" on public.exercises;
create policy "Membership gates exercise reads" on public.exercises as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates routine reads" on public.routines;
create policy "Membership gates routine reads" on public.routines as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates day reads" on public.routine_days;
create policy "Membership gates day reads" on public.routine_days as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates routine exercise reads" on public.routine_exercises;
create policy "Membership gates routine exercise reads" on public.routine_exercises as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates assignment reads" on public.routine_assignments;
create policy "Membership gates assignment reads" on public.routine_assignments as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates workout reads" on public.workout_logs;
create policy "Membership gates workout reads" on public.workout_logs as restrictive
for select to authenticated using ((select public.is_trainer()) or (select public.has_active_membership()));
drop policy if exists "Membership gates workout creation" on public.workout_logs;
create policy "Membership gates workout creation" on public.workout_logs as restrictive
for insert to authenticated with check (
  (select public.has_active_membership())
  and exists (
    select 1 from public.routine_assignments a
    join public.routine_days d on d.routine_id = a.routine_id
    where a.id = workout_logs.assignment_id
      and a.client_id = workout_logs.client_id
      and d.id = workout_logs.routine_day_id
      and a.is_active and current_date between a.start_date and a.end_date
  )
);

-- Accounts are linked by the authenticated invitation function, not by email matching.
revoke execute on function public.link_client_account() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'La publicación supabase_realtime no existe; habilita Realtime antes de aplicar esta migración.';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients') then
    alter publication supabase_realtime add table public.clients;
  end if;
end;
$$;

create or replace function public.save_routine_bundle(p_routine jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  routine_uuid uuid := (p_routine ->> 'id')::uuid;
  day_data jsonb;
  move_data jsonb;
  day_uuid uuid;
  day_order integer := 0;
  move_order integer;
begin
  insert into public.routines (id, trainer_id, name, goal, duration_weeks, is_archived)
  values (routine_uuid, (select auth.uid()), p_routine ->> 'name', p_routine ->> 'goal',
    (p_routine ->> 'durationWeeks')::integer, coalesce((p_routine ->> 'archived')::boolean, false))
  on conflict (id) do update set name = excluded.name, goal = excluded.goal,
    duration_weeks = excluded.duration_weeks, is_archived = excluded.is_archived;
  delete from public.routine_days where routine_id = routine_uuid;
  for day_data in select value from jsonb_array_elements(p_routine -> 'days') loop
    day_uuid := (day_data ->> 'id')::uuid;
    insert into public.routine_days (id, routine_id, day_number, title, focus, sort_order)
    values (day_uuid, routine_uuid, (day_data ->> 'number')::integer,
      day_data ->> 'title', coalesce(day_data ->> 'focus', ''), day_order);
    move_order := 0;
    for move_data in select value from jsonb_array_elements(coalesce(day_data -> 'exercises', '[]'::jsonb)) loop
      insert into public.routine_exercises (id, routine_day_id, exercise_id, exercise_name,
        muscle_group, equipment, instructions, video_url, media_url, sets, reps, rest_seconds, tempo, suggested_load, sort_order)
      values ((move_data ->> 'id')::uuid, day_uuid, nullif(move_data ->> 'exerciseId', '')::uuid,
        move_data ->> 'name', move_data ->> 'muscleGroup', coalesce(move_data ->> 'equipment', ''),
        coalesce(move_data ->> 'instructions', ''), nullif(move_data ->> 'videoUrl', ''),
        nullif(move_data ->> 'mediaUrl', ''), (move_data ->> 'sets')::integer, move_data ->> 'reps',
        (move_data ->> 'restSeconds')::integer, coalesce(move_data ->> 'tempo', ''),
        coalesce(move_data ->> 'suggestedLoad', ''), move_order);
      move_order := move_order + 1;
    end loop;
    day_order := day_order + 1;
  end loop;
end;
$$;
