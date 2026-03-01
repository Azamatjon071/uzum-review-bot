import { clsx } from 'clsx'

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
      className={clsx(
        'rounded-xl border bg-card text-card-foreground transition-all',
        paddingMap[padding],
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.99]',
        selected && 'ring-2 ring-primary border-primary/50',
        !selected && 'border-border shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
