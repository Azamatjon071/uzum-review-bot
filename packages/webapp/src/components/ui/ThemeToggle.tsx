import { Sun, Moon, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme, type Theme } from '@/hooks/useTheme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const items: { value: Theme; icon: React.ReactNode }[] = [
    { value: 'light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', icon: <Monitor className="w-4 h-4" /> },
  ]
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => setTheme(item.value)}
          className={`relative inline-flex items-center rounded-md p-2 transition-colors ${
            theme === item.value ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {theme === item.value && (
            <motion.span
              layoutId="theme-toggle-bg"
              className="absolute inset-0 rounded-md bg-card shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{item.icon}</span>
        </button>
      ))}
    </div>
  )
}
