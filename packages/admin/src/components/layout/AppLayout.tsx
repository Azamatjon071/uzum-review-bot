import { useState, useEffect, useCallback } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useViewPreferences } from '@/hooks/useViewPreferences'
import {
  Menu, Search, LogOut, X, ChevronRight,
  LayoutDashboard, FileCheck, Users, Package, Trophy, Heart,
  Megaphone, BarChart3, ScrollText, ShieldCheck, Settings,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'

/* ── Command palette items ── */
const COMMAND_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { path: '/submissions', label: 'Submissions', icon: FileCheck, section: 'Management' },
  { path: '/users', label: 'Users', icon: Users, section: 'Management' },
  { path: '/products', label: 'Products', icon: Package, section: 'Management' },
  { path: '/prizes', label: 'Prizes', icon: Trophy, section: 'Management' },
  { path: '/charity', label: 'Charity', icon: Heart, section: 'Engagement' },
  { path: '/broadcast', label: 'Broadcast', icon: Megaphone, section: 'Engagement' },
  { path: '/reports', label: 'Reports', icon: BarChart3, section: 'System' },
  { path: '/audit', label: 'Audit Log', icon: ScrollText, section: 'System' },
  { path: '/admins', label: 'Admins', icon: ShieldCheck, section: 'System' },
  { path: '/settings', label: 'Settings', icon: Settings, section: 'System' },
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

/* ── Command Palette ── */
function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
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

  // Group by section
  const sections = filtered.reduce<Record<string, typeof COMMAND_ITEMS>>((acc, item) => {
    const key = item.section
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  let globalIndex = -1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[18vh] p-4 pointer-events-none">
        <div className="bg-popover text-popover-foreground border border-border rounded-2xl shadow-2xl shadow-black/20 w-full max-w-lg pointer-events-auto animate-scale-in overflow-hidden">
          {/* Search header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Search size={15} className="text-primary" />
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where would you like to go?"
              className="flex-1 text-sm bg-transparent placeholder:text-muted-foreground/60 outline-none"
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
            <kbd className="text-[10px] font-mono text-muted-foreground/60 bg-muted border border-border rounded-md px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          {/* Results grouped by section */}
          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Search size={20} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No matching pages</p>
              </div>
            ) : (
              Object.entries(sections).map(([sectionName, items]) => (
                <div key={sectionName}>
                  <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.08em] px-5 pt-3 pb-1.5">
                    {sectionName}
                  </p>
                  {items.map((item) => {
                    globalIndex++
                    const idx = globalIndex
                    const Icon = item.icon
                    const isCurrent = location.pathname === item.path
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSelect(item.path)}
                        className={cn(
                          'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all',
                          idx === selectedIndex
                            ? 'bg-primary/10 text-foreground'
                            : 'text-foreground/80 hover:bg-accent',
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          idx === selectedIndex ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          <Icon size={14} />
                        </div>
                        <span className="text-sm font-medium flex-1">{item.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            Current
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground/50">
            <span>Navigate with <kbd className="font-mono bg-muted border border-border rounded px-1 py-px mx-0.5">↑↓</kbd> keys</span>
            <span><kbd className="font-mono bg-muted border border-border rounded px-1 py-px">Enter</kbd> to select</span>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Main Layout ── */
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
        {/* ── Top Header ── */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-border bg-background/80 backdrop-blur-xl shrink-0 sticky top-0 z-30">
          {/* Left: hamburger + breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground/60 hidden sm:inline font-medium">Admin</span>
              <ChevronRight size={12} className="text-muted-foreground/40 hidden sm:inline" />
              <span className="font-semibold text-foreground">{currentPageLabel}</span>
            </nav>
          </div>

          {/* Right: search + theme + avatar */}
          <div className="flex items-center gap-2">
            {/* Search trigger */}
            <button
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/30 text-sm transition-all group"
              title="Search (Ctrl+K)"
            >
              <Search size={14} className="group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline text-[10px] font-mono text-muted-foreground/50 bg-background border border-border rounded-md px-1.5 py-0.5 ml-1">
                ⌘K
              </kbd>
            </button>

            {/* Theme toggle — desktop */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User avatar with dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserMenu((s) => !s)
                }}
                className="relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-105 uzum-gradient text-white shadow-sm"
                title="Account"
              >
                A
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl shadow-black/10 py-1 z-50 animate-scale-in overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full uzum-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                        A
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">Admin</p>
                        <p className="text-[11px] text-muted-foreground">Administrator</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings')
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/80 hover:bg-accent transition-colors"
                    >
                      <Settings size={14} className="text-muted-foreground" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        logout()
                        navigate('/login')
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut size={14} />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 animate-fade-in" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Command palette */}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </div>
  )
}
