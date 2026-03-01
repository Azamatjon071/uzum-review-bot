import { useState, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sendBroadcast } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { clsx } from 'clsx'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Send, Clock, Megaphone, AlertCircle, CalendarClock, MessageSquare, Loader2, Users,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import ViewToggle from '@/components/ui/ViewToggle'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'

/* ── Types ──────────────────────────────────────────────── */

interface BroadcastEntry {
  id: number
  message: string
  target: string
  status: 'sent' | 'scheduled' | 'failed'
  scheduled_at?: string
  sent_at: string
  recipient_count?: number
}

const MAX_LEN = 4096
const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active Users' },
  { value: 'new', label: 'New Users' },
]

const STATUS_MAP: Record<string, 'success' | 'info' | 'error'> = {
  sent: 'success',
  scheduled: 'info',
  failed: 'error',
}

/* ── Preview bubble ─────────────────────────────────────── */

function PreviewBubble({ message }: { message: string }) {
  if (!message.trim()) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground italic">
        Message preview will appear here...
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-primary/10 dark:bg-primary/20 px-4 py-3 max-w-[85%]">
      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
        {message}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
        {format(new Date(), 'HH:mm')}
      </p>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────── */

export default function BroadcastPage() {
  const { getView, setView, density } = useViewPreferences()
  const historyView = getView('broadcast-history', 'table')
  const dc = densityClasses[density]

  /* ── Compose state ───────────────────────────────────── */
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ── History (client-side, no GET endpoint) ──────────── */
  const [history, setHistory] = useState<BroadcastEntry[]>([])

  const remaining = MAX_LEN - message.length
  const isOverLimit = remaining < 0

  const minSchedule = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)

  const mut = useMutation({
    mutationFn: () =>
      sendBroadcast(
        message,
        undefined,
        null,
        scheduleEnabled && scheduledAt ? scheduledAt : undefined,
      ),
    onSuccess: (res) => {
      const queued = res.data?.queued ?? 0
      const isScheduled = scheduleEnabled && !!scheduledAt
      toast.success(isScheduled ? 'Broadcast scheduled' : `Broadcast sent to ${queued} users`)
      const entry: BroadcastEntry = {
        id: Date.now(),
        message,
        target,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduled_at: isScheduled ? scheduledAt : undefined,
        sent_at: new Date().toISOString(),
        recipient_count: queued,
      }
      setHistory((h) => [entry, ...h])
      setMessage('')
      setScheduleEnabled(false)
      setScheduledAt('')
    },
    onError: () => toast.error('Broadcast failed'),
  })

  const handleSend = useCallback(() => {
    if (!message.trim() || isOverLimit || mut.isPending) return
    mut.mutate()
  }, [message, isOverLimit, mut])

  /* ── History table view ──────────────────────────────── */

  function renderHistoryTable() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={clsx('w-full min-w-[600px]', dc.text)}>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Message', 'Target', 'Status', 'Date', 'Recipients'].map((h) => (
                  <th key={h} className={clsx('text-left font-medium text-muted-foreground', dc.padding)}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                  <td className={clsx(dc.padding, 'max-w-[200px]')}>
                    <p className="text-foreground truncate">{h.message}</p>
                  </td>
                  <td className={clsx(dc.padding, 'text-muted-foreground capitalize')}>
                    {h.target}
                  </td>
                  <td className={dc.padding}>
                    <StatusBadge variant={STATUS_MAP[h.status]} dot>
                      {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                    </StatusBadge>
                  </td>
                  <td className={clsx(dc.padding, 'text-muted-foreground text-xs whitespace-nowrap')}>
                    {formatDistanceToNow(new Date(h.sent_at), { addSuffix: true })}
                  </td>
                  <td className={clsx(dc.padding, 'text-muted-foreground')}>
                    {h.recipient_count?.toLocaleString() ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    )
  }

  /* ── History card view ───────────────────────────────── */

  function renderHistoryCards() {
    return (
      <div className={clsx('grid grid-cols-1 md:grid-cols-2', dc.gap)}>
        {history.map((h) => (
          <DataCard key={h.id}>
            <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{h.message}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusBadge variant={STATUS_MAP[h.status]} dot>
                {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
              </StatusBadge>
              <span className="text-xs text-muted-foreground capitalize">{h.target}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(h.sent_at), { addSuffix: true })}</span>
              {h.recipient_count != null && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {h.recipient_count.toLocaleString()}
                </span>
              )}
            </div>
          </DataCard>
        ))}
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6', dc.spacing)}>
      <PageHeader
        title="Broadcast"
        description="Send messages to users"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Compose section (3 cols) ──────────────────── */}
        <div className="lg:col-span-3">
          <DataCard>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Megaphone className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Compose Message</h2>
            </div>

            {/* Message textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Message
                </label>
                <span
                  className={clsx(
                    'text-xs font-mono',
                    isOverLimit
                      ? 'text-destructive'
                      : remaining < 200
                        ? 'text-warning'
                        : 'text-muted-foreground',
                  )}
                >
                  {remaining.toLocaleString()} / {MAX_LEN.toLocaleString()}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Write your broadcast message..."
                className={clsx(
                  'w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 transition-colors',
                  isOverLimit
                    ? 'border-destructive focus:ring-destructive/30'
                    : 'border-input focus:ring-ring/30 focus:border-ring',
                )}
              />
              {isOverLimit && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Message exceeds maximum length
                </p>
              )}
            </div>

            {/* Target audience */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target Audience
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
              >
                {TARGET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Schedule */}
            <div className="mt-4">
              <DataCard padding="sm" className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Schedule</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleEnabled((v) => !v)
                      if (scheduleEnabled) setScheduledAt('')
                    }}
                    className={clsx(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      scheduleEnabled ? 'bg-primary' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: scheduleEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>
                {scheduleEnabled && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={minSchedule}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    />
                  </div>
                )}
              </DataCard>
            </div>

            {/* Preview */}
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preview
              </label>
              <div className="rounded-lg border border-border bg-muted/30 p-4 min-h-[80px]">
                <PreviewBubble message={message} />
              </div>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!message.trim() || isOverLimit || mut.isPending}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : scheduleEnabled && scheduledAt ? (
                <>
                  <CalendarClock className="w-4 h-4" />
                  Schedule Broadcast
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Broadcast
                </>
              )}
            </button>
          </DataCard>
        </div>

        {/* ── History section (2 cols) ─────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">History</h2>
              <span className="text-xs text-muted-foreground">{history.length}</span>
            </div>
            <ViewToggle
              current={historyView}
              onChange={(m) => setView('broadcast-history', m)}
              options={['table', 'card']}
            />
          </div>

          {history.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-6 h-6 text-muted-foreground" />}
              title="No broadcasts yet"
              description="Sent broadcasts will appear here."
            />
          ) : historyView === 'table' ? (
            renderHistoryTable()
          ) : (
            renderHistoryCards()
          )}
        </div>
      </div>
    </div>
  )
}
