import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
