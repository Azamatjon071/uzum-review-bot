import { clsx } from 'clsx'

export type StatusVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  variant: StatusVariant
  children: React.ReactNode
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses: Record<StatusVariant, string> = {
  primary: 'bg-primary/12 text-primary ring-primary/25',
  success: 'bg-success/12 text-success ring-success/25',
  warning: 'bg-warning/12 text-warning ring-warning/25',
  error:   'bg-destructive/12 text-destructive ring-destructive/25',
  info:    'bg-info/12 text-info ring-info/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
}

const dotColorClasses: Record<StatusVariant, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error:   'bg-destructive',
  info:    'bg-info',
  neutral: 'bg-muted-foreground',
}

export default function StatusBadge({
  variant,
  children,
  dot = false,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium ring-1 ring-inset rounded-full',
        variantClasses[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5',
        className
      )}
    >
      {dot && (
        <span
          className={clsx('rounded-full shrink-0', dotColorClasses[variant], size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')}
        />
      )}
      {children}
    </span>
  )
}
