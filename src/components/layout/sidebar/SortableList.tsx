import { useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { GripVertical } from 'lucide-react'

interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  renderItem?: (item: T, index: number) => React.ReactNode
  children?: (item: T, index: number) => React.ReactNode
  onReorder: (items: T[]) => void
  className?: string
  showDragHandle?: boolean
}

export function SortableList<T>({
  items,
  getId,
  renderItem,
  children,
  onReorder,
  className,
  showDragHandle = false,
}: SortableListProps<T>) {
  const render = renderItem || children!
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setIsLongPress(false)
  }, [])

  const handleReorder = useCallback((sourceId: string, targetIndex: number) => {
    const sourceIndex = items.findIndex(item => getId(item) === sourceId)
    if (sourceIndex === -1 || sourceIndex === targetIndex) return
    const newItems = [...items]
    const [removed] = newItems.splice(sourceIndex, 1)
    newItems.splice(targetIndex, 0, removed)
    onReorder(newItems)
  }, [items, getId, onReorder])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggingId == null) return
    const sourceIndex = items.findIndex(item => getId(item) === draggingId)
    if (sourceIndex !== -1 && index !== sourceIndex) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId) handleReorder(sourceId, index)
    setDraggingId(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverIndex(null)
  }

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      setDraggingId(id)
      if (navigator.vibrate) navigator.vibrate(50)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearLongPress()
    }
    if (!isLongPress || !containerRef.current || draggingId == null) return
    e.preventDefault()
    const containerRect = containerRef.current.getBoundingClientRect()
    const relativeY = touch.clientY - containerRect.top + containerRef.current.scrollTop
    let overIndex = 0
    for (let i = 0; i < items.length; i++) {
      const el = itemRefs.current.get(getId(items[i]))
      if (el) {
        const centerY = el.offsetTop + el.offsetHeight / 2
        if (relativeY > centerY) overIndex = i + 1
      }
    }
    setDragOverIndex(overIndex)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isLongPress && draggingId != null && dragOverIndex != null) {
      e.preventDefault()
      handleReorder(draggingId, dragOverIndex)
    }
    clearLongPress()
    setDraggingId(null)
    setDragOverIndex(null)
    touchStartPos.current = null
  }

  const draggingIndex = draggingId != null
    ? items.findIndex(item => getId(item) === draggingId)
    : -1

  return (
    <div ref={containerRef} className={className}>
      {items.map((item, index) => {
        const id = getId(item)
        const isDragging = id === draggingId
        const showDropLine = dragOverIndex != null && dragOverIndex === index && index !== draggingIndex
        return (
          <div
            key={id}
            ref={el => { if (el) itemRefs.current.set(id, el) }}
            draggable
            onDragStart={e => handleDragStart(e, id)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={e => handleTouchStart(e, id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              'relative transition-opacity duration-200 group',
              isDragging && 'opacity-40',
              (isLongPress && isDragging) && 'opacity-60'
            )}
          >
            {showDropLine && (
              <div className="absolute -top-[1px] left-2 right-2 h-[2px] bg-primary rounded-full z-10" />
            )}
            {showDragHandle && (
              <div
                className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  isDragging && 'opacity-100'
                )}
                onClick={e => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
            )}
            <div className={cn(showDragHandle && 'group-hover:pl-4', isDragging && showDragHandle && 'pl-4')}>
              {render(item, index)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
