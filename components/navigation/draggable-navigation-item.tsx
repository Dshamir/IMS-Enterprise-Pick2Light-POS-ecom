"use client"

import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import type { Identifier, XYCoord } from 'dnd-core'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react'

interface NavigationItem {
  id: string
  name: string
  href?: string | null
  icon_name: string
  parent_id?: string | null
  display_order: number
  is_visible: number
  is_group: number
  badge_key?: string | null
  highlight?: number
  subRoutes?: NavigationItem[]
}

interface DraggableNavigationItemProps {
  item: NavigationItem
  index: number
  getIcon: (iconName: string) => any
  onMove: (dragIndex: number, hoverIndex: number) => void
  onToggleVisibility: (id: string, currentVisibility: number) => void
  onEdit: (item: NavigationItem) => void
  onDelete: (id: string, name: string) => void
}

interface DragItem {
  index: number
  id: string
  type: string
}

export function DraggableNavigationItem({
  item,
  index,
  getIcon,
  onMove,
  onToggleVisibility,
  onEdit,
  onDelete,
}: DraggableNavigationItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: 'navigation-item',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect()

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position
      const clientOffset = monitor.getClientOffset()

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex)

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'navigation-item',
    item: () => {
      return { id: item.id, index }
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  drag(drop(ref))

  const Icon = getIcon(item.icon_name)

  return (
    <Card
      ref={ref}
      data-handler-id={handlerId}
      className={`hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div className="cursor-move">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Group Indicator */}
          {item.is_group === 1 ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : null}

          {/* Dynamic Icon */}
          <div className="flex items-center justify-center h-8 w-8 rounded bg-muted">
            <Icon className="h-4 w-4" />
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{item.name}</div>
            <div className="text-sm text-muted-foreground truncate">
              {item.href || (item.is_group === 1 ? 'Group' : 'No path')}
            </div>
            {item.is_group === 1 && (
              <div className="text-xs text-muted-foreground">
                {item.subRoutes?.length || 0} items in group
              </div>
            )}
          </div>

          {/* Badges */}
          {item.highlight === 1 && (
            <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded">
              Highlighted
            </span>
          )}
          {item.is_visible === 0 && (
            <span className="text-xs bg-gray-500/20 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
              Hidden
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Visibility Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(item.id, item.is_visible)}
              title={item.is_visible ? 'Hide item' : 'Show item'}
            >
              {item.is_visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>

            {/* Edit Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              title="Edit item"
            >
              <Edit className="h-4 w-4" />
            </Button>

            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Delete item">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Navigation Item</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{item.name}"?
                    {item.is_group === 1 && item.subRoutes && item.subRoutes.length > 0 && (
                      <span className="block mt-2 font-semibold text-amber-600">
                        ⚠️ This group contains {item.subRoutes.length} item(s) that will also be deleted.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id, item.name)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Child Items (if group) */}
        {item.is_group === 1 && item.subRoutes && item.subRoutes.length > 0 && (
          <div className="ml-12 mt-2 space-y-1 border-l-2 border-muted pl-4">
            {item.subRoutes.map((subItem) => {
              const SubIcon = getIcon(subItem.icon_name)
              return (
                <div key={subItem.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <SubIcon className="h-3 w-3" />
                  <span>{subItem.name}</span>
                  <span className="text-xs">({subItem.href})</span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
