-- Run this in Supabase SQL Editor if student login says:
-- "Could not find the function public.student_get_profile(p_login_code) in the schema cache"

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

notify pgrst, 'reload schema';
