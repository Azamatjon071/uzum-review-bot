import { useState } from 'react'
import { toast } from 'sonner'
import { BarChart3, FileCheck, Users, Dice5, Gift, Heart, Download, Loader2, FileText } from 'lucide-react'
import { downloadExport } from '@/api'
import { downloadBlob } from '@/lib/utils'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'

/* ── Report type definitions ────────────────────────────────────────────── */

interface ReportDef {
  key: 'submissions' | 'users' | 'spins' | 'rewards' | 'charity'
  title: string
  description: string
  icon: React.ElementType
  /** Tailwind classes for the icon container background */
  iconBg: string
  /** Tailwind classes for the icon color */
  iconColor: string
  /** Tailwind classes for the top accent bar color */
  accentBar: string
  /** Tailwind classes for ring on icon container */
  iconRing: string
  /** Stats hint shown below description */
  hint: string
}

const REPORTS: ReportDef[] = [
  {
    key: 'submissions',
    title: 'Submissions Report',
    description:
      'Export all review submissions with approval statuses, user info, product details, and timestamps.',
    icon: FileCheck,
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    accentBar: 'bg-violet-500',
    iconRing: 'ring-violet-200 dark:ring-violet-500/25',
    hint: 'Includes pending, approved & rejected entries',
  },
  {
    key: 'users',
    title: 'Users Report',
    description:
      'Full user registry with registration dates, language preferences, Telegram IDs, and activity metrics.',
    icon: Users,
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accentBar: 'bg-blue-500',
    iconRing: 'ring-blue-200 dark:ring-blue-500/25',
    hint: 'Active, banned & new user breakdown',
  },
  {
    key: 'spins',
    title: 'Spins Report',
    description:
      'Prize wheel spin log with winners, prizes awarded, fair-play commitments, and spin timestamps.',
    icon: Dice5,
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accentBar: 'bg-amber-500',
    iconRing: 'ring-amber-200 dark:ring-amber-500/25',
    hint: 'Win rates & prize distribution data',
  },
  {
    key: 'rewards',
    title: 'Rewards Report',
    description:
      'All rewards issued, redeemed, and pending across the platform, with user attribution and amounts.',
    icon: Gift,
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accentBar: 'bg-emerald-500',
    iconRing: 'ring-emerald-200 dark:ring-emerald-500/25',
    hint: 'Redemption rates & total value exported',
  },
  {
    key: 'charity',
    title: 'Charity Report',
    description:
      'Donation records by campaign with user attribution, amounts donated, and campaign performance.',
    icon: Heart,
    iconBg: 'bg-pink-100 dark:bg-pink-500/15',
    iconColor: 'text-pink-600 dark:text-pink-400',
    accentBar: 'bg-pink-500',
    iconRing: 'ring-pink-200 dark:ring-pink-500/25',
    hint: 'Per-campaign totals & donor lists',
  },
]

/* ── Report Card ─────────────────────────────────────────────────────────── */

interface ReportCardProps {
  report: ReportDef
  isLoading: boolean
  onExport: () => void
}

function ReportCard({ report, isLoading, onExport }: ReportCardProps) {
  const Icon = report.icon

  return (
    <div
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-card',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden',
        'flex flex-col',
      )}
    >
      {/* Per-card accent top bar */}
      <div className={cn('h-[3px] w-full shrink-0', report.accentBar)} />

      <div className="p-5 flex flex-col flex-1">
        {/* Icon + title */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-xl ring-1 shrink-0',
              report.iconBg,
              report.iconRing,
            )}
          >
            <Icon className={cn('w-5 h-5', report.iconColor)} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {report.title}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {report.description}
            </p>
          </div>
        </div>

        {/* Hint row */}
        <div className="flex items-center gap-1.5 mb-4">
          <FileText className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <p className="text-[11px] text-muted-foreground/80 italic">{report.hint}</p>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="pt-4 border-t border-border mt-auto">
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading}
            className={cn(
              'w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl',
              'uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity',
              isLoading && 'opacity-70 cursor-not-allowed',
            )}
            aria-label={`Export ${report.title} as CSV`}
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
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function ReportsPage() {
  const { density } = useViewPreferences()
  const dc = densityClasses[density]

  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  function handleExport(key: string, title: string) {
    if (loadingKey) return // prevent concurrent exports
    setLoadingKey(key)
    downloadExport(key)
      .then((res) => {
        downloadBlob(res.data, `${key}_report_${new Date().toISOString().slice(0, 10)}.csv`)
        toast.success(`${title} exported successfully`)
      })
      .catch(() => toast.error(`Failed to export ${title}. Please try again.`))
      .finally(() => setLoadingKey(null))
  }

  return (
    <div className={cn('space-y-6', dc.spacing)}>
      <PageHeader
        title="Reports & Export"
        description="Download platform data as CSV reports"
        icon={<BarChart3 className="w-5 h-5 text-primary" />}
      />

      {/* Report grid */}
      <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3', dc.gap)}>
        {REPORTS.map((report) => (
          <ReportCard
            key={report.key}
            report={report}
            isLoading={loadingKey === report.key}
            onExport={() => handleExport(report.key, report.title)}
          />
        ))}
      </div>

      {/* Info note */}
      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Reports are generated in real-time from live data. Large datasets may take a few seconds to prepare.
      </p>
    </div>
  )
}
