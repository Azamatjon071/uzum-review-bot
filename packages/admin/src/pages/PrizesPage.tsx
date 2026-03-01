import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrizes, createPrize, updatePrize, deletePrize, togglePrize } from '@/api'
import { Trophy, Plus, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface Prize {
  id: string
  name_uz: string
  name_ru: string
  name_en: string
  prize_type?: string
  type?: string
  value: number
  weight: number
  color: string
  is_active: boolean
  stock_limit?: number | null
  stock_used?: number | null
  icon_url?: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const PRIZE_TYPES = [
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'CASHBACK', label: 'Cashback' },
  { value: 'GIFT', label: 'Gift' },
  { value: 'FREE_PRODUCT', label: 'Free Product' },
  { value: 'CHARITY_DONATION', label: 'Charity Donation' },
]

const TYPE_LABELS: Record<string, string> = {
  DISCOUNT: 'Discount',
  CASHBACK: 'Cashback',
  GIFT: 'Gift',
  FREE_PRODUCT: 'Free Product',
  CHARITY_DONATION: 'Charity',
  discount: 'Discount',
  cashback: 'Cashback',
  gift: 'Gift',
  free_product: 'Free Product',
  charity_donation: 'Charity',
}

const TYPE_VARIANTS: Record<string, 'info' | 'primary' | 'success' | 'warning' | 'error' | 'neutral'> = {
  DISCOUNT: 'warning',
  CASHBACK: 'primary',
  GIFT: 'info',
  FREE_PRODUCT: 'success',
  CHARITY_DONATION: 'success',
  discount: 'warning',
  cashback: 'primary',
  gift: 'info',
  free_product: 'success',
  charity_donation: 'success',
}

function getPrizeType(p: Prize): string {
  return p.type ?? p.prize_type ?? ''
}

function getRarityLabel(weight: number, totalWeight: number): { label: string; variant: 'neutral' | 'info' | 'primary' | 'warning' | 'error' } {
  if (totalWeight === 0) return { label: 'N/A', variant: 'neutral' }
  const pct = (weight / totalWeight) * 100
  if (pct < 2) return { label: 'Legendary', variant: 'error' }
  if (pct < 5) return { label: 'Epic', variant: 'primary' }
  if (pct < 10) return { label: 'Rare', variant: 'info' }
  if (pct < 20) return { label: 'Uncommon', variant: 'warning' }
  return { label: 'Common', variant: 'neutral' }
}

// ── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange() }}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50',
        checked ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  )
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string
  message: string
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
              {isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Prize form drawer ────────────────────────────────────────────────────────

function PrizeFormDrawer({
  editing,
  onClose,
  onCreate,
  onUpdate,
  isPending,
}: {
  editing: Prize | null
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
      prize_type: fd.get('prize_type') as string,
      value: Number(fd.get('value')) || 0,
      weight: Number(fd.get('weight')) || 10,
      color: (fd.get('color_hex') as string) || '#6366f1',
      stock_limit: fd.get('stock_limit') ? Number(fd.get('stock_limit')) : null,
      is_active: isActive,
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
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header with accent */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-1 uzum-gradient" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {editing ? 'Edit Prize' : 'New Prize'}
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
          {[
            { name: 'name_uz', label: 'Name (UZ)', placeholder: "Sovg'a kartasi" },
            { name: 'name_ru', label: 'Name (RU)', placeholder: 'Подарочная карта' },
            { name: 'name_en', label: 'Name (EN)', placeholder: 'Gift Card' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
              <input
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[name as keyof Prize] as string ?? ''}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Prize Type</label>
            <select
              name="prize_type"
              defaultValue={getPrizeType(editing ?? { prize_type: 'GIFT' } as Prize) || 'GIFT'}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            >
              {PRIZE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Value</label>
            <input
              name="value"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 50000 or 10"
              defaultValue={editing?.value ?? 0}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">For discounts use percentage, for gifts/cashback use UZS amount</p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Weight (probability)</label>
            <input
              name="weight"
              type="number"
              min="1"
              max="1000"
              placeholder="10"
              defaultValue={editing?.weight ?? 10}
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">Higher weight = more frequent on the wheel</p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                name="color_picker"
                type="color"
                defaultValue={editing?.color ?? '#6366f1'}
                className="w-10 h-10 rounded-xl border border-input cursor-pointer p-0.5 bg-background"
                onChange={(e) => {
                  const hex = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[name=color_hex]')
                  if (hex) hex.value = e.currentTarget.value
                }}
              />
              <input
                name="color_hex"
                type="text"
                defaultValue={editing?.color ?? '#6366f1'}
                placeholder="#6366f1"
                pattern="^#[0-9a-fA-F]{6}$"
                className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                onChange={(e) => {
                  const picker = e.currentTarget.parentElement?.querySelector<HTMLInputElement>('input[type=color]')
                  if (picker && /^#[0-9a-fA-F]{6}$/.test(e.currentTarget.value)) {
                    picker.value = e.currentTarget.value
                  }
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Stock Limit</label>
            <input
              name="stock_limit"
              type="number"
              min="0"
              placeholder="Leave empty for unlimited"
              defaultValue={editing?.stock_limit ?? ''}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
            <label className="text-xs font-medium text-muted-foreground">Active</label>
            <ToggleSwitch checked={isActive} onChange={() => setIsActive(!isActive)} />
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
              {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Prize'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PrizesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Prize | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Prize | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { getView, setView, density, setDensity } = useViewPreferences()
  const view = getView('prizes', 'table') as ViewMode
  const dc = densityClasses[density]

  const { data, isLoading } = useQuery({
    queryKey: ['prizes'],
    queryFn: () => getPrizes().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createPrize,
    onSuccess: () => {
      toast.success('Prize created')
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['prizes'] })
    },
    onError: () => toast.error('Failed to create prize'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updatePrize(id, data),
    onSuccess: () => {
      toast.success('Prize updated')
      setEditing(null)
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['prizes'] })
    },
    onError: () => toast.error('Failed to update prize'),
  })

  const deleteMut = useMutation({
    mutationFn: deletePrize,
    onSuccess: () => {
      toast.success('Prize deleted')
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['prizes'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to delete prize'),
  })

  const toggleMut = useMutation({
    mutationFn: togglePrize,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prizes'] })
    },
    onError: () => toast.error('Failed to toggle prize'),
  })

  const prizes: Prize[] = data?.prizes ?? []
  const totalWeight = prizes.reduce((sum, p) => sum + (p.weight ?? 0), 0)

  const filtered = prizes.filter((p) => {
    const matchesSearch = !search || [p.name_uz, p.name_ru, p.name_en].some(
      (n) => n?.toLowerCase().includes(search.toLowerCase()),
    )
    const matchesType = typeFilter === 'all' || getPrizeType(p).toUpperCase() === typeFilter
    return matchesSearch && matchesType
  })

  const filterChips = [
    { key: 'all', label: 'All', active: typeFilter === 'all' },
    { key: 'DISCOUNT', label: 'Discount', active: typeFilter === 'DISCOUNT' },
    { key: 'CASHBACK', label: 'Cashback', active: typeFilter === 'CASHBACK' },
    { key: 'GIFT', label: 'Gift', active: typeFilter === 'GIFT' },
    { key: 'FREE_PRODUCT', label: 'Free Product', active: typeFilter === 'FREE_PRODUCT' },
    { key: 'CHARITY_DONATION', label: 'Charity', active: typeFilter === 'CHARITY_DONATION' },
  ]

  function openEdit(p: Prize) {
    setEditing(p)
    setShowForm(true)
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
  }

  function formatValue(p: Prize): string {
    const t = getPrizeType(p).toUpperCase()
    if (t === 'DISCOUNT') return `${p.value}%`
    return p.value.toLocaleString()
  }

  return (
    <div className={dc.spacing}>
      <PageHeader
        title="Prizes"
        description="Configure wheel prizes and probabilities"
        icon={<Trophy className="w-5 h-5 text-primary" />}
        badge={<StatusBadge variant="info" size="sm">{prizes.length} total</StatusBadge>}
        actions={
          <div className="flex items-center gap-2">
            <DensityToggle current={density} onChange={setDensity} />
            <ViewToggle
              current={view}
              onChange={(m) => setView('prizes', m)}
              options={['table', 'card']}
            />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Prize
            </button>
          </div>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search prizes..."
        chips={filterChips}
        onChipToggle={(key) => setTypeFilter(key)}
      />

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-6 h-6 text-muted-foreground/60" />}
          title={search || typeFilter !== 'all' ? 'No prizes match your filters' : 'No prizes yet'}
          description={search || typeFilter !== 'all' ? 'Try different filters' : 'Add your first prize to get started'}
          action={
            !search && typeFilter === 'all' ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Prize
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
                  {['Color', 'Name', 'Type', 'Value', 'Weight', 'Stock', 'Active', 'Actions'].map((h) => (
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
                {filtered.map((p) => {
                  const pct = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0
                  const stockUsed = p.stock_used ?? 0
                  const stockLimit = p.stock_limit ?? null
                  const stockPct = stockLimit ? (stockUsed / stockLimit) * 100 : 0
                  const typeKey = getPrizeType(p)

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                      <td className={dc.padding}>
                        <span
                          className="inline-block w-5 h-5 rounded-lg border border-border shadow-sm"
                          style={{ backgroundColor: p.color }}
                        />
                      </td>
                      <td className={cn(dc.padding, dc.text)}>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {p.name_uz || p.name_en || p.name_ru || '—'}
                        </span>
                      </td>
                      <td className={dc.padding}>
                        <StatusBadge variant={TYPE_VARIANTS[typeKey] ?? 'neutral'} size="sm">
                          {TYPE_LABELS[typeKey] ?? typeKey}
                        </StatusBadge>
                      </td>
                      <td className={cn(dc.padding, dc.text, 'text-foreground font-semibold tabular-nums')}>
                        {formatValue(p)}
                      </td>
                      <td className={cn(dc.padding, 'min-w-[130px]')}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: p.color }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right font-medium">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={cn(dc.padding, 'min-w-[110px]')}>
                        {stockLimit !== null ? (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground tabular-nums font-medium">
                              {stockUsed}/{stockLimit} used
                            </span>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-300',
                                  stockPct > 90 ? 'bg-destructive' : stockPct > 70 ? 'bg-warning' : 'bg-emerald-500',
                                )}
                                style={{ width: `${Math.min(stockPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unlimited</span>
                        )}
                      </td>
                      <td className={dc.padding}>
                        <ToggleSwitch
                          checked={p.is_active}
                          onChange={() => toggleMut.mutate(p.id)}
                          disabled={toggleMut.isPending}
                        />
                      </td>
                      <td className={dc.padding}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
          {filtered.map((p) => {
            const pct = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0
            const rarity = getRarityLabel(p.weight, totalWeight)
            const typeKey = getPrizeType(p)
            const stockUsed = p.stock_used ?? 0
            const stockLimit = p.stock_limit ?? null
            const stockPct = stockLimit ? (stockUsed / stockLimit) * 100 : 0

            return (
              <DataCard key={p.id} padding="none" className={cn(!p.is_active && 'opacity-60')}>
                {/* Color stripe */}
                <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: p.color }} />

                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {p.name_uz || p.name_en || p.name_ru || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.name_ru || p.name_en || ''}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={p.is_active}
                      onChange={() => toggleMut.mutate(p.id)}
                      disabled={toggleMut.isPending}
                    />
                  </div>

                  {/* Type + value */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge variant={TYPE_VARIANTS[typeKey] ?? 'neutral'} size="sm">
                      {TYPE_LABELS[typeKey] ?? typeKey}
                    </StatusBadge>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {formatValue(p)}
                    </span>
                  </div>

                  {/* Weight bar */}
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weight</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground tabular-nums">{pct.toFixed(1)}%</span>
                        <StatusBadge variant={rarity.variant} size="sm">{rarity.label}</StatusBadge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>

                  {/* Stock meter */}
                  {stockLimit !== null ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stock</span>
                        <span className="text-xs text-muted-foreground tabular-nums font-medium">{stockUsed}/{stockLimit} used</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            stockPct > 90 ? 'bg-destructive' : stockPct > 70 ? 'bg-warning' : 'bg-emerald-500',
                          )}
                          style={{ width: `${Math.min(stockPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stock</span>
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-3 border-t border-border/50">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="inline-flex items-center justify-center p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </DataCard>
            )
          })}
        </div>
      )}

      {/* Prize form drawer */}
      {showForm && (
        <PrizeFormDrawer
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onCreate={(data) => createMut.mutate(data)}
          onUpdate={(data) => updateMut.mutate(data)}
          isPending={createMut.isPending || updateMut.isPending}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Prize"
          message={`Are you sure you want to delete "${deleteTarget.name_uz || deleteTarget.name_en}"? This action cannot be undone.`}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMut.isPending}
        />
      )}
    </div>
  )
}
