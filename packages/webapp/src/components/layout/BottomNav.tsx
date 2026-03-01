import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Disc3, Wallet, FileText, Heart, User } from 'lucide-react'
import { t } from '@/i18n'
import { getMyRewards } from '@/api'

const TABS: { to: string; icon: React.ComponentType<{ className?: string }>; labelKey: 'tab_spin' | 'tab_wallet' | 'tab_reviews' | 'tab_charity' | 'tab_profile' }[] = [
  { to: '/', icon: Disc3, labelKey: 'tab_spin' },
  { to: '/wallet', icon: Wallet, labelKey: 'tab_wallet' },
  { to: '/reviews', icon: FileText, labelKey: 'tab_reviews' },
  { to: '/charity', icon: Heart, labelKey: 'tab_charity' },
  { to: '/profile', icon: User, labelKey: 'tab_profile' },
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
      {/* Glass morphism backdrop */}
      <div className="absolute inset-0 bg-card/80 backdrop-blur-xl border-t border-border/50" />

      <div className="relative flex">
        {TABS.map(({ to, icon: Icon, labelKey }) => {
          const isWallet = to === '/wallet'
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex-1 flex flex-col items-center justify-center py-3 text-xs transition-all duration-200 relative',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active top indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}

                  {/* Icon with micro-bounce on active */}
                  <motion.span
                    animate={isActive ? { y: [0, -3, 0], scale: [1, 1.15, 1.1] } : { scale: 1 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                    className="leading-none mb-1 relative"
                  >
                    <Icon className="w-5 h-5" />
                    {/* Wallet pending badge */}
                    {isWallet && pendingCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -top-1.5 -right-2 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-destructive-foreground bg-destructive shadow-lg shadow-destructive/50 ${
                          pendingCount > 9 ? 'min-w-[18px] px-0.5' : 'w-4'
                        }`}
                      >
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </motion.span>
                    )}
                  </motion.span>

                  <span
                    className={[
                      'font-medium tracking-wide text-[10px] transition-colors',
                      isActive ? 'text-primary' : '',
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
