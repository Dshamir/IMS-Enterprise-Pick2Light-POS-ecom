# Navigation Menu Editor - Quick Reference

## Component Files
```
/components/navigation/
├── navigation-editor.tsx (310 lines) - Main editor interface
├── navigation-item-dialog.tsx (309 lines) - Create/edit dialog
└── draggable-navigation-item.tsx (238 lines) - Drag-drop card

/app/api/navigation/
├── route.ts - GET (list), POST (create)
├── [id]/route.ts - GET, PUT (update), DELETE
├── reorder/route.ts - POST (bulk reorder)
└── reset/route.ts - POST (restore defaults)
```

## Database Schema
```sql
navigation_items (
  id, name, href, icon_name, parent_id,
  display_order, is_visible, is_group,
  badge_key, highlight
)
```

## API Endpoints
```bash
# List all items
GET /api/navigation
→ { items: [...] }

# Create item
POST /api/navigation
{ name, href, icon_name, parent_id, is_visible, is_group, badge_key, highlight }
→ { success, id, message }

# Get single item
GET /api/navigation/{id}
→ { id, name, href, ... }

# Update item
PUT /api/navigation/{id}
{ name?, href?, icon_name?, ... }
→ { success, message }

# Delete item
DELETE /api/navigation/{id}
→ { success, message, childrenDeleted }

# Reorder items
POST /api/navigation/reorder
{ updates: [{ id, display_order }] }
→ { success, message, updatedCount }

# Reset to defaults
POST /api/navigation/reset
→ { success, message }
```

## React DnD Setup
```typescript
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

<DndProvider backend={HTML5Backend}>
  {/* Draggable items */}
</DndProvider>
```

## Dynamic Icon Mapping
```typescript
import * as LucideIcons from 'lucide-react'

const getIcon = (iconName: string) => {
  return (LucideIcons as any)[iconName] || LinkIcon
}

const Icon = getIcon('Home')
<Icon className="h-4 w-4" />
```

## State Management
```typescript
// Dialog control
const [dialogOpen, setDialogOpen] = useState(false)
const [editingItem, setEditingItem] = useState<NavigationItem | null>(null)
const [createAsGroup, setCreateAsGroup] = useState(false)

// Open for create
setEditingItem(null)
setCreateAsGroup(false) // or true for group
setDialogOpen(true)

// Open for edit
setEditingItem(item)
setDialogOpen(true)
```

## Drag-Drop Implementation
```typescript
// In draggable component
const [{ isDragging }, drag] = useDrag({
  type: 'navigation-item',
  item: () => ({ id, index }),
  collect: (monitor) => ({ isDragging: monitor.isDragging() })
})

const [{ handlerId }, drop] = useDrop({
  accept: 'navigation-item',
  hover(item, monitor) {
    // Reordering logic
    onMove(dragIndex, hoverIndex)
    item.index = hoverIndex
  }
})

drag(drop(ref))
```

## Database Helpers
```typescript
// In /lib/database/sqlite.ts
sqliteHelpers.getAllNavigationItems()
sqliteHelpers.getNavigationItemById(id)
sqliteHelpers.createNavigationItem(data)
sqliteHelpers.updateNavigationItem(id, updates)
sqliteHelpers.deleteNavigationItem(id)
sqliteHelpers.reorderNavigationItems(updates)
sqliteHelpers.resetNavigationToDefault()
```

## Common Patterns

### Loading Items
```typescript
const [items, setItems] = useState<NavigationItem[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function load() {
    const res = await fetch('/api/navigation')
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }
  load()
}, [])
```

### Creating Item
```typescript
const body = {
  name: 'New Link',
  href: '/new',
  icon_name: 'Link',
  parent_id: null,
  is_visible: 1,
  is_group: 0
}

const res = await fetch('/api/navigation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
```

### Updating Item
```typescript
const res = await fetch(`/api/navigation/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Updated Name' })
})
```

### Reordering
```typescript
// After drag-drop, get new order
const updates = items.map((item, index) => ({
  id: item.id,
  display_order: index
}))

await fetch('/api/navigation/reorder', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ updates })
})
```

## Testing Commands
```bash
# List all items
curl http://localhost:3000/api/navigation

# Create item
curl -X POST http://localhost:3000/api/navigation \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","href":"/test","icon_name":"Link"}'

# Update item
curl -X PUT http://localhost:3000/api/navigation/nav-home \
  -H "Content-Type: application/json" \
  -d '{"name":"Homepage"}'

# Delete item
curl -X DELETE http://localhost:3000/api/navigation/nav-home

# Reorder
curl -X POST http://localhost:3000/api/navigation/reorder \
  -H "Content-Type: application/json" \
  -d '{"updates":[{"id":"nav-home","display_order":0}]}'

# Reset
curl -X POST http://localhost:3000/api/navigation/reset
```

## Icon Options
```typescript
const POPULAR_ICONS = [
  'Home', 'LayoutDashboard', 'Package', 'ShoppingCart', 'Users',
  'Settings', 'AlertTriangle', 'BarChart3', 'Barcode', 'Bot',
  'Wrench', 'Image', 'Factory', 'Hash', 'Search', 'Zap',
  'BookOpen', 'Network', 'Database', 'Shield', 'Bell',
  'FileText', 'Folder', 'FolderOpen', 'FolderPlus', 'File',
  'Link', 'Mail', 'Phone', 'Calendar', 'Clock'
]
```

## TypeScript Types
```typescript
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

interface DragItem {
  index: number
  id: string
  type: string
}
```

## Performance Tips
- Use `useMemo` for expensive computations
- Memoize icon components to prevent recreation
- Batch reorder calls (single API call for all changes)
- Use optimistic UI updates (update state immediately, sync to API after)
- Implement virtual scrolling if menu exceeds 50 items

## Security Checklist
- [ ] Validate all inputs server-side
- [ ] Use prepared statements (SQL injection prevention)
- [ ] Sanitize icon names (XSS prevention)
- [ ] Implement authorization checks
- [ ] Rate limit API endpoints
- [ ] Log all modification operations

## Debugging Tips
```typescript
// Check navigation loaded
console.log('Navigation items:', items)

// Check icon mapping
console.log('Icon for Home:', getIcon('Home'))

// Check drag state
console.log('Is dragging:', isDragging)

// Check API response
const res = await fetch('/api/navigation')
console.log('API status:', res.status)
console.log('API data:', await res.json())
```

## Common Errors

### "Cannot find module './vendor-chunks'"
**Cause**: Webpack cache corruption
**Fix**: `rm -rf .next && npm run dev`

### "params should be awaited"
**Cause**: Next.js 15 async params requirement
**Fix**: `const params = await params` in API routes
**Priority**: Low (warning only)

### "Icon not displaying"
**Cause**: Case-sensitive icon name or typo
**Fix**: Use exact Lucide React icon name (e.g., "Home" not "home")

### "Drag-drop not working"
**Cause**: DndProvider not wrapping components
**Fix**: Ensure `<DndProvider backend={HTML5Backend}>` wraps editor

---

**Last Updated**: October 12, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
