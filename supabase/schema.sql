create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'client' check (role in ('trainer', 'client')),
  membership text not null default 'premium' check (membership in ('basica', 'premium', 'premium_plus')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null check (length(trim(name)) >= 2),
  email text,
  phone text,
  goal text,
  level text not null default 'Principiante' check (level in ('Principiante', 'Intermedio', 'Avanzado')),
  start_date date not null default current_date,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  membership text not null default 'premium' check (membership in ('basica', 'premium', 'premium_plus')),
  membership_status text not null default 'pending' check (membership_status in ('active', 'pending', 'expired', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) >= 2),
  muscle_group text not null,
  equipment text not null default '',
  instructions text not null,
  video_url text check (video_url is null or video_url ~* '^https?://'),
  media_url text check (media_url is null or media_url ~* '^https?://' or media_url ~ '^/exercises/[a-z0-9-]+[.]webp$'),
  created_at timestamptz not null default now()
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) >= 3),
  goal text not null,
  duration_weeks integer not null check (duration_weeks between 1 and 52),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  title text not null,
  focus text not null default '',
  sort_order integer not null default 0,
  unique (routine_id, day_number)
);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null,
  muscle_group text not null,
  equipment text not null default '',
  instructions text not null default '',
  video_url text check (video_url is null or video_url ~* '^https?://'),
  media_url text check (media_url is null or media_url ~* '^https?://' or media_url ~ '^/exercises/[a-z0-9-]+[.]webp$'),
  sets integer not null check (sets between 1 and 20),
  reps text not null,
  rest_seconds integer not null default 60 check (rest_seconds >= 0),
  tempo text not null default '',
  suggested_load text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.routine_assignments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  assignment_id uuid references public.routine_assignments (id) on delete set null,
  routine_day_id uuid references public.routine_days (id) on delete set null,
  routine_day_title text not null default '',
  routine_day_focus text not null default '',
  completed_at timestamptz not null default now(),
  comments text,
  exercise_results jsonb not null default '[]'::jsonb check (jsonb_typeof(exercise_results) = 'array')
);

create index if not exists clients_trainer_id_idx on public.clients (trainer_id);
create index if not exists clients_profile_id_idx on public.clients (profile_id);
create index if not exists routines_trainer_id_idx on public.routines (trainer_id);
create index if not exists routine_days_routine_id_idx on public.routine_days (routine_id, sort_order);
create index if not exists routine_exercises_day_id_idx on public.routine_exercises (routine_day_id, sort_order);
create index if not exists assignments_client_dates_idx on public.routine_assignments (client_id, is_active, start_date, end_date);
create index if not exists workout_logs_client_completed_idx on public.workout_logs (client_id, completed_at desc);

update public.clients set email = lower(trim(email)) where email is not null;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role, membership)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'client',
    case
      when new.raw_user_meta_data ->> 'membership' in ('basica', 'premium', 'premium_plus')
      then new.raw_user_meta_data ->> 'membership'
      else 'premium'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles alter column role set default 'client';

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.is_trainer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'trainer'
  );
$$;

revoke all on function public.is_trainer() from public;
grant execute on function public.is_trainer() to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_assignments enable row level security;
alter table public.workout_logs enable row level security;

create policy "Profiles are visible to their owner and trainer"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.clients c
    where c.profile_id = profiles.id and c.trainer_id = (select auth.uid())
  )
);

create policy "Clients are visible to their trainer or linked client"
on public.clients for select to authenticated
using (trainer_id = (select auth.uid()) or profile_id = (select auth.uid()));

create policy "Trainers can create their clients"
on public.clients for insert to authenticated
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Trainers can update their clients"
on public.clients for update to authenticated
using (trainer_id = (select auth.uid()) and (select public.is_trainer()))
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Exercises are visible to their trainer"
on public.exercises for select to authenticated
using (
  trainer_id is null
  or trainer_id = (select auth.uid())
);

create policy "Trainers can create exercises"
on public.exercises for insert to authenticated
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Trainers can update their exercises"
on public.exercises for update to authenticated
using (trainer_id = (select auth.uid()) and (select public.is_trainer()))
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Trainers and assigned clients can read routines"
on public.routines for select to authenticated
using (
  trainer_id = (select auth.uid())
  or exists (
    select 1
    from public.routine_assignments a
    join public.clients c on c.id = a.client_id
    where a.routine_id = routines.id and c.profile_id = (select auth.uid())
  )
);

create policy "Trainers can create routines"
on public.routines for insert to authenticated
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Trainers can update their routines"
on public.routines for update to authenticated
using (trainer_id = (select auth.uid()) and (select public.is_trainer()))
with check (trainer_id = (select auth.uid()) and (select public.is_trainer()));

create policy "Routine days are visible to their trainer and assigned clients"
on public.routine_days for select to authenticated
using (
  exists (
    select 1 from public.routines r
    where r.id = routine_days.routine_id and r.trainer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.routine_assignments a
    join public.clients c on c.id = a.client_id
    join public.routines r on r.id = a.routine_id
    where r.id = routine_days.routine_id and c.profile_id = (select auth.uid())
  )
);

create policy "Trainers can create routine days"
on public.routine_days for insert to authenticated
with check (exists (
  select 1 from public.routines r
  where r.id = routine_days.routine_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Trainers can update routine days"
on public.routine_days for update to authenticated
using (exists (
  select 1 from public.routines r
  where r.id = routine_days.routine_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
))
with check (exists (
  select 1 from public.routines r
  where r.id = routine_days.routine_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Trainers can replace routine days"
on public.routine_days for delete to authenticated
using (exists (
  select 1 from public.routines r
  where r.id = routine_days.routine_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Routine exercises are visible to their trainer and assigned clients"
on public.routine_exercises for select to authenticated
using (
  exists (
    select 1 from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where d.id = routine_exercises.routine_day_id and r.trainer_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.routine_days d
    join public.routine_assignments a on a.routine_id = d.routine_id
    join public.clients c on c.id = a.client_id
    where d.id = routine_exercises.routine_day_id and c.profile_id = (select auth.uid())
  )
);

create policy "Trainers can create routine exercises"
on public.routine_exercises for insert to authenticated
with check (exists (
  select 1 from public.routine_days d
  join public.routines r on r.id = d.routine_id
  where d.id = routine_exercises.routine_day_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Trainers can update routine exercises"
on public.routine_exercises for update to authenticated
using (exists (
  select 1 from public.routine_days d
  join public.routines r on r.id = d.routine_id
  where d.id = routine_exercises.routine_day_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
))
with check (exists (
  select 1 from public.routine_days d
  join public.routines r on r.id = d.routine_id
  where d.id = routine_exercises.routine_day_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Trainers can replace routine exercises"
on public.routine_exercises for delete to authenticated
using (exists (
  select 1 from public.routine_days d
  join public.routines r on r.id = d.routine_id
  where d.id = routine_exercises.routine_day_id and r.trainer_id = (select auth.uid()) and (select public.is_trainer())
));

create policy "Assignments are visible to their trainer or linked client"
on public.routine_assignments for select to authenticated
using (
  trainer_id = (select auth.uid())
  or exists (
    select 1 from public.clients c
    where c.id = routine_assignments.client_id and c.profile_id = (select auth.uid())
  )
);

create policy "Trainers can assign routines to their own clients"
on public.routine_assignments for insert to authenticated
with check (
  trainer_id = (select auth.uid())
  and (select public.is_trainer())
  and exists (
    select 1 from public.clients c
    where c.id = routine_assignments.client_id and c.trainer_id = (select auth.uid())
  )
  and exists (
    select 1 from public.routines r
    where r.id = routine_assignments.routine_id and r.trainer_id = (select auth.uid())
  )
);

create policy "Trainers can update their assignments"
on public.routine_assignments for update to authenticated
using (trainer_id = (select auth.uid()) and (select public.is_trainer()))
with check (
  trainer_id = (select auth.uid())
  and (select public.is_trainer())
  and exists (
    select 1 from public.clients c
    where c.id = routine_assignments.client_id and c.trainer_id = (select auth.uid())
  )
  and exists (
    select 1 from public.routines r
    where r.id = routine_assignments.routine_id and r.trainer_id = (select auth.uid())
  )
);

create policy "Workout logs are visible to their client and trainer"
on public.workout_logs for select to authenticated
using (exists (
  select 1 from public.clients c
  where c.id = workout_logs.client_id
    and (c.profile_id = (select auth.uid()) or c.trainer_id = (select auth.uid()))
));

create policy "Clients can register their own workouts"
on public.workout_logs for insert to authenticated
with check (exists (
  select 1 from public.clients c
  where c.id = workout_logs.client_id and c.profile_id = (select auth.uid())
)
and exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'client'
)
and (
  workout_logs.assignment_id is null
  or exists (
    select 1 from public.routine_assignments a
    where a.id = workout_logs.assignment_id and a.client_id = workout_logs.client_id
  )
)
and (
  workout_logs.routine_day_id is null
  or exists (
    select 1
    from public.routine_days d
    join public.routine_assignments a on a.routine_id = d.routine_id
    where d.id = workout_logs.routine_day_id
      and a.id = workout_logs.assignment_id
      and a.client_id = workout_logs.client_id
  )
));

create or replace function public.save_routine_bundle(p_routine jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
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
  values (
    routine_uuid,
    (select auth.uid()),
    p_routine ->> 'name',
    p_routine ->> 'goal',
    (p_routine ->> 'durationWeeks')::integer,
    coalesce((p_routine ->> 'archived')::boolean, false)
  )
  on conflict (id) do update set
    name = excluded.name,
    goal = excluded.goal,
    duration_weeks = excluded.duration_weeks,
    is_archived = excluded.is_archived;

  delete from public.routine_days where routine_id = routine_uuid;

  for day_data in select value from jsonb_array_elements(p_routine -> 'days')
  loop
    day_uuid := (day_data ->> 'id')::uuid;
    insert into public.routine_days (id, routine_id, day_number, title, focus, sort_order)
    values (
      day_uuid,
      routine_uuid,
      (day_data ->> 'number')::integer,
      day_data ->> 'title',
      coalesce(day_data ->> 'focus', ''),
      day_order
    );

    move_order := 0;
    for move_data in select value from jsonb_array_elements(coalesce(day_data -> 'exercises', '[]'::jsonb))
    loop
      insert into public.routine_exercises (
        id, routine_day_id, exercise_id, exercise_name, muscle_group, equipment, instructions, video_url, media_url,
        sets, reps, rest_seconds, tempo, suggested_load, sort_order
      )
      values (
        (move_data ->> 'id')::uuid,
        day_uuid,
        nullif(move_data ->> 'exerciseId', '')::uuid,
        move_data ->> 'name',
        move_data ->> 'muscleGroup',
        coalesce(move_data ->> 'equipment', ''),
        coalesce(move_data ->> 'instructions', ''),
        nullif(move_data ->> 'videoUrl', ''),
        nullif(move_data ->> 'mediaUrl', ''),
        (move_data ->> 'sets')::integer,
        move_data ->> 'reps',
        (move_data ->> 'restSeconds')::integer,
        coalesce(move_data ->> 'tempo', ''),
        coalesce(move_data ->> 'suggestedLoad', ''),
        move_order
      );
      move_order := move_order + 1;
    end loop;
    day_order := day_order + 1;
  end loop;
end;
$$;

revoke all on function public.save_routine_bundle(jsonb) from public;
grant execute on function public.save_routine_bundle(jsonb) to authenticated;

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

revoke all on public.profiles, public.clients, public.exercises, public.routines,
  public.routine_days, public.routine_exercises, public.routine_assignments, public.workout_logs
  from public, anon, authenticated;
grant select on public.profiles, public.clients, public.exercises, public.routines,
  public.routine_days, public.routine_exercises, public.routine_assignments, public.workout_logs to authenticated;
grant insert (id, trainer_id, name, email, phone, goal, level, start_date, notes, status, membership, membership_status),
  update (id, trainer_id, name, email, phone, goal, level, start_date, notes, status, membership, membership_status)
  on public.clients to authenticated;
grant insert (id, trainer_id, name, muscle_group, equipment, instructions, video_url, media_url),
  update (id, trainer_id, name, muscle_group, equipment, instructions, video_url, media_url)
  on public.exercises to authenticated;
grant insert (id, trainer_id, name, goal, duration_weeks, is_archived),
  update (id, trainer_id, name, goal, duration_weeks, is_archived)
  on public.routines to authenticated;
grant insert (id, routine_id, day_number, title, focus, sort_order),
  update (id, routine_id, day_number, title, focus, sort_order)
  on public.routine_days to authenticated;
grant insert (id, routine_day_id, exercise_id, exercise_name, muscle_group, equipment, instructions, video_url, media_url, sets, reps, rest_seconds, tempo, suggested_load, sort_order),
  update (id, routine_day_id, exercise_id, exercise_name, muscle_group, equipment, instructions, video_url, media_url, sets, reps, rest_seconds, tempo, suggested_load, sort_order)
  on public.routine_exercises to authenticated;
grant delete on public.routine_days, public.routine_exercises to authenticated;
grant insert (id, trainer_id, client_id, routine_id, start_date, end_date, is_active),
  update (id, trainer_id, client_id, routine_id, start_date, end_date, is_active)
  on public.routine_assignments to authenticated;
grant insert (id, client_id, assignment_id, routine_day_id, routine_day_title, routine_day_focus, completed_at, comments, exercise_results)
  on public.workout_logs to authenticated;
