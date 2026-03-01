import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const items: { value: Theme; icon: React.ReactNode }[] = [
    { value: 'light', icon: <Sun className="w-3.5 h-3.5" /> },
    { value: 'dark', icon: <Moon className="w-3.5 h-3.5" /> },
    { value: 'system', icon: <Monitor className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setTheme(item.value)}
          className={`
            inline-flex items-center rounded-md p-1.5 transition-all
            ${theme === item.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          title={item.value.charAt(0).toUpperCase() + item.value.slice(1)}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
