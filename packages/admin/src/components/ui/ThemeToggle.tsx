import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** When true, renders for sidebar context (white-on-violet). Default false = normal surface context. */
  variant?: 'surface' | 'sidebar'
}

export default function ThemeToggle({ variant = 'surface' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const items: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-3.5 h-3.5" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-3.5 h-3.5" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="w-3.5 h-3.5" />, label: 'System' },
  ]

  const isSidebar = variant === 'sidebar'

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg p-0.5',
      isSidebar
        ? 'bg-white/10 dark:bg-white/[0.06] backdrop-blur-sm'
        : 'bg-muted/60 border border-border/50',
    )}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setTheme(item.value)}
          className={cn(
            'inline-flex items-center rounded-md p-1.5 transition-all duration-200',
            isSidebar
              ? theme === item.value
                ? 'bg-white/25 dark:bg-white/15 text-sidebar-foreground shadow-sm'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
              : theme === item.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
          )}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
