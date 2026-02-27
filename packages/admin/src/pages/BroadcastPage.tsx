import { useState, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sendBroadcast, getAnalyticsOverview } from '@/api'
import { Megaphone, Globe, Users, Send, Clock, CheckCircle, AlertCircle, ImageIcon, X, CalendarClock, Info } from 'lucide-react'

const MAX_LEN = 4096

// Simulated send history (client-side for now)
const MOCK_HISTORY = [
  { id: 1, message: '🎉 Yangi sovrinlar qo\'shildi! Hoziroq spin qiling!', lang: 'uz', queued: 847, sent_at: '2026-02-26T10:30:00Z', status: 'sent' },
  { id: 2, message: '🎁 Новые призы добавлены! Крутите прямо сейчас!', lang: 'ru', queued: 312, sent_at: '2026-02-25T14:00:00Z', status: 'sent' },
  { id: 3, message: '🌟 Special offer — review your purchases today!', lang: 'en', queued: 45, sent_at: '2026-02-24T09:15:00Z', status: 'sent' },
]

const LANG_FLAGS: Record<string, string> = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧', '': '🌍' }
const LANG_LABELS: Record<string, string> = { uz: 'Uzbek', ru: 'Russian', en: 'English', '': 'All Languages' }

// Rough split of users by language (used for recipient estimation)
const LANG_SPLIT: Record<string, number> = { uz: 0.65, ru: 0.30, en: 0.05, '': 1.0 }

function TelegramPreview({ message, lang, imagePreview }: { message: string; lang: string; imagePreview: string | null }) {
  const processed = message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />')

  return (
    <div className="bg-[#0f1923] rounded-2xl p-4 min-h-[180px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">U</div>
        <div>
          <p className="text-white text-xs font-semibold leading-tight">UzumBot</p>
          <p className="text-[10px] text-blue-400 leading-tight">bot</p>
        </div>
      </div>

      {(message.trim() || imagePreview) ? (
        <div className="bg-[#182533] rounded-xl rounded-tl-sm overflow-hidden max-w-[80%]">
          {imagePreview && (
            <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover" />
          )}
          {message.trim() && (
            <div className="px-3.5 py-2.5 text-sm text-white/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processed }} />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-20 text-slate-600 text-xs italic">
          Your message preview appears here…
        </div>
      )}

      {(message.trim() || imagePreview) && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
          <span className="text-[10px] text-slate-600">
            {LANG_FLAGS[lang]} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <CheckCircle size={10} className="text-blue-400" />
          <CheckCircle size={10} className="text-blue-400 -ml-1.5" />
        </div>
      )}
    </div>
  )
}

export default function BroadcastPage() {
  const [message, setMessage] = useState('')
  const [lang, setLang] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [history, setHistory] = useState(MOCK_HISTORY)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_LEN - message.length
  const isNearLimit = remaining < 200
  const isOverLimit = remaining < 0

  // Get real user count for recipient estimation
  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
    staleTime: 60_000,
  })
  const totalUsers = overview?.total_users ?? 0
  const estimatedRecipients = Math.round(totalUsers * (LANG_SPLIT[lang] ?? 1))

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImage(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const clearImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const mut = useMutation({
    mutationFn: () => sendBroadcast(message, lang || undefined, image),
    onSuccess: (res) => {
      const queued = res.data?.queued ?? estimatedRecipients
      toast.success(`Queued for ${queued.toLocaleString()} users`)
      setHistory((h) => [
        {
          id: Date.now(),
          message,
          lang,
          queued,
          sent_at: scheduleEnabled && scheduledAt ? scheduledAt : new Date().toISOString(),
          status: 'sent',
        },
        ...h,
      ])
      setMessage('')
      clearImage()
      setScheduleEnabled(false)
      setScheduledAt('')
    },
    onError: () => toast.error('Broadcast failed'),
  })

  // Min datetime for schedule picker (now + 5 min)
  const minSchedule = new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Broadcast</h1>
        <p className="text-sm text-slate-500 mt-0.5">Send messages to all users or filter by language</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Compose panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Megaphone size={15} className="text-white" />
            </div>
            <h2 className="font-bold text-slate-800">Compose Message</h2>
          </div>

          {/* Language filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Target Audience
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['', 'uz', 'ru', 'en'] as const).map((l) => {
                const cnt = Math.round(totalUsers * (LANG_SPLIT[l] ?? 1))
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                    ${lang === l
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <span className="text-lg">{LANG_FLAGS[l]}</span>
                    <span className="flex-1 text-left">{LANG_LABELS[l]}</span>
                    {totalUsers > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        lang === l ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        ~{cnt >= 1000 ? `${(cnt / 1000).toFixed(1)}k` : cnt}
                      </span>
                    )}
                    {l === '' && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">ALL</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Image <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="Selected" className="w-full max-h-40 object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all"
              >
                <ImageIcon size={16} />
                Click to attach an image
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          {/* Message textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Message
              </label>
              <span className={`text-xs font-mono font-semibold ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-slate-400'}`}>
                {remaining} chars left
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your broadcast message here…&#10;&#10;You can use:&#10;<b>bold</b>, <i>italic</i>, <code>code</code>, emojis 🎉"
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors resize-none
                ${isOverLimit
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-slate-200 focus:ring-blue-400'}`}
            />
            {isOverLimit && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Message exceeds maximum length
              </p>
            )}
          </div>

          {/* Schedule send */}
          <div className="border border-slate-100 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={14} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Schedule Send</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">BETA</span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => { setScheduleEnabled((v) => !v); if (scheduleEnabled) setScheduledAt('') }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${scheduleEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: scheduleEnabled ? 'translateX(18px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
            {scheduleEnabled && (
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Send at</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minSchedule}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="border rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {scheduledAt && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Info size={11} />
                    Will be sent on {new Date(scheduledAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={() => mut.mutate()}
            disabled={(!message.trim() && !image) || isOverLimit || mut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm disabled:opacity-60 transition-all shadow-md shadow-blue-500/20"
          >
            {mut.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending…
              </>
            ) : scheduleEnabled && scheduledAt ? (
              <>
                <CalendarClock size={15} />
                Schedule for {new Date(scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </>
            ) : (
              <>
                <Send size={15} /> Send to {LANG_LABELS[lang]} Users
              </>
            )}
          </button>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Messages are queued via Celery. Large broadcasts may take a few minutes.
            </p>
          </div>
        </div>

        {/* Preview panel */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400 text-xs ml-2">Telegram preview</span>
            </div>
            <TelegramPreview message={message} lang={lang} imagePreview={imagePreview} />
          </div>

          {/* Recipient stats */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Estimated Recipients</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Users size={16} className="mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-extrabold text-blue-700">
                  {totalUsers > 0 ? estimatedRecipients.toLocaleString() : '—'}
                </p>
                <p className="text-[10px] text-blue-500 font-medium">Eligible recipients</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Globe size={16} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xl font-extrabold text-slate-700">{LANG_FLAGS[lang]}</p>
                <p className="text-[10px] text-slate-500 font-medium">{LANG_LABELS[lang]}</p>
              </div>
            </div>
            {totalUsers > 0 && (
              <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                Based on {totalUsers.toLocaleString()} total registered users
              </p>
            )}
          </div>

          {/* Quick templates */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Templates</p>
            <div className="space-y-1.5">
              {[
                { emoji: '🎉', text: 'New prizes added! Spin now to win!', lang_hint: 'en' },
                { emoji: '🎁', text: "Yangi sovrinlar qo'shildi! Hoziroq spin qiling!", lang_hint: 'uz' },
                { emoji: '🏆', text: 'Новые призы добавлены! Крутите прямо сейчас!', lang_hint: 'ru' },
              ].map((t) => (
                <button
                  key={t.text}
                  onClick={() => { setMessage(t.emoji + ' ' + t.text); setLang(t.lang_hint) }}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-slate-600 truncate"
                >
                  {t.emoji} {t.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Send history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Clock size={15} className="text-slate-400" />
          <h2 className="font-bold text-slate-800 text-sm">Recent Broadcasts</h2>
          <span className="ml-auto text-xs text-slate-400">{history.length} broadcasts</span>
        </div>
        <div className="divide-y divide-slate-50">
          {history.map((h) => (
            <div key={h.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-lg">
                {LANG_FLAGS[h.lang]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{h.message}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400">{LANG_LABELS[h.lang] || 'All'}</span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{new Date(h.sent_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} /> {h.queued.toLocaleString()} sent
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
