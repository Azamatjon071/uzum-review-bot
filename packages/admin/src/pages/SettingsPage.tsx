import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '@/api'
import { useState, useEffect } from 'react'
import {
  Settings, Zap, Shield, Gift, Bell, ChevronRight, Save, RefreshCw,
} from 'lucide-react'

// Group settings by prefix
const SETTING_GROUPS: { key: string; label: string; icon: React.ElementType; color: string; prefixes: string[] }[] = [
  { key: 'bot', label: 'Bot Behavior', icon: Zap, color: 'text-blue-500', prefixes: ['bot_', 'telegram_', 'max_', 'min_', 'welcome'] },
  { key: 'prizes', label: 'Prizes & Spins', icon: Gift, color: 'text-violet-500', prefixes: ['prize_', 'spin_', 'reward_'] },
  { key: 'security', label: 'Security', icon: Shield, color: 'text-emerald-500', prefixes: ['rate_', 'auth_', 'token_', 'secret'] },
  { key: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-500', prefixes: ['notify_', 'alert_', 'email_'] },
]

function groupSetting(key: string): string {
  for (const g of SETTING_GROUPS) {
    if (g.prefixes.some((p) => key.startsWith(p))) return g.key
  }
  return 'other'
}

function isBooleanLike(val: string) {
  return val === 'true' || val === 'false'
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-blue-500' : 'bg-slate-300'}`}
      style={{ height: '22px', minWidth: '40px' }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
        style={{ width: '18px', height: '18px' }}
      />
    </button>
  )
}

interface SettingRowProps {
  s: { key: string; value: string; description?: string }
  val: string
  onChange: (v: string) => void
}

function SettingRow({ s, val, onChange }: SettingRowProps) {
  const isBool = isBooleanLike(s.value)
  const prettyKey = s.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{prettyKey}</p>
        {s.description && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.description}</p>
        )}
        <p className="text-[10px] font-mono text-slate-300 mt-0.5">{s.key}</p>
      </div>
      <div className="shrink-0">
        {isBool ? (
          <Toggle checked={val === 'true'} onChange={(v) => onChange(v ? 'true' : 'false')} />
        ) : (
          <input
            value={val}
            onChange={(e) => onChange(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-right w-44 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
          />
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => getSettings().then((r) => r.data) })
  const [form, setForm] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data?.settings) {
      const flat: Record<string, string> = {}
      for (const s of data.settings) flat[s.key] = s.value
      setForm(flat)
      setDirty(false)
    }
  }, [data])

  const handleChange = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }))
    setDirty(true)
  }

  const mut = useMutation({
    mutationFn: () => updateSettings({ settings: Object.entries(form).map(([key, value]) => ({ key, value })) }),
    onSuccess: () => {
      toast.success('Settings saved')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const settings: any[] = data?.settings ?? []

  // Group settings
  const grouped: Record<string, any[]> = { other: [] }
  for (const g of SETTING_GROUPS) grouped[g.key] = []
  for (const s of settings) {
    const gKey = groupSetting(s.key)
    if (!grouped[gKey]) grouped[gKey] = []
    grouped[gKey].push(s)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure platform behaviour and features</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              <ChevronRight size={12} /> Unsaved changes
            </span>
          )}
          <button
            onClick={() => mut.mutate()}
            disabled={!dirty || mut.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            {mut.isPending ? (
              <><RefreshCw size={14} className="animate-spin" /> Saving…</>
            ) : (
              <><Save size={14} /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-32 mb-4" />
              {[...Array(3)].map((__, j) => (
                <div key={j} className="flex justify-between py-3.5 border-b border-slate-50">
                  <div className="h-4 bg-slate-100 rounded w-40" />
                  <div className="h-8 bg-slate-100 rounded w-44" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Settings size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No settings configured yet</p>
          <p className="text-slate-400 text-sm mt-1">Settings will appear here once the platform is configured.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SETTING_GROUPS.map((group) => {
            const groupSettings = grouped[group.key] ?? []
            if (groupSettings.length === 0) return null
            const Icon = group.icon
            return (
              <div key={group.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                  <div className={`w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center`}>
                    <Icon size={15} className={group.color} />
                  </div>
                  <h2 className="font-bold text-slate-700 text-sm">{group.label}</h2>
                  <span className="ml-auto text-xs text-slate-400">{groupSettings.length} setting{groupSettings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="px-5">
                  {groupSettings.map((s: any) => (
                    <SettingRow
                      key={s.key}
                      s={s}
                      val={form[s.key] ?? ''}
                      onChange={(v) => handleChange(s.key, v)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Ungrouped / other settings */}
          {(grouped['other'] ?? []).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Settings size={15} className="text-slate-400" />
                </div>
                <h2 className="font-bold text-slate-700 text-sm">Other</h2>
              </div>
              <div className="px-5">
                {(grouped['other'] ?? []).map((s: any) => (
                  <SettingRow
                    key={s.key}
                    s={s}
                    val={form[s.key] ?? ''}
                    onChange={(v) => handleChange(s.key, v)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
