import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview, getAnalyticsChart, getSubmissions, getUsers, getPrizes } from '@/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { formatNumber, formatDate } from '@/lib/utils'
import {
  Users, FileText, Clock, Heart, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Star, Award, Activity,
  Trophy, Zap, ArrowRight, RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  gradient: string
  iconBg: string
  trend?: { value: number; label: string }
}

function KpiCard({ label, value, sub, icon: Icon, gradient, iconBg, trend }: KpiCardProps) {
  const isPositive = trend ? trend.value >= 0 : null
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-lg ${gradient}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70">{label}</p>
          <p className="text-3xl font-extrabold text-white mt-1 tracking-tight">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-green-200' : 'text-red-200'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPositive ? '+' : ''}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} shadow-inner`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  APPROVED:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  REJECTED:  'bg-red-100 text-red-700 border border-red-200',
  DUPLICATE: 'bg-slate-100 text-slate-500 border border-slate-200',
}
const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING: AlertCircle,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  DUPLICATE: AlertCircle,
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-400 text-xs mb-2 font-medium">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}:</span>
            <span className="text-white font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Custom donut label
const DonutLabel = ({ cx, cy, total }: { cx: number; cy: number; total: number }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
    <tspan x={cx} dy="-6" fontSize="20" fontWeight="800" fill="#1e293b">{total}</tspan>
    <tspan x={cx} dy="20" fontSize="11" fill="#94a3b8">total</tspan>
  </text>
)

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: overview, refetch: refetchOverview, isFetching } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
    refetchInterval: 60_000,
  })
  const { data: chart } = useQuery({
    queryKey: ['analytics-chart'],
    queryFn: () => getAnalyticsChart(30).then((r) => r.data),
  })
  const { data: recentSubs } = useQuery({
    queryKey: ['submissions-recent'],
    queryFn: () => getSubmissions({ page: 1, limit: 8 }).then((r) => r.data),
  })
  const { data: topUsers } = useQuery({
    queryKey: ['users-leaderboard'],
    queryFn: () => getUsers({ page: 1, limit: 5 }).then((r) => r.data),
  })
  const { data: prizesData } = useQuery({
    queryKey: ['prizes'],
    queryFn: () => getPrizes().then((r) => r.data),
  })

  const pending    = overview?.pending_submissions ?? 0
  const approved   = overview?.approved_count ?? 0
  const rejected   = overview?.rejected_count ?? 0
  const chartData  = chart?.data ?? []
  const prizes     = prizesData?.prizes ?? []
  const activePrizes = prizes.filter((p: any) => p.is_active).length

  // Donut chart data
  const donutData = [
    { name: 'Approved', value: approved, color: '#10b981' },
    { name: 'Pending',  value: pending,  color: '#f59e0b' },
    { name: 'Rejected', value: rejected, color: '#ef4444' },
  ].filter((d) => d.value > 0)
  const donutTotal = approved + pending + rejected

  // Quick actions
  const quickActions = [
    { label: 'Review Queue', sub: `${pending} pending`, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', to: '/submissions' },
    { label: 'All Users', sub: `${overview?.total_users ?? 0} total`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', to: '/users' },
    { label: 'Manage Prizes', sub: `${activePrizes} active`, icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100', to: '/prizes' },
    { label: 'Broadcast', sub: 'Send message', icon: Zap, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', to: '/broadcast' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchOverview()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-xs font-medium"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Live</span>
          </div>
        </div>
      </div>

      {/* KPI cards — 6 on xl, 3 on md */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Users"
          value={overview?.total_users ?? '—'}
          sub="Registered via bot"
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          iconBg="bg-blue-400/40"
        />
        <KpiCard
          label="Today's Reviews"
          value={overview?.submissions_today ?? '—'}
          sub="New submissions"
          icon={FileText}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          iconBg="bg-violet-400/40"
        />
        <KpiCard
          label="Pending Review"
          value={pending}
          sub={pending > 0 ? 'Needs attention' : 'Queue is clear ✓'}
          icon={Clock}
          gradient={pending > 5
            ? 'bg-gradient-to-br from-orange-500 to-red-500'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'}
          iconBg={pending > 5 ? 'bg-orange-400/40' : 'bg-emerald-400/40'}
        />
        <KpiCard
          label="Charity Raised"
          value={overview ? `${formatNumber(overview.charity_raised_uzs ?? 0)} UZS` : '—'}
          sub="Total donations"
          icon={Heart}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          iconBg="bg-pink-400/40"
        />
        <KpiCard
          label="Total Spins"
          value={overview?.total_spins ?? '—'}
          sub="All time spin count"
          icon={Trophy}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          iconBg="bg-amber-400/40"
        />
        <KpiCard
          label="Active Prizes"
          value={activePrizes}
          sub={`${prizes.length} configured`}
          icon={Star}
          gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
          iconBg="bg-teal-400/40"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(({ label, sub, icon: Icon, color, bg, border, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`flex items-center gap-3 p-4 rounded-2xl border ${bg} ${border} hover:shadow-md transition-all group text-left`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm`}>
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 ml-auto shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Area chart — submissions trend */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Submission Trends</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 rounded-full bg-blue-500 inline-block" />Total
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 rounded-full bg-emerald-500 inline-block" />Approved
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradTotal)" name="Total" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2.5} fill="url(#gradApproved)" name="Approved" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut + top users */}
        <div className="space-y-4">
          {/* Donut */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Approval Breakdown</h2>
            {donutData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={110} height={110}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="800" fill="#1e293b">
                      {donutTotal}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
            )}
          </div>

          {/* Top users */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Top Users</h2>
            </div>
            <div className="space-y-2">
              {(topUsers?.items ?? []).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No data yet</p>
              )}
              {(topUsers?.items ?? []).map((u: any, i: number) => {
                const medals = ['🥇', '🥈', '🥉']
                const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-amber-500']
                return (
                  <div key={u.id} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold shadow
                      ${i < 3 ? `bg-gradient-to-br ${colors[i]}` : 'bg-slate-100 text-slate-500'}`}>
                      {i < 3 ? medals[i] : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {u.first_name ?? 'User'} {u.last_name ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                      <Star size={9} />
                      {u.spin_count ?? 0}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent submissions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Submissions</h2>
            <button
              onClick={() => navigate('/submissions')}
              className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {(recentSubs?.items ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No submissions yet</p>
            )}
            {(recentSubs?.items ?? []).map((s: any) => {
              const StatusIcon = STATUS_ICON[s.status] ?? AlertCircle
              const rowBg = s.status === 'PENDING' ? 'bg-yellow-50/60' : s.status === 'REJECTED' ? 'bg-red-50/40' : ''
              return (
                <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer ${rowBg}`}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(s.user?.first_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.user?.first_name ?? 'User'}
                      {s.order_number && <span className="ml-1.5 font-mono text-xs text-slate-400">#{s.order_number}</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{s.review_text ?? 'No review text'}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[s.status] ?? ''}`}>
                      <StatusIcon size={10} />
                      {s.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status breakdown bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-800">Approval Rate (Last 14 days)</h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="approved" fill="#10b981" radius={[4, 4, 0, 0]} name="Approved" />
                <Bar dataKey="rejected" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No chart data available
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Approved', value: approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rejected', value: rejected, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Pending',  value: pending,  color: 'text-orange-500', bg: 'bg-orange-50' },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-2.5 text-center`}>
                <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
