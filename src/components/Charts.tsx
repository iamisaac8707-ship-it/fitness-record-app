import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { itemByCode } from '../lib/metrics'
import type { ItemCode } from '../lib/types'

interface TrendChartProps {
  code: ItemCode
  data: Array<{ measuredAt: string; value: number | null }>
}

interface DistributionChartProps {
  rows: Array<{ name: string; value: number; missing: number }>
}

export function TrendChart({ code, data }: TrendChartProps) {
  const unit = itemByCode.get(code)?.unit ?? ''

  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="measuredAt" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} unit={unit} />
          <Tooltip
            formatter={(value) => [`${value}${unit}`, itemByCode.get(code)?.nameKo ?? code]}
            labelFormatter={(label) => `측정일 ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DistributionChart({ rows }: DistributionChartProps) {
  const max = Math.max(...rows.map((row) => row.value + row.missing), 1)

  return (
    <div className="distribution-bars" aria-label="학급 측정 분포">
      {rows.map((row) => (
        <article key={row.name}>
          <div className="distribution-label">
            <strong>{row.name}</strong>
            <span>
              측정 {row.value} · 미측정 {row.missing}
            </span>
          </div>
          <div className="distribution-track">
            <span className="measured" style={{ width: `${(row.value / max) * 100}%` }} />
            <span className="missing" style={{ width: `${(row.missing / max) * 100}%` }} />
          </div>
        </article>
      ))}
    </div>
  )
}
