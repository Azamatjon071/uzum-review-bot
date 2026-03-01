import { clsx } from 'clsx'

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

interface StatusBadgeProps {
  variant: StatusVariant
  children: React.ReactNode
  dot?: boolean
  size?: 'sm' | 'md'
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-success/10 text-success ring-success/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  error: 'bg-destructive/10 text-destructive ring-destructive/20',
  info: 'bg-primary/10 text-primary ring-primary/20',
  neutral: 'bg-muted text-muted-foreground ring-border',
  primary: 'bg-primary/10 text-primary ring-primary/20',
}

const dotColors: Record<StatusVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
}

export default function StatusBadge({ variant, children, dot = false, size = 'sm' }: StatusBadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center font-medium ring-1 ring-inset rounded-full',
      variantClasses[variant],
      size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-sm gap-1.5'
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
