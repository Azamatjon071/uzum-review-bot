import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Disc3, Wallet, FileText, Heart, User } from 'lucide-react'
import { t } from '@/i18n'
import { getMyRewards } from '@/api'

type TabLabelKey = 'tab_spin' | 'tab_wallet' | 'tab_reviews' | 'tab_charity' | 'tab_profile'

const TABS: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  labelKey: TabLabelKey
}[] = [
  { to: '/',        icon: Disc3,    labelKey: 'tab_spin'     },
  { to: '/wallet',  icon: Wallet,   labelKey: 'tab_wallet'   },
  { to: '/reviews', icon: FileText, labelKey: 'tab_reviews'  },
  { to: '/charity', icon: Heart,    labelKey: 'tab_charity'  },
  { to: '/profile', icon: User,     labelKey: 'tab_profile'  },
]

export default function BottomNav() {
  const { data: rewardsData } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => getMyRewards().then((r) => r.data),
    refetchInterval: 60_000,
  })

  const pendingCount: number = (rewardsData?.rewards ?? []).filter(
    (r: { status: string }) => r.status === 'pending'
  ).length

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glass morphism backdrop */}
      <div className="absolute inset-0 bg-card/85 backdrop-blur-2xl border-t border-border/40" />

      <div className="relative flex">
        {TABS.map(({ to, icon: Icon, labelKey }) => {
          const isWallet = to === '/wallet'
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center pt-2.5 pb-2 text-xs transition-colors duration-200 relative ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active top indicator — gradient bar */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full uzum-gradient"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Icon with micro-bounce */}
                  <motion.span
                    animate={
                      isActive
                        ? { y: [0, -2, 0], scale: [1, 1.18, 1.1] }
                        : { y: 0, scale: 1 }
                    }
                    transition={{ duration: 0.28, type: 'spring', stiffness: 500 }}
                    className="leading-none mb-1 relative"
                  >
                    <Icon className="w-5 h-5" />

                    {/* Pending rewards badge on Wallet */}
                    {isWallet && pendingCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        className={`absolute -top-1.5 -right-2 h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-destructive shadow-sm ${
                          pendingCount > 9 ? 'min-w-[18px] px-1' : 'w-[18px]'
                        }`}
                      >
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </motion.span>
                    )}
                  </motion.span>

                  {/* Label */}
                  <span className={`font-medium tracking-wide text-[10px] leading-none transition-colors ${isActive ? 'text-primary' : ''}`}>
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
