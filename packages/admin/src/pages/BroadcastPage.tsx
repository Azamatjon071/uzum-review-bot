import { useState, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Send, Clock, Megaphone, AlertCircle, CalendarClock,
  MessageSquare, Loader2, Users, CheckCircle2, XCircle, Info,
} from 'lucide-react'
import { sendBroadcast } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'
import StatusBadge from '@/components/ui/StatusBadge'
import EmptyState from '@/components/ui/EmptyState'
import ViewToggle from '@/components/ui/ViewToggle'

/* ── Types ──────────────────────────────────────────────────────────────── */

interface BroadcastEntry {
  id: number
  message: string
  target: string
  status: 'sent' | 'scheduled' | 'failed'
  scheduled_at?: string
  sent_at: string
  recipient_count?: number
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const MAX_LEN = 4096
const WARN_THRESHOLD = 200

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'active', label: 'Active Users' },
  { value: 'new', label: 'New Users (last 7 days)' },
]

const STATUS_MAP: Record<BroadcastEntry['status'], 'success' | 'info' | 'error'> = {
  sent: 'success',
  scheduled: 'info',
  failed: 'error',
}

const STATUS_ICON: Record<BroadcastEntry['status'], React.ElementType> = {
  sent: CheckCircle2,
  scheduled: Info,
  failed: XCircle,
}

/* ── Input / label class constants ─────────────────────────────────────── */

const INPUT_CLS =
  'w-full px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'

const LABEL_CLS = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5'

/* ── Telegram-style preview bubble ─────────────────────────────────────── */

function PreviewBubble({ message }: { message: string }) {
  const now = format(new Date(), 'HH:mm')

  if (!message.trim()) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground italic select-none">
        Message preview will appear here...
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="relative max-w-[88%] rounded-2xl rounded-tl-sm bg-primary/10 dark:bg-primary/15 border border-primary/15 px-4 py-3 shadow-sm">
        {/* Bubble tail */}
        <div className="absolute -left-[6px] top-2 w-3 h-3 overflow-hidden">
          <div className="absolute top-0 left-0 w-4 h-4 rounded-br-full bg-primary/10 dark:bg-primary/15 border-b border-r border-primary/15" />
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {message}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-right select-none">
          {now}
        </p>
      </div>
    </div>
  )
}

/* ── Toggle switch component ────────────────────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'uzum-gradient' : 'bg-muted-foreground/25',
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

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function BroadcastPage() {
  const { getView, setView, density } = useViewPreferences()
  const historyView = getView('broadcast-history', 'table')
  const dc = densityClasses[density]

  /* ── Compose state ── */
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ── History (client-side only — no GET endpoint) ── */
  const [history, setHistory] = useState<BroadcastEntry[]>([])

  const remaining = MAX_LEN - message.length
  const isOverLimit = remaining < 0
  const isNearLimit = remaining >= 0 && remaining < WARN_THRESHOLD

  const minSchedule = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)

  /* ── Send mutation ── */
  const mut = useMutation({
    mutationFn: () =>
      sendBroadcast(
        message,
        undefined,
        null,
        scheduleEnabled && scheduledAt ? scheduledAt : undefined,
      ),
    onSuccess: (res) => {
      const queued: number = res.data?.queued ?? 0
      const isScheduled = scheduleEnabled && !!scheduledAt

      toast.success(
        isScheduled
          ? `Broadcast scheduled for ${format(new Date(scheduledAt), 'MMM d, HH:mm')}`
          : `Broadcast sent to ${queued.toLocaleString()} users`,
      )

      const entry: BroadcastEntry = {
        id: Date.now(),
        message,
        target,
        status: isScheduled ? 'scheduled' : 'sent',
        scheduled_at: isScheduled ? scheduledAt : undefined,
        sent_at: new Date().toISOString(),
        recipient_count: queued,
      }

      setHistory((prev) => [entry, ...prev])
      setMessage('')
      setScheduleEnabled(false)
      setScheduledAt('')
    },
    onError: () => toast.error('Broadcast failed. Please try again.'),
  })

  const canSend = message.trim().length > 0 && !isOverLimit && !mut.isPending
  const handleSend = useCallback(() => {
    if (!canSend) return
    mut.mutate()
  }, [canSend, mut])

  /* ── History: table view ── */
  function renderHistoryTable() {
    return (
      <DataCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={cn('w-full min-w-[420px]', dc.text)}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Message', 'Target', 'Status', 'Date', 'Rcpts'].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider',
                      dc.padding,
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => {
                const Icon = STATUS_ICON[h.status]
                return (
                  <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                    <td className={cn(dc.padding, 'max-w-[160px]')}>
                      <p className="text-foreground text-xs truncate" title={h.message}>
                        {h.message}
                      </p>
                    </td>
                    <td className={cn(dc.padding)}>
                      <span className="text-xs text-muted-foreground capitalize">{h.target}</span>
                    </td>
                    <td className={cn(dc.padding)}>
                      <StatusBadge variant={STATUS_MAP[h.status]} dot>
                        {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                      </StatusBadge>
                    </td>
                    <td className={cn(dc.padding, 'text-muted-foreground text-xs whitespace-nowrap')}>
                      {formatDistanceToNow(new Date(h.sent_at), { addSuffix: true })}
                    </td>
                    <td className={cn(dc.padding)}>
                      {h.recipient_count != null ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {h.recipient_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </DataCard>
    )
  }

  /* ── History: card view ── */
  function renderHistoryCards() {
    return (
      <div className={cn('grid grid-cols-1 animate-fade-in', dc.gap)}>
        {history.map((h) => {
          const Icon = STATUS_ICON[h.status]
          return (
            <DataCard key={h.id} className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
              {/* Status + date row */}
              <div className="flex items-center justify-between mb-2.5">
                <StatusBadge variant={STATUS_MAP[h.status]} dot>
                  {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                </StatusBadge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(h.sent_at), { addSuffix: true })}
                </span>
              </div>

              {/* Message excerpt */}
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{h.message}</p>

              {/* Footer */}
              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="capitalize">
                  Target: <span className="text-foreground/70">{h.target}</span>
                </span>
                {h.recipient_count != null && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {h.recipient_count.toLocaleString()} recipients
                  </span>
                )}
              </div>
            </DataCard>
          )
        })}
      </div>
    )
  }

  /* ── Render ── */

  return (
    <div className={cn('space-y-6', dc.spacing)}>
      <PageHeader
        title="Broadcast"
        description="Send messages to all or targeted users"
        icon={<Megaphone className="w-5 h-5 text-primary" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Compose section (3 cols) ──────────────────────────────────── */}
        <div className="lg:col-span-3">
          <DataCard padding="none" className="overflow-hidden">
            {/* Gradient top bar */}
            <div className="h-[3px] w-full uzum-gradient" />

            <div className="p-5 space-y-5">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl uzum-gradient shrink-0">
                  <Megaphone className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground leading-tight">
                    Compose Message
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Write your broadcast, choose audience & schedule
                  </p>
                </div>
              </div>

              {/* Message textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="bc-message" className={LABEL_CLS}>
                    Message
                  </label>
                  <span
                    className={cn(
                      'text-[11px] font-mono tabular-nums transition-colors',
                      isOverLimit
                        ? 'text-destructive font-semibold'
                        : isNearLimit
                          ? 'text-amber-500 dark:text-amber-400'
                          : 'text-muted-foreground',
                    )}
                  >
                    {remaining.toLocaleString()} / {MAX_LEN.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="bc-message"
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={7}
                  placeholder="Write your broadcast message here..."
                  className={cn(
                    'w-full px-3.5 py-2.5 text-sm rounded-xl border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 transition-all',
                    isOverLimit
                      ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
                      : 'border-input focus:ring-primary/30 focus:border-primary/50',
                  )}
                />
                {isOverLimit && (
                  <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Message exceeds the {MAX_LEN.toLocaleString()} character limit
                  </p>
                )}
                {isNearLimit && !isOverLimit && (
                  <p className="mt-1.5 text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Approaching character limit
                  </p>
                )}
              </div>

              {/* Target audience */}
              <div>
                <label htmlFor="bc-target" className={LABEL_CLS}>
                  Target Audience
                </label>
                <select
                  id="bc-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={INPUT_CLS}
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule toggle */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CalendarClock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        Schedule Delivery
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Send at a specific date and time
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={scheduleEnabled}
                    onChange={(v) => {
                      setScheduleEnabled(v)
                      if (!v) setScheduledAt('')
                    }}
                    label="Toggle schedule"
                  />
                </div>

                {scheduleEnabled && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <label htmlFor="bc-schedule" className={LABEL_CLS}>
                      Scheduled Date &amp; Time
                    </label>
                    <input
                      id="bc-schedule"
                      type="datetime-local"
                      value={scheduledAt}
                      min={minSchedule}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className={INPUT_CLS}
                    />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Must be at least 5 minutes from now.
                    </p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <p className={LABEL_CLS}>Message Preview</p>
                <div className="rounded-xl border border-border bg-muted/20 p-4 min-h-[100px]">
                  <PreviewBubble message={message} />
                </div>
              </div>

              {/* Send / Schedule button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity',
                  !canSend && 'opacity-50 cursor-not-allowed',
                )}
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
            </div>
          </DataCard>
        </div>

        {/* ── History section (2 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* History header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Broadcast History</h2>
              {history.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {history.length}
                </span>
              )}
            </div>
            {history.length > 0 && (
              <ViewToggle
                current={historyView}
                onChange={(m) => setView('broadcast-history', m)}
                options={['table', 'card']}
              />
            )}
          </div>

          {/* History content */}
          {history.length === 0 ? (
            <DataCard className="flex-1">
              <EmptyState
                icon={<MessageSquare className="w-6 h-6 text-muted-foreground/60" />}
                title="No broadcasts yet"
                description="Broadcasts you send will appear here with their delivery status."
                compact
              />
            </DataCard>
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
