import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, subDays } from 'date-fns'
import {
  Users, FileText, CheckCircle2, Dices, Gift, HeartHandshake,
  RefreshCw, ArrowRight, TrendingUp, TrendingDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getAnalyticsOverview, getAnalyticsChart, getSubmissions } from '@/api'
import { formatNumber, formatDate } from '@/lib/utils'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode } from '@/hooks/useViewPreferences'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'

// ── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1200, formatter }: {
  value: number
  duration?: number
  formatter?: (n: number) => string
}) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)
  const prevValueRef = useRef(0)

  const easeOutExpo = useCallback((t: number): number => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }, [])

  useEffect(() => {
    const from = prevValueRef.current
    const to = value
    if (to === from) return

    startRef.current = null
    cancelAnimationFrame(rafRef.current)

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValueRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, easeOutExpo])

  return <>{formatter ? formatter(display) : formatNumber(display)}</>
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  icon: React.ElementType
  accentColor: string
  iconBg: string
  iconColor: string
  trend?: number
  formatter?: (n: number) => string
}

function KpiCard({ label, value, icon: Icon, accentColor, iconBg, iconColor, trend, formatter }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${accentColor}`} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              <AnimatedCounter value={value} formatter={formatter} />
            </p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend >= 0 ? '+' : ''}{trend}% vs last period</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Status map helper ────────────────────────────────────────────────────────

const statusVariantMap: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  DUPLICATE: 'neutral',
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { density, setDensity, getView, setView } = useViewPreferences()
  const dc = densityClasses[density]
  const view = getView('dashboard-activity', 'table')
  const [chartDays, setChartDays] = useState(30)

  const { data: overview, refetch: refetchOverview, isFetching } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: chart } = useQuery({
    queryKey: ['admin-submissions-chart', chartDays],
    queryFn: () => getAnalyticsChart(chartDays).then((r) => r.data),
  })

  const { data: recentSubs } = useQuery({
    queryKey: ['submissions-recent'],
    queryFn: () => getSubmissions({ page: 1, page_size: 10 }).then((r) => r.data),
  })

  const chartData = chart?.daily ?? []
  const recentItems = recentSubs?.items ?? []

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Users',
      value: overview?.total_users ?? 0,
      icon: Users,
      accentColor: 'bg-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Submissions',
      value: overview?.total_submissions ?? 0,
      icon: FileText,
      accentColor: 'bg-violet-500',
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Approved',
      value: overview?.approved_submissions ?? 0,
      icon: CheckCircle2,
      accentColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Total Spins',
      value: overview?.total_spins ?? 0,
      icon: Dices,
      accentColor: 'bg-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Total Rewards',
      value: overview?.total_rewards ?? 0,
      icon: Gift,
      accentColor: 'bg-pink-500',
      iconBg: 'bg-pink-50 dark:bg-pink-500/10',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
    {
      label: 'Charity Donated',
      value: overview?.total_charity_amount ?? 0,
      icon: HeartHandshake,
      accentColor: 'bg-teal-500',
      iconBg: 'bg-teal-50 dark:bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
      formatter: (n: number) => formatNumber(n),
    },
  ]

  return (
    <div className={dc.spacing}>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of platform activity"
        actions={
          <div className="flex items-center gap-2">
            <DensityToggle current={density} onChange={setDensity} />
            <button
              onClick={() => refetchOverview()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Submission Trends</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily submissions over time</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  chartDays === d
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gradTotal)"
                  name="Total"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradApproved)"
                  name="Approved"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No chart data" description="Submission data will appear here once available" />
          )}
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-primary inline-block" />Total
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-emerald-500 inline-block" />Approved
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          <div className="flex items-center gap-2">
            <ViewToggle
              current={view}
              onChange={(m) => setView('dashboard-activity', m)}
              options={['table', 'card']}
            />
            <button
              onClick={() => navigate('/submissions')}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <EmptyState title="No submissions yet" description="Submissions will appear here as they come in" />
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className={`w-full ${dc.text}`}>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={`text-left font-medium text-muted-foreground ${dc.padding}`}>User</th>
                  <th className={`text-left font-medium text-muted-foreground ${dc.padding}`}>Product</th>
                  <th className={`text-left font-medium text-muted-foreground ${dc.padding}`}>Status</th>
                  <th className={`text-left font-medium text-muted-foreground ${dc.padding}`}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentItems.map((s: any) => (
                  <tr
                    key={s.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/submissions')}
                  >
                    <td className={dc.padding}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {(s.user?.first_name ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground truncate">
                          {s.user?.first_name ?? 'User'} {s.user?.last_name ?? ''}
                        </span>
                      </div>
                    </td>
                    <td className={`${dc.padding} text-muted-foreground`}>
                      {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                    </td>
                    <td className={dc.padding}>
                      <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                        {s.status}
                      </StatusBadge>
                    </td>
                    <td className={`${dc.padding} text-muted-foreground whitespace-nowrap`}>
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`p-4 grid gap-3 ${dc.gridCols}`}>
            {recentItems.map((s: any) => (
              <DataCard key={s.id} onClick={() => navigate('/submissions')} padding="sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {(s.user?.first_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.user?.first_name ?? 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                    {s.status}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                </div>
              </DataCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
