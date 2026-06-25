import {
  BarChart3,
  ClipboardList,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DistributionChart, TrendChart } from './Charts'
import {
  deleteStudent,
  exportClassCsv,
  listStudents,
  listTeacherMeasurements,
  parseStudentCsv,
  saveStudent,
} from '../lib/dataService'
import {
  RECORD_ITEM_CODES,
  TEST_ITEMS,
  formatValue,
  generateLoginCode,
  getDirectionLabel,
  itemByCode,
} from '../lib/metrics'
import { buildClassStats, getSessionValue, getStudentTrend, latestSessionsByStudent } from '../lib/stats'
import type { ItemCode, MeasurementSession, Student, StudentDraft, TeacherProfile } from '../lib/types'

interface TeacherWorkspaceProps {
  teacher: TeacherProfile
  students: Student[]
  sessions: MeasurementSession[]
  onStudentsChange: (students: Student[]) => void
  onSessionsChange: (sessions: MeasurementSession[]) => void
  onLogout: () => void
}

const initialDraft: StudentDraft = {
  name: '',
  gender: 'M',
  grade: 1,
  classNo: 3,
  studentNo: 1,
  birthDate: '',
  loginCode: '',
}

export function TeacherWorkspace({
  teacher,
  students,
  sessions,
  onStudentsChange,
  onSessionsChange,
  onLogout,
}: TeacherWorkspaceProps) {
  const [draft, setDraft] = useState<StudentDraft>({ ...initialDraft, loginCode: generateLoginCode() })
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all')
  const [classFilter, setClassFilter] = useState<number | 'all'>('all')
  const [activeCode, setActiveCode] = useState<ItemCode>('GRIP')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [csvText, setCsvText] = useState('1,3,21,하린,F,HRN2026\n1,3,22,준서,M,JNS2026')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          (gradeFilter === 'all' || student.grade === gradeFilter) &&
          (classFilter === 'all' || student.classNo === classFilter),
      ),
    [classFilter, gradeFilter, students],
  )
  const filteredIds = useMemo(() => new Set(filteredStudents.map((student) => student.id)), [filteredStudents])
  const filteredSessions = useMemo(
    () => sessions.filter((session) => filteredIds.has(session.studentId)),
    [filteredIds, sessions],
  )
  const latestByStudent = useMemo(() => latestSessionsByStudent(filteredSessions), [filteredSessions])
  const classStats = useMemo(() => buildClassStats(filteredStudents, filteredSessions), [filteredStudents, filteredSessions])
  const selectedStudent = filteredStudents.find((student) => student.id === selectedStudentId) ?? filteredStudents[0]
  const selectedSessions = useMemo(
    () => (selectedStudent ? filteredSessions.filter((session) => session.studentId === selectedStudent.id) : []),
    [filteredSessions, selectedStudent],
  )
  const selectedTrend = useMemo(() => getStudentTrend(selectedSessions, activeCode), [activeCode, selectedSessions])
  const availableGrades = [...new Set(students.map((student) => student.grade))].sort((a, b) => a - b)
  const availableClasses = [...new Set(students.map((student) => student.classNo))].sort((a, b) => a - b)

  useEffect(() => {
    if (!selectedStudentId && filteredStudents[0]) setSelectedStudentId(filteredStudents[0].id)
    if (selectedStudentId && !filteredStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0]?.id ?? '')
    }
  }, [filteredStudents, selectedStudentId])

  async function refresh() {
    setBusy(true)
    setMessage('')
    try {
      const [nextStudents, nextSessions] = await Promise.all([listStudents(), listTeacherMeasurements()])
      onStudentsChange(nextStudents)
      onSessionsChange(nextSessions)
      setMessage('최신 데이터로 갱신했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '데이터 갱신에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function submitStudent(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await saveStudent(draft, teacher)
      onStudentsChange(await listStudents())
      setDraft({ ...initialDraft, grade: draft.grade, classNo: draft.classNo, studentNo: draft.studentNo + 1, loginCode: generateLoginCode() })
      setMessage('학생을 등록했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '학생 등록에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function removeStudent(studentId: string) {
    setBusy(true)
    setMessage('')
    try {
      await deleteStudent(studentId)
      const [nextStudents, nextSessions] = await Promise.all([listStudents(), listTeacherMeasurements()])
      onStudentsChange(nextStudents)
      onSessionsChange(nextSessions)
      setMessage('학생을 삭제했습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function importCsv() {
    setBusy(true)
    setMessage('')
    try {
      const drafts = parseStudentCsv(csvText)
      for (const row of drafts) await saveStudent(row, teacher)
      onStudentsChange(await listStudents())
      setMessage(`${drafts.length}명을 가져왔습니다.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CSV 가져오기에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function downloadCsv() {
    const csv = exportClassCsv(filteredStudents, filteredSessions)
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fitness-class-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="teacher-shell">
      <aside className="side-nav">
        <div className="brand-mark">F</div>
        <nav aria-label="교사용 메뉴">
          <a href="#students" className="active">
            <Users size={18} />
            학생 관리
          </a>
          <a href="#records">
            <Table2 size={18} />
            학급 기록
          </a>
          <a href="#stats">
            <BarChart3 size={18} />
            통계
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{teacher.school}</p>
            <h1>체력측정 기록</h1>
            <p>{teacher.name} 교사용 대시보드</p>
          </div>
          <div className="header-actions">
            <button className="ghost-action compact" type="button" onClick={refresh} disabled={busy}>
              <RefreshCw size={16} />
              갱신
            </button>
            <button className="ghost-action compact" type="button" onClick={onLogout}>
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </header>

        <section className="controls-band">
          <label>
            학년
            <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
              <option value="all">전체</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}학년
                </option>
              ))}
            </select>
          </label>
          <label>
            반
            <select value={classFilter} onChange={(event) => setClassFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
              <option value="all">전체</option>
              {availableClasses.map((classNo) => (
                <option key={classNo} value={classNo}>
                  {classNo}반
                </option>
              ))}
            </select>
          </label>
          <button className="primary-action compact" type="button" onClick={downloadCsv}>
            <Download size={16} />
            CSV
          </button>
        </section>

        <section className="stat-grid" id="stats">
          <StatCard label="학생" value={`${classStats.totalStudents}명`} detail={`측정 ${classStats.measuredStudents}명`} />
          <StatCard label="완료율" value={`${classStats.completionRate}%`} detail={`미측정 ${classStats.missingStudents}명`} tone="green" />
          <StatCard
            label="평균 악력"
            value={formatValue('GRIP', classStats.itemStats.find((item) => item.code === 'GRIP')?.avg)}
            detail="최근 세션 기준"
          />
          <StatCard
            label="10m 왕복"
            value={formatValue('SHUTTLE_10M', classStats.itemStats.find((item) => item.code === 'SHUTTLE_10M')?.avg)}
            detail="낮을수록 향상"
            tone="blue"
          />
        </section>

        <section className="teacher-grid">
          <div className="panel" id="students">
            <div className="panel-title">
              <Users size={20} />
              <div>
                <h2>학생 관리</h2>
                <p>학생 코드로 학생용 화면에 접속합니다.</p>
              </div>
            </div>
            <form className="student-form" onSubmit={submitStudent}>
              <div className="field-row three">
                <label>
                  이름
                  <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                </label>
                <label>
                  성별
                  <select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as StudentDraft['gender'] })}>
                    <option value="M">남</option>
                    <option value="F">여</option>
                  </select>
                </label>
                <label>
                  코드
                  <input value={draft.loginCode} onChange={(event) => setDraft({ ...draft, loginCode: event.target.value.toUpperCase() })} required />
                </label>
              </div>
              <div className="field-row three">
                <NumberField label="학년" value={draft.grade} onChange={(value) => setDraft({ ...draft, grade: value })} />
                <NumberField label="반" value={draft.classNo} onChange={(value) => setDraft({ ...draft, classNo: value })} />
                <NumberField label="번호" value={draft.studentNo} onChange={(value) => setDraft({ ...draft, studentNo: value })} />
              </div>
              <button className="primary-action compact" type="submit" disabled={busy}>
                <Plus size={16} />
                등록
              </button>
            </form>
            {message && <p className="form-message">{message}</p>}

            <div className="student-list">
              {filteredStudents.map((student) => (
                <button
                  className={`student-row ${student.id === selectedStudent?.id ? 'active' : ''}`}
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <span>
                    {student.grade}-{student.classNo} {student.studentNo}번
                  </span>
                  <strong>{student.name}</strong>
                  <code>{student.loginCode}</code>
                  <span className="row-actions">
                    <Trash2
                      size={16}
                      role="button"
                      aria-label={`${student.name} 삭제`}
                      onClick={(event) => {
                        event.stopPropagation()
                        void removeStudent(student.id)
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel import-panel">
            <div className="panel-title">
              <Upload size={20} />
              <div>
                <h2>CSV 일괄등록</h2>
                <p>학년,반,번호,이름,성별,코드 순서로 붙여넣습니다.</p>
              </div>
            </div>
            <textarea value={csvText} rows={6} onChange={(event) => setCsvText(event.target.value)} />
            <button className="ghost-action compact" type="button" onClick={importCsv} disabled={busy}>
              <Upload size={16} />
              가져오기
            </button>
          </div>
        </section>

        <section className="panel record-panel" id="records">
          <div className="panel-title">
            <ClipboardList size={20} />
            <div>
              <h2>학급 기록 테이블</h2>
              <p>가장 최근 세션 기준, 미측정자는 노란색으로 표시합니다.</p>
            </div>
          </div>
          <div className="record-table-wrap">
            <table className="record-table">
              <thead>
                <tr>
                  <th>학생</th>
                  <th>BMI</th>
                  {RECORD_ITEM_CODES.map((code) => (
                    <th key={code}>{itemByCode.get(code)?.nameKo}</th>
                  ))}
                  <th>측정일</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const latest = latestByStudent.get(student.id)
                  return (
                    <tr key={student.id} className={!latest ? 'missing' : ''}>
                      <td>
                        <strong>{student.name}</strong>
                        <span>
                          {student.grade}-{student.classNo} {student.studentNo}번
                        </span>
                      </td>
                      <td>{formatValue('BMI', latest?.bmi)}</td>
                      {RECORD_ITEM_CODES.map((code) => (
                        <td key={code}>{formatValue(code, getSessionValue(latest, code))}</td>
                      ))}
                      <td>{latest?.measuredAt ?? '미측정'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="teacher-grid lower">
          <div className="panel">
            <div className="panel-title">
              <BarChart3 size={20} />
              <div>
                <h2>학급 통계</h2>
                <p>항목별 측정/미측정 분포입니다.</p>
              </div>
            </div>
            <DistributionChart
              rows={classStats.itemStats.map((item) => ({
                name: itemByCode.get(item.code)?.nameKo ?? item.code,
                value: item.count,
                missing: item.missing,
              }))}
            />
            <div className="stats-list">
              {classStats.itemStats.map((item) => (
                <article key={item.code}>
                  <strong>{itemByCode.get(item.code)?.nameKo}</strong>
                  <span>평균 {formatValue(item.code, item.avg)}</span>
                  <span>표준편차 {item.stdDev.toFixed(1)}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <ClipboardList size={20} />
              <div>
                <h2>학생 상세</h2>
                <p>{selectedStudent ? `${selectedStudent.name} 학생 추이` : '학생을 선택하세요.'}</p>
              </div>
            </div>
            <div className="metric-tabs">
              {TEST_ITEMS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={activeCode === item.code ? 'active' : ''}
                  title={getDirectionLabel(item.direction)}
                  onClick={() => setActiveCode(item.code)}
                >
                  {item.nameKo}
                </button>
              ))}
            </div>
            <TrendChart code={activeCode} data={selectedTrend} />
          </div>
        </section>
      </section>
    </main>
  )
}

interface StatCardProps {
  label: string
  value: string
  detail: string
  tone?: 'green' | 'blue'
}

function StatCard({ label, value, detail, tone }: StatCardProps) {
  return (
    <article className={`stat-card ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label>
      {label}
      <input type="number" min="1" value={value} onChange={(event) => onChange(Number(event.target.value))} required />
    </label>
  )
}
