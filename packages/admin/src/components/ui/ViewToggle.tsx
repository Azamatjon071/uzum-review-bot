import { List, LayoutGrid, Table2, Columns3, GripVertical } from 'lucide-react'
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

const labels: Record<ViewMode, string> = {
  list: 'List',
  card: 'Cards',
  grid: 'Grid',
  table: 'Table',
  kanban: 'Board',
}

export default function ViewToggle({ current, onChange, options = ['table', 'card'] }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {options.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`
            inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all
            ${current === mode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          title={labels[mode]}
        >
          {icons[mode]}
          <span className="hidden sm:inline">{labels[mode]}</span>
        </button>
      ))}
    </div>
  )
}
