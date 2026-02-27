import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getPrizes, createPrize, updatePrize, deletePrize } from '@/api'

// Prize types matching backend enum (halal - no direct monetary payout)
const PRIZE_TYPES = [
  { value: 'GIFT',             label: 'Gift Card' },
  { value: 'FREE_PRODUCT',     label: 'Free Product' },
  { value: 'DISCOUNT',         label: 'Discount Coupon' },
  { value: 'CHARITY_DONATION', label: 'Charity Donation (Sadaqa)' },
  { value: 'CASHBACK',         label: 'Store Credit / Cashback' },
]

const TYPE_BADGE: Record<string, string> = {
  gift:             'bg-indigo-100 text-indigo-700',
  free_product:     'bg-emerald-100 text-emerald-700',
  discount:         'bg-orange-100 text-orange-700',
  charity_donation: 'bg-teal-100 text-teal-700',
  cashback:         'bg-purple-100 text-purple-700',
  // uppercase fallbacks
  GIFT:             'bg-indigo-100 text-indigo-700',
  FREE_PRODUCT:     'bg-emerald-100 text-emerald-700',
  DISCOUNT:         'bg-orange-100 text-orange-700',
  CHARITY_DONATION: 'bg-teal-100 text-teal-700',
  CASHBACK:         'bg-purple-100 text-purple-700',
}

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
    editing
      ? updateMut.mutate({ id: editing.id, data: payload })
      : createMut.mutate(payload)
  }

  const prizes = data?.prizes ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prizes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{prizes.length} prizes configured</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
        >
          + Add Prize
        </button>
      </div>

      {(showForm || editing) && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold mb-4 text-lg">{editing ? 'Edit Prize' : 'New Prize'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (Uzbek)</label>
              <input name="name_uz" placeholder="e.g. Sovg'a kartasi" defaultValue={editing?.name_uz}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (Russian)</label>
              <input name="name_ru" placeholder="e.g. Подарочная карта" defaultValue={editing?.name_ru}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (English)</label>
              <input name="name_en" placeholder="e.g. Gift Card" defaultValue={editing?.name_en}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prize Type</label>
              <select name="prize_type" defaultValue={editing?.type ?? 'GIFT'}
                className="border rounded-lg px-3 py-2 text-sm w-full" required>
                {PRIZE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Weight <span className="text-slate-400">(higher = more likely)</span>
              </label>
              <input name="weight" type="number" min="1" max="100" placeholder="10"
                defaultValue={editing?.weight ?? 10}
                className="border rounded-lg px-3 py-2 text-sm w-full" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Wheel Color</label>
              <input name="color" type="color" defaultValue={editing?.color ?? '#6366f1'}
                className="border rounded-lg px-2 py-1 h-10 w-full cursor-pointer" />
            </div>
            <div className="col-span-1 sm:col-span-2 flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {editing ? 'Save Changes' : 'Create Prize'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading prizes…</div>
        ) : prizes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No prizes yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Color', 'Name (UZ)', 'Name (EN)', 'Type', 'Weight', 'Probability', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {prizes.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="inline-block w-6 h-6 rounded-full border shadow-sm" style={{ background: p.color }} />
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name_uz}</td>
                  <td className="px-4 py-3 text-slate-500">{p.name_en}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[p.type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {PRIZE_TYPES.find((t) => t.value === p.type?.toUpperCase())?.label ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.weight}</td>
                  <td className="px-4 py-3 text-slate-600">{p.probability_pct?.toFixed(1) ?? '—'}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => { setEditing(p); setShowForm(false) }}
                        className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      <button
                        onClick={() => { if (confirm(`Delete "${p.name_en}"?`)) deleteMut.mutate(p.id) }}
                        className="text-xs text-red-600 hover:underline font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
