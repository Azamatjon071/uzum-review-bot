import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sendBroadcast } from '@/api'
import { Megaphone, Globe, Users, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const MAX_LEN = 4096

// Simulated send history (client-side for now)
const MOCK_HISTORY = [
  { id: 1, message: '🎉 Yangi sovrinlar qo\'shildi! Hoziroq spin qiling!', lang: 'uz', queued: 847, sent_at: '2026-02-26T10:30:00Z', status: 'sent' },
  { id: 2, message: '🎁 Новые призы добавлены! Крутите прямо сейчас!', lang: 'ru', queued: 312, sent_at: '2026-02-25T14:00:00Z', status: 'sent' },
  { id: 3, message: '🌟 Special offer — review your purchases today!', lang: 'en', queued: 45, sent_at: '2026-02-24T09:15:00Z', status: 'sent' },
]

const LANG_FLAGS: Record<string, string> = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧', '': '🌍' }
const LANG_LABELS: Record<string, string> = { uz: 'Uzbek', ru: 'Russian', en: 'English', '': 'All Languages' }

function TelegramPreview({ message, lang }: { message: string; lang: string }) {
  const processed = message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />')

  return (
    <div className="bg-[#0f1923] rounded-2xl p-4 min-h-[180px]">
      {/* Telegram-style header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">U</div>
        <div>
          <p className="text-white text-xs font-semibold leading-tight">UzumBot</p>
          <p className="text-[10px] text-blue-400 leading-tight">bot</p>
        </div>
      </div>

      {message.trim() ? (
        <div className="bg-[#182533] rounded-xl rounded-tl-sm px-3.5 py-2.5 text-sm text-white/90 leading-relaxed max-w-[80%]"
          dangerouslySetInnerHTML={{ __html: processed }} />
      ) : (
        <div className="flex items-center justify-center h-20 text-slate-600 text-xs italic">
          Your message preview appears here…
        </div>
      )}

      {message.trim() && (
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
  const [history, setHistory] = useState(MOCK_HISTORY)

  const remaining = MAX_LEN - message.length
  const isNearLimit = remaining < 200
  const isOverLimit = remaining < 0

  const mut = useMutation({
    mutationFn: () => sendBroadcast({ message, language: lang || undefined }),
    onSuccess: (res) => {
      const queued = res.data?.queued ?? 0
      toast.success(`Queued for ${queued} users`)
      setHistory((h) => [
        {
          id: Date.now(),
          message,
          lang,
          queued,
          sent_at: new Date().toISOString(),
          status: 'sent',
        },
        ...h,
      ])
      setMessage('')
    },
    onError: () => toast.error('Broadcast failed'),
  })

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
              {(['', 'uz', 'ru', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                    ${lang === l
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <span className="text-lg">{LANG_FLAGS[l]}</span>
                  {LANG_LABELS[l]}
                  {l === '' && (
                    <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">ALL</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Message <span className="text-slate-400 font-normal normal-case">(HTML/Telegram formatting)</span>
              </label>
              <span className={`text-xs font-mono font-semibold ${isOverLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-slate-400'}`}>
                {remaining}
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
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

          {/* Send button */}
          <button
            onClick={() => mut.mutate()}
            disabled={!message.trim() || isOverLimit || mut.isPending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm disabled:opacity-60 transition-all shadow-md shadow-blue-500/20"
          >
            {mut.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending…
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
            <TelegramPreview message={message} lang={lang} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <Users size={16} className="mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-extrabold text-blue-700">1,204</p>
                <p className="text-[10px] text-blue-500 font-medium">Eligible recipients</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <Globe size={16} className="mx-auto text-slate-400 mb-1" />
                <p className="text-lg font-extrabold text-slate-700">{LANG_FLAGS[lang]}</p>
                <p className="text-[10px] text-slate-500 font-medium">{LANG_LABELS[lang]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send history */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Clock size={15} className="text-slate-400" />
          <h2 className="font-bold text-slate-800 text-sm">Recent Broadcasts</h2>
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
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{new Date(h.sent_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <CheckCircle size={10} /> {h.queued} sent
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
