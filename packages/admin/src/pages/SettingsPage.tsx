import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/api'
import { useViewPreferences } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'
import {
  Save, Loader2, Settings, Palette, RotateCcw,
  Dices, Bell, Shield, Plug, Globe,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import DataCard from '@/components/ui/DataCard'
import ThemeToggle from '@/components/ui/ThemeToggle'
import DensityToggle from '@/components/ui/DensityToggle'

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Setting {
  key: string
  value: string
  description?: string
}

type SettingType = 'boolean' | 'number' | 'json' | 'string'

function detectType(value: string): SettingType {
  if (value === 'true' || value === 'false') return 'boolean'
  if (/^-?\d+(\.\d+)?$/.test(value) && value.length < 20) return 'number'
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try { JSON.parse(value); return 'json' } catch { return 'string' }
  }
  return 'string'
}

function humanizeKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\./g, ' › ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ── Tab definition ─────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'general',      label: 'General',       icon: Globe,    keyPrefix: [] as string[] },
  { id: 'spin',         label: 'Spin Config',   icon: Dices,    keyPrefix: ['spin'] },
  { id: 'notifications',label: 'Notifications', icon: Bell,     keyPrefix: ['notif', 'notify', 'notification'] },
  { id: 'security',     label: 'Security',      icon: Shield,   keyPrefix: ['auth', 'jwt', 'totp', 'security', 'session'] },
  { id: 'integrations', label: 'Integrations',  icon: Plug,     keyPrefix: ['telegram', 'webhook', 'api', 'integration'] },
] as const

type TabId = typeof TABS[number]['id']

function classifyKey(key: string): TabId {
  const lower = key.toLowerCase()
  for (const tab of TABS) {
    if (tab.id === 'general') continue
    if (tab.keyPrefix.some((p) => lower.includes(p))) return tab.id
  }
  return 'general'
}

/* ── Primitive inputs ───────────────────────────────────────────────────────── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
      )} />
    </button>
  )
}

function SettingInput({ type, value, onChange }: { type: SettingType; value: string; onChange: (v: string) => void }) {
  const base = 'px-3.5 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all'
  if (type === 'boolean') return <ToggleSwitch checked={value === 'true'} onChange={(v) => onChange(v ? 'true' : 'false')} />
  if (type === 'number') return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={cn(base, 'w-36 text-right')} />
  if (type === 'json') return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} spellCheck={false} className={cn(base, 'w-full sm:w-64 text-xs font-mono resize-y')} />
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cn(base, 'w-full sm:w-48')} />
}

/* ── Single setting row ─────────────────────────────────────────────────────── */

function SettingRow({ setting, value, onChange, isDirty }: {
  setting: Setting; value: string; onChange: (v: string) => void; isDirty: boolean
}) {
  const type = detectType(setting.value)
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{humanizeKey(setting.key)}</p>
          {isDirty && <span title="Unsaved change" className="w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />}
        </div>
        {setting.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{setting.description}</p>}
        <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5 select-all">{setting.key}</p>
      </div>
      <div className={cn('shrink-0 sm:ml-4', type === 'boolean' && 'flex items-center pt-0.5')}>
        <SettingInput type={type} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

/* ── Tab button ─────────────────────────────────────────────────────────────── */

function TabButton({ tab, active, dirtyCount, onClick }: {
  tab: typeof TABS[number]; active: boolean; dirtyCount: number; onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap transition-all',
        active
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {tab.label}
      {dirtyCount > 0 && (
        <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1">
          {dirtyCount}
        </span>
      )}
    </button>
  )
}

/* ── Save bar ───────────────────────────────────────────────────────────────── */

function SaveBar({ dirtyCount, onReset, onSave, isPending }: {
  dirtyCount: number; onReset: () => void; onSave: () => void; isPending: boolean
}) {
  if (dirtyCount === 0) return null
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 animate-fade-in">
      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
        {dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''} — will be lost if you leave.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onReset} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button onClick={onSave} disabled={isPending} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
      </div>
    </div>
  )
}

/* ── Skeleton ───────────────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <DataCard>
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border/50">
            <div className="space-y-1.5">
              <div className="h-3.5 w-40 rounded bg-muted" />
              <div className="h-3 w-60 rounded bg-muted" />
            </div>
            <div className="h-9 w-36 rounded-xl bg-muted" />
          </div>
        ))}
      </div>
    </DataCard>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const qc = useQueryClient()
  const { density, setDensity } = useViewPreferences()
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [form, setForm] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSettings().then((r) => r.data),
  })

  useEffect(() => {
    if (data?.settings) {
      const flat: Record<string, string> = {}
      for (const s of data.settings as Setting[]) flat[s.key] = s.value
      setForm(flat)
      setOriginal(flat)
    }
  }, [data])

  const allSettings: Setting[] = data?.settings ?? []
  const dirtyKeys = Object.keys(form).filter((k) => form[k] !== original[k])
  const hasDirty = dirtyKeys.length > 0

  const saveMut = useMutation({
    mutationFn: () => updateSettings({ settings: dirtyKeys.map((key) => ({ key, value: form[key] })) }),
    onSuccess: () => { toast.success('Settings saved'); setOriginal({ ...form }); qc.invalidateQueries({ queryKey: ['settings'] }) },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleChange = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))
  const handleReset = () => setForm({ ...original })

  // Partition settings by tab
  const byTab: Record<TabId, Setting[]> = { general: [], spin: [], notifications: [], security: [], integrations: [] }
  for (const s of allSettings) byTab[classifyKey(s.key)].push(s)

  const tabDirty = (id: TabId) => (byTab[id] ?? []).filter((s) => form[s.key] !== original[s.key]).length
  const activeSettings = byTab[activeTab] ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="Configure platform settings"
        icon={<Settings className="w-5 h-5 text-primary" />}
        actions={hasDirty ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs font-medium text-amber-600 dark:text-amber-400">
              {dirtyKeys.length} unsaved
            </span>
            <button onClick={handleReset} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl uzum-gradient text-white shadow-sm hover:opacity-90 disabled:opacity-60">
              {saveMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        ) : undefined}
      />

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {TABS.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            dirtyCount={tabDirty(tab.id)}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* ── General tab: display preferences + backend general settings ── */}
      {activeTab === 'general' && (
        <>
          <DataCard>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Display Preferences</h2>
                <p className="text-xs text-muted-foreground">Appearance and layout settings (local only)</p>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              <div className="flex items-center justify-between py-4 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Light, dark, or system-matched</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between py-4 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">Density</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adjust UI spacing and padding</p>
                </div>
                <DensityToggle current={density} onChange={setDensity} />
              </div>
            </div>
          </DataCard>

          {isLoading ? <Skeleton /> : activeSettings.length > 0 && (
            <DataCard>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">General Platform Settings</h2>
                  <p className="text-xs text-muted-foreground">{activeSettings.length} setting{activeSettings.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="mt-3">
                {activeSettings.map((s) => (
                  <SettingRow key={s.key} setting={s} value={form[s.key] ?? s.value} onChange={(v) => handleChange(s.key, v)} isDirty={form[s.key] !== original[s.key]} />
                ))}
              </div>
            </DataCard>
          )}
        </>
      )}

      {/* ── Other tabs: render grouped settings ── */}
      {activeTab !== 'general' && (
        isLoading ? <Skeleton /> : activeSettings.length === 0 ? (
          <DataCard>
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-4">
                {(() => { const T = TABS.find((t) => t.id === activeTab)!; return <T.icon className="w-6 h-6 text-muted-foreground/60" /> })()}
              </div>
              <p className="text-sm font-semibold text-foreground">No settings in this category</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Settings prefixed with <code className="font-mono bg-muted px-1 rounded">{activeTab}</code> will appear here.
              </p>
            </div>
          </DataCard>
        ) : (
          <DataCard>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                {(() => { const T = TABS.find((t) => t.id === activeTab)!; return <T.icon className="w-4 h-4 text-primary" /> })()}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{TABS.find((t) => t.id === activeTab)?.label} Settings</h2>
                <p className="text-xs text-muted-foreground">{activeSettings.length} setting{activeSettings.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="mt-3">
              {activeSettings.map((s) => (
                <SettingRow key={s.key} setting={s} value={form[s.key] ?? s.value} onChange={(v) => handleChange(s.key, v)} isDirty={form[s.key] !== original[s.key]} />
              ))}
            </div>
          </DataCard>
        )
      )}

      {/* ── Sticky save bar ── */}
      <SaveBar dirtyCount={dirtyKeys.length} onReset={handleReset} onSave={() => saveMut.mutate()} isPending={saveMut.isPending} />
    </div>
  )
}
