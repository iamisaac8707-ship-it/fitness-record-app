import { RECORD_ITEM_CODES, compareValues } from './metrics'
import type { ItemCode, MeasurementSession, RecordItemCode, Student } from './types'

export function latestSessionsByStudent(sessions: MeasurementSession[]) {
  const latest = new Map<string, MeasurementSession>()
  for (const session of [...sessions].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))) {
    if (!latest.has(session.studentId)) latest.set(session.studentId, session)
  }
  return latest
}

export function getSessionValue(session: MeasurementSession | undefined, code: ItemCode) {
  if (!session) return undefined
  if (code === 'BMI') return session.bmi
  return session.records[code as RecordItemCode]
}

export function getStudentTrend(sessions: MeasurementSession[], code: ItemCode) {
  return [...sessions]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((session) => ({
      measuredAt: session.measuredAt,
      value: getSessionValue(session, code) ?? null,
    }))
    .filter((point) => point.value != null)
}

export function getLatestAndPrevious(sessions: MeasurementSession[], code: ItemCode) {
  const values = [...sessions]
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .map((session) => getSessionValue(session, code))
    .filter((value): value is number => value != null)
  return {
    latest: values[0],
    previous: values[1],
    compare: compareValues(code, values[0], values[1]),
  }
}

export function buildClassStats(students: Student[], sessions: MeasurementSession[]) {
  const latest = latestSessionsByStudent(sessions)
  const measuredStudentIds = new Set([...latest.keys()])

  const itemStats = [...RECORD_ITEM_CODES, 'BMI' as const].map((code) => {
    const values = students
      .map((student) => getSessionValue(latest.get(student.id), code))
      .filter((value): value is number => value != null)

    const avg = average(values)
    const variance = values.length
      ? values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
      : 0

    return {
      code,
      avg,
      min: values.length ? Math.min(...values) : undefined,
      max: values.length ? Math.max(...values) : undefined,
      stdDev: Math.sqrt(variance),
      count: values.length,
      missing: students.length - values.length,
    }
  })

  return {
    totalStudents: students.length,
    measuredStudents: measuredStudentIds.size,
    missingStudents: students.length - measuredStudentIds.size,
    completionRate: students.length ? Math.round((measuredStudentIds.size / students.length) * 100) : 0,
    itemStats,
  }
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
