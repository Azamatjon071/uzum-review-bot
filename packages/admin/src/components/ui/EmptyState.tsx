import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export default function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-8 px-4' : 'py-16 px-4',
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-2xl bg-muted/60 mb-4',
        compact ? 'w-10 h-10' : 'w-14 h-14',
      )}>
        {icon || <Inbox className={cn('text-muted-foreground/60', compact ? 'w-5 h-5' : 'w-7 h-7')} />}
      </div>
      <h3 className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
