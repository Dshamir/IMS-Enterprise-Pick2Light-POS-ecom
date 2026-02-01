# Troubleshooting Guide

## Common Issues and Solutions

### **Issue 1: Raw UUIDs Displayed Instead of Names**

#### **Symptoms**
- UI shows `137a47e674e46179e996a40668389c1d` instead of `Units (unit)`
- Dropdown displays UUIDs instead of readable names
- Only some items show correct names while others show raw IDs

#### **Root Cause**
Database query not joining with related tables to get display names.

#### **Solution**
```typescript
// BEFORE (Problem)
getAllProducts: () => {
  return db.prepare('SELECT * FROM products ORDER BY name').all()
}

// AFTER (Solution)
getAllProducts: () => {
  return db.prepare(`
    SELECT 
      p.*,
      u.name as unit_name,
      u.display_name as unit_display_name,
      u.symbol as unit_symbol
    FROM products p
    LEFT JOIN units u ON p.unit_id = u.id
    ORDER BY p.name
  `).all()
}
```

#### **Prevention**
- Always JOIN related tables when displaying related data
- Use LEFT JOIN to handle missing relationships gracefully
- Include display fields in initial queries

### **Issue 2: Dropdown Shows Technical Values**

#### **Symptoms**
- SelectValue component displays UUID instead of unit name
- Dropdown works but shows unfriendly technical identifiers
- Users confused by technical values in UI

#### **Root Cause**
SelectValue displaying raw editValue instead of transformed display value.

#### **Solution**
```typescript
// BEFORE (Problem)
<SelectValue placeholder="Select a unit" />

// AFTER (Solution)
<SelectValue placeholder="Select a unit">
  {selectedUnit ? `${selectedUnit.display_name} (${selectedUnit.symbol})` : "Select a unit"}
</SelectValue>
```

#### **Prevention**
- Always transform technical values for display
- Use helper functions to find display representations
- Separate storage values from display values

### **Issue 3: Inconsistent Field Styling**

#### **Symptoms**
- Some fields use badges, others use plain text
- Visual inconsistency between similar fields
- User confusion about which fields are editable

#### **Root Cause**
Different rendering logic for similar field types.

#### **Solution**
```typescript
// BEFORE (Problem)
{field === 'category' ? (
  <Badge>{value}</Badge>
) : (
  <span>{value}</span> // Different styling
)}

// AFTER (Solution)
{field === 'category' ? (
  <Badge className="capitalize flex-1">{value || '-'}</Badge>
) : field === 'unit_id' ? (
  <Badge className="capitalize flex-1">{displayValue || '-'}</Badge>
) : (
  <span className="flex-1">{value || '-'}</span>
)}
```

#### **Prevention**
- Use consistent styling for similar field types
- Create reusable components for common patterns
- Document UI patterns for consistency

### **Issue 4: N+1 Query Performance Problems**

#### **Symptoms**
- Slow page loading with many items
- Database showing excessive query count
- Performance degrades with more products

#### **Root Cause**
Making individual queries for each item instead of batch operations.

#### **Solution**
```typescript
// BEFORE (Problem)
products.map(product => {
  const unit = getUnitById(product.unit_id) // N individual queries
})

// AFTER (Solution)
// Single query with JOIN gets all data at once
SELECT p.*, u.name, u.display_name, u.symbol 
FROM products p LEFT JOIN units u ON p.unit_id = u.id
```

#### **Prevention**
- Use JOIN queries for related data
- Batch operations instead of individual calls
- Profile database queries during development

### **Issue 5: Missing Creation Capabilities**

#### **Symptoms**
- Users can select from existing items but can't create new ones
- Inconsistent functionality compared to similar fields
- Workflow interrupted when needed item doesn't exist

#### **Root Cause**
Missing plus button and creation modal for related entities.

#### **Solution**
```typescript
// Add plus button next to dropdown
<Button
  size="sm"
  variant="outline"
  onClick={() => setIsUnitModalOpen(true)}
  className="h-6 w-6 p-0"
  title="Add new unit"
>
  <Plus className="h-3 w-3" />
</Button>

// Add creation modal
<UnitModal
  isOpen={isUnitModalOpen}
  onOpenChange={setIsUnitModalOpen}
  onUnitCreated={handleUnitCreated}
/>
```

#### **Prevention**
- Include creation capabilities with selection interfaces
- Follow patterns from similar fields in the application
- Test complete user workflows, not just display

### **Issue 6: State Synchronization Problems**

#### **Symptoms**
- Creating new item doesn't update current selection
- UI shows stale data after creation
- Users have to refresh to see changes

#### **Root Cause**
Not updating all related state after creation operations.

#### **Solution**
```typescript
const handleUnitCreated = (newUnit) => {
  // Update the list
  setUnits(prev => [...prev, newUnit])
  
  // Update current selection
  setEditValue(newUnit.id)
  
  // Show feedback
  toast({
    title: "Success",
    description: `Unit "${newUnit.display_name}" created and selected!`,
  })
}
```

#### **Prevention**
- Update all related state after mutations
- Provide clear feedback for user actions
- Test state changes in real user workflows

### **Issue 7: Port Conflicts in Development**

#### **Symptoms**
- `npm run dev` hangs or fails to start
- "Port already in use" errors
- Development server won't start

#### **Root Cause**
Previous development server processes still running.

#### **Solution**
```bash
# Find and kill conflicting processes
lsof -ti:3000 | xargs kill -9

# Or use pkill
pkill -f "next dev"

# Then restart
npm run dev
```

#### **Prevention**
- Always properly stop development servers
- Use process managers for development
- Check for running processes before starting

### **Issue 8: Build Failures After Changes**

#### **Symptoms**
- TypeScript compilation errors
- Build succeeds but runtime errors
- Missing dependencies or imports

#### **Root Cause**
Missing imports, type mismatches, or dependency issues.

#### **Solution**
```bash
# Check TypeScript errors
npm run typecheck

# Run full build
npm run build

# Fix import issues
# Add missing imports
import { Badge } from "@/components/ui/badge"

# Fix type issues
interface Product {
  // Add missing fields
  unit_name?: string | null
  unit_symbol?: string | null
}
```

#### **Prevention**
- Run TypeScript checks frequently during development
- Use IDE with TypeScript support
- Test builds before committing changes

## Debugging Strategies

### **1. Systematic Investigation**
1. **Identify the symptom** - what exactly is wrong?
2. **Trace the data flow** - database → API → UI
3. **Check each layer** - where does the problem occur?
4. **Fix at the source** - address root cause, not symptoms

### **2. Database Debugging**
```sql
-- Check if data exists
SELECT * FROM products WHERE id = '...' LIMIT 1;

-- Check relationships
SELECT p.name, u.display_name 
FROM products p 
LEFT JOIN units u ON p.unit_id = u.id 
WHERE p.id = '...';

-- Check for missing relationships
SELECT COUNT(*) FROM products WHERE unit_id IS NULL;
```

### **3. API Debugging**
```typescript
// Add logging to API endpoints
console.log('Products query result:', products)
console.log('Unit data:', { unit_id: product.unit_id, unit_name: product.unit_name })

// Check response structure
curl -s "http://localhost:3000/api/products" | jq '.products[0]'
```

### **4. UI Debugging**
```typescript
// Add console logs to components
console.log('Product data:', product)
console.log('Units available:', units)
console.log('Selected unit:', selectedUnit)

// Use React DevTools to inspect state
// Check component props and state
```

### **5. Performance Debugging**
```typescript
// Time database queries
console.time('getAllProducts')
const products = getAllProducts()
console.timeEnd('getAllProducts')

// Check query counts
// Monitor database query logs
// Use browser DevTools Network tab
```

## Best Practices for Avoiding Issues

### **Development Workflow**
1. **Start with database** - get data structure right first
2. **Test queries** - verify data retrieval before UI
3. **Follow patterns** - use existing successful patterns
4. **Test incrementally** - don't build everything at once

### **Code Quality**
1. **Type safety** - use TypeScript effectively
2. **Error handling** - plan for failure scenarios
3. **Consistent patterns** - follow established conventions
4. **Documentation** - document complex logic

### **Testing Strategy**
1. **Test real workflows** - not just happy paths
2. **Test with real data** - not just mock data
3. **Test performance** - with realistic data volumes
4. **Test error scenarios** - network failures, bad data

### **Deployment Checklist**
1. **Build successfully** - `npm run build`
2. **TypeScript clean** - `npm run typecheck`
3. **Tests passing** - run test suite
4. **Database migrations** - applied correctly
5. **Environment variables** - configured properly

## When to Ask for Help

### **Red Flags**
- Problem affects multiple unrelated components
- Performance significantly degrades
- Data integrity concerns
- Security implications
- Breaking changes to existing functionality

### **Information to Provide**
1. **Exact error messages** - copy/paste full errors
2. **Steps to reproduce** - detailed reproduction steps
3. **Expected vs actual behavior** - what should happen vs what happens
4. **Environment details** - OS, Node version, etc.
5. **Recent changes** - what was modified recently

### **Escalation Path**
1. **Documentation** - check existing docs first
2. **Code review** - look for similar patterns
3. **Testing** - isolate the problem
4. **Team discussion** - get input from colleagues
5. **External resources** - Stack Overflow, GitHub issues

Remember: Most issues have been encountered before. Document solutions so future developers can benefit from your experience.