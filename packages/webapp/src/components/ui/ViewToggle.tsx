import { List, LayoutGrid, Table2, Columns3 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ViewMode } from '@/hooks/useViewPreferences'

interface ViewToggleProps {
  current: ViewMode
  onChange: (mode: ViewMode) => void
  options?: ViewMode[]
}

const icons: Record<ViewMode, React.ReactNode> = {
  list: <List className="w-4 h-4" />,
  card: <LayoutGrid className="w-4 h-4" />,
  grid: <LayoutGrid className="w-4 h-4" />,
  table: <Table2 className="w-4 h-4" />,
  kanban: <Columns3 className="w-4 h-4" />,
}

export default function ViewToggle({ current, onChange, options = ['list', 'card'] }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
      {options.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`relative inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            current === mode ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {current === mode && (
            <motion.span
              layoutId="view-toggle-bg"
              className="absolute inset-0 rounded-md bg-card shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{icons[mode]}</span>
        </button>
      ))}
    </div>
  )
}
