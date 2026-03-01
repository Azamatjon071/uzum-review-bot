import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

interface KanbanColumn<T> {
  id: string
  title: string
  color: string
  items: T[]
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn<T>[]
  renderCard: (item: T) => ReactNode
  onMove?: (itemId: string, fromCol: string, toCol: string) => void
  getItemId: (item: T) => string
}

export default function KanbanBoard<T>({ columns, renderCard, onMove, getItemId }: KanbanBoardProps<T>) {
  const [dragItem, setDragItem] = useState<{ id: string; fromCol: string } | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (itemId: string, colId: string) => {
    setDragItem({ id: itemId, fromCol: colId })
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(colId)
  }

  const handleDrop = (colId: string) => {
    if (dragItem && dragItem.fromCol !== colId && onMove) {
      onMove(dragItem.id, dragItem.fromCol, colId)
    }
    setDragItem(null)
    setDragOverCol(null)
  }

  const handleDragEnd = () => {
    setDragItem(null)
    setDragOverCol(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {columns.map((col) => (
        <div
          key={col.id}
          className={cn(
            'flex-shrink-0 w-72 rounded-xl border transition-all duration-200',
            dragOverCol === col.id
              ? 'border-primary/40 bg-primary/5 shadow-uzum'
              : 'border-border bg-muted/20',
          )}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDrop={() => handleDrop(col.id)}
          onDragLeave={() => setDragOverCol(null)}
        >
          {/* Column header */}
          <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border/50">
            <div className={cn('w-2.5 h-2.5 rounded-full', col.color)} />
            <span className="text-sm font-semibold text-foreground">{col.title}</span>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {col.items.length}
            </span>
          </div>

          {/* Column items */}
          <div className="p-2.5 space-y-2 min-h-[120px] max-h-[calc(100vh-280px)] overflow-y-auto">
            {col.items.length === 0 && (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60">
                No items
              </div>
            )}
            {col.items.map((item) => {
              const itemId = getItemId(item)
              return (
                <div
                  key={itemId}
                  draggable={!!onMove}
                  onDragStart={() => handleDragStart(itemId, col.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'rounded-xl border bg-card p-3 transition-all duration-200',
                    onMove && 'cursor-grab active:cursor-grabbing hover:shadow-card-hover hover:border-primary/20',
                    dragItem?.id === itemId && 'opacity-40 scale-95',
                  )}
                >
                  {onMove && (
                    <div className="flex justify-center mb-1.5">
                      <GripVertical className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                  {renderCard(item)}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
