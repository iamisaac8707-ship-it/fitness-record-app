import { Activity, CalendarDays, Save, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TrendChart } from './Charts'
import { listStudentMeasurements, submitStudentMeasurement } from '../lib/dataService'
import { RECORD_ITEM_CODES, TEST_ITEMS, calculateBmi, compareValues, formatValue, itemByCode } from '../lib/metrics'
import { getLatestAndPrevious, getStudentTrend } from '../lib/stats'
import type { ItemCode, MeasurementDraft, MeasurementSession, RecordItemCode, StudentProfile } from '../lib/types'

interface StudentWorkspaceProps {
  profile: StudentProfile
  loginCode: string
  sessions: MeasurementSession[]
  onSessionsChange: (sessions: MeasurementSession[]) => void
  onLogout: () => void
}

const today = new Date().toISOString().slice(0, 10)

export function StudentWorkspace({
  profile,
  loginCode,
  sessions,
  onSessionsChange,
  onLogout,
}: StudentWorkspaceProps) {
  const [activeCode, setActiveCode] = useState<ItemCode>('GRIP')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState<MeasurementDraft>({
    measuredAt: today,
    semester: '1학기',
    heightCm: 165,
    weightKg: 55,
    memo: '',
    records: {
      GRIP: 30,
      SHUTTLE_10M: 11.5,
      SIT_REACH: 15,
      LONG_JUMP: 180,
    },
  })

  const bmi = calculateBmi(draft.heightCm, draft.weightKg)
  const trend = useMemo(() => getStudentTrend(sessions, activeCode), [activeCode, sessions])
  const recentSummary = useMemo(
    () => TEST_ITEMS.map((item) => ({ item, ...getLatestAndPrevious(sessions, item.code) })),
    [sessions],
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await submitStudentMeasurement(loginCode, draft)
      const nextSessions = await listStudentMeasurements(loginCode, profile.studentId)
      onSessionsChange(nextSessions)
      setMessage('저장되었습니다.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function updateRecord(code: RecordItemCode, value: number) {
    setDraft((current) => ({
      ...current,
      records: { ...current.records, [code]: value },
    }))
  }

  return (
    <main className="student-shell">
      <header className="student-header">
        <div>
          <p className="eyebrow">{profile.school}</p>
          <h1>내 기록 입력</h1>
          <p>
            {profile.grade}학년 {profile.classNo}반 {profile.studentNo}번 {profile.name}
          </p>
        </div>
        <button className="ghost-action compact" type="button" onClick={onLogout}>
          나가기
        </button>
      </header>

      <section className="student-main">
        <form className="panel measurement-form" onSubmit={submit}>
          <div className="panel-title">
            <Activity size={20} />
            <div>
              <h2>체력 측정값</h2>
              <p>BMI는 키와 몸무게로 자동계산됩니다.</p>
            </div>
          </div>

          <div className="field-row two">
            <label>
              측정일
              <input
                type="date"
                value={draft.measuredAt}
                onChange={(event) => setDraft({ ...draft, measuredAt: event.target.value })}
                required
              />
            </label>
            <label>
              학기
              <select
                value={draft.semester}
                onChange={(event) => setDraft({ ...draft, semester: event.target.value as MeasurementDraft['semester'] })}
              >
                <option>1학기</option>
                <option>2학기</option>
                <option>기타</option>
              </select>
            </label>
          </div>

          <div className="field-row three">
            <NumberField label="키" unit="cm" value={draft.heightCm} onChange={(value) => setDraft({ ...draft, heightCm: value })} />
            <NumberField label="몸무게" unit="kg" value={draft.weightKg} onChange={(value) => setDraft({ ...draft, weightKg: value })} />
            <div className="bmi-preview">
              <span>BMI 자동계산</span>
              <strong>{bmi.toFixed(1)}</strong>
            </div>
          </div>

          <div className="metric-input-grid">
            {RECORD_ITEM_CODES.map((code) => {
              const item = itemByCode.get(code)!
              return (
                <NumberField
                  key={code}
                  label={item.nameKo}
                  unit={item.unit}
                  value={draft.records[code]}
                  step={code === 'SHUTTLE_10M' ? 0.1 : 0.5}
                  onChange={(value) => updateRecord(code, value)}
                />
              )
            })}
          </div>

          <label>
            메모
            <textarea
              rows={3}
              value={draft.memo}
              onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
              placeholder="선택 입력"
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="primary-action" type="submit" disabled={busy}>
            <Save size={18} />
            {busy ? '저장 중' : '저장'}
          </button>
        </form>

        <section className="panel trend-panel">
          <div className="panel-title">
            <TrendingUp size={20} />
            <div>
              <h2>최근 추이</h2>
              <p>방향성이 다른 종목도 향상 판정을 반영합니다.</p>
            </div>
          </div>
          <div className="metric-tabs">
            {TEST_ITEMS.map((item) => (
              <button
                key={item.code}
                type="button"
                className={activeCode === item.code ? 'active' : ''}
                onClick={() => setActiveCode(item.code)}
              >
                {item.nameKo}
              </button>
            ))}
          </div>
          <TrendChart code={activeCode} data={trend} />
          <div className="summary-strip">
            {recentSummary.map(({ item, latest, previous }) => {
              const compare = compareValues(item.code, latest, previous)
              return (
                <button
                  className="summary-tile"
                  key={item.code}
                  type="button"
                  onClick={() => setActiveCode(item.code)}
                >
                  <span>{item.nameKo}</span>
                  <strong>{formatValue(item.code, latest)}</strong>
                  <small className={compare.status}>
                    {compare.status === 'new' ? '신규' : compare.status === 'improved' ? '향상' : compare.status === 'declined' ? '저하' : '유지'}
                  </small>
                </button>
              )
            })}
          </div>
        </section>
      </section>

      <section className="panel history-panel">
        <div className="panel-title">
          <CalendarDays size={20} />
          <div>
            <h2>측정 이력</h2>
            <p>최근 저장된 세션부터 표시합니다.</p>
          </div>
        </div>
        <div className="history-list">
          {sessions.map((session) => (
            <article className="history-row" key={session.id}>
              <div>
                <strong>{session.measuredAt}</strong>
                <span>{session.semester}</span>
              </div>
              <span>{formatValue('BMI', session.bmi)}</span>
              <span>{formatValue('GRIP', session.records.GRIP)}</span>
              <span>{formatValue('SHUTTLE_10M', session.records.SHUTTLE_10M)}</span>
              <span>{formatValue('LONG_JUMP', session.records.LONG_JUMP)}</span>
            </article>
          ))}
          {!sessions.length && <p className="empty-state">아직 저장된 기록이 없습니다.</p>}
        </div>
      </section>
    </main>
  )
}

interface NumberFieldProps {
  label: string
  unit: string
  value: number
  step?: number
  onChange: (value: number) => void
}

function NumberField({ label, unit, value, step = 0.1, onChange }: NumberFieldProps) {
  return (
    <label>
      {label}
      <div className="unit-input">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          required
        />
        <span>{unit}</span>
      </div>
    </label>
  )
}
