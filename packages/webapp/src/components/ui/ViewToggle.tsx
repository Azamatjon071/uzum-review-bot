import { motion } from 'framer-motion'
import { List, LayoutGrid, Table2, Columns3 } from 'lucide-react'
import type { ViewMode } from '@/hooks/useViewPreferences'

interface ViewToggleProps {
  current: ViewMode
  onChange: (mode: ViewMode) => void
  options?: ViewMode[]
}

const icons: Record<ViewMode, React.ReactNode> = {
  list:   <List      className="w-3.5 h-3.5" />,
  card:   <LayoutGrid className="w-3.5 h-3.5" />,
  grid:   <LayoutGrid className="w-3.5 h-3.5" />,
  table:  <Table2    className="w-3.5 h-3.5" />,
  kanban: <Columns3  className="w-3.5 h-3.5" />,
}

export default function ViewToggle({
  current,
  onChange,
  options = ['list', 'card'],
}: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-xl bg-muted/40 p-0.5 gap-0.5">
      {options.map((mode) => {
        const isActive = current === mode
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`relative inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={isActive}
            aria-label={mode}
          >
            {isActive && (
              <motion.span
                layoutId="view-toggle-bg"
                className="absolute inset-0 rounded-lg bg-primary/20"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
            <span className="relative z-10">{icons[mode]}</span>
          </button>
        )
      })}
    </div>
  )
}
