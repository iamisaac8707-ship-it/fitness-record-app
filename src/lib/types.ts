export type Gender = 'M' | 'F'
export type ItemCode = 'GRIP' | 'SHUTTLE_10M' | 'SIT_REACH' | 'LONG_JUMP' | 'BMI'
export type RecordItemCode = Exclude<ItemCode, 'BMI'>
export type Direction = 'HIGH_BETTER' | 'LOW_BETTER' | 'RANGE'
export type Semester = '1학기' | '2학기' | '기타'

export interface TestItem {
  code: ItemCode
  nameKo: string
  unit: string
  direction: Direction
  fitnessFactor: string
  sortOrder: number
}

export interface TeacherProfile {
  id: string
  email: string
  name: string
  school: string
}

export interface Student {
  id: string
  teacherId: string
  name: string
  gender: Gender
  grade: number
  classNo: number
  studentNo: number
  birthDate?: string | null
  loginCode: string
}

export interface MeasurementSession {
  id: string
  studentId: string
  measuredAt: string
  semester: Semester
  heightCm: number
  weightKg: number
  bmi: number
  memo?: string | null
  records: Partial<Record<RecordItemCode, number>>
}

export interface StudentProfile {
  studentId: string
  name: string
  gender: Gender
  grade: number
  classNo: number
  studentNo: number
  school: string
  teacherName: string
}

export interface StudentDraft {
  name: string
  gender: Gender
  grade: number
  classNo: number
  studentNo: number
  birthDate?: string
  loginCode?: string
}

export interface MeasurementDraft {
  measuredAt: string
  semester: Semester
  heightCm: number
  weightKg: number
  memo?: string
  records: Record<RecordItemCode, number>
}

export interface AuthResult {
  profile: TeacherProfile | null
  needsEmailConfirmation?: boolean
}
