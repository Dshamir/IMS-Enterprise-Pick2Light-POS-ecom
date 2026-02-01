# Technical Architecture Patterns

## Database Query Patterns

### **Pattern 1: Efficient Related Data Retrieval**

#### **Problem: N+1 Query Anti-Pattern**
```typescript
// BAD: Results in N+1 queries
const getAllProducts = () => {
  return db.prepare('SELECT * FROM products ORDER BY name').all()
}

// Later in API:
products.map(product => {
  const unit = getUnitById(product.unit_id) // N additional queries
})
```

#### **Solution: Single JOIN Query**
```typescript
// GOOD: Single query with related data
const getAllProducts = () => {
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

#### **Benefits**
- **Performance**: Single query instead of N+1
- **Efficiency**: Related data pre-loaded
- **Scalability**: Performance doesn't degrade with more products

### **Pattern 2: Flexible Foreign Key Resolution**

#### **Problem: Rigid ID-Only Validation**
```typescript
// BAD: Only accepts UUIDs
const isValidUnit = (unitId) => {
  return db.prepare('SELECT id FROM units WHERE id = ?').get(unitId)
}
```

#### **Solution: Name or ID Resolution**
```typescript
// GOOD: Accepts both names and UUIDs
const resolveUnitId = (unitNameOrId) => {
  const db = getDatabase()
  
  // Try UUID first
  let unit = db.prepare('SELECT * FROM units WHERE id = ?').get(unitNameOrId)
  
  // Fallback to name lookup
  if (!unit) {
    unit = db.prepare('SELECT * FROM units WHERE name = ?').get(unitNameOrId)
  }
  
  return unit ? unit.id : null
}
```

#### **Benefits**
- **User-friendly**: Accepts readable names like "UNITS"
- **Backward compatible**: Still accepts UUIDs
- **Flexible**: Works with both import formats

## API Response Patterns

### **Pattern 3: Consistent Data Transformation**

#### **Problem: Inconsistent API Responses**
```typescript
// BAD: Sometimes has unit object, sometimes doesn't
return {
  ...product,
  unit: someCondition ? unitObject : null
}
```

#### **Solution: Predictable Response Structure**
```typescript
// GOOD: Always includes unit fields
return {
  ...product,
  unit: product.unit_id ? {
    id: product.unit_id,
    name: product.unit_name,
    display_name: product.unit_display_name,
    symbol: product.unit_symbol
  } : null,
  unit_name: product.unit_display_name,
  unit_symbol: product.unit_symbol,
  // Other fields...
}
```

#### **Benefits**
- **Predictability**: UI always knows what to expect
- **Flexibility**: Both nested and flat access patterns
- **Maintainability**: Consistent structure across endpoints

### **Pattern 4: Error Handling with Fallbacks**

#### **Problem: Brittle Error Handling**
```typescript
// BAD: Fails completely on any error
const getUnits = async () => {
  const response = await fetch('/api/units')
  return response.json() // Throws if API fails
}
```

#### **Solution: Graceful Degradation**
```typescript
// GOOD: Fallback strategies
const loadUnits = async () => {
  try {
    setIsLoadingUnits(true)
    const response = await fetch('/api/units')
    
    if (response.ok) {
      const data = await response.json()
      setUnits(data.units || [])
    } else {
      console.error('Failed to load units:', response.status)
      // Could add default units fallback here
      setUnits([])
    }
  } catch (error) {
    console.error('Error loading units:', error)
    setUnits([])
    // Show user-friendly error message
  } finally {
    setIsLoadingUnits(false)
  }
}
```

#### **Benefits**
- **Resilience**: Doesn't break on API failures
- **User experience**: Graceful degradation
- **Debugging**: Clear error logging

## UI Component Patterns

### **Pattern 5: Consistent Field Rendering**

#### **Problem: Inconsistent Field Styling**
```typescript
// BAD: Different styling for similar fields
{field === 'category' ? (
  <Badge>{value}</Badge>
) : (
  <span>{value}</span> // Different for unit field
)}
```

#### **Solution: Unified Field Rendering**
```typescript
// GOOD: Consistent styling for similar fields
{field === 'category' ? (
  <Badge className="capitalize flex-1">{value || '-'}</Badge>
) : field === 'unit_id' ? (
  <Badge className="capitalize flex-1">{displayValue || '-'}</Badge>
) : (
  <span className="flex-1">{value || '-'}</span>
)}
```

#### **Benefits**
- **Visual consistency**: Similar fields look identical
- **User experience**: Predictable interface behavior
- **Maintainability**: Easy to update styling globally

### **Pattern 6: Modal Creation Pattern**

#### **Problem: Inconsistent Modal Implementations**
```typescript
// BAD: Different modal patterns for different entities
const CategoryModal = ({ isOpen, onClose, onCreate }) => {
  // Different structure
}

const UnitModal = ({ open, setOpen, onUnitCreated }) => {
  // Different props and behavior
}
```

#### **Solution: Standardized Modal Pattern**
```typescript
// GOOD: Consistent modal interface
interface EntityModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEntityCreated: (entity: any) => void
}

export function UnitModal({ isOpen, onOpenChange, onUnitCreated }: EntityModalProps) {
  const [formData, setFormData] = useState(initialState)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const data = await response.json()
        onUnitCreated(data.unit)
        onOpenChange(false)
        setFormData(initialState)
      }
    } catch (error) {
      // Error handling
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### **Benefits**
- **Reusability**: Same pattern for all entity creation
- **Predictability**: Consistent behavior across modals
- **Maintainability**: Easy to update modal behavior globally

### **Pattern 7: Dropdown with Creation**

#### **Problem: Separate Creation Flow**
```typescript
// BAD: Creation in different location
<Select>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {units.map(unit => <SelectItem key={unit.id} value={unit.id}>...)}
  </SelectContent>
</Select>
// Plus button somewhere else...
```

#### **Solution: Integrated Creation Flow**
```typescript
// GOOD: Creation integrated with selection
<div className="flex items-center gap-2">
  <Select value={editValue} onValueChange={setEditValue}>
    <SelectTrigger className="h-8 text-sm flex-1">
      <SelectValue placeholder="Select a unit">
        {selectedUnit ? `${selectedUnit.display_name} (${selectedUnit.symbol})` : "Select a unit"}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {units.map(unit => (
        <SelectItem key={unit.id} value={unit.id}>
          {unit.display_name} ({unit.symbol})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  
  <Button
    size="sm"
    variant="outline"
    onClick={() => setIsUnitModalOpen(true)}
    className="h-6 w-6 p-0"
    title="Add new unit"
  >
    <Plus className="h-3 w-3" />
  </Button>
  
  {/* Save/Cancel buttons */}
</div>
```

#### **Benefits**
- **User experience**: Creation where users expect it
- **Workflow efficiency**: No navigation required
- **Visual clarity**: Clear relationship between selection and creation

## State Management Patterns

### **Pattern 8: Optimistic Updates**

#### **Problem: Slow UI Updates**
```typescript
// BAD: Wait for API response before updating UI
const handleSave = async () => {
  const result = await updateProduct(productId, data)
  if (result.success) {
    // Only update UI after API confirms
    setProducts(prev => prev.map(p => p.id === productId ? result.product : p))
  }
}
```

#### **Solution: Optimistic with Rollback**
```typescript
// GOOD: Update UI immediately, rollback on failure
const handleSave = async () => {
  // Optimistic update
  const optimisticProduct = { ...product, ...updateData }
  setProducts(prev => prev.map(p => p.id === productId ? optimisticProduct : p))
  
  try {
    const result = await updateProduct(productId, updateData)
    if (result.error) {
      // Rollback on error
      setProducts(prev => prev.map(p => p.id === productId ? product : p))
      showError(result.error)
    } else {
      // Confirm with server data
      setProducts(prev => prev.map(p => p.id === productId ? result.product : p))
    }
  } catch (error) {
    // Rollback on exception
    setProducts(prev => prev.map(p => p.id === productId ? product : p))
    showError('Update failed')
  }
}
```

#### **Benefits**
- **Responsiveness**: Immediate UI feedback
- **Reliability**: Rollback on failure
- **User experience**: Feels fast and reliable

### **Pattern 9: Related Data Synchronization**

#### **Problem: Stale Related Data**
```typescript
// BAD: Related data gets out of sync
const handleUnitCreated = (newUnit) => {
  // Only update units list
  setUnits(prev => [...prev, newUnit])
  // editValue still has old value
}
```

#### **Solution: Synchronized Updates**
```typescript
// GOOD: Update all related state
const handleUnitCreated = (newUnit) => {
  // Update units list
  setUnits(prev => [...prev, newUnit])
  
  // Update current selection
  setEditValue(newUnit.id)
  
  // Show success feedback
  toast({
    title: "Success",
    description: `Unit "${newUnit.display_name}" created and selected!`,
  })
}
```

#### **Benefits**
- **Data consistency**: All related state stays in sync
- **User experience**: Smooth workflow continuation
- **Feedback**: Clear confirmation of actions

## Performance Optimization Patterns

### **Pattern 10: Efficient Data Loading**

#### **Problem: Loading All Data Upfront**
```typescript
// BAD: Load everything at once
const loadAllData = async () => {
  const [products, units, categories] = await Promise.all([
    fetch('/api/products').then(r => r.json()),
    fetch('/api/units').then(r => r.json()),
    fetch('/api/categories').then(r => r.json())
  ])
  // Heavy initial load
}
```

#### **Solution: Lazy Loading with Caching**
```typescript
// GOOD: Load on demand with caching
const loadUnits = async () => {
  if (units.length > 0) return // Already loaded
  
  try {
    setIsLoadingUnits(true)
    const response = await fetch('/api/units')
    const data = await response.json()
    setUnits(data.units || [])
  } finally {
    setIsLoadingUnits(false)
  }
}

// Load only when needed
useEffect(() => {
  if (editingCell?.field === 'unit_id') {
    loadUnits()
  }
}, [editingCell])
```

#### **Benefits**
- **Performance**: Only load what's needed
- **Memory efficiency**: Smaller initial payload
- **Scalability**: Handles large datasets better

### **Pattern 11: Debounced Operations**

#### **Problem: Excessive API Calls**
```typescript
// BAD: API call on every keystroke
const handleSearch = (query) => {
  fetch(`/api/products/search?q=${query}`)
    .then(r => r.json())
    .then(setResults)
}

<input onChange={(e) => handleSearch(e.target.value)} />
```

#### **Solution: Debounced Search**
```typescript
// GOOD: Debounced API calls
const debouncedSearch = useMemo(
  () => debounce(async (query) => {
    if (query.length < 3) return
    
    try {
      const response = await fetch(`/api/products/search?q=${query}`)
      const data = await response.json()
      setResults(data.products)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }, 300),
  []
)

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

#### **Benefits**
- **Performance**: Reduced API load
- **User experience**: Smooth typing without lag
- **Server efficiency**: Fewer unnecessary requests

## Testing Patterns

### **Pattern 12: Component Testing Strategy**

#### **Problem: Brittle Tests**
```typescript
// BAD: Testing implementation details
test('unit dropdown shows correct class names', () => {
  render(<ProductList />)
  expect(screen.getByText('Units')).toHaveClass('capitalize flex-1')
})
```

#### **Solution: Behavior-Driven Testing**
```typescript
// GOOD: Testing user behavior
test('user can select unit from dropdown', async () => {
  render(<ProductList products={mockProducts} />)
  
  // Click unit cell to start editing
  await user.click(screen.getByText('Units (unit)'))
  
  // Should show dropdown with available units
  expect(screen.getByRole('combobox')).toBeInTheDocument()
  
  // Select different unit
  await user.click(screen.getByText('Kilograms (kg)'))
  
  // Should update display
  expect(screen.getByText('Kilograms (kg)')).toBeInTheDocument()
})
```

#### **Benefits**
- **Reliability**: Tests actual user workflows
- **Maintainability**: Less brittle than implementation tests
- **Documentation**: Tests serve as usage examples

## Error Handling Patterns

### **Pattern 13: Graceful Error Recovery**

#### **Problem: App Crashes on Errors**
```typescript
// BAD: Unhandled errors crash the app
const loadData = async () => {
  const response = await fetch('/api/units')
  const data = await response.json() // Throws on network error
  setUnits(data.units) // Crashes if data.units is undefined
}
```

#### **Solution: Defensive Error Handling**
```typescript
// GOOD: Graceful error handling
const loadData = async () => {
  try {
    const response = await fetch('/api/units')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data && Array.isArray(data.units)) {
      setUnits(data.units)
    } else {
      console.warn('Invalid units data structure:', data)
      setUnits([])
    }
  } catch (error) {
    console.error('Failed to load units:', error)
    setUnits([])
    
    // Show user-friendly error
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load units. Please try again.",
    })
  }
}
```

#### **Benefits**
- **Stability**: App continues working despite errors
- **User experience**: Clear error messages
- **Debugging**: Detailed error logging

## **Pattern 7: Manufacturing Image Upload Architecture**

### **Problem: Entity-Specific Image Management**
Different manufacturing entities (Projects, Production Lines, BOMs, Production Runs) needed consistent image upload functionality without code duplication.

#### **Anti-Pattern: Component Duplication**
```typescript
// BAD: Separate upload components for each entity
function ProjectImageUpload() { /* duplicate logic */ }
function ProductionLineImageUpload() { /* duplicate logic */ }
function BOMImageUpload() { /* duplicate logic */ }
```

#### **Solution: Generic Upload Pattern with Entity Types**

**1. Type-Safe Entity System:**
```typescript
export type ManufacturingEntityType = 
  | 'projects' 
  | 'production-lines' 
  | 'manufacturing-boms' 
  | 'production-runs'

interface ImageUploadProps {
  entityType: ManufacturingEntityType
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  label?: string
}
```

**2. Generic Upload Action:**
```typescript
export async function uploadManufacturingImage(
  formData: FormData, 
  entityType: ManufacturingEntityType
) {
  const uploadFormData = new FormData()
  uploadFormData.append("image", formData.get("image") as File)
  uploadFormData.append("entityType", entityType)

  const response = await fetch('/api/upload/manufacturing-image', {
    method: 'POST',
    body: uploadFormData
  })

  return response.ok ? { url: (await response.json()).url } : { error: 'Upload failed' }
}
```

**3. Reusable Upload Component:**
```typescript
export function ImageUpload({ entityType, currentImageUrl, onImageChange, label }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('image', file)

    const result = await uploadManufacturingImage(formData, entityType)
    
    if (result.error) {
      setError(result.error)
    } else {
      onImageChange(result.url)
    }
    
    setIsUploading(false)
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {/* Upload UI with drag-and-drop, preview, and validation */}
    </div>
  )
}
```

**4. Entity-Specific Storage Organization:**
```typescript
// API endpoint: /api/upload/manufacturing-image/route.ts
const uploadsDir = join(process.cwd(), "public", "uploads", entityType)
// Results in organized directories:
// /uploads/projects/
// /uploads/production-lines/
// /uploads/manufacturing-boms/
// /uploads/production-runs/
```

**5. Consistent Card Layout Pattern:**
```typescript
// Reusable card layout for all manufacturing entities
<div className="flex gap-4 items-start">
  {/* Image Thumbnail */}
  {entity.image_url ? (
    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
      <img src={entity.image_url} alt={entity.name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
      {getEntityIcon(entityType)} {/* Entity-specific fallback icons */}
    </div>
  )}
  
  {/* Content */}
  <div className="flex-1 min-w-0">
    <CardTitle className="text-lg truncate">{entity.name}</CardTitle>
    {/* Entity-specific content */}
  </div>
  
  {/* Actions */}
  <div className="flex gap-2 flex-shrink-0">
    {/* Edit/Delete buttons */}
  </div>
</div>
```

#### **Implementation Benefits**
- **Code Reusability**: Single upload component serves all manufacturing entities
- **Type Safety**: TypeScript prevents incorrect entity type usage
- **Organized Storage**: Clean file organization by entity type
- **Consistent UX**: Identical upload experience across all manufacturing tabs
- **Maintainability**: Single component to update for all entity types
- **Extensibility**: Easy to add new entity types with minimal code changes

#### **Database Integration Pattern**
```sql
-- Migration 017: Add image support to all manufacturing tables
ALTER TABLE projects ADD COLUMN image_url TEXT;
ALTER TABLE production_lines ADD COLUMN image_url TEXT;
ALTER TABLE manufacturing_boms ADD COLUMN image_url TEXT;
ALTER TABLE production_runs ADD COLUMN image_url TEXT;

-- Performance indexes for image-based queries
CREATE INDEX IF NOT EXISTS idx_projects_image ON projects(image_url) WHERE image_url IS NOT NULL;
-- ... similar for other tables
```

#### **Usage Example in Components**
```typescript
// In any manufacturing dialog component
import { ImageUpload } from '@/components/manufacturing/image-upload'

export function ProductionLineDialog({ productionLine, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: null as string | null
  })

  return (
    <Dialog>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {/* Other form fields */}
          
          <ImageUpload
            entityType="production-lines"
            currentImageUrl={formData.image_url}
            onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, image_url: imageUrl }))}
            label="Production Line Image"
          />
          
          {/* Submit button */}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### **Key Architecture Decisions**
1. **Entity Type Validation**: Prevents incorrect API usage
2. **File Organization**: Entity-specific directories for clean storage
3. **Component Reusability**: Single component reduces maintenance burden
4. **Consistent Patterns**: Same upload flow across all manufacturing entities
5. **Fallback Strategy**: Appropriate icons when images aren't present

## WLED Device Management Patterns

### **Pattern 1: Device CRUD with Connection Testing**

#### **Problem: Managing IoT Devices with Validation**
```typescript
// Managing WLED WiFi LED controllers requires validation and testing
interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
}
```

#### **Solution: Comprehensive Device Management**
```typescript
// Device Manager with Real-time Testing
export function WLEDDeviceManager() {
  const [devices, setDevices] = useState<WLEDDevice[]>([])
  const [filteredDevices, setFilteredDevices] = useState<WLEDDevice[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Load devices with error handling
  const loadDevices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/wled-devices')

      if (response.ok) {
        const devicesData = await response.json()
        setDevices(devicesData)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Devices",
          description: "Could not fetch WLED devices from server"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to load WLED devices"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time search filtering
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDevices(devices)
    } else {
      const filtered = devices.filter(device =>
        device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address.includes(searchTerm)
      )
      setFilteredDevices(filtered)
    }
  }, [devices, searchTerm])
}
```

### **Pattern 2: Form Validation with Connection Testing**

#### **Problem: Validating Device Configuration**
```typescript
// Need comprehensive validation for IP addresses and device parameters
const validateForm = () => {
  // IP address format validation
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipRegex.test(formData.ip_address)) {
    return false
  }

  // IP range validation (0-255 per octet)
  const parts = formData.ip_address.split('.').map(Number)
  if (parts.some(part => part < 0 || part > 255)) {
    return false
  }

  return true
}
```

#### **Solution: Real-time Connection Testing**
```typescript
// Connection Test with User Feedback
const testConnection = async () => {
  if (!formData.ip_address.trim() || !validateForm()) {
    return
  }

  setIsTesting(true)
  setConnectionStatus('idle')

  try {
    const response = await fetch('/api/led-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wled_ip: formData.ip_address,
        segment_id: 0,
        colors: ['#FF0000'],
        duration: 1000
      }),
    })

    if (response.ok) {
      setConnectionStatus('success')
      toast({
        title: "Connection Test Successful",
        description: `WLED device at ${formData.ip_address} is reachable`
      })
    } else {
      setConnectionStatus('error')
      toast({
        variant: "destructive",
        title: "Connection Test Failed",
        description: `Cannot reach WLED device at ${formData.ip_address}`
      })
    }
  } catch (error) {
    setConnectionStatus('error')
    toast({
      variant: "destructive",
      title: "Connection Test Failed",
      description: `Network error while testing ${formData.ip_address}`
    })
  } finally {
    setIsTesting(false)
  }
}
```

### **Pattern 3: Real-time Animation Preview System**

#### **Problem: Visualizing LED Behaviors**
```css
/* CSS Animation Classes for LED Preview */
.led-flash { animation: led-flash 1s infinite; }
.led-flash-solid { animation: led-flash-solid 2s infinite; }
.led-chaser { animation: led-chaser 2s infinite linear; }
.led-chaser-twice { animation: led-chaser-twice 4s; }
.led-off { opacity: 0.2; background-color: #6b7280; }

@keyframes led-flash {
  0%, 50% { opacity: 1; background-color: #ef4444; }
  25%, 75% { opacity: 0.3; background-color: #fca5a5; }
}
```

#### **Solution: Dynamic Animation Integration**
```typescript
// Animation Preview Component
const LEDPreview = ({ behaviorConfig, segmentConfig }) => {
  const getAnimationClass = (behavior: string) => {
    switch (behavior) {
      case 'flash': return 'led-flash'
      case 'flash-solid': return 'led-flash-solid'
      case 'chaser-loop': return 'led-chaser'
      case 'chaser-twice': return 'led-chaser-twice'
      case 'off': return 'led-off'
      default: return ''
    }
  }

  useEffect(() => {
    const segments = document.querySelectorAll('.led-preview-segment')
    segments.forEach((segment, index) => {
      const animationClass = getAnimationClass(behaviorConfig.selectedBehavior)
      segment.className = `led-preview-segment ${animationClass}`
    })
  }, [behaviorConfig.selectedBehavior, segmentConfig])

  return (
    <div className="led-preview-container">
      {Array.from({ length: segmentConfig.ledCount }).map((_, index) => (
        <div
          key={index}
          className={`led-preview-segment ${getAnimationClass(behaviorConfig.selectedBehavior)}`}
          style={{
            animationDelay: behaviorConfig.selectedBehavior.includes('chaser')
              ? `${index * 0.1}s` : '0s'
          }}
        />
      ))}
    </div>
  )
}
```

### **Pattern 4: Database Relationships with Foreign Keys**

#### **Problem: Managing Device-Segment Relationships**
```sql
-- WLED Devices Table
CREATE TABLE wled_devices (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    ip_address TEXT NOT NULL UNIQUE,
    total_leds INTEGER NOT NULL,
    status TEXT CHECK (status IN ('online', 'offline')) DEFAULT 'online'
);

-- LED Segments with Foreign Key Relationship
CREATE TABLE led_segments (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    wled_device_id TEXT NOT NULL,
    start_led INTEGER NOT NULL,
    led_count INTEGER NOT NULL,
    FOREIGN KEY (wled_device_id) REFERENCES wled_devices(id) ON DELETE CASCADE
);
```

#### **Solution: Dependency Checking Before Deletion**
```typescript
// API Endpoint with Relationship Validation
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check if device exists
    const existingDevice = sqliteHelpers.getWLEDDeviceById(id)
    if (!existingDevice) {
      return NextResponse.json(
        { error: 'WLED device not found' },
        { status: 404 }
      )
    }

    // Check if device has LED segments (prevent deletion if in use)
    const deviceSegments = sqliteHelpers.getLEDSegmentsByDeviceId(id)

    if (deviceSegments.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete device. It has ${deviceSegments.length} active LED segments.` },
        { status: 400 }
      )
    }

    const result = sqliteHelpers.deleteWLEDDevice(id)

    return NextResponse.json({
      success: true,
      message: 'WLED device deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting WLED device:', error)
    return NextResponse.json(
      { error: 'Failed to delete WLED device' },
      { status: 500 }
    )
  }
}
```

#### **Key WLED Architecture Decisions**
1. **Real-time Validation**: Connection testing prevents configuration errors
2. **Visual Feedback**: Animation previews improve user understanding
3. **Relationship Safety**: Foreign key constraints maintain data integrity
4. **Professional Interface**: Enterprise-grade device management capabilities
5. **Responsive Design**: Mobile-optimized for field technicians

## Real-Time Connectivity Monitoring Patterns

### **Pattern 1: Reusable Signal Strength Indicator**

#### **Problem: Displaying WiFi Connectivity Status**
```typescript
// Need consistent visual feedback for device WiFi signal strength across multiple components
// RSSI values from ESP devices range from -100 dBm (poor) to -30 dBm (excellent)
```

#### **Solution: Reusable SignalStrengthIndicator Component**
```typescript
// /components/led/signal-strength-indicator.tsx
interface SignalStrengthIndicatorProps {
  rssi?: number  // WiFi signal strength in dBm
  isChecking?: boolean  // Loading state during connectivity check
  showText?: boolean  // Display text label with signal quality
  className?: string
  size?: 'sm' | 'md' | 'lg'  // Visual size variant
}

export function SignalStrengthIndicator({
  rssi,
  isChecking = false,
  showText = false,
  className,
  size = 'md'
}: SignalStrengthIndicatorProps) {
  // RSSI-based quality categorization
  const getSignalQuality = (): { level: number; label: string; color: string } => {
    if (rssi === undefined || rssi === null) {
      return { level: 0, label: 'Unknown', color: 'text-gray-400' }
    }
    if (rssi >= -50) {
      return { level: 4, label: 'Excellent', color: 'text-green-500' }
    } else if (rssi >= -65) {
      return { level: 3, label: 'Good', color: 'text-green-500' }
    } else if (rssi >= -75) {
      return { level: 2, label: 'Fair', color: 'text-yellow-500' }
    } else {
      return { level: 1, label: 'Poor', color: 'text-orange-500' }
    }
  }

  const quality = getSignalQuality()

  // Visual WiFi bars component
  const WifiStrengthBars = () => {
    const bars = [1, 2, 3, 4]
    return (
      <div className="relative inline-flex items-end gap-0.5">
        {bars.map((bar) => {
          const isActive = bar <= quality.level
          return (
            <div
              key={bar}
              className={cn(
                "w-1 rounded-sm transition-colors",
                isActive ? quality.color.replace('text-', 'bg-') : 'bg-gray-300'
              )}
              style={{ height: `${bar * 3}px` }}
            />
          )
        })}
      </div>
    )
  }

  // Loading state with spinning WiFi icon
  if (isChecking) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Wifi className={cn("animate-spin text-gray-400", sizeClasses[size])} />
        {showText && <span className="text-xs text-gray-500">Checking...</span>}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <WifiStrengthBars />
      {showText && (
        <div className="flex flex-col">
          <span className={cn("text-xs font-medium", quality.color)}>
            {quality.label}
          </span>
          {rssi !== undefined && rssi !== null && (
            <span className="text-xs text-gray-500">{rssi} dBm</span>
          )}
        </div>
      )}
    </div>
  )
}
```

#### **Benefits**
- **Reusability**: Single component serves all device connectivity displays
- **Visual Consistency**: Identical WiFi bars across all interfaces
- **User-Friendly**: Color-coded signal quality (green = good, yellow = fair, orange = poor)
- **Configurable**: Multiple display modes (bars only, bars + text, bars + dBm)
- **Loading States**: Clear feedback during connectivity checks

### **Pattern 2: Auto-Refresh with Interval Cleanup**

#### **Problem: Real-time Device Monitoring**
```typescript
// Need periodic connectivity checks without memory leaks
// Different refresh intervals for single device vs multiple devices
```

#### **Solution: useEffect with setInterval and Cleanup**
```typescript
// Pattern for single device monitoring (30 seconds)
const [deviceInfo, setDeviceInfo] = useState<{
  online: boolean
  signal_strength?: number
  last_seen?: string
} | null>(null)
const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)

useEffect(() => {
  if (!deviceId || readOnly) return

  const checkConnectivity = async () => {
    setIsCheckingConnectivity(true)
    try {
      const response = await fetch(`/api/wled-devices/${deviceId}/info`)
      const data = await response.json()

      if (response.ok) {
        setDeviceInfo({
          online: data.online,
          signal_strength: data.wifi?.rssi,
          last_seen: data.lastSeen
        })
      } else {
        setDeviceInfo({ online: false })
      }
    } catch (error) {
      console.error('Connectivity check failed:', error)
      setDeviceInfo({ online: false })
    } finally {
      setIsCheckingConnectivity(false)
    }
  }

  // Immediate check on mount
  checkConnectivity()

  // Auto-refresh every 30 seconds
  const interval = setInterval(checkConnectivity, 30000)

  // Cleanup on unmount to prevent memory leaks
  return () => clearInterval(interval)
}, [deviceId, readOnly])
```

```typescript
// Pattern for multiple device monitoring (60 seconds)
const [deviceInfo, setDeviceInfo] = useState<Record<string, {
  online: boolean
  signal_strength?: number
  last_seen?: string
}>>({})
const [checkingDevices, setCheckingDevices] = useState<Set<string>>(new Set())

useEffect(() => {
  if (devices.length === 0) return

  const checkAllDevices = async () => {
    for (const device of devices) {
      setCheckingDevices(prev => new Set(prev).add(device.id))

      try {
        const response = await fetch(`/api/wled-devices/${device.id}/info`)
        const data = await response.json()

        if (response.ok) {
          setDeviceInfo(prev => ({
            ...prev,
            [device.id]: {
              online: data.online,
              signal_strength: data.wifi?.rssi,
              last_seen: data.lastSeen
            }
          }))
        }
      } catch (error) {
        setDeviceInfo(prev => ({
          ...prev,
          [device.id]: { online: false }
        }))
      } finally {
        setCheckingDevices(prev => {
          const newSet = new Set(prev)
          newSet.delete(device.id)
          return newSet
        })
      }
    }
  }

  checkAllDevices()
  const interval = setInterval(checkAllDevices, 60000) // 60 seconds for multiple devices
  return () => clearInterval(interval)
}, [devices])
```

#### **Benefits**
- **Memory Safety**: Proper cleanup prevents memory leaks
- **Performance**: Longer intervals for multiple devices reduce API load
- **Immediate Feedback**: Initial check on component mount
- **Error Resilience**: Graceful degradation on network failures
- **Loading States**: Per-device loading indicators for better UX

### **Pattern 3: Optional TypeScript Fields for Backward Compatibility**

#### **Problem: Extending Interfaces Without Breaking Changes**
```typescript
// Need to add connectivity fields to existing interface without breaking existing code
interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
  // How to add signal_strength and last_seen without breaking existing code?
}
```

#### **Solution: Optional Fields with Type Safety**
```typescript
// Extended interface with optional connectivity fields
interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'

  // Optional connectivity fields
  signal_strength?: number  // RSSI value (-100 to 0 dBm)
  last_seen?: string  // ISO 8601 timestamp

  // Optional device info (from JOIN queries)
  device_name?: string
  ip_address?: string
  total_leds?: number
}

// Database helper with optional field support
export function updateWLEDDevice(id: string, updates: Partial<WLEDDevice>) {
  const db = getDatabase()

  const fields: string[] = []
  const values: any[] = []

  if (updates.device_name !== undefined) {
    fields.push('device_name = ?')
    values.push(updates.device_name)
  }

  if (updates.signal_strength !== undefined) {
    fields.push('signal_strength = ?')
    values.push(updates.signal_strength)
  }

  if (updates.last_seen !== undefined) {
    fields.push('last_seen = ?')
    values.push(updates.last_seen)
  }

  // Add updated_at timestamp
  fields.push('updated_at = ?')
  values.push(new Date().toISOString())

  values.push(id)

  const sql = `UPDATE wled_devices SET ${fields.join(', ')} WHERE id = ?`
  return db.prepare(sql).run(...values)
}
```

#### **Benefits**
- **Backward Compatibility**: Existing code works without modifications
- **Type Safety**: TypeScript ensures proper field usage
- **Flexible Updates**: Can update any subset of fields
- **Null Handling**: Explicit undefined/null handling prevents bugs

### **Pattern 4: Dynamic Status Badges with Real-Time Data**

#### **Problem: Static Database Status vs Real-Time Connectivity**
```typescript
// BAD: Static status from database doesn't reflect actual device state
<Badge variant={device.status === 'online' ? 'success' : 'secondary'}>
  {device.status}
</Badge>
```

#### **Solution: Real-Time Status with Fallback**
```typescript
// GOOD: Use real-time connectivity data with database fallback
const getDeviceStatus = (deviceId: string): 'online' | 'offline' | 'checking' => {
  if (checkingDevices.has(deviceId)) return 'checking'

  const info = deviceInfo[deviceId]
  if (info === undefined) {
    // No connectivity check yet, use database status
    const device = devices.find(d => d.id === deviceId)
    return device?.status || 'offline'
  }

  return info.online ? 'online' : 'offline'
}

// Dynamic status badge
<Badge
  variant={
    getDeviceStatus(device.id) === 'online' ? 'success' :
    getDeviceStatus(device.id) === 'checking' ? 'secondary' :
    'destructive'
  }
  className="capitalize"
>
  {getDeviceStatus(device.id) === 'checking' ? (
    <span className="flex items-center gap-1">
      <Wifi className="h-3 w-3 animate-spin" />
      Checking...
    </span>
  ) : (
    getDeviceStatus(device.id)
  )}
</Badge>

// Signal strength display
{deviceInfo[device.id] && (
  <SignalStrengthIndicator
    rssi={deviceInfo[device.id].signal_strength}
    isChecking={checkingDevices.has(device.id)}
    showText={true}
    size="sm"
  />
)}

// Last seen timestamp
{deviceInfo[device.id]?.last_seen && (
  <div className="text-xs text-gray-500">
    Last seen: {new Date(deviceInfo[device.id].last_seen!).toLocaleString()}
  </div>
)}
```

#### **Benefits**
- **Accurate Status**: Reflects actual device connectivity
- **Loading States**: Visual feedback during checks
- **Fallback Strategy**: Uses database status until real-time check completes
- **Rich Context**: Signal strength and last seen provide additional insight

### **Pattern 5: LED Location System Accessibility**

#### **Problem: Blocking UI Based on External Dependencies**
```typescript
// BAD: Blocking user access when devices aren't configured
if (devices.length === 0) {
  return (
    <Card>
      <CardContent>
        <div className="text-center text-yellow-800">
          <Wifi className="h-8 w-8 mx-auto mb-2" />
          <p>No WLED devices available</p>
          <p>LED location features will be available once WLED devices are configured.</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### **Solution: Always-Accessible Interface with Dynamic Feedback**
```typescript
// GOOD: Allow configuration regardless of device availability
return (
  <div className="space-y-6">
    <InfoBox /> {/* Explain LED system */}

    {/* Loading state while fetching devices */}
    {isLoadingDevices && (
      <div className="text-center py-4 text-gray-500">
        <Wifi className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading WLED devices...</p>
      </div>
    )}

    {/* LED Segments - always accessible */}
    <div className="space-y-4">
      {segments.map((segment, index) => (
        <LEDSegmentCard
          key={`segment-${index}`}
          segment={segment}
          segmentIndex={index}
          devices={devices}
          onUpdate={updateSegment}
          onRemove={removeSegment}
          onAdvancedConfig={openAdvancedConfig}
          readOnly={disabled}
        />
      ))}

      {/* Add Segment Button - always available */}
      {!disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={addLEDSegment}
          className="w-full h-16 border-dashed"
        >
          <Plus className="h-5 w-5" />
          Add LED Segment
        </Button>
      )}

      {/* Info message when no devices (non-blocking) */}
      {!isLoadingDevices && devices.length === 0 && (
        <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          ℹ️ No WLED devices configured yet. Configure devices in Settings → LED Devices to activate LED segments.
        </div>
      )}
    </div>
  </div>
)
```

#### **Benefits**
- **User Empowerment**: Always allow configuration and data entry
- **Non-Blocking**: Informational messages instead of hard blocks
- **Progressive Enhancement**: Features activate when dependencies become available
- **Better UX**: Users can prepare configurations before hardware is ready

### **Pattern 6: One-Click Profile Activation**

#### **Problem: Deploying Saved LED Configurations to Hardware**
```typescript
// Need to apply saved LED segment configurations to physical WLED devices
```

#### **Solution: Profile Activation with Real-Time Feedback**
```typescript
// Profile activation function in component
const [isActivating, setIsActivating] = useState(false)

const activateProfile = async () => {
  if (!selectedDevice || !segment.id || isActivating) return

  setIsActivating(true)

  try {
    const response = await fetch(`/api/wled-devices/${selectedDevice.id}/sync-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentId: segment.id })
    })

    const data = await response.json()

    if (response.ok) {
      toast({
        title: "Profile Activated",
        description: `LED segment configuration applied to ${selectedDevice.device_name}`,
      })
    } else {
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: data.error || "Could not activate LED profile",
      })
    }
  } catch (error) {
    toast({
      variant: "destructive",
      title: "Network Error",
      description: "Failed to communicate with WLED device",
    })
  } finally {
    setIsActivating(false)
  }
}

// Activate button in UI
<Button
  onClick={activateProfile}
  disabled={!selectedDevice || isActivating || readOnly}
  size="sm"
  variant="outline"
  className="flex items-center gap-2"
>
  {isActivating ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      Activating...
    </>
  ) : (
    <>
      <Power className="h-4 w-4" />
      Activate
    </>
  )}
</Button>
```

```typescript
// API endpoint: /api/wled-devices/[id]/sync-state
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { segmentId } = await request.json()

    // Get WLED device from database
    const device = sqliteHelpers.getWLEDDeviceById(id)
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Get LED segment configuration
    const segment = sqliteHelpers.getLEDSegmentById(segmentId)
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    // Build WLED segments payload
    const wledSegments = [{
      id: 0,
      start: segment.start_led,
      stop: segment.start_led + segment.led_count - 1,
      col: [
        hexToRgb(segment.location_color),
        hexToRgb(segment.stock_color_1 || '#4CAF50'),
        hexToRgb(segment.alert_color_1 || '#333333')
      ],
      fx: getEffectId(segment.location_behavior),
      sx: 128,  // Speed
      ix: 128   // Intensity
    }]

    // Send to WLED device
    const response = await fetch(`http://${device.ip_address}/json/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        on: true,
        seg: wledSegments
      }),
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      throw new Error(`WLED HTTP ${response.status}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Profile activated successfully',
      segmentCount: wledSegments.length,
      ledRange: `${segment.start_led}-${segment.start_led + segment.led_count - 1}`
    })
  } catch (error) {
    console.error('Profile activation failed:', error)
    return NextResponse.json(
      { error: 'Failed to activate profile on device' },
      { status: 500 }
    )
  }
}
```

#### **Benefits**
- **Instant Deployment**: One-click application of saved configurations
- **Real-Time Feedback**: Loading states and toast notifications
- **Error Handling**: Clear error messages for troubleshooting
- **User Experience**: Smooth workflow from configuration to hardware

### **Auto-Refresh Strategy Summary**

| Component | Monitoring Type | Refresh Interval | Cleanup Pattern |
|-----------|----------------|------------------|-----------------|
| LED Segment Card | Single Device | 30 seconds | `return () => clearInterval(interval)` |
| WLED Device Selector | Single Device | 30 seconds | `return () => clearInterval(interval)` |
| WLED Device Manager | Multiple Devices | 60 seconds | `return () => clearInterval(interval)` |

**Key Principles:**
- **Immediate Check**: Run connectivity check immediately on component mount
- **Conditional Execution**: Only run checks when data is available and component is active
- **Cleanup Required**: Always return cleanup function from useEffect to prevent memory leaks
- **Error Resilience**: Gracefully handle network failures without breaking the UI
- **Loading States**: Provide visual feedback during connectivity checks
- **Optimized Intervals**: Use longer intervals for multiple devices to reduce API load

## Conclusion

These patterns emerged from real-world development challenges and provide proven solutions for common problems in full-stack applications. Key principles:

1. **Consistency**: Use the same patterns throughout the application
2. **Performance**: Optimize at the database level first
3. **User Experience**: Make interfaces predictable and responsive
4. **Error Handling**: Plan for failure scenarios
5. **Maintainability**: Write code that's easy to understand and modify

By following these patterns, developers can create robust, scalable, and maintainable applications that provide excellent user experiences.