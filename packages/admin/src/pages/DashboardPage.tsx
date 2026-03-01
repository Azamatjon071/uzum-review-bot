import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, FileText, CheckCircle2, Dices, Gift, HeartHandshake,
  RefreshCw, ArrowRight, TrendingUp, TrendingDown, Activity,
  Zap, Star, BarChart3, Clock, ChevronRight, Trophy,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getAnalyticsOverview, getAnalyticsChart, getSubmissions, getUsers } from '@/api'
import { cn, formatNumber, formatDate } from '@/lib/utils'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import StatusBadge from '@/components/ui/StatusBadge'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'

/* ── Animated Counter ── */

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

/* ── Sparkline (mini chart per KPI) ── */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ── KPI Card ── */

interface KpiCardProps {
  label: string
  value: number
  icon: React.ElementType
  accentColor: string
  gradientFrom: string
  gradientTo: string
  iconBg: string
  iconColor: string
  trend?: number
  formatter?: (n: number) => string
  sparkData?: number[]
  sparkColor?: string
  onClick?: () => void
}

function KpiCard({
  label, value, icon: Icon, accentColor, gradientFrom, gradientTo,
  iconBg, iconColor, trend, formatter, sparkData, sparkColor, onClick,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'relative group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300',
        'hover:shadow-card-hover hover:border-primary/20 hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Gradient top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
      />

      {/* Subtle gradient fill */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${gradientFrom}08, transparent 70%)` }}
      />

      <div className="relative p-4 pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              <AnimatedCounter value={value} formatter={formatter} />
            </p>
          </div>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
            'group-hover:scale-110 group-hover:shadow-md',
            iconBg,
          )}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="mt-1 -mx-1">
            <Sparkline data={sparkData} color={sparkColor ?? gradientFrom} />
          </div>
        )}

        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 mt-1.5 text-xs font-medium',
            trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{trend >= 0 ? '+' : ''}{trend}% vs last period</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Chart Tooltip ── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover px-4 py-3 shadow-xl shadow-black/10">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2.5 text-sm">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Quick Action Button ── */

function QuickAction({ icon: Icon, label, sub, color, onClick }: {
  icon: React.ElementType
  label: string
  sub?: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all duration-200 hover:shadow-card-hover hover:border-primary/20 hover:-translate-y-0.5 w-full"
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
    </button>
  )
}

/* ── Live Pulse Dot ── */

function PulseDot({ color = 'bg-emerald-500' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  )
}

/* ── Status helpers ── */

const statusVariantMap: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  DUPLICATE: 'neutral',
}

const avatarColors = [
  'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
  'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300',
  'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

/* ── Approval Rate Donut ── */

function ApprovalDonut({ approved, total }: { approved: number; total: number }) {
  const rate = total > 0 ? Math.round((approved / total) * 100) : 0
  const pending = total - approved
  const data = total === 0
    ? [{ name: 'No data', value: 1 }]
    : [
        { name: 'Approved', value: approved },
        { name: 'Other', value: Math.max(pending, 0) },
      ]
  const colors = total === 0 ? ['#e5e7eb'] : ['#10b981', '#e5e7eb']

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <div className="relative">
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx={65}
            cy={65}
            innerRadius={44}
            outerRadius={62}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{rate}%</span>
          <span className="text-[10px] text-muted-foreground">approved</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          {formatNumber(approved)} approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-muted inline-block border border-border" />
          {formatNumber(Math.max(total - approved, 0))} other
        </span>
      </div>
    </div>
  )
}

/* ── Top Users Leaderboard ── */

const TIER_COLORS: Record<string, string> = {
  gold: 'text-amber-500',
  silver: 'text-slate-400',
  bronze: 'text-orange-400',
}

const RANK_BADGE: Record<number, string> = {
  0: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
  1: 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400',
  2: 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
}

function TopUsersWidget({ users }: { users: any[] }) {
  const navigate = useNavigate()
  if (!users.length) return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm gap-2">
      <Trophy className="w-8 h-8 opacity-30" />
      <p>No user data yet</p>
    </div>
  )
  const maxApproved = Math.max(...users.map((u) => u.approved_submissions ?? 0), 1)
  return (
    <div className="divide-y divide-border">
      {users.slice(0, 8).map((u, i) => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Unknown'
        const approved = u.approved_submissions ?? 0
        const total = u.total_submissions ?? 0
        const pct = Math.round((approved / maxApproved) * 100)
        const avatarCls = avatarColors[Math.abs(name.split('').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)) % avatarColors.length]
        const tierColor = TIER_COLORS[u.tier] ?? 'text-muted-foreground'
        return (
          <div
            key={u.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer group"
            onClick={() => navigate('/users')}
          >
            {/* Rank */}
            <div className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
              RANK_BADGE[i] ?? 'bg-muted text-muted-foreground',
            )}>
              {i + 1}
            </div>
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-200 group-hover:scale-110',
              avatarCls,
            )}>
              {name[0].toUpperCase()}
            </div>
            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5 gap-2">
                <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{name}</span>
                {u.tier && (
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide shrink-0', tierColor)}>{u.tier}</span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7000FF, #e8007c)' }}
                />
              </div>
            </div>
            {/* Stats */}
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-foreground">{formatNumber(approved)}</p>
              <p className="text-[10px] text-muted-foreground">of {formatNumber(total)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Dashboard Page ── */

export default function DashboardPage() {
  const navigate = useNavigate()
  const { density, getView, setView } = useViewPreferences()
  const dc = densityClasses[density]
  const view = getView('dashboard-activity', 'table')
  const [chartDays, setChartDays] = useState(30)
  const [now, setNow] = useState(new Date())

  // Keep a live clock for "last updated" display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const { data: overview, refetch: refetchOverview, isFetching, dataUpdatedAt } = useQuery({
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

  const { data: topUsersData } = useQuery({
    queryKey: ['top-users-leaderboard'],
    queryFn: () => getUsers({ page: 1, page_size: 8, sort_by: 'approved_submissions', sort_dir: 'desc' }).then((r) => r.data),
    refetchInterval: 120_000,
  })

  const chartData = chart?.daily ?? []
  const recentItems = recentSubs?.items ?? []
  const topUsers = topUsersData?.items ?? []
  const pendingCount = recentItems.filter((s: any) => s.status === 'PENDING').length

  // Build sparklines from chart data (last N values of each series)
  const usersSpark = chartData.slice(-10).map((d: any) => d.total ?? 0)
  const approvedSpark = chartData.slice(-10).map((d: any) => d.approved ?? 0)

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const kpis: KpiCardProps[] = [
    {
      label: 'Total Users',
      value: overview?.total_users ?? 0,
      icon: Users,
      accentColor: 'bg-blue-500',
      gradientFrom: '#3b82f6',
      gradientTo: '#06b6d4',
      iconBg: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      sparkData: usersSpark,
      sparkColor: '#3b82f6',
      onClick: () => navigate('/users'),
    },
    {
      label: 'Submissions',
      value: overview?.total_submissions ?? 0,
      icon: FileText,
      accentColor: 'bg-primary',
      gradientFrom: '#7000FF',
      gradientTo: '#e8007c',
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      iconColor: 'text-violet-600 dark:text-violet-400',
      sparkData: chartData.slice(-10).map((d: any) => d.total ?? 0),
      sparkColor: '#7000FF',
      onClick: () => navigate('/submissions'),
    },
    {
      label: 'Approved',
      value: overview?.approved_submissions ?? 0,
      icon: CheckCircle2,
      accentColor: 'bg-emerald-500',
      gradientFrom: '#10b981',
      gradientTo: '#06b6d4',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      sparkData: approvedSpark,
      sparkColor: '#10b981',
    },
    {
      label: 'Total Spins',
      value: overview?.total_spins ?? 0,
      icon: Dices,
      accentColor: 'bg-amber-500',
      gradientFrom: '#f59e0b',
      gradientTo: '#ef4444',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Rewards',
      value: overview?.total_rewards ?? 0,
      icon: Gift,
      accentColor: 'bg-pink-500',
      gradientFrom: '#e8007c',
      gradientTo: '#7000FF',
      iconBg: 'bg-pink-50 dark:bg-pink-500/10',
      iconColor: 'text-pink-600 dark:text-pink-400',
      onClick: () => navigate('/rewards'),
    },
    {
      label: 'Charity Donated',
      value: overview?.total_charity_amount ?? 0,
      icon: HeartHandshake,
      accentColor: 'bg-teal-500',
      gradientFrom: '#14b8a6',
      gradientTo: '#06b6d4',
      iconBg: 'bg-teal-50 dark:bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400',
      formatter: (n: number) => formatNumber(n) + ' UZS',
      onClick: () => navigate('/charity'),
    },
  ]

  return (
    <div className={dc.spacing}>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of platform activity and key metrics"
        icon={<Activity className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Updated {lastUpdated}
              </div>
            )}
            <button
              onClick={() => refetchOverview()}
              disabled={isFetching}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition-all',
                'hover:text-foreground hover:border-primary/30 hover:shadow-sm',
                'disabled:opacity-50',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ background: 'linear-gradient(135deg, #7000FF 0%, #e8007c 50%, #f59e0b 100%)' }}
        />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, #7000FF, transparent)' }} />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10 blur-2xl"
          style={{ background: 'radial-gradient(circle, #e8007c, transparent)' }} />

        <div className="relative px-5 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl uzum-gradient flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Platform Live</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <PulseDot color="bg-emerald-500" />
                <span className="text-xs text-muted-foreground">All systems operational</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {overview ? Math.round((overview.approved_submissions / Math.max(overview.total_submissions, 1)) * 100) : 0}%
              </p>
              <p className="text-[11px] text-muted-foreground">Approval rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {formatNumber(overview?.total_users ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">Total users</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold uzum-gradient-text">
                {formatNumber(overview?.total_spins ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground">Spins issued</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <QuickAction
            icon={FileText}
            label="Review Submissions"
            sub={pendingCount > 0 ? `${pendingCount} pending` : 'All caught up'}
            color="bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400"
            onClick={() => navigate('/submissions')}
          />
          <QuickAction
            icon={Users}
            label="Manage Users"
            sub={`${formatNumber(overview?.total_users ?? 0)} registered`}
            color="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
            onClick={() => navigate('/users')}
          />
          <QuickAction
            icon={BarChart3}
            label="Analytics"
            sub="View detailed reports"
            color="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
            onClick={() => navigate('/analytics')}
          />
          <QuickAction
            icon={Gift}
            label="Rewards"
            sub={`${formatNumber(overview?.total_rewards ?? 0)} issued`}
            color="bg-pink-100 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400"
            onClick={() => navigate('/rewards')}
          />
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Submission Trends</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Daily submissions over time</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  chartDays === d
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7000FF" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#e8007c" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#7000FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="strokeGradTotal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7000FF" />
                    <stop offset="100%" stopColor="#e8007c" />
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
                  stroke="url(#strokeGradTotal)"
                  strokeWidth={2.5}
                  fill="url(#gradTotal)"
                  name="Total"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#7000FF', fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="approved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradApproved)"
                  name="Approved"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#10b981', fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No chart data yet"
              description="Submission data will appear here once reviews start coming in"
              compact
            />
          )}
          {chartData.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-4 h-[3px] rounded-full inline-block" style={{ background: 'linear-gradient(90deg, #7000FF, #e8007c)' }} />
                Total submissions
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-[3px] rounded-full bg-emerald-500 inline-block" />
                Approved
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Approval Rate + Top Users leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Approval Rate Donut */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Approval Rate</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Approved vs all submissions</p>
          </div>
          <div className="px-5 py-3">
            <ApprovalDonut
              approved={overview?.approved_submissions ?? 0}
              total={overview?.total_submissions ?? 0}
            />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Approved', value: overview?.approved_submissions ?? 0, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Pending', value: (overview?.total_submissions ?? 0) - (overview?.approved_submissions ?? 0), color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Total', value: overview?.total_submissions ?? 0, color: 'text-foreground' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/40 px-3 py-2 text-center">
                  <p className={cn('text-base font-bold', s.color)}>{formatNumber(s.value)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Users Leaderboard */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Top Contributors
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Most approved submissions</p>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <TopUsersWidget users={topUsers} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest submission updates</p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <PulseDot color="bg-amber-500" />
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle
              current={view}
              onChange={(m) => setView('dashboard-activity', m)}
              options={['table', 'card']}
            />
            <button
              onClick={() => navigate('/submissions')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description="Submissions will appear here as they come in"
          />
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className={cn('w-full', dc.text)}>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={cn('text-left font-medium text-muted-foreground', dc.padding)}>User</th>
                  <th className={cn('text-left font-medium text-muted-foreground', dc.padding)}>Product</th>
                  <th className={cn('text-left font-medium text-muted-foreground', dc.padding)}>Status</th>
                  <th className={cn('text-left font-medium text-muted-foreground', dc.padding)}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentItems.map((s: any) => {
                  const name = s.user?.first_name ?? '?'
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => navigate('/submissions')}
                    >
                      <td className={dc.padding}>
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-200 group-hover:scale-110',
                            getAvatarColor(name),
                          )}>
                            {name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {name} {s.user?.last_name ?? ''}
                          </span>
                        </div>
                      </td>
                      <td className={cn(dc.padding, 'text-muted-foreground')}>
                        {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                      </td>
                      <td className={dc.padding}>
                        <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                          {s.status}
                        </StatusBadge>
                      </td>
                      <td className={cn(dc.padding, 'text-muted-foreground whitespace-nowrap')}>
                        {formatDate(s.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={cn('p-4 grid gap-3', dc.gridCols)}>
            {recentItems.map((s: any) => {
              const name = s.user?.first_name ?? '?'
              return (
                <DataCard key={s.id} onClick={() => navigate('/submissions')} padding="sm">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      getAvatarColor(name),
                    )}>
                      {name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.product?.name_en ?? s.product?.name_uz ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusBadge variant={statusVariantMap[s.status] ?? 'neutral'} dot size="sm">
                      {s.status}
                    </StatusBadge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(s.created_at)}</span>
                  </div>
                </DataCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
