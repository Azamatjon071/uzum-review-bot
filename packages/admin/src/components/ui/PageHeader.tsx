import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  badge?: ReactNode
  icon?: ReactNode
}

export default function PageHeader({ title, description, actions, badge, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">{actions}</div>}
    </div>
  )
}
