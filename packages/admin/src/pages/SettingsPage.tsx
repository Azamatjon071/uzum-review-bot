import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/api'
import { useViewPreferences, densityClasses } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'
import {
  Save, Loader2, Settings, Palette, RotateCcw,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'
import ThemeToggle from '@/components/ui/ThemeToggle'
import DensityToggle from '@/components/ui/DensityToggle'

/* ── Types ──────────────────────────────────────────────────────────────────── */

interface Setting {
  key: string
  value: string
  description?: string
  updated_at?: string
}

/* ── Value type detection ───────────────────────────────────────────────────── */

type SettingType = 'boolean' | 'number' | 'json' | 'string'

function detectType(value: string): SettingType {
  if (value === 'true' || value === 'false') return 'boolean'
  if (/^-?\d+(\.\d+)?$/.test(value) && value.length < 20) return 'number'
  if (
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']'))
  ) {
    try {
      JSON.parse(value)
      return 'json'
    } catch {
      return 'string'
    }
  }
  return 'string'
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\./g, ' › ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ── Toggle switch ──────────────────────────────────────────────────────────── */

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
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
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

/* ── Setting input by type ──────────────────────────────────────────────────── */

function SettingInput({
  type,
  value,
  onChange,
}: {
  type: SettingType
  value: string
  onChange: (v: string) => void
}) {
  if (type === 'boolean') {
    return (
      <ToggleSwitch
        checked={value === 'true'}
        onChange={(v) => onChange(v ? 'true' : 'false')}
      />
    )
  }

  if (type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-36 px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground',
          'text-right placeholder:text-muted-foreground focus:outline-none focus:ring-2',
          'focus:ring-primary/30 focus:border-primary/50 transition-all',
        )}
      />
    )
  }

  if (type === 'json') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        spellCheck={false}
        className={cn(
          'w-full sm:w-64 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-input bg-background text-foreground',
          'placeholder:text-muted-foreground focus:outline-none focus:ring-2',
          'focus:ring-primary/30 focus:border-primary/50 transition-all resize-y',
        )}
      />
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full sm:w-48 px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground',
        'placeholder:text-muted-foreground focus:outline-none focus:ring-2',
        'focus:ring-primary/30 focus:border-primary/50 transition-all',
      )}
    />
  )
}

/* ── Setting row ────────────────────────────────────────────────────────────── */

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
  const prettyKey = humanizeKey(setting.key)

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{prettyKey}</p>
          {isDirty && (
            <span
              title="Unsaved change"
              className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0"
            />
          )}
        </div>
        {setting.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {setting.description}
          </p>
        )}
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5 select-all">
          {setting.key}
        </p>
      </div>

      <div className={cn('shrink-0 sm:ml-4', type === 'boolean' && 'flex items-center pt-0.5')}>
        <SettingInput type={type} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

/* ── Loading skeleton ───────────────────────────────────────────────────────── */

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <DataCard key={i}>
          <div className="animate-pulse space-y-1 mb-5">
            <div className="h-4 w-36 rounded-lg bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="space-y-0 divide-y divide-border/50">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="flex items-center justify-between py-4">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-muted" />
                  <div className="h-3 w-60 rounded bg-muted" />
                  <div className="h-2.5 w-28 rounded bg-muted/60" />
                </div>
                <div className="h-9 w-36 rounded-xl bg-muted" />
              </div>
            ))}
          </div>
        </DataCard>
      ))}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const qc = useQueryClient()
  const { density, setDensity } = useViewPreferences()
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
      for (const s of data.settings as Setting[]) flat[s.key] = s.value
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
    setForm({ ...original })
  }

  const saveMut = useMutation({
    mutationFn: () => {
      const changes = dirtyKeys.map((key) => ({ key, value: form[key] }))
      return updateSettings({ settings: changes })
    },
    onSuccess: () => {
      toast.success('Settings saved successfully')
      setOriginal({ ...form })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const settings: Setting[] = data?.settings ?? []

  return (
    <div className={cn('space-y-6 max-w-3xl', dc.spacing)}>
      <PageHeader
        title="Settings"
        description="Configure platform settings"
        icon={<Settings className="w-5 h-5 text-primary" />}
        actions={
          hasDirty ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs font-medium text-amber-600 dark:text-amber-400">
                {dirtyKeys.length} unsaved change{dirtyKeys.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
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

      {/* ── Display Preferences ─────────────────────────────────────────────── */}
      <DataCard>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Display Preferences</h2>
            <p className="text-xs text-muted-foreground">Appearance and layout settings</p>
          </div>
        </div>

        <div className="space-y-0 divide-y divide-border/50">
          {/* Theme row */}
          <div className="flex items-center justify-between py-4 first:pt-0">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose light, dark, or system-matched theme
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Density row */}
          <div className="flex items-center justify-between py-4 last:pb-0">
            <div>
              <p className="text-sm font-medium text-foreground">Density</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adjust spacing and padding of UI elements
              </p>
            </div>
            <DensityToggle current={density} onChange={setDensity} />
          </div>
        </div>
      </DataCard>

      {/* ── Platform Settings ────────────────────────────────────────────────── */}
      {isLoading ? (
        <SettingsSkeleton />
      ) : settings.length === 0 ? (
        <DataCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-4">
              <Settings className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">No settings configured</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
              Platform settings will appear here once the backend is configured.
            </p>
          </div>
        </DataCard>
      ) : (
        <DataCard>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Platform Settings</h2>
              <p className="text-xs text-muted-foreground">
                {settings.length} setting{settings.length !== 1 ? 's' : ''}
                {hasDirty && (
                  <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    · {dirtyKeys.length} unsaved
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3">
            {settings.map((s) => (
              <SettingRow
                key={s.key}
                setting={s}
                value={form[s.key] ?? s.value}
                onChange={(v) => handleChange(s.key, v)}
                isDirty={form[s.key] !== original[s.key]}
              />
            ))}
          </div>

          {/* Sticky save bar when dirty */}
          {hasDirty && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between gap-3 animate-fade-in">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {dirtyKeys.length} unsaved change{dirtyKeys.length !== 1 ? 's' : ''}
                </span>
                {' '}— changes will be lost if you leave this page.
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saveMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </DataCard>
      )}
    </div>
  )
}
