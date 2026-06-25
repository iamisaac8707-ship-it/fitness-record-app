-- Fitness measurement app schema for Supabase.
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  school text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.test_items (
  code text primary key,
  name_ko text not null,
  unit text not null,
  direction text not null check (direction in ('HIGH_BETTER', 'LOW_BETTER', 'RANGE')),
  fitness_factor text not null,
  sort_order integer not null unique
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  name text not null,
  gender text not null check (gender in ('M', 'F')),
  grade integer not null check (grade between 1 and 12),
  class_no integer not null check (class_no between 1 and 99),
  student_no integer not null check (student_no between 1 and 99),
  birth_date date,
  login_code text not null unique check (login_code = upper(login_code) and login_code ~ '^[A-Z0-9]{6,12}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, grade, class_no, student_no)
);

create table if not exists public.measurement_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  measured_at date not null default current_date,
  height_cm numeric(5,1) not null check (height_cm between 80 and 230),
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 200),
  bmi numeric(4,1) generated always as (
    round(weight_kg / ((height_cm / 100) * (height_cm / 100)), 1)
  ) stored,
  semester text not null check (semester in ('1학기', '2학기', '기타')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.fitness_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.measurement_sessions(id) on delete cascade,
  item_code text not null references public.test_items(code),
  value numeric(7,2) not null check (value >= 0),
  created_at timestamptz not null default now(),
  unique (session_id, item_code),
  check (item_code <> 'BMI')
);

create index if not exists students_teacher_class_idx
  on public.students (teacher_id, grade, class_no, student_no);

create index if not exists measurement_sessions_student_date_idx
  on public.measurement_sessions (student_id, measured_at desc);

create index if not exists fitness_records_session_item_idx
  on public.fitness_records (session_id, item_code);

insert into public.test_items (code, name_ko, unit, direction, fitness_factor, sort_order) values
  ('GRIP',        '악력',                 'kg',   'HIGH_BETTER', '근력',          1),
  ('SHUTTLE_10M', '10m 왕복달리기',        '초',   'LOW_BETTER',  '민첩성/순발력', 2),
  ('SIT_REACH',   '앉아윗몸앞으로굽히기',  'cm',   'HIGH_BETTER', '유연성',        3),
  ('LONG_JUMP',   '제자리멀리뛰기',        'cm',   'HIGH_BETTER', '순발력',        4),
  ('BMI',         'BMI',                  'kg/m²','RANGE',       '비만/체격',     5)
on conflict (code) do update set
  name_ko = excluded.name_ko,
  unit = excluded.unit,
  direction = excluded.direction,
  fitness_factor = excluded.fitness_factor,
  sort_order = excluded.sort_order;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at
before update on public.students
for each row
execute function public.touch_updated_at();

create or replace function public.handle_new_teacher_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.teacher_profiles (id, email, name, school)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '교사'),
    coalesce(new.raw_user_meta_data ->> 'school', '학교')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_teacher_profile();

alter table public.teacher_profiles enable row level security;
alter table public.test_items enable row level security;
alter table public.students enable row level security;
alter table public.measurement_sessions enable row level security;
alter table public.fitness_records enable row level security;

-- Explicit Data API grants are required for new Supabase projects.
grant select, insert, update on public.teacher_profiles to authenticated;
grant select on public.test_items to anon, authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.measurement_sessions to authenticated;
grant select, insert, update, delete on public.fitness_records to authenticated;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

drop policy if exists "Teachers can read own profile" on public.teacher_profiles;
create policy "Teachers can read own profile"
on public.teacher_profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Teachers can create own profile" on public.teacher_profiles;
create policy "Teachers can create own profile"
on public.teacher_profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Teachers can update own profile" on public.teacher_profiles;
create policy "Teachers can update own profile"
on public.teacher_profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Everyone can read test items" on public.test_items;
create policy "Everyone can read test items"
on public.test_items for select
to anon, authenticated
using (true);

drop policy if exists "Teachers can manage own students" on public.students;
create policy "Teachers can manage own students"
on public.students for all
to authenticated
using ((select auth.uid()) = teacher_id)
with check ((select auth.uid()) = teacher_id);

drop policy if exists "Teachers can manage own sessions" on public.measurement_sessions;
create policy "Teachers can manage own sessions"
on public.measurement_sessions for all
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = measurement_sessions.student_id
      and s.teacher_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = measurement_sessions.student_id
      and s.teacher_id = (select auth.uid())
  )
);

drop policy if exists "Teachers can manage own records" on public.fitness_records;
create policy "Teachers can manage own records"
on public.fitness_records for all
to authenticated
using (
  exists (
    select 1
    from public.measurement_sessions ms
    join public.students s on s.id = ms.student_id
    where ms.id = fitness_records.session_id
      and s.teacher_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.measurement_sessions ms
    join public.students s on s.id = ms.student_id
    where ms.id = fitness_records.session_id
      and s.teacher_id = (select auth.uid())
  )
);

create or replace function public.student_get_profile(p_login_code text)
returns table (
  student_id uuid,
  name text,
  gender text,
  grade integer,
  class_no integer,
  student_no integer,
  school text,
  teacher_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    s.id,
    s.name,
    s.gender,
    s.grade,
    s.class_no,
    s.student_no,
    tp.school,
    tp.name
  from public.students s
  join public.teacher_profiles tp on tp.id = s.teacher_id
  where s.login_code = upper(trim(p_login_code));
end;
$$;

create or replace function public.student_get_measurements(p_login_code text)
returns table (
  session_id uuid,
  measured_at date,
  semester text,
  height_cm numeric,
  weight_kg numeric,
  bmi numeric,
  memo text,
  grip numeric,
  shuttle_10m numeric,
  sit_reach numeric,
  long_jump numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    ms.id,
    ms.measured_at,
    ms.semester,
    ms.height_cm,
    ms.weight_kg,
    ms.bmi,
    ms.memo,
    max(fr.value) filter (where fr.item_code = 'GRIP') as grip,
    max(fr.value) filter (where fr.item_code = 'SHUTTLE_10M') as shuttle_10m,
    max(fr.value) filter (where fr.item_code = 'SIT_REACH') as sit_reach,
    max(fr.value) filter (where fr.item_code = 'LONG_JUMP') as long_jump
  from public.students s
  join public.measurement_sessions ms on ms.student_id = s.id
  left join public.fitness_records fr on fr.session_id = ms.id
  where s.login_code = upper(trim(p_login_code))
  group by ms.id
  order by ms.measured_at desc, ms.created_at desc;
end;
$$;

create or replace function public.student_submit_measurement(
  p_login_code text,
  p_measured_at date,
  p_semester text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_records jsonb,
  p_memo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_session_id uuid;
begin
  select id into v_student_id
  from public.students
  where login_code = upper(trim(p_login_code));

  if v_student_id is null then
    raise exception 'LOGIN_CODE_NOT_FOUND';
  end if;

  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'RECORDS_MUST_BE_ARRAY';
  end if;

  insert into public.measurement_sessions (
    student_id,
    measured_at,
    semester,
    height_cm,
    weight_kg,
    memo
  )
  values (
    v_student_id,
    coalesce(p_measured_at, current_date),
    coalesce(nullif(p_semester, ''), '기타'),
    p_height_cm,
    p_weight_kg,
    nullif(p_memo, '')
  )
  returning id into v_session_id;

  insert into public.fitness_records (session_id, item_code, value)
  select v_session_id, r.item_code, r.value
  from jsonb_to_recordset(p_records) as r(item_code text, value numeric)
  join public.test_items ti on ti.code = r.item_code
  where r.item_code <> 'BMI'
    and r.value is not null;

  return v_session_id;
end;
$$;

grant execute on function public.student_get_profile(text) to anon, authenticated;
grant execute on function public.student_get_measurements(text) to anon, authenticated;
grant execute on function public.student_submit_measurement(text, date, text, numeric, numeric, jsonb, text) to anon, authenticated;
