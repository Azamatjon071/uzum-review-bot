import { motion } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'

const ITEMS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light',  icon: <Sun     className="w-3.5 h-3.5" />, label: 'Light'  },
  { value: 'dark',   icon: <Moon    className="w-3.5 h-3.5" />, label: 'Dark'   },
  { value: 'system', icon: <Monitor className="w-3.5 h-3.5" />, label: 'System' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="inline-flex items-center rounded-xl bg-muted/40 p-0.5 gap-0.5"
      role="group"
      aria-label="Theme"
    >
      {ITEMS.map(({ value, icon, label }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            aria-label={label}
            className={`relative inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="theme-toggle-bg"
                className="absolute inset-0 rounded-lg bg-primary/20"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
            <span className="relative z-10">{icon}</span>
          </button>
        )
      })}
    </div>
  )
}
