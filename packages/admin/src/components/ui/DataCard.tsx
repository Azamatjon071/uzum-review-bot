import { cn } from '@/lib/utils'

interface DataCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

export default function DataCard({ children, className, onClick, selected, padding = 'md' }: DataCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card text-card-foreground transition-all duration-200',
        paddingMap[padding],
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-primary/20 active:scale-[0.99]',
        selected
          ? 'ring-2 ring-primary/50 border-primary/40 shadow-uzum'
          : 'border-border shadow-card',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
