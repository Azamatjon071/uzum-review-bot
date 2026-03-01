import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import {
  Save, Loader2, Settings, Palette, RotateCcw,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'
import ThemeToggle from '@/components/ui/ThemeToggle'
import DensityToggle from '@/components/ui/DensityToggle'

/* ── Types ──────────────────────────────────────────────── */

interface Setting {
  key: string
  value: string
  description?: string
  updated_at?: string
}

/* ── Value type detection ───────────────────────────────── */

function detectType(value: string): 'boolean' | 'number' | 'json' | 'string' {
  if (value === 'true' || value === 'false') return 'boolean'
  if (/^-?\d+(\.\d+)?$/.test(value) && value.length < 20) return 'number'
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      JSON.parse(value)
      return 'json'
    } catch {
      return 'string'
    }
  }
  return 'string'
}

/* ── Toggle switch ──────────────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

/* ── Setting row ────────────────────────────────────────── */

function SettingRow({
  setting,
  value,
  onChange,
  isDirty,
}: {
  setting: Setting
  value: string
  onChange: (v: string) => void
  isDirty: boolean
}) {
  const type = detectType(setting.value)
  const prettyKey = setting.key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-3.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{prettyKey}</p>
          {isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
          )}
        </div>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</p>
        )}
        <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{setting.key}</p>
      </div>

      <div className="shrink-0 sm:ml-4">
        {type === 'boolean' ? (
          <ToggleSwitch
            checked={value === 'true'}
            onChange={(v) => onChange(v ? 'true' : 'false')}
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-36 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-right text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
          />
        ) : type === 'json' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full sm:w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full sm:w-44 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
          />
        )}
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────── */

export default function SettingsPage() {
  const qc = useQueryClient()
  const { density } = useViewPreferences()
  const dc = densityClasses[density]

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((r) => r.data),
  })

  const [form, setForm] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})

  useEffect(() => {
    if (data?.settings) {
      const flat: Record<string, string> = {}
      for (const s of data.settings) flat[s.key] = s.value
      setForm(flat)
      setOriginal(flat)
    }
  }, [data])

  const dirtyKeys = Object.keys(form).filter((k) => form[k] !== original[k])
  const hasDirty = dirtyKeys.length > 0

  function handleChange(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function handleReset() {
    setForm(original)
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const changes = dirtyKeys.map((key) => ({ key, value: form[key] }))
      return updateSettings({ settings: changes })
    },
    onSuccess: () => {
      toast.success('Settings saved')
      setOriginal({ ...form })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const settings: Setting[] = data?.settings ?? []

  /* ── Loading skeleton ─────────────────────────────────── */

  function renderSkeleton() {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <DataCard key={i}>
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 rounded bg-muted" />
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="flex items-center justify-between py-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-40 rounded bg-muted" />
                    <div className="h-3 w-56 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-36 rounded bg-muted" />
                </div>
              ))}
            </div>
          </DataCard>
        ))}
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6 max-w-3xl', dc.spacing)}>
      <PageHeader
        title="Settings"
        actions={
          hasDirty ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-warning font-medium">
                {dirtyKeys.length} unsaved change{dirtyKeys.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground bg-background hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saveMut.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Changes
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ── Display / Preferences ───────────────────────── */}
      <DataCard>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Display Preferences</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">Choose light, dark, or system theme</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Density</p>
              <p className="text-xs text-muted-foreground">Adjust the spacing and padding of UI elements</p>
            </div>
            <DensityToggle
              current={density}
              onChange={useViewPreferences.getState().setDensity}
            />
          </div>
        </div>
      </DataCard>

      {/* ── Platform Settings ───────────────────────────── */}
      {isLoading ? (
        renderSkeleton()
      ) : settings.length === 0 ? (
        <DataCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
              <Settings className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No settings configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Settings will appear here once the platform is configured.
            </p>
          </div>
        </DataCard>
      ) : (
        <DataCard>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Platform Settings</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {settings.length} setting{settings.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-2">
            {settings.map((s) => (
              <SettingRow
                key={s.key}
                setting={s}
                value={form[s.key] ?? ''}
                onChange={(v) => handleChange(s.key, v)}
                isDirty={form[s.key] !== original[s.key]}
              />
            ))}
          </div>
        </DataCard>
      )}
    </div>
  )
}
