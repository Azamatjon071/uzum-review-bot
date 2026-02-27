import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrizes, createPrize, updatePrize, deletePrize, togglePrize } from '@/api'
import { Trophy, Plus, X, BarChart3, Zap } from 'lucide-react'

// Prize types matching backend enum
const PRIZE_TYPES = [
  { value: 'GIFT',             label: 'Gift Card',              emoji: '🎁' },
  { value: 'FREE_PRODUCT',     label: 'Free Product',           emoji: '📦' },
  { value: 'DISCOUNT',         label: 'Discount Coupon',        emoji: '🏷️' },
  { value: 'CHARITY_DONATION', label: 'Charity Donation',       emoji: '💚' },
  { value: 'CASHBACK',         label: 'Store Cashback',         emoji: '💰' },
]

const TYPE_META: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  GIFT:             { label: 'Gift Card',        emoji: '🎁', bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  FREE_PRODUCT:     { label: 'Free Product',     emoji: '📦', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  DISCOUNT:         { label: 'Discount Coupon',  emoji: '🏷️', bg: 'bg-orange-50',  text: 'text-orange-700' },
  CHARITY_DONATION: { label: 'Charity Donation', emoji: '💚', bg: 'bg-teal-50',    text: 'text-teal-700' },
  CASHBACK:         { label: 'Store Cashback',   emoji: '💰', bg: 'bg-purple-50',  text: 'text-purple-700' },
  // lowercase fallbacks
  gift:             { label: 'Gift Card',        emoji: '🎁', bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  free_product:     { label: 'Free Product',     emoji: '📦', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  discount:         { label: 'Discount Coupon',  emoji: '🏷️', bg: 'bg-orange-50',  text: 'text-orange-700' },
  charity_donation: { label: 'Charity Donation', emoji: '💚', bg: 'bg-teal-50',    text: 'text-teal-700' },
  cashback:         { label: 'Store Cashback',   emoji: '💰', bg: 'bg-purple-50',  text: 'text-purple-700' },
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
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
      prize_type: fd.get('prize_type'),
      value: 0,
      weight: Number(fd.get('weight')),
      color: fd.get('color') || '#6366f1',
      is_active: true,
    }
    editing ? onUpdate({ id: editing.id, data: payload }) : onCreate(payload)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy size={14} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{editing ? 'Edit Prize' : 'New Prize'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-500">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {[
              { name: 'name_uz', label: 'Name (Uzbek)', placeholder: "e.g. Sovg'a kartasi" },
              { name: 'name_ru', label: 'Name (Russian)', placeholder: 'e.g. Подарочная карта' },
              { name: 'name_en', label: 'Name (English)', placeholder: 'e.g. Gift Card' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                <input
                  name={name}
                  placeholder={placeholder}
                  defaultValue={editing?.[name]}
                  className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prize Type</label>
              <select
                name="prize_type"
                defaultValue={editing?.type ?? editing?.prize_type ?? 'GIFT'}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                {PRIZE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Weight <span className="text-slate-400 font-normal normal-case">(higher = more likely)</span>
              </label>
              <input
                name="weight"
                type="number"
                min="1"
                max="1000"
                placeholder="10"
                defaultValue={editing?.weight ?? 10}
                className="border rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Relative weight compared to other prizes. Higher = appears more often on the wheel.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Wheel Segment Color</label>
              <div className="flex items-center gap-3">
                <input
                  name="color"
                  type="color"
                  defaultValue={editing?.color ?? '#6366f1'}
                  className="border rounded-xl px-1 py-1 h-11 w-16 cursor-pointer"
                />
                <p className="text-xs text-slate-400">Choose the color for this prize's wheel segment</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Prize'}
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
  const [editing, setEditing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['prizes'],
    queryFn: () => getPrizes().then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: createPrize,
    onSuccess: () => { toast.success('Prize created'); setShowForm(false); qc.invalidateQueries({ queryKey: ['prizes'] }) },
    onError: () => toast.error('Failed to create prize'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updatePrize(id, data),
    onSuccess: () => { toast.success('Prize updated'); setEditing(null); qc.invalidateQueries({ queryKey: ['prizes'] }) },
    onError: () => toast.error('Failed to update prize'),
  })
  const deleteMut = useMutation({
    mutationFn: deletePrize,
    onSuccess: () => { toast.success('Prize deleted'); qc.invalidateQueries({ queryKey: ['prizes'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Failed to delete prize'),
  })
  const toggleMut = useMutation({
    mutationFn: togglePrize,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prizes'] }) },
    onError: () => toast.error('Failed to toggle prize'),
  })

  const prizes = data?.prizes ?? []
  const totalWeight = prizes.reduce((sum: number, p: any) => sum + (p.weight ?? 0), 0)
  const activePrizes = prizes.filter((p: any) => p.is_active).length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Prizes</h1>
          <p className="text-sm text-slate-400 mt-0.5">{prizes.length} prizes · {activePrizes} active</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus size={15} />
          Add Prize
        </button>
      </div>

      {/* Summary stats */}
      {prizes.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Prizes', value: prizes.length, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active', value: activePrizes, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Inactive', value: prizes.length - activePrizes, icon: X, color: 'text-slate-500', bg: 'bg-slate-50' },
            { label: 'Total Weight', value: totalWeight, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mb-2`}>
                <Icon size={14} className={color} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Probability chart */}
      {prizes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-slate-400" />
            Probability Distribution
          </h2>
          <div className="space-y-3">
            {[...prizes]
              .sort((a: any, b: any) => (b.weight ?? 0) - (a.weight ?? 0))
              .map((p: any) => {
                const pct = totalWeight > 0 ? ((p.weight ?? 0) / totalWeight) * 100 : 0
                const meta = TYPE_META[p.type ?? p.prize_type ?? ''] ?? { label: p.type, emoji: '🎁', bg: 'bg-slate-50', text: 'text-slate-600' }
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ background: p.color }} />
                    <div className="w-32 min-w-0 flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{p.name_en}</p>
                      <p className="text-[10px] text-slate-400">{meta.emoji} {meta.label}</p>
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: p.color }}
                      />
                    </div>
                    <div className="w-12 text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-600">{pct.toFixed(1)}%</p>
                    </div>
                    <div className="w-8 text-right flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {p.is_active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Prize grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : prizes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy size={28} className="text-amber-400" />
          </div>
          <p className="font-bold text-slate-700 text-lg">No prizes yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your first prize to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prizes.map((p: any) => {
            const meta = TYPE_META[p.type ?? p.prize_type ?? ''] ?? { label: p.type ?? 'Unknown', emoji: '🎁', bg: 'bg-slate-50', text: 'text-slate-600' }
            const pct = totalWeight > 0 ? ((p.weight ?? 0) / totalWeight) * 100 : 0

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${p.is_active ? 'border-slate-100' : 'border-slate-200 opacity-70'}`}
              >
                {/* Color banner */}
                <div className="h-2" style={{ background: p.color }} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black shadow-md flex-shrink-0"
                        style={{ background: p.color }}
                      >
                        {meta.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate leading-tight">{p.name_en}</p>
                        <p className="text-xs text-slate-500 truncate">{p.name_uz}</p>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div className="flex-shrink-0 pt-1">
                      <ToggleSwitch
                        checked={p.is_active}
                        onChange={() => toggleMut.mutate(p.id)}
                        disabled={toggleMut.isPending}
                      />
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>

                  {/* Probability bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Probability</span>
                      <span className="text-xs font-black text-slate-700">{pct.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%`, background: p.color }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Weight: {p.weight} / {totalWeight} total</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={() => { setEditing(p); setShowForm(false) }}
                      className="flex-1 text-xs text-blue-600 hover:text-blue-800 font-semibold py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <div className="w-px bg-slate-100" />
                    <button
                      onClick={() => { if (confirm(`Delete "${p.name_en}"?`)) deleteMut.mutate(p.id) }}
                      disabled={deleteMut.isPending}
                      className="flex-1 text-xs text-red-600 hover:text-red-800 font-semibold py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over form */}
      {(showForm || editing) && (
        <PrizeFormDrawer
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
