import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileCheck, Users, Package, Trophy, Heart,
  Megaphone, BarChart3, ScrollText, ShieldCheck, Settings,
  LogOut, X, PanelLeftClose, PanelLeft,
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
        'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center shrink-0 h-14 border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-sm font-bold">U</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground leading-tight">UzumBot</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">U</span>
          </div>
        )}
        {onClose && !showCollapseBtn && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-4 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-6' : ''}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            )}
            {collapsed && si > 0 && (
              <div className="my-2 mx-1.5 border-t border-sidebar-border" />
            )}
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
                        'flex items-center rounded-md text-sm transition-all duration-150 relative',
                        collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left accent */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                        )}
                        {isActive && collapsed && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
                        )}
                        <Icon size={collapsed ? 18 : 16} className="shrink-0" />
                        {!collapsed && (
                          <span className="truncate flex-1">{label}</span>
                        )}
                        {badgeCount > 0 && !collapsed && (
                          <span
                            className={cn(
                              'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                              isActive
                                ? 'bg-primary/20 text-primary'
                                : 'bg-destructive/10 text-destructive',
                            )}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                        {badgeCount > 0 && collapsed && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full" />
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

      {/* Bottom section */}
      <div className={cn('border-t border-sidebar-border shrink-0', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        {/* Theme and density toggles — expanded mode */}
        {!collapsed && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Density</span>
              <DensityToggle current={density} onChange={setDensity} />
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        {showCollapseBtn && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex items-center rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full',
              collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
            )}
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={16} />}
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
            'flex items-center rounded-md text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2',
          )}
        >
          <LogOut size={collapsed ? 18 : 16} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
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
              'fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200',
              open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed top-0 left-0 h-full z-50 lg:hidden transition-transform duration-200 ease-out',
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
