import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileCheck, Package, Trophy, Gift,
  Users, Heart, Megaphone, TrendingUp, ShieldAlert,
  Settings, LogOut, X, PanelLeftClose, PanelLeft,
  ShieldCheck, ScrollText, BarChart3,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useViewPreferences } from '@/hooks/useViewPreferences'
import { getAnalyticsOverview } from '@/api'
import { cn } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import DensityToggle from '@/components/ui/DensityToggle'

type NavItem = {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  badgeKey?: string
  iconBg: string
  iconColor: string
}

type NavSection = {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        to: '/', icon: LayoutDashboard, label: 'Dashboard',
        iconBg: 'bg-orange-500/20', iconColor: 'text-orange-300',
      },
    ],
  },
  {
    title: 'Content',
    items: [
      {
        to: '/submissions', icon: FileCheck, label: 'Submissions',
        badgeKey: 'pending_submissions',
        iconBg: 'bg-amber-500/20', iconColor: 'text-amber-300',
      },
      {
        to: '/products', icon: Package, label: 'Products',
        iconBg: 'bg-teal-500/20', iconColor: 'text-teal-300',
      },
    ],
  },
  {
    title: 'Commerce',
    items: [
      {
        to: '/prizes', icon: Trophy, label: 'Prizes',
        iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-300',
      },
      {
        to: '/reports', icon: Gift, label: 'Rewards',
        iconBg: 'bg-pink-500/20', iconColor: 'text-pink-300',
      },
    ],
  },
  {
    title: 'Community',
    items: [
      {
        to: '/users', icon: Users, label: 'Users',
        iconBg: 'bg-blue-500/20', iconColor: 'text-blue-300',
      },
      {
        to: '/charity', icon: Heart, label: 'Charity',
        iconBg: 'bg-rose-500/20', iconColor: 'text-rose-300',
      },
      {
        to: '/broadcast', icon: Megaphone, label: 'Broadcast',
        badgeKey: 'draft_broadcasts',
        iconBg: 'bg-violet-500/20', iconColor: 'text-violet-300',
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        to: '/analytics', icon: TrendingUp, label: 'Analytics',
        iconBg: 'bg-cyan-500/20', iconColor: 'text-cyan-300',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        to: '/admins', icon: ShieldCheck, label: 'Admins',
        iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-300',
      },
      {
        to: '/settings', icon: Settings, label: 'Settings',
        iconBg: 'bg-slate-500/20', iconColor: 'text-slate-300',
      },
      {
        to: '/audit', icon: ScrollText, label: 'Audit Log',
        iconBg: 'bg-gray-500/20', iconColor: 'text-gray-300',
      },
      {
        to: '/fraud', icon: ShieldAlert, label: 'Fraud Signals',
        badgeKey: 'fraud_review',
        iconBg: 'bg-red-500/20', iconColor: 'text-red-300',
      },
    ],
  },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

function SidebarContent({
  collapsed,
  onClose,
  onToggleCollapse,
  showCollapseBtn,
}: {
  collapsed: boolean
  onClose?: () => void
  onToggleCollapse?: () => void
  showCollapseBtn?: boolean
}) {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const { density, setDensity } = useViewPreferences()

  const { data: overview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => getAnalyticsOverview().then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const badges: Record<string, number> = {
    pending_submissions: overview?.pending_submissions ?? 0,
    draft_broadcasts: overview?.draft_broadcasts ?? 0,
    fraud_review: overview?.fraud_review_count ?? 0,
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out relative overflow-hidden',
        collapsed ? 'w-[68px]' : 'w-[280px]',
      )}
    >
      {/* Decorative coral orb */}
      <div
        className="absolute -top-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 -right-12 w-36 h-36 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)' }}
      />

      {/* ── Header ── */}
      <div
        className={cn(
          'relative flex items-center shrink-0 h-16 border-b border-sidebar-border/30',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 min-w-0 w-full">
            <div className="relative w-9 h-9 shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-black/25"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a5c)' }}
              >
                <span className="text-white font-black text-lg leading-none select-none">U</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar shadow-sm shadow-emerald-400/50" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-tight tracking-tight truncate text-sidebar-foreground">
                UzumBot
              </p>
              <p className="text-[10px] leading-tight font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Admin Panel
              </p>
            </div>
            {onClose && !showCollapseBtn && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-9 h-9 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-black/25"
              style={{ background: 'linear-gradient(135deg, #FF6B35, #ff9a5c)' }}
            >
              <span className="text-white font-black text-lg leading-none select-none">U</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar" />
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        className={cn(
          'relative flex-1 overflow-y-auto overflow-x-hidden py-4',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-4' : ''}>
            {/* Section label */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {section.title}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              </div>
            )}
            {collapsed && si > 0 && (
              <div className="my-3 mx-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            )}

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, badgeKey, iconBg, iconColor }) => {
                const badgeCount = badgeKey ? (badges[badgeKey] ?? 0) : 0
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 relative',
                        collapsed
                          ? 'justify-center w-11 h-11 mx-auto'
                          : 'gap-2.5 px-2.5 py-2',
                        isActive
                          ? 'text-white'
                          : 'hover:text-white',
                      )
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'rgba(255,255,255,0.1)',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
                          }
                        : {}
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left accent bar — coral */}
                        {isActive && !collapsed && (
                          <span
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ background: 'linear-gradient(180deg, #FF6B35, #ff9a5c)' }}
                          />
                        )}

                        {/* Colored icon box */}
                        <span
                          className={cn(
                            'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150',
                            isActive ? iconBg : 'bg-transparent group-hover:' + iconBg,
                          )}
                        >
                          <Icon
                            size={15}
                            className={cn(
                              'transition-colors duration-150',
                              isActive
                                ? iconColor
                                : 'text-sidebar-foreground/50 group-hover:' + iconColor,
                            )}
                          />
                        </span>

                        {!collapsed && (
                          <span
                            className={cn(
                              'truncate flex-1 transition-colors duration-150',
                              isActive
                                ? 'text-white font-semibold'
                                : 'text-sidebar-foreground/65 group-hover:text-sidebar-foreground',
                            )}
                          >
                            {label}
                          </span>
                        )}

                        {/* Badge — expanded */}
                        {badgeCount > 0 && !collapsed && (
                          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full leading-none bg-orange-500 text-white shadow-sm shadow-orange-500/40">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}

                        {/* Badge — collapsed dot */}
                        {badgeCount > 0 && collapsed && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full shadow-sm shadow-orange-500/50 animate-pulse" />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div
        className={cn(
          'relative shrink-0 border-t',
          collapsed ? 'px-2 py-3' : 'px-3 py-4',
        )}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Theme & Density — expanded */}
        {!collapsed && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Theme
              </span>
              <ThemeToggle variant="sidebar" />
            </div>
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Density
              </span>
              <DensityToggle current={density} onChange={setDensity} variant="sidebar" />
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        {showCollapseBtn && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center rounded-xl text-[13px] font-medium transition-all w-full mb-1',
              collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-2.5 px-2.5 py-2',
            )}
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            {collapsed ? (
              <PanelLeft size={17} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={() => {
            logout()
            navigate('/login')
            onClose?.()
          }}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'group flex items-center rounded-xl text-[13px] font-medium transition-all w-full',
            collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-2.5 px-2.5 py-2',
          )}
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
            e.currentTarget.style.color = 'rgba(252,165,165,1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = ''
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
          }}
        >
          <LogOut size={collapsed ? 17 : 16} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Version footer */}
        {!collapsed && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p
              className="text-[9px] font-medium tracking-wider uppercase text-center"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              UzumBot v2.0
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          showCollapseBtn
        />
      </div>

      {/* Mobile overlay drawer */}
      {open !== undefined && (
        <>
          <div
            className={cn(
              'fixed inset-0 z-40 lg:hidden transition-all duration-300',
              open
                ? 'opacity-100 pointer-events-auto bg-black/60 backdrop-blur-sm'
                : 'opacity-0 pointer-events-none',
            )}
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed top-0 left-0 h-full z-50 lg:hidden transition-transform duration-300 ease-out shadow-2xl shadow-black/30',
              open ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <SidebarContent collapsed={false} onClose={onClose} />
          </div>
        </>
      )}
    </>
  )
}
