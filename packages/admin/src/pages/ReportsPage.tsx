import { useState } from 'react'
import { toast } from 'sonner'
import { downloadExport } from '@/api'
import { downloadBlob } from '@/lib/utils'
import { densityClasses, useViewPreferences } from '@/hooks/useViewPreferences'
import { clsx } from 'clsx'
import {
  FileCheck, Users, Dice5, Gift, Heart, Download, Loader2,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'

/* ── Report definitions ─────────────────────────────────── */

interface ReportType {
  key: 'submissions' | 'users' | 'spins' | 'rewards' | 'charity'
  title: string
  description: string
  icon: React.ElementType
  accentBg: string
  accentText: string
  accentRing: string
}

const REPORTS: ReportType[] = [
  {
    key: 'submissions',
    title: 'Submissions Report',
    description: 'Export all review submissions with statuses, user info, and timestamps.',
    icon: FileCheck,
    accentBg: 'bg-violet-100 dark:bg-violet-500/15',
    accentText: 'text-violet-600 dark:text-violet-400',
    accentRing: 'ring-violet-200 dark:ring-violet-500/20',
  },
  {
    key: 'users',
    title: 'Users Report',
    description: 'Full user registry with registration date, language, and activity.',
    icon: Users,
    accentBg: 'bg-blue-100 dark:bg-blue-500/15',
    accentText: 'text-blue-600 dark:text-blue-400',
    accentRing: 'ring-blue-200 dark:ring-blue-500/20',
  },
  {
    key: 'spins',
    title: 'Spins Report',
    description: 'Prize wheel spin log with winners, prizes, and fair commitments.',
    icon: Dice5,
    accentBg: 'bg-amber-100 dark:bg-amber-500/15',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentRing: 'ring-amber-200 dark:ring-amber-500/20',
  },
  {
    key: 'rewards',
    title: 'Rewards Report',
    description: 'All rewards issued, redeemed, and pending across the platform.',
    icon: Gift,
    accentBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentRing: 'ring-emerald-200 dark:ring-emerald-500/20',
  },
  {
    key: 'charity',
    title: 'Charity Report',
    description: 'Donation records by campaign with user attribution and amounts.',
    icon: Heart,
    accentBg: 'bg-pink-100 dark:bg-pink-500/15',
    accentText: 'text-pink-600 dark:text-pink-400',
    accentRing: 'ring-pink-200 dark:ring-pink-500/20',
  },
]

/* ── Main Page ──────────────────────────────────────────── */

export default function ReportsPage() {
  const { density } = useViewPreferences()
  const dc = densityClasses[density]
  const [loading, setLoading] = useState<string | null>(null)

  function handleExport(key: string) {
    setLoading(key)
    downloadExport(key)
      .then((res) => {
        downloadBlob(res.data, `${key}_export.csv`)
        toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} report exported`)
      })
      .catch(() => toast.error('Export failed. Please try again.'))
      .finally(() => setLoading(null))
  }

  return (
    <div className={clsx('space-y-6', dc.spacing)}>
      <PageHeader
        title="Reports & Export"
        description="Download platform data as CSV reports"
      />

      <div className={clsx('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3', dc.gap)}>
        {REPORTS.map((report) => {
          const Icon = report.icon
          const isLoading = loading === report.key

          return (
            <DataCard key={report.key}>
              <div className="flex items-start gap-3">
                <div
                  className={clsx(
                    'flex items-center justify-center w-10 h-10 rounded-lg ring-1 shrink-0',
                    report.accentBg,
                    report.accentRing,
                  )}
                >
                  <Icon className={clsx('w-5 h-5', report.accentText)} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => handleExport(report.key)}
                  disabled={isLoading}
                  className={clsx(
                    'w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    'disabled:opacity-50',
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </DataCard>
          )
        })}
      </div>
    </div>
  )
}
