import { useState, useEffect, useCallback } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useViewPreferences } from '@/hooks/useViewPreferences'
import {
  Menu, Search, LogOut, X,
  LayoutDashboard, FileCheck, Users, Package, Trophy, Heart,
  Megaphone, BarChart3, ScrollText, ShieldCheck, Settings,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

const COMMAND_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/submissions', label: 'Submissions', icon: FileCheck },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/prizes', label: 'Prizes', icon: Trophy },
  { path: '/charity', label: 'Charity', icon: Heart },
  { path: '/broadcast', label: 'Broadcast', icon: Megaphone },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/audit', label: 'Audit Log', icon: ScrollText },
  { path: '/admins', label: 'Admins', icon: ShieldCheck },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/submissions': 'Submissions',
  '/users': 'Users',
  '/products': 'Products',
  '/prizes': 'Prizes',
  '/charity': 'Charity',
  '/broadcast': 'Broadcast',
  '/reports': 'Reports',
  '/audit': 'Audit Log',
  '/admins': 'Admins',
  '/settings': 'Settings',
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filtered = COMMAND_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  function handleSelect(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[20vh] p-4 pointer-events-none">
        <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-2xl w-full max-w-lg pointer-events-auto animate-fade-in overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages..."
              className="flex-1 text-sm bg-transparent placeholder:text-muted-foreground outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex((i) => Math.max(i - 1, 0))
                }
                if (e.key === 'Enter' && filtered.length > 0) {
                  handleSelect(filtered[selectedIndex].path)
                }
              }}
            />
            <kbd className="text-[10px] font-mono text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
            ) : (
              filtered.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent',
                    )}
                  >
                    <Icon size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function AppLayout() {
  const token = useAuth((s) => s.token)
  const logout = useAuth((s) => s.logout)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _theme = useTheme((s) => s.theme)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _density = useViewPreferences((s) => s.density)
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const currentPageLabel = ROUTE_LABELS[location.pathname] || 'Page'

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey

      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPalette((p) => !p)
        return
      }

      if (e.key === 'Escape') {
        setShowPalette(false)
        setShowUserMenu(false)
        return
      }
    },
    [],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Close user menu on click outside
  useEffect(() => {
    if (!showUserMenu) return
    const handleClick = () => setShowUserMenu(false)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [showUserMenu])

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-lg shrink-0 sticky top-0 z-30">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Admin</span>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="font-medium text-foreground">{currentPageLabel}</span>
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/50 text-muted-foreground hover:text-foreground text-sm transition-colors"
              title="Search (Ctrl+K)"
            >
              <Search size={14} />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline text-[10px] font-mono bg-background border border-border rounded px-1 py-0.5 ml-1">
                Ctrl+K
              </kbd>
            </button>

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* Avatar / logout dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserMenu((s) => !s)
                }}
                className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold hover:bg-primary/20 transition-colors"
                title="Account"
              >
                A
              </button>
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 z-50 animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground">Administrator</p>
                  </div>
                  <button
                    onClick={() => {
                      logout()
                      navigate('/login')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Command palette */}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </div>
  )
}
