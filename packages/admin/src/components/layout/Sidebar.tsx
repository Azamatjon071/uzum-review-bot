import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Users, Trophy, Heart,
  ScrollText, ShieldCheck, Settings, Megaphone,
  Package, BarChart3, LogOut, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/submissions', icon: FileText, label: 'Submissions' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/prizes', icon: Trophy, label: 'Prizes' },
  { to: '/charity', icon: Heart, label: 'Charity' },
  { to: '/broadcast', icon: Megaphone, label: 'Broadcast' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/audit', icon: ScrollText, label: 'Audit Log' },
  { to: '/admins', icon: ShieldCheck, label: 'Admins' },
  { to: '/settings', icon: Settings, label: 'Settings' },
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

  return (
    <aside className={cn(
      'flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-slate-100 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Logo + collapse/close */}
      <div className={cn(
        'flex items-center border-b border-slate-700/60 shrink-0 h-14',
        collapsed ? 'justify-center px-2' : 'justify-between px-4',
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
              <span className="text-white text-sm font-black">U</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight tracking-tight text-white truncate">UzumBot</p>
              <p className="text-[10px] text-slate-400 leading-tight">Admin Panel</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <span className="text-white text-sm font-black">U</span>
          </div>
        )}
        {/* Mobile close */}
        {onClose && !showCollapseBtn && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        )}
        {/* Desktop collapse toggle */}
        {showCollapseBtn && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && showCollapseBtn && (
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center py-2 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl text-sm transition-all duration-150 group relative',
                collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={collapsed ? 18 : 16} className="shrink-0" />
                {!collapsed && <span className="truncate font-medium">{label}</span>}
                {/* Active indicator dot (collapsed mode) */}
                {collapsed && isActive && (
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-400 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className={cn('border-t border-slate-700/60 pt-3 pb-4 shrink-0', collapsed ? 'px-2' : 'px-3')}>
        {/* User card (expanded mode) */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 bg-slate-800/60 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-black shrink-0">
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">Superadmin</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">admin@uzumbot.local</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); onClose?.() }}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex items-center rounded-xl text-sm text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-all w-full font-medium',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5',
          )}
        >
          <LogOut size={collapsed ? 18 : 16} className="shrink-0" />
          {!collapsed && 'Logout'}
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

      {/* Mobile drawer */}
      {open !== undefined && (
        <>
          <div
            className={cn(
              'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300',
              open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed top-0 left-0 h-full z-50 lg:hidden transition-transform duration-300 ease-in-out',
              open ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <SidebarContent collapsed={false} onClose={onClose} />
          </div>
        </>
      )}
    </>
  )
}
