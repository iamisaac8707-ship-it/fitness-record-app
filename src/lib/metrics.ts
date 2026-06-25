import type { Direction, ItemCode, RecordItemCode, TestItem } from './types'

export const TEST_ITEMS: TestItem[] = [
  {
    code: 'GRIP',
    nameKo: '악력',
    unit: 'kg',
    direction: 'HIGH_BETTER',
    fitnessFactor: '근력',
    sortOrder: 1,
  },
  {
    code: 'SHUTTLE_10M',
    nameKo: '10m 왕복달리기',
    unit: '초',
    direction: 'LOW_BETTER',
    fitnessFactor: '민첩성/순발력',
    sortOrder: 2,
  },
  {
    code: 'SIT_REACH',
    nameKo: '앉아윗몸앞으로굽히기',
    unit: 'cm',
    direction: 'HIGH_BETTER',
    fitnessFactor: '유연성',
    sortOrder: 3,
  },
  {
    code: 'LONG_JUMP',
    nameKo: '제자리멀리뛰기',
    unit: 'cm',
    direction: 'HIGH_BETTER',
    fitnessFactor: '순발력',
    sortOrder: 4,
  },
  {
    code: 'BMI',
    nameKo: 'BMI',
    unit: 'kg/m²',
    direction: 'RANGE',
    fitnessFactor: '비만/체격',
    sortOrder: 5,
  },
]

export const RECORD_ITEM_CODES: RecordItemCode[] = [
  'GRIP',
  'SHUTTLE_10M',
  'SIT_REACH',
  'LONG_JUMP',
]

export const itemByCode = new Map(TEST_ITEMS.map((item) => [item.code, item]))

export function calculateBmi(heightCm: number, weightKg: number) {
  if (!heightCm || !weightKg) return 0
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
}

function distanceFromBmiRange(value: number) {
  if (value >= 18.5 && value <= 23) return 0
  return value < 18.5 ? 18.5 - value : value - 23
}

export function compareValues(
  code: ItemCode,
  current?: number,
  previous?: number,
): {
  delta: number
  displayDelta: number
  percent: number
  status: 'improved' | 'declined' | 'same' | 'new'
} {
  if (current == null || previous == null || previous === 0) {
    return { delta: 0, displayDelta: 0, percent: 0, status: 'new' }
  }

  const direction = itemByCode.get(code)?.direction ?? 'HIGH_BETTER'
  const delta = current - previous
  const percent = Math.round((delta / previous) * 1000) / 10
  let improved = false
  let same = Math.abs(delta) < 0.01

  if (direction === 'HIGH_BETTER') improved = delta > 0
  if (direction === 'LOW_BETTER') improved = delta < 0
  if (direction === 'RANGE') {
    const before = distanceFromBmiRange(previous)
    const after = distanceFromBmiRange(current)
    improved = after < before
    same = Math.abs(after - before) < 0.01
  }

  const displayDelta = direction === 'LOW_BETTER' ? -delta : delta

  return {
    delta,
    displayDelta,
    percent: direction === 'LOW_BETTER' ? -percent : percent,
    status: same ? 'same' : improved ? 'improved' : 'declined',
  }
}

export function formatValue(code: ItemCode, value?: number | null) {
  if (value == null || Number.isNaN(value)) return '-'
  const unit = itemByCode.get(code)?.unit ?? ''
  const fixed = code === 'BMI' || code === 'SHUTTLE_10M' ? value.toFixed(1) : String(Math.round(value * 10) / 10)
  return `${fixed}${unit}`
}

export function getDirectionLabel(direction: Direction) {
  if (direction === 'HIGH_BETTER') return '높을수록 좋음'
  if (direction === 'LOW_BETTER') return '낮을수록 좋음'
  return '적정 범위'
}

export function generateLoginCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const values = crypto.getRandomValues(new Uint8Array(8))
  for (const value of values) code += alphabet[value % alphabet.length]
  return code
}
