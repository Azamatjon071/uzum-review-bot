import { NavLink } from 'react-router-dom'
import { t } from '@/i18n'

const TABS = [
  { to: '/', icon: '🎡', labelKey: 'tab_spin' as const },
  { to: '/wallet', icon: '👛', labelKey: 'tab_wallet' as const },
  { to: '/charity', icon: '🤲', labelKey: 'tab_charity' as const },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 safe-area-inset-bottom">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-[#0f0f1a]/80 backdrop-blur-xl border-t border-white/10" />

      <div className="relative flex">
        {TABS.map(({ to, icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center justify-center py-3 text-xs transition-all duration-200 relative',
                isActive ? 'text-white' : 'text-white/40',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
                )}
                <span
                  className={[
                    'text-2xl leading-none mb-1 transition-transform duration-200',
                    isActive ? 'scale-110' : 'scale-100',
                  ].join(' ')}
                >
                  {icon}
                </span>
                <span className={['font-medium tracking-wide text-[10px]', isActive ? 'text-violet-300' : ''].join(' ')}>
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
