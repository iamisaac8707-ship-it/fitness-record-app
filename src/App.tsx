import { useEffect, useState } from 'react'
import './App.css'
import { AuthPanel } from './components/AuthPanel'
import { StudentWorkspace } from './components/StudentWorkspace'
import { TeacherWorkspace } from './components/TeacherWorkspace'
import {
  getCurrentTeacher,
  listStudentMeasurements,
  listStudents,
  listTeacherMeasurements,
  signOutTeacher,
} from './lib/dataService'
import { isSupabaseConfigured } from './lib/supabaseClient'
import type { MeasurementSession, Student, StudentProfile, TeacherProfile } from './lib/types'

function App() {
  const [mode, setMode] = useState<'teacher' | 'student'>('teacher')
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [studentLoginCode, setStudentLoginCode] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<MeasurementSession[]>([])
  const [loading, setLoading] = useState(true)
  const [bootMessage, setBootMessage] = useState('')

  useEffect(() => {
    let alive = true
    async function boot() {
      try {
        const currentTeacher = await getCurrentTeacher()
        if (!alive) return
        if (currentTeacher) {
          setTeacher(currentTeacher)
          const [studentRows, sessionRows] = await Promise.all([listStudents(), listTeacherMeasurements()])
          if (!alive) return
          setStudents(studentRows)
          setSessions(sessionRows)
        }
      } catch (error) {
        if (alive) setBootMessage(error instanceof Error ? error.message : '초기화 중 오류가 발생했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void boot()
    return () => {
      alive = false
    }
  }, [])

  async function handleTeacherReady(profile: TeacherProfile) {
    setTeacher(profile)
    setStudentProfile(null)
    setMode('teacher')
    const [studentRows, sessionRows] = await Promise.all([listStudents(), listTeacherMeasurements()])
    setStudents(studentRows)
    setSessions(sessionRows)
  }

  async function handleStudentReady(profile: StudentProfile, loginCode: string) {
    setStudentProfile(profile)
    setStudentLoginCode(loginCode)
    setTeacher(null)
    setMode('student')
    setSessions(await listStudentMeasurements(loginCode, profile.studentId))
  }

  if (loading) {
    return <div className="loading-screen">체력측정 기록을 불러오는 중입니다.</div>
  }

  return (
    <>
      {!isSupabaseConfigured && (
        <div className="setup-banner">
          Supabase 환경변수가 없어 휘발성 데모 데이터로 실행 중입니다. 배포 전{' '}
          <code>VITE_SUPABASE_URL</code>
          {' '}
          <code>VITE_SUPABASE_ANON_KEY</code>
          {' '}를 설정하세요.
        </div>
      )}
      {bootMessage && <div className="setup-banner danger">{bootMessage}</div>}
      {teacher ? (
        <TeacherWorkspace
          teacher={teacher}
          students={students}
          sessions={sessions}
          onStudentsChange={setStudents}
          onSessionsChange={setSessions}
          onLogout={() => {
            void signOutTeacher()
            setTeacher(null)
            setStudents([])
            setSessions([])
          }}
        />
      ) : studentProfile ? (
        <StudentWorkspace
          profile={studentProfile}
          loginCode={studentLoginCode}
          sessions={sessions}
          onSessionsChange={setSessions}
          onLogout={() => {
            setStudentProfile(null)
            setStudentLoginCode('')
            setSessions([])
          }}
        />
      ) : (
        <AuthPanel
          mode={mode}
          onModeChange={setMode}
          onTeacherReady={handleTeacherReady}
          onStudentReady={handleStudentReady}
        />
      )}
    </>
  )
}

export default App
