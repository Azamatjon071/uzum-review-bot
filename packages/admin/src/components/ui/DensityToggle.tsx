import { Minus, AlignCenter, AlignJustify } from 'lucide-react'
import type { Density } from '@/hooks/useViewPreferences'
import { cn } from '@/lib/utils'

interface DensityToggleProps {
  current: Density
  onChange: (d: Density) => void
  /** When 'sidebar', renders for sidebar context (white-on-violet). Default = 'surface'. */
  variant?: 'surface' | 'sidebar'
}

const items: { value: Density; icon: React.ReactNode; label: string }[] = [
  { value: 'compact', icon: <Minus className="w-3.5 h-3.5" />, label: 'Compact' },
  { value: 'comfortable', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Comfortable' },
  { value: 'spacious', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Spacious' },
]

export default function DensityToggle({ current, onChange, variant = 'surface' }: DensityToggleProps) {
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
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200',
            isSidebar
              ? current === item.value
                ? 'bg-white/25 dark:bg-white/15 text-sidebar-foreground shadow-sm'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
              : current === item.value
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
