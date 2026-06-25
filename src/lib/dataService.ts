import { TEST_ITEMS, calculateBmi, generateLoginCode } from './metrics'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import type {
  AuthResult,
  Gender,
  MeasurementDraft,
  MeasurementSession,
  RecordItemCode,
  Semester,
  Student,
  StudentDraft,
  StudentProfile,
  TeacherProfile,
  TestItem,
} from './types'

type DbStudent = {
  id: string
  teacher_id: string
  name: string
  gender: Gender
  grade: number
  class_no: number
  student_no: number
  birth_date: string | null
  login_code: string
}

type DbSession = {
  id: string
  student_id: string
  measured_at: string
  semester: Semester
  height_cm: number | string
  weight_kg: number | string
  bmi: number | string
  memo: string | null
  fitness_records?: Array<{ item_code: RecordItemCode; value: number | string }>
}

const demoTeacher: TeacherProfile = {
  id: 'demo-teacher',
  email: 'teacher@example.com',
  name: '김체육',
  school: '한빛중학교',
}

let demoStudents: Student[] = [
  {
    id: 'student-1',
    teacherId: demoTeacher.id,
    name: '민준',
    gender: 'M',
    grade: 1,
    classNo: 3,
    studentNo: 7,
    birthDate: null,
    loginCode: 'MJN2026',
  },
  {
    id: 'student-2',
    teacherId: demoTeacher.id,
    name: '서연',
    gender: 'F',
    grade: 1,
    classNo: 3,
    studentNo: 12,
    birthDate: null,
    loginCode: 'SYE2026',
  },
  {
    id: 'student-3',
    teacherId: demoTeacher.id,
    name: '도윤',
    gender: 'M',
    grade: 1,
    classNo: 3,
    studentNo: 18,
    birthDate: null,
    loginCode: 'DYU2026',
  },
  {
    id: 'student-4',
    teacherId: demoTeacher.id,
    name: '지우',
    gender: 'F',
    grade: 1,
    classNo: 4,
    studentNo: 3,
    birthDate: null,
    loginCode: 'JIW2026',
  },
]

let demoSessions: MeasurementSession[] = [
  makeDemoSession('student-1', '2026-03-14', '1학기', 166.3, 58.4, {
    GRIP: 31.2,
    SHUTTLE_10M: 11.8,
    SIT_REACH: 12.5,
    LONG_JUMP: 188,
  }),
  makeDemoSession('student-1', '2026-06-10', '1학기', 168.0, 59.1, {
    GRIP: 34.8,
    SHUTTLE_10M: 11.1,
    SIT_REACH: 14.0,
    LONG_JUMP: 196,
  }),
  makeDemoSession('student-2', '2026-03-14', '1학기', 160.2, 50.0, {
    GRIP: 24.4,
    SHUTTLE_10M: 12.4,
    SIT_REACH: 16.5,
    LONG_JUMP: 162,
  }),
  makeDemoSession('student-2', '2026-06-10', '1학기', 161.1, 50.6, {
    GRIP: 26.0,
    SHUTTLE_10M: 12.0,
    SIT_REACH: 18.4,
    LONG_JUMP: 170,
  }),
  makeDemoSession('student-3', '2026-06-10', '1학기', 169.5, 61.8, {
    GRIP: 36.2,
    SHUTTLE_10M: 10.8,
    SIT_REACH: 9.8,
    LONG_JUMP: 210,
  }),
]

function makeDemoSession(
  studentId: string,
  measuredAt: string,
  semester: Semester,
  heightCm: number,
  weightKg: number,
  records: Record<RecordItemCode, number>,
): MeasurementSession {
  return {
    id: crypto.randomUUID(),
    studentId,
    measuredAt,
    semester,
    heightCm,
    weightKg,
    bmi: calculateBmi(heightCm, weightKg),
    memo: null,
    records,
  }
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return supabase
}

function throwError(error: unknown) {
  if (!error) return
  const message = error instanceof Error ? error.message : String(error)
  throw new Error(message)
}

function toStudent(row: DbStudent): Student {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    gender: row.gender,
    grade: row.grade,
    classNo: row.class_no,
    studentNo: row.student_no,
    birthDate: row.birth_date,
    loginCode: row.login_code,
  }
}

function toDbStudent(draft: StudentDraft, teacherId: string) {
  return {
    teacher_id: teacherId,
    name: draft.name.trim(),
    gender: draft.gender,
    grade: draft.grade,
    class_no: draft.classNo,
    student_no: draft.studentNo,
    birth_date: draft.birthDate || null,
    login_code: (draft.loginCode || generateLoginCode()).trim().toUpperCase(),
  }
}

function toSession(row: DbSession): MeasurementSession {
  const records: Partial<Record<RecordItemCode, number>> = {}
  for (const record of row.fitness_records ?? []) {
    records[record.item_code] = Number(record.value)
  }
  return {
    id: row.id,
    studentId: row.student_id,
    measuredAt: row.measured_at,
    semester: row.semester,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    bmi: Number(row.bmi),
    memo: row.memo,
    records,
  }
}

function toStudentMeasurement(row: Record<string, unknown>, studentId: string): MeasurementSession {
  return {
    id: String(row.session_id),
    studentId,
    measuredAt: String(row.measured_at),
    semester: row.semester as Semester,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    bmi: Number(row.bmi),
    memo: row.memo ? String(row.memo) : null,
    records: {
      GRIP: row.grip == null ? undefined : Number(row.grip),
      SHUTTLE_10M: row.shuttle_10m == null ? undefined : Number(row.shuttle_10m),
      SIT_REACH: row.sit_reach == null ? undefined : Number(row.sit_reach),
      LONG_JUMP: row.long_jump == null ? undefined : Number(row.long_jump),
    },
  }
}

export async function getTestItems(): Promise<TestItem[]> {
  if (!isSupabaseConfigured) return TEST_ITEMS
  const client = requireSupabase()
  const { data, error } = await client
    .from('test_items')
    .select('code,name_ko,unit,direction,fitness_factor,sort_order')
    .order('sort_order')
  throwError(error)
  return (data ?? []).map((row) => ({
    code: row.code,
    nameKo: row.name_ko,
    unit: row.unit,
    direction: row.direction,
    fitnessFactor: row.fitness_factor,
    sortOrder: row.sort_order,
  }))
}

export async function getCurrentTeacher(): Promise<TeacherProfile | null> {
  if (!isSupabaseConfigured) return demoTeacher
  const client = requireSupabase()
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()
  throwError(userError)
  if (!user) return null
  const { data, error } = await client
    .from('teacher_profiles')
    .select('id,email,name,school')
    .eq('id', user.id)
    .maybeSingle()
  throwError(error)
  if (!data) return null
  return data
}

export async function signInTeacher(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { profile: demoTeacher }
  const client = requireSupabase()
  const { error } = await client.auth.signInWithPassword({ email, password })
  throwError(error)
  return { profile: await getCurrentTeacher() }
}

export async function signUpTeacher(
  email: string,
  password: string,
  name: string,
  school: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { profile: demoTeacher }
  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name, school } },
  })
  throwError(error)
  if (!data.user || !data.session) return { profile: null, needsEmailConfirmation: true }
  const { error: profileError } = await client.from('teacher_profiles').upsert({
    id: data.user.id,
    email,
    name,
    school,
  })
  throwError(profileError)
  return { profile: await getCurrentTeacher() }
}

export async function signOutTeacher() {
  if (!isSupabaseConfigured) return
  const client = requireSupabase()
  const { error } = await client.auth.signOut()
  throwError(error)
}

export async function listStudents(): Promise<Student[]> {
  if (!isSupabaseConfigured) return [...demoStudents].sort(sortStudents)
  const client = requireSupabase()
  const { data, error } = await client
    .from('students')
    .select('id,teacher_id,name,gender,grade,class_no,student_no,birth_date,login_code')
    .order('grade')
    .order('class_no')
    .order('student_no')
  throwError(error)
  return (data ?? []).map(toStudent)
}

export async function saveStudent(
  draft: StudentDraft,
  teacher: TeacherProfile,
  studentId?: string,
): Promise<Student> {
  if (!isSupabaseConfigured) {
    const payload: Student = {
      id: studentId ?? crypto.randomUUID(),
      teacherId: teacher.id,
      name: draft.name.trim(),
      gender: draft.gender,
      grade: draft.grade,
      classNo: draft.classNo,
      studentNo: draft.studentNo,
      birthDate: draft.birthDate || null,
      loginCode: (draft.loginCode || generateLoginCode()).trim().toUpperCase(),
    }
    demoStudents = studentId
      ? demoStudents.map((student) => (student.id === studentId ? payload : student))
      : [...demoStudents, payload]
    return payload
  }

  const client = requireSupabase()
  const payload = toDbStudent(draft, teacher.id)
  const query = studentId
    ? client
        .from('students')
        .update(payload)
        .eq('id', studentId)
        .select('id,teacher_id,name,gender,grade,class_no,student_no,birth_date,login_code')
        .single()
    : client
        .from('students')
        .insert(payload)
        .select('id,teacher_id,name,gender,grade,class_no,student_no,birth_date,login_code')
        .single()
  const { data, error } = await query
  throwError(error)
  if (!data) throw new Error('저장된 학생 데이터를 불러오지 못했습니다.')
  return toStudent(data)
}

export async function deleteStudent(studentId: string) {
  if (!isSupabaseConfigured) {
    demoStudents = demoStudents.filter((student) => student.id !== studentId)
    demoSessions = demoSessions.filter((session) => session.studentId !== studentId)
    return
  }
  const client = requireSupabase()
  const { error } = await client.from('students').delete().eq('id', studentId)
  throwError(error)
}

export async function listTeacherMeasurements(): Promise<MeasurementSession[]> {
  if (!isSupabaseConfigured) return [...demoSessions].sort(sortSessionsDesc)
  const client = requireSupabase()
  const { data, error } = await client
    .from('measurement_sessions')
    .select('id,student_id,measured_at,semester,height_cm,weight_kg,bmi,memo,fitness_records(item_code,value)')
    .order('measured_at', { ascending: false })
  throwError(error)
  return (data ?? []).map(toSession)
}

export async function studentLogin(loginCode: string): Promise<StudentProfile | null> {
  const normalized = loginCode.trim().toUpperCase()
  if (!isSupabaseConfigured) {
    const student = demoStudents.find((entry) => entry.loginCode === normalized)
    if (!student) return null
    return {
      studentId: student.id,
      name: student.name,
      gender: student.gender,
      grade: student.grade,
      classNo: student.classNo,
      studentNo: student.studentNo,
      school: demoTeacher.school,
      teacherName: demoTeacher.name,
    }
  }

  const client = requireSupabase()
  const { data, error } = await client.rpc('student_get_profile', { p_login_code: normalized })
  throwError(error)
  const row = data?.[0]
  if (!row) return null
  return {
    studentId: row.student_id,
    name: row.name,
    gender: row.gender,
    grade: row.grade,
    classNo: row.class_no,
    studentNo: row.student_no,
    school: row.school,
    teacherName: row.teacher_name,
  }
}

export async function listStudentMeasurements(
  loginCode: string,
  studentId: string,
): Promise<MeasurementSession[]> {
  const normalized = loginCode.trim().toUpperCase()
  if (!isSupabaseConfigured) {
    return demoSessions
      .filter((session) => session.studentId === studentId)
      .sort(sortSessionsDesc)
  }

  const client = requireSupabase()
  const { data, error } = await client.rpc('student_get_measurements', {
    p_login_code: normalized,
  })
  throwError(error)
  return ((data ?? []) as Record<string, unknown>[]).map((row) => toStudentMeasurement(row, studentId))
}

export async function submitStudentMeasurement(loginCode: string, draft: MeasurementDraft) {
  const normalized = loginCode.trim().toUpperCase()
  if (!isSupabaseConfigured) {
    const student = demoStudents.find((entry) => entry.loginCode === normalized)
    if (!student) throw new Error('학생 코드를 찾을 수 없습니다.')
    demoSessions = [
      {
        id: crypto.randomUUID(),
        studentId: student.id,
        measuredAt: draft.measuredAt,
        semester: draft.semester,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        bmi: calculateBmi(draft.heightCm, draft.weightKg),
        memo: draft.memo || null,
        records: draft.records,
      },
      ...demoSessions,
    ]
    return
  }

  const client = requireSupabase()
  const records = Object.entries(draft.records).map(([item_code, value]) => ({
    item_code,
    value,
  }))
  const { error } = await client.rpc('student_submit_measurement', {
    p_login_code: normalized,
    p_measured_at: draft.measuredAt,
    p_semester: draft.semester,
    p_height_cm: draft.heightCm,
    p_weight_kg: draft.weightKg,
    p_records: records,
    p_memo: draft.memo || null,
  })
  throwError(error)
}

export function exportClassCsv(students: Student[], sessions: MeasurementSession[]) {
  const latestByStudent = new Map<string, MeasurementSession>()
  for (const session of [...sessions].sort(sortSessionsDesc)) {
    if (!latestByStudent.has(session.studentId)) latestByStudent.set(session.studentId, session)
  }

  const rows = students.map((student) => {
    const latest = latestByStudent.get(student.id)
    return [
      student.grade,
      student.classNo,
      student.studentNo,
      student.name,
      student.gender,
      student.loginCode,
      latest?.measuredAt ?? '',
      latest?.heightCm ?? '',
      latest?.weightKg ?? '',
      latest?.bmi ?? '',
      latest?.records.GRIP ?? '',
      latest?.records.SHUTTLE_10M ?? '',
      latest?.records.SIT_REACH ?? '',
      latest?.records.LONG_JUMP ?? '',
    ]
  })

  return [
    ['학년', '반', '번호', '이름', '성별', '로그인코드', '최근측정일', '키', '몸무게', 'BMI', '악력', '10m왕복', '앉아굽히기', '멀리뛰기'],
    ...rows,
  ]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n')
}

export function parseStudentCsv(text: string): StudentDraft[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): StudentDraft => {
      const [grade, classNo, studentNo, name, gender, loginCode] = line.split(',').map((cell) => cell.trim())
      return {
        grade: Number(grade),
        classNo: Number(classNo),
        studentNo: Number(studentNo),
        name,
        gender: gender === 'F' ? 'F' : 'M',
        loginCode: loginCode || generateLoginCode(),
      }
    })
    .filter((draft) => draft.name && draft.grade && draft.classNo && draft.studentNo)
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function sortStudents(a: Student, b: Student) {
  return a.grade - b.grade || a.classNo - b.classNo || a.studentNo - b.studentNo
}

function sortSessionsDesc(a: MeasurementSession, b: MeasurementSession) {
  return b.measuredAt.localeCompare(a.measuredAt)
}
