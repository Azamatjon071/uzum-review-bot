import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { t } from '@/i18n'
import { getMyRewards } from '@/api'

const TABS = [
  { to: '/', icon: '🎡', labelKey: 'tab_spin' as const },
  { to: '/wallet', icon: '👛', labelKey: 'tab_wallet' as const },
  { to: '/charity', icon: '🤲', labelKey: 'tab_charity' as const },
  { to: '/profile', icon: '👤', labelKey: 'tab_profile' as const },
]

export default function BottomNav() {
  // Badge: count of pending rewards for wallet tab
  const { data: rewardsData } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getMyRewards().then((r) => r.data),
    refetchInterval: 60_000,
  })
  const pendingCount: number = (rewardsData?.rewards ?? []).filter(
    (r: any) => r.status === 'pending'
  ).length

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 safe-area-inset-bottom">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-[#0f0f1a]/85 backdrop-blur-xl border-t border-white/10" />

      <div className="relative flex">
        {TABS.map(({ to, icon, labelKey }) => {
          const isWallet = to === '/wallet'
          return (
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
                  {/* Active top indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #6c63ff, #8b5cf6)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Icon with micro-bounce on active */}
                  <motion.span
                    animate={isActive ? { y: [0, -3, 0], scale: [1, 1.15, 1.1] } : { scale: 1 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                    className="text-2xl leading-none mb-1 relative"
                  >
                    {icon}
                    {/* Wallet pending badge */}
                    {isWallet && pendingCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #f87171)',
                          boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                          minWidth: pendingCount > 9 ? '18px' : '16px',
                        }}
                      >
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </motion.span>
                    )}
                  </motion.span>

                  <span
                    className={[
                      'font-medium tracking-wide text-[10px] transition-colors',
                      isActive ? 'text-violet-300' : '',
                    ].join(' ')}
                  >
                    {t(labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
