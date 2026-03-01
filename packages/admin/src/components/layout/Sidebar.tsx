import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileCheck, Users, Package, Trophy, Heart,
  Megaphone, BarChart3, ScrollText, ShieldCheck, Settings,
  LogOut, X, PanelLeftClose, PanelLeft, Zap,
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
}

type NavSection = {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/submissions', icon: FileCheck, label: 'Submissions', badgeKey: 'pending_submissions' },
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/prizes', icon: Trophy, label: 'Prizes' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { to: '/charity', icon: Heart, label: 'Charity' },
      { to: '/broadcast', icon: Megaphone, label: 'Broadcast' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/audit', icon: ScrollText, label: 'Audit Log' },
      { to: '/admins', icon: ShieldCheck, label: 'Admins' },
      { to: '/settings', icon: Settings, label: 'Settings' },
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
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out relative',
        collapsed ? 'w-[68px]' : 'w-[260px]',
      )}
    >
      {/* Subtle gradient overlay for light mode depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none dark:from-white/[0.02]" />

      {/* ── Header ── */}
      <div
        className={cn(
          'relative flex items-center shrink-0 h-16 border-b border-sidebar-border/50',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            {/* Brand mark */}
            <div className="relative w-9 h-9 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-white/10 flex items-center justify-center backdrop-blur-sm shadow-sm shadow-black/10">
                <Zap size={18} className="text-sidebar-foreground" />
              </div>
              {/* Tiny online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight tracking-tight truncate">
                UzumBot
              </p>
              <p className="text-[10px] leading-tight opacity-60 font-medium">
                Admin Panel
              </p>
            </div>
          </div>
        ) : (
          <div className="relative w-9 h-9">
            <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-white/10 flex items-center justify-center backdrop-blur-sm shadow-sm shadow-black/10">
              <Zap size={18} className="text-sidebar-foreground" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar" />
          </div>
        )}

        {/* Close button for mobile drawer */}
        {onClose && !showCollapseBtn && (
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={cn(
        'relative flex-1 overflow-y-auto overflow-x-hidden py-5',
        collapsed ? 'px-2' : 'px-3',
      )}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-5' : ''}>
            {/* Section label */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-40">
                  {section.title}
                </span>
                <div className="flex-1 h-px bg-sidebar-foreground/[0.08]" />
              </div>
            )}
            {collapsed && si > 0 && (
              <div className="my-3 mx-2.5 border-t border-sidebar-foreground/[0.1]" />
            )}

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, badgeKey }) => {
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
                        'group flex items-center rounded-lg text-[13px] font-medium transition-all duration-150 relative',
                        collapsed
                          ? 'justify-center w-11 h-11 mx-auto'
                          : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-white/20 dark:bg-white/10 text-sidebar-foreground shadow-sm shadow-black/5'
                          : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-white/10 dark:hover:bg-white/[0.06]',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left accent bar */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-sidebar-foreground/80" />
                        )}
                        {isActive && collapsed && (
                          <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-sidebar-foreground/80" />
                        )}

                        {/* Icon with subtle glow when active */}
                        <span className={cn(
                          'shrink-0 transition-transform duration-150',
                          isActive && 'scale-110',
                          !collapsed && !isActive && 'group-hover:translate-x-0.5',
                        )}>
                          <Icon size={collapsed ? 19 : 17} />
                        </span>

                        {!collapsed && (
                          <span className="truncate flex-1">{label}</span>
                        )}

                        {/* Badge — expanded */}
                        {badgeCount > 0 && !collapsed && (
                          <span
                            className={cn(
                              'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full leading-none',
                              isActive
                                ? 'bg-white/25 text-sidebar-foreground'
                                : 'bg-orange-400/90 text-white dark:bg-orange-500/80',
                            )}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}

                        {/* Badge — collapsed (dot) */}
                        {badgeCount > 0 && collapsed && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-500/30 animate-pulse" />
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
      <div className={cn(
        'relative border-t border-sidebar-foreground/[0.1] shrink-0',
        collapsed ? 'px-2 py-3' : 'px-3 py-4',
      )}>
        {/* Theme & Density — expanded */}
        {!collapsed && (
          <div className="space-y-2.5 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-40">
                Theme
              </span>
              <ThemeToggle variant="sidebar" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-40">
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
              'flex items-center rounded-lg text-[13px] font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/10 transition-all w-full',
              collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
            )}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={17} />}
            {!collapsed && <span>Collapse</span>}
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
            'flex items-center rounded-lg text-[13px] font-medium text-sidebar-foreground/50 hover:bg-red-500/20 hover:text-red-200 dark:hover:text-red-400 transition-all w-full',
            collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-3 py-2.5',
          )}
        >
          <LogOut size={collapsed ? 18 : 17} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Branding footer — expanded only */}
        {!collapsed && (
          <div className="mt-3 pt-3 border-t border-sidebar-foreground/[0.06]">
            <p className="text-[9px] font-medium tracking-wider uppercase opacity-25 text-center">
              Powered by UzumBot v2.0
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
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 lg:hidden transition-all duration-300',
              open
                ? 'opacity-100 pointer-events-auto bg-black/60 backdrop-blur-sm'
                : 'opacity-0 pointer-events-none',
            )}
            onClick={onClose}
          />
          {/* Drawer */}
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
