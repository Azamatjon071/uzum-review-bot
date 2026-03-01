import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCharityCampaigns,
  createCampaign,
  updateCampaign,
  closeCampaign,
  getCampaignDonations,
} from '@/api'
import { Heart, Plus, X, Pencil, Ban, Calendar, AlertTriangle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import FilterBar from '@/components/ui/FilterBar'
import ViewToggle from '@/components/ui/ViewToggle'
import DensityToggle from '@/components/ui/DensityToggle'
import DataCard from '@/components/ui/DataCard'
import EmptyState from '@/components/ui/EmptyState'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import type { ViewMode } from '@/hooks/useViewPreferences'

// ── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name_uz: string
  name_ru: string
  name_en: string
  description_uz?: string
  description_ru?: string
  description_en?: string
  image_url?: string | null
  goal_amount: number
  raised_amount: number
  currency?: string
  is_active: boolean
  status?: string
  deadline?: string | null
  created_at?: string
  donor_count?: number
}

interface Donation {
  id: string
  user?: {
    id?: string
    first_name?: string
    last_name?: string
    username?: string
  }
  campaign?: {
    name_uz?: string
    name_en?: string
  }
  amount_uzs: number
  source?: string
  created_at: string
}

// ── SVG Circular Progress Ring ───────────────────────────────────────────────

function CircleProgress({ pct, size = 64 }: { pct: number; size?: number }) {
  const strokeWidth = 5
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={pct >= 100 ? 'stroke-emerald-500' : 'stroke-primary'}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

// ── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 animate-fade-in" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">{message}</p>
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isPending ? 'Processing...' : confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </>
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
  editing: Campaign | null
  onClose: () => void
  onCreate: (data: Record<string, unknown>) => void
  onUpdate: (data: { id: string; data: Record<string, unknown> }) => void
  isPending: boolean
}) {
  const [isActive, setIsActive] = useState(editing?.is_active ?? true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      name_uz: (fd.get('name_uz') as string) || '',
      name_ru: (fd.get('name_ru') as string) || '',
      name_en: (fd.get('name_en') as string) || '',
      description_uz: (fd.get('description_uz') as string) || '',
      description_ru: (fd.get('description_ru') as string) || '',
      description_en: (fd.get('description_en') as string) || '',
      image_url: (fd.get('image_url') as string) || null,
      goal_amount: Number(fd.get('goal_amount')) || 0,
      currency: (fd.get('currency') as string) || 'UZS',
      is_active: isActive,
      deadline: (fd.get('deadline') as string) || null,
    }
    if (editing) {
      onUpdate({ id: editing.id, data: payload })
    } else {
      onCreate(payload)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header with accent */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Names */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Campaign Name</p>
            <div className="space-y-2">
              {[
                { name: 'name_uz', placeholder: 'Kampaniya nomi (UZ)', defaultKey: 'name_uz' as const },
                { name: 'name_ru', placeholder: 'Название кампании (RU)', defaultKey: 'name_ru' as const },
                { name: 'name_en', placeholder: 'Campaign name (EN)', defaultKey: 'name_en' as const },
              ].map(({ name, placeholder, defaultKey }) => (
                <input
                  key={name}
                  name={name}
                  placeholder={placeholder}
                  defaultValue={editing?.[defaultKey] ?? ''}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
            <div className="space-y-2">
              {[
                { name: 'description_uz', placeholder: 'Tavsif (UZ)', defaultKey: 'description_uz' as const },
                { name: 'description_ru', placeholder: 'Описание (RU)', defaultKey: 'description_ru' as const },
                { name: 'description_en', placeholder: 'Description (EN)', defaultKey: 'description_en' as const },
              ].map(({ name, placeholder, defaultKey }) => (
                <textarea
                  key={name}
                  name={name}
                  placeholder={placeholder}
                  defaultValue={editing?.[defaultKey] ?? ''}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Image URL</label>
            <input
              name="image_url"
              type="url"
              placeholder="https://..."
              defaultValue={editing?.image_url ?? ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Goal Amount</label>
              <input
                name="goal_amount"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 5000000"
                defaultValue={editing?.goal_amount ?? ''}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Currency</label>
              <select
                name="currency"
                defaultValue={editing?.currency ?? 'UZS'}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              >
                <option value="UZS">UZS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Deadline</label>
            <input
              name="deadline"
              type="datetime-local"
              defaultValue={editing?.deadline?.slice(0, 16) ?? ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
            <label className="text-xs font-medium text-muted-foreground">Active</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
                isActive ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted-foreground/30',
              )}
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
                  isActive ? 'translate-x-[18px]' : 'translate-x-[2px]',
                )}
              />
            </button>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Donations tab ────────────────────────────────────────────────────────────

function DonationsTab() {
  const [search, setSearch] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { density } = useViewPreferences()
  const dc = densityClasses[density]

  const { data: campaignsData } = useQuery({
    queryKey: ['charity-campaigns'],
    queryFn: () => getCharityCampaigns().then((r) => r.data),
  })

  const campaigns: Campaign[] = campaignsData?.campaigns ?? []

  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['charity-donations', selectedCampaignId],
    queryFn: () =>
      selectedCampaignId
        ? getCampaignDonations(selectedCampaignId).then((r) => r.data)
        : Promise.resolve({ donations: [] }),
    enabled: !!selectedCampaignId,
  })

  const donations: Donation[] = donationsData?.donations ?? []

  const filtered = donations.filter((d) => {
    if (!search) return true
    const userName = [d.user?.first_name, d.user?.last_name].filter(Boolean).join(' ')
    return userName.toLowerCase().includes(search.toLowerCase()) ||
      d.user?.username?.toLowerCase().includes(search.toLowerCase())
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search donors..."
      >
        <select
          value={selectedCampaignId}
          onChange={(e) => { setSelectedCampaignId(e.target.value); setPage(1) }}
          className="px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all min-w-[200px]"
        >
          <option value="">Select campaign...</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name_uz || c.name_en}</option>
          ))}
        </select>
      </FilterBar>

      {!selectedCampaignId ? (
        <EmptyState
          icon={<Heart className="w-6 h-6 text-muted-foreground/60" />}
          title="Select a campaign"
          description="Choose a campaign from the dropdown to view its donations"
        />
      ) : isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-6 h-6 text-muted-foreground/60" />}
          title={search ? 'No donors match your search' : 'No donations yet'}
          description={search ? 'Try a different search term' : 'This campaign has no donations yet'}
        />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className={cn('w-full', dc.text)}>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['User', 'Campaign', 'Amount (UZS)', 'Source', 'Date'].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          dc.padding,
                          'text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((d) => {
                    const userName = [d.user?.first_name, d.user?.last_name].filter(Boolean).join(' ') || 'Unknown'
                    return (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors group">
                        <td className={cn(dc.padding, dc.text)}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {(d.user?.first_name?.[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{userName}</p>
                              {d.user?.username && (
                                <p className="text-xs text-muted-foreground">@{d.user.username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={cn(dc.padding, dc.text, 'text-muted-foreground')}>
                          {d.campaign?.name_uz || d.campaign?.name_en || '—'}
                        </td>
                        <td className={cn(dc.padding, dc.text, 'font-semibold text-foreground tabular-nums')}>
                          {d.amount_uzs.toLocaleString()}
                        </td>
                        <td className={dc.padding}>
                          <StatusBadge variant={d.source === 'reward' ? 'primary' : 'info'} size="sm">
                            {d.source ?? 'direct'}
                          </StatusBadge>
                        </td>
                        <td className={cn(dc.padding, 'text-xs text-muted-foreground whitespace-nowrap')}>
                          {format(new Date(d.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filtered.length} donation{filtered.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 rounded-xl uzum-gradient text-white text-xs font-bold">
                  {page}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CharityPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'campaigns' | 'donations'>('campaigns')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [closeTarget, setCloseTarget] = useState<Campaign | null>(null)
  const [search, setSearch] = useState('')

  const { getView, setView, density, setDensity } = useViewPreferences()
  const view = getView('charity', 'table') as ViewMode
  const dc = densityClasses[density]

  const { data, isLoading } = useQuery({
    queryKey: ['charity-campaigns'],
    queryFn: () => getCharityCampaigns().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast.success('Campaign launched')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to create campaign'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateCampaign(id, data),
    onSuccess: () => {
      toast.success('Campaign updated')
      setEditing(null)
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to update campaign'),
  })

  const closeMut = useMutation({
    mutationFn: (id: string) => closeCampaign(id),
    onSuccess: () => {
      toast.success('Campaign closed')
      setCloseTarget(null)
      qc.invalidateQueries({ queryKey: ['charity-campaigns'] })
    },
    onError: () => toast.error('Failed to close campaign'),
  })

  const campaigns: Campaign[] = data?.campaigns ?? []

  const filtered = campaigns.filter((c) => {
    if (!search) return true
    return [c.name_uz, c.name_ru, c.name_en].some(
      (n) => n?.toLowerCase().includes(search.toLowerCase()),
    )
  })

  function openEdit(c: Campaign) {
    setEditing(c)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function getCampaignPct(c: Campaign): number {
    if (!c.goal_amount || c.goal_amount === 0) return 0
    return Math.min(100, (c.raised_amount / c.goal_amount) * 100)
  }

  function getDeadlineText(c: Campaign): string | null {
    if (!c.deadline) return null
    const deadlineDate = new Date(c.deadline)
    if (deadlineDate.getTime() < Date.now()) return 'Ended'
    return formatDistanceToNow(deadlineDate, { addSuffix: true })
  }

  function isActive(c: Campaign): boolean {
    return c.is_active || c.status === 'active'
  }

  return (
    <div className={dc.spacing}>
      <PageHeader
        title="Charity Campaigns"
        description="Manage fundraising campaigns and donations"
        icon={<Heart className="w-5 h-5 text-primary" />}
        badge={<StatusBadge variant="info" size="sm">{campaigns.length} campaigns</StatusBadge>}
        actions={
          tab === 'campaigns' ? (
            <div className="flex items-center gap-2">
              <DensityToggle current={density} onChange={setDensity} />
              <ViewToggle
                current={view}
                onChange={(m) => setView('charity', m)}
                options={['table', 'card']}
              />
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Tab toggle */}
      <div className="flex items-center gap-1 border-b border-border">
        {(['campaigns', 'donations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
              tab === t
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Campaigns tab */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search campaigns..."
          />

          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Heart className="w-6 h-6 text-muted-foreground/60" />}
              title={search ? 'No campaigns match your search' : 'No campaigns yet'}
              description={search ? 'Try a different search term' : 'Launch a charity campaign to start collecting donations'}
              action={
                !search ? (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                  </button>
                ) : undefined
              }
            />
          ) : view === 'table' ? (
            /* ── Table View ── */
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className={cn('w-full', dc.text)}>
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Name', 'Goal', 'Raised', 'Progress', 'Status', 'Deadline', 'Actions'].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            dc.padding,
                            'text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c) => {
                      const pct = getCampaignPct(c)
                      const deadlineText = getDeadlineText(c)
                      const active = isActive(c)

                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          <td className={cn(dc.padding, dc.text)}>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <Heart className="w-4 h-4" />
                              </div>
                              <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                                {c.name_uz || c.name_en || '—'}
                              </span>
                            </div>
                          </td>
                          <td className={cn(dc.padding, dc.text, 'text-muted-foreground tabular-nums whitespace-nowrap')}>
                            {c.goal_amount.toLocaleString()} {c.currency || 'UZS'}
                          </td>
                          <td className={cn(dc.padding, dc.text, 'font-semibold text-foreground tabular-nums whitespace-nowrap')}>
                            {c.raised_amount.toLocaleString()} {c.currency || 'UZS'}
                          </td>
                          <td className={cn(dc.padding, 'min-w-[150px]')}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    pct >= 100 ? 'bg-emerald-500' : 'uzum-gradient',
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-foreground tabular-nums w-10 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className={dc.padding}>
                            <StatusBadge variant={active ? 'success' : 'neutral'} dot size="sm">
                              {active ? 'Active' : 'Closed'}
                            </StatusBadge>
                          </td>
                          <td className={cn(dc.padding, 'text-xs text-muted-foreground whitespace-nowrap')}>
                            {deadlineText ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{deadlineText}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className={dc.padding}>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {active && (
                                <>
                                  <button
                                    onClick={() => openEdit(c)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setCloseTarget(c)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Close campaign"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Card View ── */
            <div className={cn('grid gap-3', dc.gridCols)}>
              {filtered.map((c) => {
                const pct = getCampaignPct(c)
                const deadlineText = getDeadlineText(c)
                const active = isActive(c)

                return (
                  <DataCard key={c.id} padding="none" className={cn(!active && 'opacity-60')}>
                    <div className="p-4 space-y-3">
                      {/* Header with circle progress */}
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <CircleProgress pct={pct} size={56} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-foreground tabular-nums">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {c.name_uz || c.name_en || '—'}
                            </p>
                            <StatusBadge variant={active ? 'success' : 'neutral'} dot size="sm">
                              {active ? 'Active' : 'Closed'}
                            </StatusBadge>
                          </div>
                          {c.description_uz && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {c.description_uz}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Goal vs raised */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Goal</p>
                          <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                            {c.goal_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Raised</p>
                          <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">
                            {c.raised_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Deadline */}
                      {deadlineText && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {deadlineText === 'Ended' ? 'Campaign ended' : `Ends ${deadlineText}`}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      {active && (
                        <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
                          <button
                            onClick={() => openEdit(c)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => setCloseTarget(c)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  </DataCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Donations tab */}
      {tab === 'donations' && <DonationsTab />}

      {/* Campaign form drawer */}
      {showForm && (
        <CampaignFormDrawer
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onCreate={(data) => createMut.mutate(data)}
          onUpdate={(data) => updateMut.mutate(data)}
          isPending={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Close campaign confirmation */}
      {closeTarget && (
        <ConfirmDialog
          title="Close Campaign"
          message={`Are you sure you want to close "${closeTarget.name_uz || closeTarget.name_en}"? This will stop accepting donations.`}
          confirmLabel="Close Campaign"
          onConfirm={() => closeMut.mutate(closeTarget.id)}
          onCancel={() => setCloseTarget(null)}
          isPending={closeMut.isPending}
        />
      )}
    </div>
  )
}
