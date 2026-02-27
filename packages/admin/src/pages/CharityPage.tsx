import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCharityCampaigns, createCampaign, updateCampaign, closeCampaign, getCampaignDonations } from '@/api'
import { Heart, Plus, X, TrendingUp, Users, DollarSign, Target, ChevronDown, ChevronUp } from 'lucide-react'

// ── SVG Circular Progress Ring ───────────────────────────────────────────────

function CircleProgress({ pct, color = '#10b981', size = 64 }: { pct: number; color?: string; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

// ── Campaign form drawer ─────────────────────────────────────────────────────

function CampaignFormDrawer({
  editing,
  onClose,
  onCreate,
  onUpdate,
  isPending,
}: {
  editing: any
  onClose: () => void
  onCreate: (data: any) => void
  onUpdate: (data: any) => void
  isPending: boolean
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name_uz: fd.get('name_uz'),
      name_ru: fd.get('name_ru'),
      name_en: fd.get('name_en'),
      description_uz: fd.get('description_uz'),
      description_ru: fd.get('description_ru'),
      description_en: fd.get('description_en'),
      goal_amount: Number(fd.get('goal_amount')) || 0,
      deadline: fd.get('deadline') || null,
    }
    editing ? onUpdate({ id: editing.id, data: payload }) : onCreate(payload)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <Heart size={14} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Names */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Campaign Name</p>
            <div className="space-y-2">
              {[
                { name: 'name_uz', placeholder: '🇺🇿 Kampaniya nomi (UZ)' },
                { name: 'name_ru', placeholder: '🇷🇺 Название кампании (RU)' },
                { name: 'name_en', placeholder: '🇬🇧 Campaign name (EN)' },
              ].map(({ name, placeholder }) => (
                <input
                  key={name}
                  name={name}
                  placeholder={placeholder}
                  defaultValue={editing?.[name]}
                  required
                  className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</p>
            <div className="space-y-2">
              {[
                { name: 'description_uz', placeholder: '🇺🇿 Tavsif (UZ)' },
                { name: 'description_ru', placeholder: '🇷🇺 Описание (RU)' },
                { name: 'description_en', placeholder: '🇬🇧 Description (EN)' },
              ].map(({ name, placeholder }) => (
                <textarea
                  key={name}
                  name={name}
                  placeholder={placeholder}
                  defaultValue={editing?.[name]}
                  rows={2}
                  className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              ))}
            </div>
          </div>

          {/* Goal + Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Goal (UZS)</label>
              <input
                name="goal_amount"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 5000000"
                defaultValue={editing?.goal_amount}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Deadline</label>
              <input
                name="deadline"
                type="datetime-local"
                defaultValue={editing?.deadline?.slice(0, 16)}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-md shadow-rose-500/20"
            >
              {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Donations panel ──────────────────────────────────────────────────────────

function DonationsPanel({ campaign }: { campaign: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-donations', campaign.id],
    queryFn: () => getCampaignDonations(campaign.id).then((r) => r.data),
  })

  const donations = data?.donations ?? []
  const totalAmount = donations.reduce((s: number, d: any) => s + (d.amount ?? 0), 0)

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
      {/* Mini summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Donations', value: donations.length, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Total Raised', value: `${(totalAmount / 1000).toFixed(0)}K UZS`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Donation', value: donations.length > 0 ? `${Math.round(totalAmount / donations.length / 1000)}K` : '—', color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
            <p className={`text-sm font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Donation list */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Donations</h4>
        {isLoading ? (
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : donations.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No donations yet</p>
        ) : (
          <div className="space-y-1">
            {donations.slice(0, 10).map((d: any) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(d.user?.first_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{d.user?.first_name ?? 'Unknown'}</p>
                  <p className="text-[10px] text-slate-400">{d.donation_type}</p>
                </div>
                <p className="text-xs font-bold text-emerald-600 flex-shrink-0">{(d.amount ?? 0).toLocaleString()} UZS</p>
                <p className="text-[10px] text-slate-400 flex-shrink-0 hidden sm:block">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {donations.length > 10 && (
              <p className="text-xs text-slate-400 text-center pt-1">+{donations.length - 10} more donations</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Campaign card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEdit,
  onClose: onCloseCampaign,
}: {
  campaign: any
  onEdit: (c: any) => void
  onClose: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pct = campaign.goal_amount > 0
    ? Math.min(100, (campaign.collected_amount / campaign.goal_amount) * 100)
    : 0

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    closed: 'bg-slate-100 text-slate-500 border-slate-200',
  }

  const deadlineMs = campaign.deadline ? new Date(campaign.deadline).getTime() - Date.now() : null
  const daysLeft = deadlineMs !== null ? Math.max(0, Math.floor(deadlineMs / 86_400_000)) : null

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${campaign.status === 'active' ? 'border-slate-100' : 'border-slate-200 opacity-80'}`}>
      <div className={`h-1.5 ${campaign.status === 'active' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-slate-200'}`} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Circle progress */}
          <div className="relative flex-shrink-0">
            <CircleProgress pct={pct} color={campaign.status === 'active' ? '#f43f5e' : '#94a3b8'} size={64} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-black text-slate-700">{pct.toFixed(0)}%</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-slate-800 leading-tight truncate">{campaign.name_uz}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 uppercase tracking-wider ${statusColors[campaign.status] ?? statusColors.closed}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">{campaign.name_en}</p>

            {campaign.description_uz && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-2">{campaign.description_uz}</p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <DollarSign size={11} className="text-emerald-500" />
                {(campaign.collected_amount ?? 0).toLocaleString()} UZS
              </span>
              {campaign.goal_amount > 0 && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Target size={11} />
                  {campaign.goal_amount.toLocaleString()} goal
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-400">
                <Users size={11} />
                {campaign.donor_count ?? 0} donors
              </span>
              {daysLeft !== null && campaign.status === 'active' && (
                <span className={`font-semibold ${daysLeft <= 3 ? 'text-red-500' : 'text-slate-400'}`}>
                  {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {campaign.goal_amount > 0 && (
              <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide' : 'Donations'}
          </button>

          <div className="flex-1" />

          {campaign.status === 'active' && (
            <>
              <button
                onClick={() => onEdit(campaign)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { if (confirm(`Close campaign "${campaign.name_en}"?`)) onCloseCampaign(campaign.id) }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>

        {expanded && <DonationsPanel campaign={campaign} />}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CharityPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['charity-campaigns'],
    queryFn: () => getCharityCampaigns().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast.success('Campaign launched!')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to create campaign'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateCampaign(id, data),
    onSuccess: () => {
      toast.success('Campaign updated')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to update campaign'),
  })

  const closeMut = useMutation({
    mutationFn: (id: string) => closeCampaign(id),
    onSuccess: () => {
      toast.success('Campaign closed')
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to close campaign'),
  })

  const campaigns = data?.campaigns ?? []
  const activeCampaigns = campaigns.filter((c: any) => c.status === 'active')
  const totalRaised = campaigns.reduce((s: number, c: any) => s + (c.collected_amount ?? 0), 0)
  const totalDonors = campaigns.reduce((s: number, c: any) => s + (c.donor_count ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Charity</h1>
          <p className="text-sm text-slate-400 mt-0.5">{campaigns.length} campaigns · {activeCampaigns.length} active</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 transition-all"
        >
          <Plus size={15} />
          New Campaign
        </button>
      </div>

      {/* Summary stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Active Campaigns', value: activeCampaigns.length, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Total Raised', value: `${(totalRaised / 1_000_000).toFixed(2)}M UZS`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Donors', value: totalDonors.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'All Campaigns', value: campaigns.length, icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className={`text-xl font-black ${color} leading-tight`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campaign list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-2 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-rose-400" />
          </div>
          <p className="font-bold text-slate-700 text-lg">No campaigns yet</p>
          <p className="text-sm text-slate-400 mt-1">Launch a charity campaign to start collecting donations</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-2 mx-auto bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            <Plus size={14} />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCampaigns.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </p>
              <div className="space-y-3">
                {activeCampaigns.map((c: any) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onEdit={(camp) => { setEditing(camp); setShowForm(true) }}
                    onClose={(id) => closeMut.mutate(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {campaigns.filter((c: any) => c.status !== 'active').length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                Past Campaigns
              </p>
              <div className="space-y-3">
                {campaigns
                  .filter((c: any) => c.status !== 'active')
                  .map((c: any) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onEdit={(camp) => { setEditing(camp); setShowForm(true) }}
                      onClose={(id) => closeMut.mutate(id)}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over form */}
      {(showForm || editing) && (
        <CampaignFormDrawer
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onCreate={createMut.mutate}
          onUpdate={updateMut.mutate}
          isPending={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  )
}
