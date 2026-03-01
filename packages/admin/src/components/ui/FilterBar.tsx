import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChip {
  key: string
  label: string
  active: boolean
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  chips?: FilterChip[]
  onChipToggle?: (key: string) => void
  children?: React.ReactNode
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  chips,
  onChipToggle,
  children,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-sm group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Chips */}
      {chips && chips.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onChipToggle?.(chip.key)}
              className={cn(
                'shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200',
                chip.active
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/30',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Extra controls */}
      {children}
    </div>
  )
}
