import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview, getAnalyticsChart, getSubmissions, getUsers } from '@/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import { formatNumber, formatDate } from '@/lib/utils'
import {
  Users, FileText, Clock, Heart, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Star, Award, Activity,
} from 'lucide-react'

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
      {/* decorative circle */}
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

export default function DashboardPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
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

  const pending = overview?.pending_submissions ?? 0
  const chartData = chart?.data ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time platform overview</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <Activity size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700">Live</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={overview?.total_users ?? '—'}
          sub="Registered via bot"
          icon={Users}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          iconBg="bg-blue-400/40"
          trend={{ value: 12, label: 'this week' }}
        />
        <KpiCard
          label="Today's Submissions"
          value={overview?.submissions_today ?? '—'}
          sub="Reviews received today"
          icon={FileText}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          iconBg="bg-violet-400/40"
          trend={{ value: 8, label: 'vs yesterday' }}
        />
        <KpiCard
          label="Pending Review"
          value={pending}
          sub={pending > 0 ? 'Needs attention' : 'Queue is clear'}
          icon={Clock}
          gradient={pending > 5
            ? 'bg-gradient-to-br from-orange-500 to-red-500'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'}
          iconBg={pending > 5 ? 'bg-orange-400/40' : 'bg-emerald-400/40'}
        />
        <KpiCard
          label="Charity Raised"
          value={overview ? `${formatNumber(overview.charity_raised_uzs)} UZS` : '—'}
          sub="Total donations"
          icon={Heart}
          gradient="bg-gradient-to-br from-pink-500 to-rose-600"
          iconBg="bg-pink-400/40"
          trend={{ value: 5, label: 'this month' }}
        />
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

        {/* Top users leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">Top Users</h2>
          </div>
          <div className="space-y-3">
            {(topUsers?.items ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No data yet</p>
            )}
            {(topUsers?.items ?? []).map((u: any, i: number) => {
              const medals = ['🥇', '🥈', '🥉']
              const colors = [
                'from-amber-400 to-yellow-500',
                'from-slate-300 to-slate-400',
                'from-orange-400 to-amber-500',
              ]
              return (
                <div key={u.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow
                    ${i < 3 ? `bg-gradient-to-br ${colors[i]}` : 'bg-slate-100 text-slate-500'}`}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {u.first_name ?? 'User'} {u.last_name ?? ''}
                    </p>
                    <p className="text-xs text-slate-400">{u.submission_count ?? 0} submissions</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star size={10} />
                    {u.spin_count ?? 0}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent submissions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">Recent Submissions</h2>
            <a href="/submissions" className="text-xs text-blue-600 hover:underline font-medium">View all →</a>
          </div>
          <div className="space-y-2">
            {(recentSubs?.items ?? []).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No submissions yet</p>
            )}
            {(recentSubs?.items ?? []).map((s: any) => {
              const StatusIcon = STATUS_ICON[s.status] ?? AlertCircle
              return (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(s.user?.first_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.user?.first_name ?? 'User'}
                      {s.order_number && <span className="ml-1.5 font-mono text-xs text-slate-400">#{s.order_number}</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {s.review_text ?? 'No review text'}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
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
            <h2 className="text-base font-bold text-slate-800">Approval Rate</h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
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
              { label: 'Approved', value: overview?.approved_count ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Rejected', value: overview?.rejected_count ?? '—', color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Pending', value: pending, color: 'text-orange-500', bg: 'bg-orange-50' },
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
