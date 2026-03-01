import { Minus, AlignCenter, AlignJustify } from 'lucide-react'
import type { Density } from '@/hooks/useViewPreferences'

interface DensityToggleProps {
  current: Density
  onChange: (d: Density) => void
}

const items: { value: Density; icon: React.ReactNode; label: string }[] = [
  { value: 'compact', icon: <Minus className="w-3.5 h-3.5" />, label: 'Compact' },
  { value: 'comfortable', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Comfortable' },
  { value: 'spacious', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Spacious' },
]

export default function DensityToggle({ current, onChange }: DensityToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`
            inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all
            ${current === item.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}
