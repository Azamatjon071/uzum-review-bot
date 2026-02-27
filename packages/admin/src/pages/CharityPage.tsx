import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCharityCampaigns, createCampaign, updateCampaign, closeCampaign, getCampaignDonations } from '@/api'

export default function CharityPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)

  const { data } = useQuery({
    queryKey: ['charity-campaigns'],
    queryFn: () => getCharityCampaigns().then((r) => r.data),
  })

  const { data: donationsData } = useQuery({
    queryKey: ['campaign-donations', selectedCampaign?.id],
    queryFn: () => getCampaignDonations(selectedCampaign.id).then((r) => r.data),
    enabled: !!selectedCampaign,
  })

  const createMut = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast.success('Campaign created')
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
      goal_amount: Number(fd.get('goal_amount')),
      deadline: fd.get('deadline') || null,
    }
    editing
      ? updateMut.mutate({ id: editing.id, data: payload })
      : createMut.mutate(payload)
  }

  const campaigns = data?.campaigns ?? []
  const donations = donationsData?.donations ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Charity</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + New Campaign
        </button>
      </div>

      {/* Campaign form */}
      {(showForm || editing) && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-semibold mb-4">{editing ? 'Edit Campaign' : 'New Campaign'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {[
              { name: 'name_uz', placeholder: 'Name (UZ)' },
              { name: 'name_ru', placeholder: 'Name (RU)' },
              { name: 'name_en', placeholder: 'Name (EN)' },
            ].map(({ name, placeholder }) => (
              <input
                key={name}
                name={name}
                placeholder={placeholder}
                defaultValue={editing?.[name]}
                className="border rounded-lg px-3 py-2 text-sm"
                required
              />
            ))}
            <textarea
              name="description_uz"
              placeholder="Description (UZ)"
              defaultValue={editing?.description_uz}
              className="border rounded-lg px-3 py-2 text-sm col-span-2 resize-none"
              rows={2}
            />
            <textarea
              name="description_ru"
              placeholder="Description (RU)"
              defaultValue={editing?.description_ru}
              className="border rounded-lg px-3 py-2 text-sm col-span-2 resize-none"
              rows={2}
            />
            <textarea
              name="description_en"
              placeholder="Description (EN)"
              defaultValue={editing?.description_en}
              className="border rounded-lg px-3 py-2 text-sm col-span-2 resize-none"
              rows={2}
            />
            <input
              name="goal_amount"
              type="number"
              placeholder="Goal (UZS)"
              defaultValue={editing?.goal_amount}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              name="deadline"
              type="datetime-local"
              defaultValue={editing?.deadline?.slice(0, 16)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaign list */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((c: any) => {
          const pct = c.goal_amount > 0 ? Math.min(100, (c.collected_amount / c.goal_amount) * 100) : 0
          return (
            <div key={c.id} className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{c.name_uz}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      c.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  {c.description_uz && (
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2">{c.description_uz}</p>
                  )}
                  {c.goal_amount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{c.collected_amount?.toLocaleString()} UZS raised</span>
                        <span>{c.goal_amount?.toLocaleString()} UZS goal</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">{pct.toFixed(1)}% funded • {c.donor_count ?? 0} donors</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)}
                    className="text-xs text-blue-600 hover:underline text-right"
                  >
                    {selectedCampaign?.id === c.id ? 'Hide' : 'Donations'}
                  </button>
                  {c.status === 'active' && (
                    <>
                      <button
                        onClick={() => { setEditing(c); setShowForm(false) }}
                        className="text-xs text-slate-600 hover:underline text-right"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => closeMut.mutate(c.id)}
                        className="text-xs text-red-600 hover:underline text-right"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Donations table */}
              {selectedCampaign?.id === c.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">Donations</h4>
                  {donations.length === 0 ? (
                    <p className="text-sm text-slate-400">No donations yet.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {['User', 'Amount', 'Type', 'Date'].map((h) => (
                            <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {donations.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">{d.user?.first_name ?? d.user_id}</td>
                            <td className="px-3 py-2 font-medium">{d.amount?.toLocaleString()} UZS</td>
                            <td className="px-3 py-2 text-slate-500">{d.donation_type}</td>
                            <td className="px-3 py-2 text-slate-400">
                              {new Date(d.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-10 text-center text-slate-400 text-sm">
            No campaigns yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  )
}
