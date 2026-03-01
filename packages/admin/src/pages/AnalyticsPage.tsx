import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, Users, FileCheck, Trophy, Download,
  RefreshCw, Calendar, ChevronDown,
} from 'lucide-react'
import { api } from '@/api'
import { cn } from '@/lib/utils'

// ── API helpers ─────────────────────────────────────────────────────────────

const getRetentionCohorts = () => api.get('/admin/analytics/retention').then((r) => r.data)
const getFunnelData = () => api.get('/admin/analytics/funnel').then((r) => r.data)
const getPrizePop = () => api.get('/admin/analytics/prize-popularity').then((r) => r.data)
const getHeatmap = () => api.get('/admin/analytics/heatmap').then((r) => r.data)
const getGeoData = () => api.get('/admin/analytics/geo').then((r) => r.data)

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ── Retention Cohort Table ──────────────────────────────────────────────────

type CohortRow = {
  cohort_week: string
  size: number
  retention: (number | null)[]
}

function RetentionTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-retention'],
    queryFn: getRetentionCohorts,
    staleTime: 5 * 60_000,
  })

  const cohorts: CohortRow[] = data?.cohorts ?? []
  const maxWeeks = cohorts.reduce((m, c) => Math.max(m, (c.retention ?? []).length), 0)

  function retentionColor(pct: number | null): string {
    if (pct === null) return 'bg-muted/40 text-muted-foreground/30'
    if (pct >= 80) return 'bg-success/20 text-success font-semibold'
    if (pct >= 60) return 'bg-success/10 text-success/80'
    if (pct >= 40) return 'bg-warning/15 text-warning'
    if (pct >= 20) return 'bg-orange-500/15 text-orange-400'
    return 'bg-destructive/10 text-destructive/70'
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <SectionHeader title="Retention Cohorts" subtitle="Week-over-week user return rate by signup cohort" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground whitespace-nowrap">Cohort</th>
              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Users</th>
              {Array.from({ length: maxWeeks || 8 }).map((_, i) => (
                <th key={i} className="text-center px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">
                  W{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={2 + (maxWeeks || 8)} />)
            ) : isError ? (
              <tr>
                <td colSpan={2 + (maxWeeks || 8)} className="text-center py-8 text-muted-foreground text-sm">
                  Failed to load retention data
                </td>
              </tr>
            ) : cohorts.length === 0 ? (
              <tr>
                <td colSpan={2 + (maxWeeks || 8)} className="text-center py-8 text-muted-foreground text-sm">
                  No cohort data yet
                </td>
              </tr>
            ) : (
              cohorts.map((row) => (
                <tr key={row.cohort_week} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap font-mono">
                    {row.cohort_week}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground font-mono">
                    {row.size.toLocaleString()}
                  </td>
                  {Array.from({ length: maxWeeks }).map((_, wi) => {
                    const val = (row.retention ?? [])[wi] ?? null
                    return (
                      <td key={wi} className="px-1 py-1 text-center">
                        {val !== null ? (
                          <span className={cn('inline-block px-2 py-0.5 rounded text-[11px] font-mono min-w-[40px]', retentionColor(val))}>
                            {val}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/25">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Funnel Visualization ────────────────────────────────────────────────────

type FunnelStep = { label: string; count: number; pct: number }

function FunnelChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: getFunnelData,
    staleTime: 5 * 60_000,
  })

  const steps: FunnelStep[] = data?.steps ?? [
    { label: 'Bot Start', count: 0, pct: 100 },
    { label: 'Onboarding', count: 0, pct: 0 },
    { label: 'First Submit', count: 0, pct: 0 },
    { label: 'Approved', count: 0, pct: 0 },
    { label: 'Spin Claimed', count: 0, pct: 0 },
  ]

  const colors = [
    'bg-primary',
    'bg-orange-400',
    'bg-warning',
    'bg-success',
    'bg-info',
  ]

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <SectionHeader title="Conversion Funnel" subtitle="Drop-off at each step of the user journey" />
      </div>
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{step.label}</span>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-xs font-mono text-muted-foreground">
                      {step.count.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold font-mono text-foreground w-12 text-right">
                      {step.pct}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="h-7 bg-muted/50 rounded-lg overflow-hidden relative">
              {isLoading ? (
                <div className="h-full w-1/2 bg-muted animate-pulse rounded-lg" />
              ) : (
                <div
                  className={cn('h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2', colors[i % colors.length])}
                  style={{ width: `${Math.max(step.pct, 2)}%`, opacity: 0.85 }}
                >
                  {step.pct > 8 && (
                    <span className="text-[10px] font-bold text-white">{step.pct}%</span>
                  )}
                </div>
              )}
            </div>
            {i < steps.length - 1 && !isLoading && step.pct > 0 && steps[i + 1].pct > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                {Math.round((steps[i + 1].count / step.count) * 100)}% continue →
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Prize Popularity ─────────────────────────────────────────────────────────

type PrizeRow = { id: string; name: string; count: number; pct: number; color: string }

function PrizePopularity() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-prize-pop'],
    queryFn: getPrizePop,
    staleTime: 5 * 60_000,
  })

  const prizes: PrizeRow[] = data?.prizes ?? []
  const maxCount = prizes.reduce((m, p) => Math.max(m, p.count), 1)

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <SectionHeader title="Prize Popularity" subtitle="Spin outcomes and win rates" />
      </div>
      <div className="p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-5 bg-muted rounded animate-pulse" />
            </div>
          ))
        ) : prizes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No prize data yet</p>
        ) : (
          prizes.map((p) => (
            <div key={p.id ?? p.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{p.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono">{p.count} spins</span>
                  <span className="text-[10px] font-bold font-mono text-primary">{p.pct}%</span>
                </div>
              </div>
              <div className="h-5 bg-muted/50 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${(p.count / maxCount) * 100}%` }}
                >
                  {(p.count / maxCount) > 0.15 && (
                    <span className="text-[10px] font-mono text-white font-bold">{p.count}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Time-of-Day Heatmap ──────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function TimeHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-heatmap'],
    queryFn: getHeatmap,
    staleTime: 10 * 60_000,
  })

  // API returns grid: number[7][24]
  const grid: number[][] = data?.grid ?? Array.from({ length: 7 }, () => Array(24).fill(0))
  const maxVal = grid.reduce((m, row) => Math.max(m, ...row), 1)

  function cellValue(day: number, hour: number) {
    return (grid[day] ?? [])[hour] ?? 0
  }

  function cellColor(val: number): string {
    if (val === 0) return 'bg-muted/40'
    const intensity = val / maxVal
    if (intensity > 0.8) return 'bg-primary'
    if (intensity > 0.6) return 'bg-primary/75'
    if (intensity > 0.4) return 'bg-primary/55'
    if (intensity > 0.2) return 'bg-primary/35'
    return 'bg-primary/15'
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <SectionHeader title="Activity Heatmap" subtitle="Submissions by day of week and hour (UTC+5)" />
      </div>
      <div className="p-4 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-1.5">
            {DAYS.map((d) => (
              <div key={d} className="flex gap-1">
                <div className="w-8 h-5 bg-muted rounded animate-pulse" />
                {HOURS.map((h) => (
                  <div key={h} className="w-5 h-5 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Hour labels */}
            <div className="flex gap-1 mb-1 pl-9">
              {HOURS.map((h) => (
                <div key={h} className="w-5 text-center text-[9px] font-mono text-muted-foreground/60">
                  {h % 6 === 0 ? h : ''}
                </div>
              ))}
            </div>
            {/* Grid */}
            {DAYS.map((day, di) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-8 text-[10px] font-medium text-muted-foreground shrink-0">{day}</span>
                {HOURS.map((h) => {
                  const v = cellValue(di, h)
                  return (
                    <div
                      key={h}
                      title={`${day} ${h}:00 — ${v} submissions`}
                      className={cn('w-5 h-5 rounded-sm transition-colors cursor-default', cellColor(v))}
                    />
                  )
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pl-9">
              <span className="text-[10px] text-muted-foreground">Less</span>
              {[0.1, 0.25, 0.5, 0.75, 1].map((f) => (
                <div
                  key={f}
                  className={cn('w-4 h-4 rounded-sm', cellColor(Math.round(maxVal * f)))}
                />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Geographic Distribution ──────────────────────────────────────────────────

type GeoRow = { region: string; count: number; pct: number }

function GeoBreakdown() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-geo'],
    queryFn: getGeoData,
    staleTime: 10 * 60_000,
  })

  const rows: GeoRow[] = data?.regions ?? []

  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <SectionHeader title="Geographic Distribution" subtitle="Users by region" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Region</th>
              <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Users</th>
              <th className="px-4 py-2 font-semibold text-muted-foreground w-32">Share</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground text-sm">No geographic data</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.region} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium text-foreground">{row.region}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-muted-foreground w-10 text-right shrink-0">
                        {row.pct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── KPI Summary Cards ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: number
  color: string
}) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon size={16} className="text-white" />
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full',
              trend >= 0
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
    </div>
  )
}

// ── Range Picker ─────────────────────────────────────────────────────────────

const RANGES = ['7d', '30d', '90d', 'all'] as const
type Range = typeof RANGES[number]

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d')
  const [exporting, setExporting] = useState(false)

  const { data: overview, refetch, isFetching } = useQuery({
    queryKey: ['analytics-overview', range],
    queryFn: () => api.get(`/admin/analytics/overview?range=${range}`).then((r) => r.data),
    staleTime: 60_000,
  })

  const handleExport = useCallback(async (fmt: 'csv' | 'png') => {
    setExporting(true)
    try {
      const res = await api.post(
        '/admin/reports/export',
        { export_type: `analytics_${fmt}`, range },
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `uzumbot-analytics-${range}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — production would show a toast
    } finally {
      setExporting(false)
    }
  }, [range])

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platform performance, user retention, and engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  range === r
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(isFetching && 'animate-spin')} />
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
              disabled={exporting}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} className="text-muted-foreground" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 hidden group-hover:block">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('png')}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
              >
                Export PNG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={overview?.total_users?.toLocaleString() ?? '—'}
          sub="All time"
          icon={Users}
          trend={overview?.users_growth_pct}
          color="bg-primary"
        />
        <KpiCard
          label="Submissions Today"
          value={overview?.submissions_today?.toLocaleString() ?? '—'}
          sub={`${overview?.pending_queue ?? 0} pending`}
          icon={FileCheck}
          trend={overview?.submissions_growth_pct}
          color="bg-warning"
        />
        <KpiCard
          label="Total Spins"
          value={overview?.total_spins?.toLocaleString() ?? '—'}
          sub="Wheel spins"
          icon={Trophy}
          trend={overview?.prizes_growth_pct}
          color="bg-success"
        />
        <KpiCard
          label="Approval Rate"
          value={overview?.approval_rate_pct !== undefined ? `${overview.approval_rate_pct}%` : '—'}
          sub={`${overview?.total_approved ?? 0} approved`}
          icon={TrendingUp}
          trend={overview?.wau_growth_pct}
          color="bg-info"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FunnelChart />
        <PrizePopularity />
      </div>

      {/* ── Retention table (full width) ── */}
      <RetentionTable />

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TimeHeatmap />
        <GeoBreakdown />
      </div>
    </div>
  )
}
