import { KeyRound, LogIn, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { signInTeacher, signUpTeacher, studentLogin } from '../lib/dataService'
import type { StudentProfile, TeacherProfile } from '../lib/types'

interface AuthPanelProps {
  mode: 'teacher' | 'student'
  onModeChange: (mode: 'teacher' | 'student') => void
  onTeacherReady: (profile: TeacherProfile) => void
  onStudentReady: (profile: StudentProfile, loginCode: string) => void
}

export function AuthPanel({ mode, onModeChange, onTeacherReady, onStudentReady }: AuthPanelProps) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('teacher@example.com')
  const [password, setPassword] = useState('password1234')
  const [name, setName] = useState('김체육')
  const [school, setSchool] = useState('한빛중학교')
  const [loginCode, setLoginCode] = useState('MJN2026')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitTeacher(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const result = isSignup
        ? await signUpTeacher(email, password, name, school)
        : await signInTeacher(email, password)
      if (result.profile) onTeacherReady(result.profile)
      else if (result.needsEmailConfirmation) setMessage('이메일 확인 후 다시 로그인해 주세요.')
      else setMessage('교사 프로필을 찾지 못했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function submitStudent(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const profile = await studentLogin(loginCode)
      if (!profile) {
        setMessage('학생 코드를 찾지 못했습니다.')
        return
      }
      onStudentReady(profile, loginCode.trim().toUpperCase())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '학생 로그인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="auth-grid">
      <div className="auth-intro">
        <h1>체력측정 기록</h1>
        <p>
          학생은 수업 중 바로 기록을 입력하고, 교사는 학급 전체의 미측정자와 향상 추이를 한 번에 확인합니다.
        </p>
        <div className="mode-switch" role="tablist" aria-label="로그인 방식">
          <button className={mode === 'teacher' ? 'active' : ''} onClick={() => onModeChange('teacher')} type="button">
            교사용
          </button>
          <button className={mode === 'student' ? 'active' : ''} onClick={() => onModeChange('student')} type="button">
            학생용
          </button>
        </div>
      </div>

      {mode === 'teacher' ? (
        <form className="panel auth-form" onSubmit={submitTeacher}>
          <div className="panel-title">
            {isSignup ? <UserPlus size={20} /> : <LogIn size={20} />}
            <div>
              <h2>{isSignup ? '교사 계정 만들기' : '교사 로그인'}</h2>
              <p>Supabase Auth 계정으로 학생 데이터를 관리합니다.</p>
            </div>
          </div>
          {isSignup && (
            <div className="field-row two">
              <label>
                이름
                <input value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
              <label>
                학교
                <input value={school} onChange={(event) => setSchool(event.target.value)} required />
              </label>
            </div>
          )}
          <label>
            이메일
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? '처리 중' : isSignup ? '계정 만들기' : '로그인'}
          </button>
          <button className="ghost-action" type="button" onClick={() => setIsSignup((value) => !value)}>
            {isSignup ? '이미 계정이 있어요' : '처음 사용하는 교사예요'}
          </button>
        </form>
      ) : (
        <form className="panel auth-form student-login" onSubmit={submitStudent}>
          <div className="panel-title">
            <KeyRound size={20} />
            <div>
              <h2>학생 코드 입력</h2>
              <p>교사가 나눠준 간편코드로 본인 기록만 입력합니다.</p>
            </div>
          </div>
          <label>
            로그인 코드
            <input
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value.toUpperCase())}
              placeholder="예: MJN2026"
              required
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? '확인 중' : '내 기록으로 이동'}
          </button>
        </form>
      )}
    </section>
  )
}
