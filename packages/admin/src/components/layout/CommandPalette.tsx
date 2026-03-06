import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { 
  LayoutDashboard, FileCheck, Package, Trophy, Gift, Heart, 
  Megaphone, TrendingUp, ShieldCheck, ScrollText, ShieldAlert, 
  Settings, Search, User, LogOut, Laptop 
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const setTheme = useTheme((s) => s.setTheme)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = React.useCallback((command: () => unknown) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm transition-all duration-200 animate-in fade-in">
      <div className="w-full max-w-[640px] shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-[#1e1e24] text-gray-200 animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
        <Command className="w-full bg-transparent" label="Global Command Menu">
          <div className="flex items-center border-b border-white/10 px-4 py-3">
            <Search className="mr-3 h-5 w-5 shrink-0 opacity-50" />
            <Command.Input 
                autoFocus
                className="flex h-10 w-full rounded-md bg-transparent text-base outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Type a command or search..."
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scroll-py-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <CommandItem icon={LayoutDashboard} onSelect={() => runCommand(() => navigate('/'))}>Dashboard</CommandItem>
              <CommandItem icon={FileCheck} onSelect={() => runCommand(() => navigate('/submissions'))}>Submissions</CommandItem>
              <CommandItem icon={Package} onSelect={() => runCommand(() => navigate('/products'))}>Products</CommandItem>
              <CommandItem icon={User} onSelect={() => runCommand(() => navigate('/users'))}>Users</CommandItem>
              <CommandItem icon={Trophy} onSelect={() => runCommand(() => navigate('/prizes'))}>Prizes</CommandItem>
              <CommandItem icon={Gift} onSelect={() => runCommand(() => navigate('/reports'))}>Rewards</CommandItem>
              <CommandItem icon={Heart} onSelect={() => runCommand(() => navigate('/charity'))}>Charity</CommandItem>
              <CommandItem icon={Megaphone} onSelect={() => runCommand(() => navigate('/broadcast'))}>Broadcast</CommandItem>
              <CommandItem icon={TrendingUp} onSelect={() => runCommand(() => navigate('/analytics'))}>Analytics</CommandItem>
              <CommandItem icon={ShieldCheck} onSelect={() => runCommand(() => navigate('/admins'))}>Admins</CommandItem>
              <CommandItem icon={ScrollText} onSelect={() => runCommand(() => navigate('/audit'))}>Audit Log</CommandItem>
              <CommandItem icon={ShieldAlert} onSelect={() => runCommand(() => navigate('/fraud'))}>Fraud Signals</CommandItem>
            </Command.Group>
            
            <Command.Group heading="Theme" className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mt-2">
              <CommandItem icon={Laptop} onSelect={() => runCommand(() => setTheme('system'))}>System</CommandItem>
              <CommandItem icon={Settings} onSelect={() => runCommand(() => setTheme('dark'))}>Dark</CommandItem>
              <CommandItem icon={Settings} onSelect={() => runCommand(() => setTheme('light'))}>Light</CommandItem>
            </Command.Group>

            <Command.Group heading="Settings" className="px-2 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mt-2">
               <CommandItem icon={Settings} onSelect={() => runCommand(() => navigate('/settings'))}>Settings</CommandItem>
               <CommandItem icon={LogOut} className="text-red-400 aria-selected:text-red-300" onSelect={() => runCommand(() => { logout(); navigate('/login') })}>Logout</CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      <div className="fixed inset-0 z-[-1]" onClick={() => onOpenChange(false)} />
    </div>
  )
}

function CommandItem({ icon: Icon, children, onSelect, className = '' }: any) {
  return (
    <Command.Item 
      onSelect={onSelect} 
      className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg aria-selected:bg-white/10 aria-selected:text-white cursor-pointer transition-colors text-gray-400 ${className}`}
    >
      <Icon className="h-4 w-4 opacity-70" />
      <span>{children}</span>
    </Command.Item>
  )
}
