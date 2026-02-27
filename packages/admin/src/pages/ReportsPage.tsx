import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { downloadExport } from '@/api'
import { downloadBlob } from '@/lib/utils'
import {
  FileText, Users, RefreshCw, Heart, Download, Clock, CheckCircle, ChevronRight,
} from 'lucide-react'

interface ExportCard {
  type: 'submissions' | 'users' | 'spins' | 'donations'
  label: string
  description: string
  icon: React.ElementType
  gradient: string
  iconBg: string
  lastExported?: string
  rowEstimate: string
}

const EXPORTS: ExportCard[] = [
  {
    type: 'submissions',
    label: 'Submissions',
    description: 'All review submissions with status, user info, order numbers and timestamps.',
    icon: FileText,
    gradient: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-400/30',
    lastExported: '2026-02-26T08:00:00Z',
    rowEstimate: '~19 rows',
  },
  {
    type: 'users',
    label: 'Users',
    description: 'Full user registry with registration date, language, ban status and submission counts.',
    icon: Users,
    gradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-400/30',
    lastExported: '2026-02-25T14:30:00Z',
    rowEstimate: '~11 rows',
  },
  {
    type: 'spins',
    label: 'Spin History',
    description: 'Prize wheel spin log — who won what, when, and provably fair HMAC commitments.',
    icon: RefreshCw,
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-400/30',
    lastExported: undefined,
    rowEstimate: '—',
  },
  {
    type: 'donations',
    label: 'Charity Donations',
    description: 'All sadaqa donations by campaign with user attribution and amounts.',
    icon: Heart,
    gradient: 'from-pink-500 to-rose-600',
    iconBg: 'bg-pink-400/30',
    lastExported: '2026-02-24T10:00:00Z',
    rowEstimate: '~5 rows',
  },
]

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [exported, setExported] = useState<Record<string, string>>({})

  const mutate = (type: string) => {
    setDownloading(type)
    downloadExport(type)
      .then((res) => {
        downloadBlob(res.data, `${type}_export.csv`)
        toast.success(`${type} export downloaded`)
        setExported((e) => ({ ...e, [type]: new Date().toISOString() }))
      })
      .catch(() => toast.error('Export failed'))
      .finally(() => setDownloading(null))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Reports & Exports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Download platform data as CSV files for analysis</p>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map((ex) => {
          const Icon = ex.icon
          const isLoading = downloading === ex.type
          const lastTs = exported[ex.type] ?? ex.lastExported

          return (
            <div
              key={ex.type}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Card header */}
              <div className={`bg-gradient-to-br ${ex.gradient} p-5 relative overflow-hidden`}>
                <div className={`w-10 h-10 rounded-xl ${ex.iconBg} flex items-center justify-center mb-3`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-white font-bold text-base leading-tight">{ex.label}</h3>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">{ex.description}</p>
                {/* decorative blob */}
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
              </div>

              {/* Card footer */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={11} className="text-slate-400" />
                    <span>{ex.rowEstimate}</span>
                  </div>
                  {lastTs ? (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle size={11} />
                      <span>Last: {new Date(lastTs).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={11} />
                      <span>Never exported</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => mutate(ex.type)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                    bg-gradient-to-r ${ex.gradient} text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-100 disabled:opacity-60 disabled:scale-100`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
          <ChevronRight size={18} className="text-slate-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 text-sm">About Exports</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Exports are generated in real time and include all data up to the moment of download.
            Files contain up to 50,000 rows. For larger datasets, contact the system administrator
            to configure a scheduled export job.
          </p>
        </div>
      </div>
    </div>
  )
}
