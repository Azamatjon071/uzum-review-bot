import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrizes, createPrize, updatePrize, deletePrize, togglePrize } from '@/api'
import { Trophy, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
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
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
        checked ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-muted-foreground/30'
      )}
    >
      <span
        className={clsx(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
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
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-sm p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-lg z-50 flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {editing ? 'Edit Prize' : 'New Prize'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {[
            { name: 'name_uz', label: 'Name (UZ)', placeholder: "Sovg'a kartasi" },
            { name: 'name_ru', label: 'Name (RU)', placeholder: 'Подарочная карта' },
            { name: 'name_en', label: 'Name (EN)', placeholder: 'Gift Card' },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
              <input
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[name as keyof Prize] as string ?? ''}
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prize Type</label>
            <select
              name="prize_type"
              defaultValue={getPrizeType(editing ?? { prize_type: 'GIFT' } as Prize) || 'GIFT'}
              required
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            >
              {PRIZE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Value</label>
            <input
              name="value"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 50000 or 10"
              defaultValue={editing?.value ?? 0}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">For discounts use percentage, for gifts/cashback use UZS amount</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Weight (probability)</label>
            <input
              name="weight"
              type="number"
              min="1"
              max="1000"
              placeholder="10"
              defaultValue={editing?.weight ?? 10}
              required
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">Higher weight = more frequent on the wheel</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                name="color_picker"
                type="color"
                defaultValue={editing?.color ?? '#6366f1'}
                className="w-10 h-10 rounded-md border border-input cursor-pointer p-0.5 bg-background"
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
                className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
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
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Stock Limit</label>
            <input
              name="stock_limit"
              type="number"
              min="0"
              placeholder="Leave empty for unlimited"
              defaultValue={editing?.stock_limit ?? ''}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Active</label>
            <ToggleSwitch checked={isActive} onChange={() => setIsActive(!isActive)} />
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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
      (n) => n?.toLowerCase().includes(search.toLowerCase())
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prizes"
        description="Configure wheel prizes and probabilities"
        badge={
          <StatusBadge variant="neutral">{prizes.length} total</StatusBadge>
        }
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Prize
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search prizes..."
        chips={filterChips}
        onChipToggle={(key) => setTypeFilter(key)}
      >
        <div className="flex items-center gap-2">
          <ViewToggle
            current={view}
            onChange={(m) => setView('prizes', m)}
            options={['table', 'card']}
          />
          <DensityToggle current={density} onChange={setDensity} />
        </div>
      </FilterBar>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border border-border bg-card">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={clsx('flex gap-4 border-b border-border last:border-b-0', dc.padding)}>
              <div className="h-4 w-4 bg-muted rounded-full animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-6 h-6 text-muted-foreground" />}
          title={search || typeFilter !== 'all' ? 'No prizes match your filters' : 'No prizes yet'}
          description={search || typeFilter !== 'all' ? 'Try different filters' : 'Add your first prize to get started'}
          action={
            !search && typeFilter === 'all' ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Prize
              </button>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        /* ── Table View ──────────────────────────────────────────────────── */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Color', 'Name', 'Type', 'Value', 'Weight', 'Stock', 'Active', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={clsx(
                        'text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                        dc.padding
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
                      <td className={clsx(dc.padding)}>
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: p.color }}
                        />
                      </td>
                      <td className={clsx(dc.padding, dc.text)}>
                        <span className="font-medium text-foreground">
                          {p.name_uz || p.name_en || p.name_ru || '--'}
                        </span>
                      </td>
                      <td className={clsx(dc.padding)}>
                        <StatusBadge variant={TYPE_VARIANTS[typeKey] ?? 'neutral'}>
                          {TYPE_LABELS[typeKey] ?? typeKey}
                        </StatusBadge>
                      </td>
                      <td className={clsx(dc.padding, dc.text, 'text-foreground font-medium tabular-nums')}>
                        {formatValue(p)}
                      </td>
                      <td className={clsx(dc.padding, 'min-w-[120px]')}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: p.color }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className={clsx(dc.padding, 'min-w-[100px]')}>
                        {stockLimit !== null ? (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {stockUsed}/{stockLimit} used
                            </span>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-300',
                                  stockPct > 90 ? 'bg-destructive' : stockPct > 70 ? 'bg-warning' : 'bg-emerald-500'
                                )}
                                style={{ width: `${Math.min(stockPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unlimited</span>
                        )}
                      </td>
                      <td className={clsx(dc.padding)}>
                        <ToggleSwitch
                          checked={p.is_active}
                          onChange={() => toggleMut.mutate(p.id)}
                          disabled={toggleMut.isPending}
                        />
                      </td>
                      <td className={clsx(dc.padding)}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
        /* ── Card View ───────────────────────────────────────────────────── */
        <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', dc.gap)}>
          {filtered.map((p) => {
            const pct = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0
            const rarity = getRarityLabel(p.weight, totalWeight)
            const typeKey = getPrizeType(p)
            const stockUsed = p.stock_used ?? 0
            const stockLimit = p.stock_limit ?? null
            const stockPct = stockLimit ? (stockUsed / stockLimit) * 100 : 0

            return (
              <DataCard key={p.id} padding="none" className={clsx(!p.is_active && 'opacity-60')}>
                {/* Color stripe */}
                <div className="h-1 rounded-t-xl" style={{ backgroundColor: p.color }} />

                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.name_uz || p.name_en || p.name_ru || '--'}
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
                    <StatusBadge variant={TYPE_VARIANTS[typeKey] ?? 'neutral'}>
                      {TYPE_LABELS[typeKey] ?? typeKey}
                    </StatusBadge>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {formatValue(p)}
                    </span>
                  </div>

                  {/* Weight bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Weight</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground tabular-nums">{pct.toFixed(1)}%</span>
                        <StatusBadge variant={rarity.variant} size="sm">{rarity.label}</StatusBadge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
                        <span className="text-xs text-muted-foreground">Stock</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{stockUsed}/{stockLimit} used</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all duration-300',
                            stockPct > 90 ? 'bg-destructive' : stockPct > 70 ? 'bg-warning' : 'bg-emerald-500'
                          )}
                          style={{ width: `${Math.min(stockPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Stock</span>
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="inline-flex items-center justify-center p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
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
