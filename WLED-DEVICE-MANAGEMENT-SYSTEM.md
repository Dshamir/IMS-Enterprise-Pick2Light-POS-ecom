# WLED Device Management System

**Version**: 2.8.1
**Implementation Date**: October 2025
**Last Updated**: October 12, 2025
**Status**: ✅ Production Ready

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Component Architecture](#component-architecture)
6. [User Guide](#user-guide)
7. [Technical Implementation](#technical-implementation)
8. [LED Animation System](#led-animation-system)
9. [Integration Points](#integration-points)
10. [Troubleshooting](#troubleshooting)
11. [Development Guidelines](#development-guidelines)

---

## System Overview

The WLED Device Management System provides comprehensive management of WiFi-controlled LED devices for inventory location tracking and visual feedback. This system enables users to:

- **Manage WLED Devices**: Create, edit, delete, and test connectivity of WiFi LED controllers
- **Configure LED Segments**: Map specific LED ranges to inventory locations
- **Real-time Animation Previews**: Visual feedback for different LED behaviors
- **Integration with Inventory**: Seamless connection with product location tracking

### Key Features

✅ **Device Management**: Full CRUD operations for WLED devices
✅ **Connection Testing**: Real-time connectivity validation with manual trigger
✅ **LED Segment Configuration**: Precise mapping of LED ranges to inventory locations
✅ **Animation Preview System**: Live preview of LED behaviors (flash, chaser, solid, etc.)
✅ **Responsive UI**: Mobile-friendly device management interface
✅ **Search & Filter**: Advanced device search and filtering capabilities
✅ **Status Management**: Displays all devices (online and offline) with real-time status indicators
✅ **Background Polling**: Non-blocking 30-minute intervals prevent UI interference
✅ **CASCADE Deletion**: Safe device removal with automatic segment cleanup

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    WLED Management System                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend Components                                        │
│  ├── WLEDDeviceManager (Main Interface)                     │
│  ├── WLEDDeviceForm (Create/Edit Modal)                     │
│  ├── LEDConfigModal (Segment Configuration)                 │
│  └── LEDPreview (Animation Preview)                         │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ├── /api/wled-devices (Device CRUD)                        │
│  ├── /api/wled-devices/[id] (Individual Operations)         │
│  ├── /api/led-test (Connectivity Testing)                   │
│  └── /api/led-segments (Segment Management)                 │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (SQLite)                                    │
│  ├── wled_devices (Device Registry)                         │
│  └── led_segments (LED Mapping)                             │
├─────────────────────────────────────────────────────────────┤
│  Physical Layer                                             │
│  └── WLED Controllers (WiFi LED Hardware)                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Next.js 15.2.4
- **UI Components**: shadcn/ui component library
- **Database**: SQLite with better-sqlite3
- **API**: Next.js API Routes with validation
- **Styling**: Tailwind CSS with custom LED animations
- **Hardware**: WLED-compatible WiFi LED controllers

---

## Database Schema

### `wled_devices` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique device identifier |
| `device_name` | TEXT | NOT NULL | Human-readable device name |
| `ip_address` | TEXT | NOT NULL, UNIQUE | Device IP address |
| `total_leds` | INTEGER | NOT NULL | Total number of LEDs on device |
| `status` | TEXT | CHECK ('online', 'offline') | Current device status |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

### `led_segments` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique segment identifier |
| `product_id` | TEXT | NOT NULL | Reference to products table |
| `wled_device_id` | TEXT | NOT NULL, FK | Reference to wled_devices |
| `start_led` | INTEGER | NOT NULL | Starting LED index |
| `led_count` | INTEGER | NOT NULL | Number of LEDs in segment |
| `location_color` | TEXT | NOT NULL | Base location color |
| `location_behavior` | TEXT | DEFAULT 'solid' | Location behavior pattern |
| `stock_mode` | TEXT | CHECK ('auto', 'manual') | Stock indication mode |
| `stock_behavior` | TEXT | DEFAULT 'gradient' | Stock level behavior |
| `alert_mode` | TEXT | CHECK ('auto', 'manual') | Alert indication mode |
| `alert_behavior` | TEXT | DEFAULT 'flash' | Alert behavior pattern |
| `segment_behavior` | TEXT | DEFAULT 'location' | Current active behavior |

### Database Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_led_segments_device_id ON led_segments(wled_device_id);
CREATE INDEX IF NOT EXISTS idx_wled_devices_status ON wled_devices(status);
CREATE INDEX IF NOT EXISTS idx_led_segments_product_id ON led_segments(product_id);
```

---

## API Reference

### Device Management Endpoints

#### `GET /api/wled-devices`
Retrieve all WLED devices.

**Response**:
```json
[
  {
    "id": "device_001",
    "device_name": "Main Storage Rack",
    "ip_address": "192.168.1.100",
    "total_leds": 60,
    "status": "online",
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
]
```

#### `POST /api/wled-devices`
Create a new WLED device.

**Request Body**:
```json
{
  "device_name": "Workshop LED Strip",
  "ip_address": "192.168.1.101",
  "total_leds": 144,
  "status": "online"
}
```

**Validation Rules**:
- `device_name`: Required, non-empty string
- `ip_address`: Required, valid IPv4 format, unique
- `total_leds`: Required, positive integer (1-1000)
- `status`: Optional, 'online' or 'offline' (default: 'online')

#### `GET /api/wled-devices/[id]`
Retrieve specific device by ID.

#### `PUT /api/wled-devices/[id]`
Update existing device.

#### `DELETE /api/wled-devices/[id]`
Delete device with CASCADE cleanup of associated LED segments.

**Behavior**:
- Deletes WLED device from database
- Automatically removes all associated LED segments (CASCADE)
- Returns informational message about deleted segments
- Safe cleanup ensures no orphaned data

**Response**:
```json
{
  "success": true,
  "message": "WLED device and 3 associated LED segment(s) deleted successfully",
  "deletedSegments": 3
}
```

### Testing Endpoints

#### `POST /api/led-test`
Test WLED device connectivity and trigger LED test.

**Request Body**:
```json
{
  "wled_ip": "192.168.1.100",
  "segment_id": 0,
  "colors": ["#FF0000"],
  "duration": 1000
}
```

### LED Segment Endpoints

#### `GET /api/led-segments`
Retrieve all LED segments with device information.

#### `POST /api/led-segments`
Create new LED segment mapping.

#### `PUT /api/led-segments/[id]`
Update LED segment configuration.

#### `DELETE /api/led-segments/[id]`
Remove LED segment mapping.

---

## Component Architecture

### WLEDDeviceManager

Main management interface component providing:
- **Device Listing**: Searchable table with pagination
- **CRUD Operations**: Create, edit, delete devices
- **Status Indicators**: Real-time online/offline status
- **Bulk Actions**: Refresh all devices, search filtering
- **Responsive Design**: Mobile-optimized interface

**Key Features**:
```typescript
interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
  created_at: string
  updated_at: string
}
```

### WLEDDeviceForm

Modal form component for device creation and editing:
- **Form Validation**: Client-side and server-side validation
- **Connection Testing**: Real-time connectivity validation
- **Input Sanitization**: IP address format validation
- **Error Handling**: Comprehensive error reporting

**Validation Features**:
- IP address format validation (`/^(\d{1,3}\.){3}\d{1,3}$/`)
- IP range validation (0-255 per octet)
- Device name uniqueness checking
- LED count bounds validation (1-1000)

### LEDConfigModal

Advanced LED segment configuration modal:
- **Device Selection**: Dropdown of available WLED devices
- **LED Range Configuration**: Start position and count selection
- **Color Management**: Location, stock, and alert color configuration
- **Behavior Settings**: Animation behavior selection
- **Real-time Preview**: Live animation preview system

### LEDPreview

Animation preview component with CSS-based animations:
- **Flash Animation**: Quick on/off blinking
- **Flash-Solid Animation**: Sustained flash pattern
- **Chaser Loop**: Continuous LED chasing effect
- **Chaser Twice**: Limited chase sequence
- **Off State**: Disabled/inactive display

---

## User Guide

### Accessing WLED Device Management

1. **Navigate to Settings**: From main menu, select "Settings"
2. **LED Devices Tab**: Click on "LED Devices" tab
3. **Alternative Access**: Direct URL `/settings/wled-devices`

### Adding a New WLED Device

1. **Click "Add Device"**: Green button in the top-left
2. **Enter Device Information**:
   - **Device Name**: Descriptive name (e.g., "Main Storage Rack")
   - **IP Address**: WLED controller IP (e.g., "192.168.1.100")
   - **Total LEDs**: Number of LEDs connected to controller
   - **Status**: Set initial status (Online/Offline)
3. **Test Connection**: Click "Test" button to verify connectivity
4. **Save Device**: Click "Create Device" to save

### Editing Existing Devices

1. **Find Device**: Use search bar or browse device list
2. **Click Edit**: Pencil icon in device row
3. **Modify Settings**: Update any device properties
4. **Test Changes**: Use "Test" button to validate updates
5. **Save Changes**: Click "Update Device"

### Deleting Devices

1. **Select Device**: Click delete (trash) icon in device row
2. **Review Confirmation Dialog**:
   - Device name and permanent deletion warning
   - **Segment Warning**: If device has LED segments, amber warning shows count
   - Example: "⚠️ This device has 3 LED segments that will also be deleted."
3. **Confirm Deletion**: Click "Delete Device"
4. **CASCADE Cleanup**: Device and all associated segments automatically removed

**Deletion Behavior**:
- ✅ Device record removed from database
- ✅ All LED segments using device automatically deleted (CASCADE)
- ✅ No orphaned data left behind
- ✅ Toast notification confirms deletion with segment count
- ❌ Products not affected (only segment associations removed)

### Manual Connectivity Check

Use the **"Check Connectivity"** button to manually verify device status:

1. **Click "Check Connectivity"**: Located in toolbar between Refresh and Search
2. **Wait for Check**: All devices checked in parallel (non-blocking)
3. **View Results**: Toast notification shows "X online, Y offline"
4. **Status Updates**: Device status badges and signal strength update instantly

**Benefits**:
- On-demand connectivity verification
- Parallel checking (fast, non-blocking)
- No automatic polling interference with typing or UI interactions

### LED Segment Configuration

1. **Access Configuration**: From product edit page, locate LED Location section
2. **Add Segment**: Click "Add LED Location"
3. **Configure Segment**:
   - **Select WLED Device**: Choose from dropdown
   - **Set LED Range**: Define start LED and count
   - **Choose Colors**: Set location, stock, and alert colors
   - **Select Behaviors**: Choose animation patterns
4. **Preview Animation**: Real-time preview in modal
5. **Save Configuration**: Apply settings to product

---

## Technical Implementation

### React Component Patterns

#### State Management Pattern
```typescript
const [devices, setDevices] = useState<WLEDDevice[]>([])
const [filteredDevices, setFilteredDevices] = useState<WLEDDevice[]>([])
const [searchTerm, setSearchTerm] = useState('')
const [isLoading, setIsLoading] = useState(true)
```

#### Error Handling Pattern
```typescript
try {
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
}
```

#### Form Validation Pattern
```typescript
const validateForm = () => {
  if (!formData.device_name.trim()) {
    toast({ variant: "destructive", title: "Validation Error",
           description: "Device name is required" })
    return false
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipRegex.test(formData.ip_address)) {
    toast({ variant: "destructive", title: "Validation Error",
           description: "Please enter a valid IP address" })
    return false
  }

  return true
}
```

### Database Helper Functions

Located in `/lib/database/sqlite.ts`:

```typescript
// WLED Device Operations
getAllWLEDDevices: () => WLEDDevice[]
  // Returns ALL devices regardless of status (no filtering)
  // Sorted by device_name ASC

getWLEDDeviceById: (id: string) => WLEDDevice | undefined
getWLEDDeviceByIP: (ipAddress: string) => WLEDDevice | undefined
createWLEDDevice: (device: WLEDDeviceInput) => DatabaseResult
updateWLEDDevice: (id: string, updates: WLEDDeviceUpdates) => DatabaseResult
deleteWLEDDevice: (id: string) => DatabaseResult
  // CASCADE deletion: automatically removes associated LED segments

// LED Segment Operations
getLEDSegmentsByDeviceId: (deviceId: string) => LEDSegment[]
getLEDSegmentsByProductId: (productId: string) => LEDSegment[]
createLEDSegment: (segment: LEDSegmentInput) => DatabaseResult
updateLEDSegment: (id: string, updates: LEDSegmentUpdates) => DatabaseResult
deleteLEDSegment: (id: string) => DatabaseResult
```

### Performance Optimizations

**Network Polling Strategy**:
```typescript
// Background connectivity checking (non-blocking)
useEffect(() => {
  const checkAllDevices = async () => {
    // All devices checked in parallel (Promise.all)
    const checkPromises = devices.map(async (device) => {
      return await fetch(`/api/wled-devices/${device.id}/info`)
    })
    const results = await Promise.all(checkPromises)
    // Batch update state after all checks complete
    setDeviceInfo(results)
  }

  checkAllDevices() // Initial check on load
  const interval = setInterval(checkAllDevices, 1800000) // 30 minutes
  return () => clearInterval(interval)
}, [devices])
```

**Benefits**:
- ✅ **30-minute polling interval** (vs 60 seconds) - 97% reduction in network calls
- ✅ **Parallel requests** - All devices checked simultaneously
- ✅ **Non-blocking** - Zero UI interference, typing never blocked
- ✅ **Manual override** - "Check Connectivity" button for on-demand checks

---

## LED Animation System

### CSS Animation Classes

Located in `/app/globals.css`:

```css
/* Flash Animation - Quick on/off blinking */
.led-flash {
  animation: led-flash 1s infinite;
}

@keyframes led-flash {
  0%, 50% { opacity: 1; background-color: #ef4444; }
  25%, 75% { opacity: 0.3; background-color: #fca5a5; }
}

/* Flash-Solid Animation - Sustained flash pattern */
.led-flash-solid {
  animation: led-flash-solid 2s infinite;
}

@keyframes led-flash-solid {
  0% { opacity: 1; }
  10%, 20% { opacity: 0; }
  30%, 40% { opacity: 1; }
  50%, 60% { opacity: 0; }
  70% { opacity: 1; }
}

/* Chaser Loop - Continuous chasing effect */
.led-chaser {
  animation: led-chaser 2s infinite linear;
}

@keyframes led-chaser {
  0% { background: linear-gradient(90deg, #ef4444 0%, #fca5a5 50%, #ef4444 100%); }
  50% { background: linear-gradient(90deg, #fca5a5 0%, #ef4444 50%, #fca5a5 100%); }
  100% { background: linear-gradient(90deg, #ef4444 0%, #fca5a5 50%, #ef4444 100%); }
}

/* Chaser Twice - Limited chase sequence */
.led-chaser-twice {
  animation: led-chaser-twice 4s;
}

/* Off State - Inactive display */
.led-off {
  opacity: 0.2;
  background-color: #6b7280;
}
```

### Animation Integration

The LED preview system integrates animations with configuration options:

```typescript
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
```

### Real-time Preview Updates

```typescript
useEffect(() => {
  const segments = document.querySelectorAll('.led-preview-segment')
  segments.forEach((segment, index) => {
    const animationClass = getAnimationClass(selectedBehavior)
    segment.className = `led-preview-segment ${animationClass}`
  })
}, [selectedBehavior, segmentConfig])
```

---

## Integration Points

### Inventory System Integration

The WLED system integrates seamlessly with the inventory management system:

#### Product Location Tracking
- **LED Segments**: Each product can have multiple LED segments
- **Location Identification**: Visual feedback for product locations
- **Stock Level Indication**: Color-coded stock level visualization
- **Alert System**: Visual alerts for low stock, reorder points

#### Database Relationships
```sql
-- Products → LED Segments (One-to-Many)
products.id → led_segments.product_id

-- WLED Devices → LED Segments (One-to-Many)
wled_devices.id → led_segments.wled_device_id
```

### Settings System Integration

#### Navigation Integration
- **Settings Menu**: Added "LED Devices" tab to main settings
- **Dedicated Page**: `/settings/wled-devices` for standalone management
- **Breadcrumb Navigation**: Back to Settings button for user orientation

#### Permission Integration
- **Access Control**: Integrated with existing settings permissions
- **User Roles**: Respects user role permissions for device management

---

## Troubleshooting

### Common Issues

#### Device Connection Failures

**Symptoms**: Connection test fails, device shows offline
**Causes**:
- Network connectivity issues
- Incorrect IP address
- WLED device powered off
- Firewall blocking requests

**Solutions**:
1. Verify device IP address using network scanner
2. Check device power and WiFi connection
3. Test network connectivity from server
4. Verify firewall allows outbound requests to device IP
5. Check WLED device is running latest firmware

#### LED Segments Not Responding

**Symptoms**: LEDs don't respond to configuration changes
**Causes**:
- Incorrect LED range configuration
- Device connectivity issues
- LED hardware problems
- WLED configuration conflicts

**Solutions**:
1. Verify LED segment ranges don't overlap
2. Test device connectivity
3. Check WLED device configuration
4. Verify LED strip hardware connections

#### Database Migration Issues

**Symptoms**: WLED tables missing, migration errors
**Causes**:
- Migration not run
- Database permissions
- Schema conflicts

**Solutions**:
1. Check migration logs for errors
2. Manually run LED system migration
3. Verify database write permissions
4. Clear and reinitialize database if necessary

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `WLED_CONN_TIMEOUT` | Device connection timeout | Check network connectivity |
| `WLED_INVALID_IP` | Invalid IP address format | Verify IP address format |
| `WLED_DEVICE_EXISTS` | Device IP already exists | Use different IP or update existing |
| `LED_RANGE_OVERLAP` | LED segments overlap | Adjust segment ranges |
| `LED_RANGE_INVALID` | LED range exceeds device capacity | Check total LED count |

**Deprecated Error Codes** (Fixed in v2.8.1):
- ~~`WLED_SEGMENTS_EXIST`~~ - No longer blocks deletion (CASCADE enabled)

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
DEBUG_WLED=true npm run dev
```

---

## Development Guidelines

### Code Style

- **TypeScript**: All components must use proper TypeScript interfaces
- **Error Handling**: Comprehensive try-catch blocks with user feedback
- **Validation**: Client-side and server-side validation for all inputs
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Mobile-first responsive design principles

### Testing Patterns

```typescript
// Component Testing
import { render, screen, fireEvent } from '@testing-library/react'
import { WLEDDeviceManager } from './wled-device-manager'

test('renders device management interface', () => {
  render(<WLEDDeviceManager />)
  expect(screen.getByText('WLED Device Management')).toBeInTheDocument()
})

// API Testing
test('creates WLED device successfully', async () => {
  const device = {
    device_name: 'Test Device',
    ip_address: '192.168.1.200',
    total_leds: 60
  }

  const response = await fetch('/api/wled-devices', {
    method: 'POST',
    body: JSON.stringify(device)
  })

  expect(response.status).toBe(201)
})
```

### Performance Optimization

- **Debounced Search**: Search input debounced at 300ms
- **Lazy Loading**: Device list pagination for large datasets
- **Memoization**: React.memo for expensive components
- **Connection Pooling**: Reuse database connections
- **Caching**: Cache device status for reduced API calls

### Security Considerations

- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries only
- **Network Security**: WLED requests timeout after 5 seconds
- **Access Control**: Integrated with application permissions
- **Error Information**: No sensitive data in error messages

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.8.1 | Oct 12, 2025 | Critical performance and usability fixes |
| | | **Status Filtering Fix**: Removed status filter from `getAllWLEDDevices()` |
| | | - All devices now visible (online and offline) |
| | | - Fixed "No devices" issue when devices were offline |
| | | - Device Manager shows complete device inventory |
| | | **Network Polling Optimization**: Reduced UI interference |
| | | - Changed from 60-second to 30-minute polling (97% reduction) |
| | | - Parallel request pattern (Promise.all) for non-blocking checks |
| | | - Added manual "Check Connectivity" button |
| | | - Eliminated typing/UI blocking issues |
| | | **CASCADE Deletion Fix**: Enabled safe device removal |
| | | - Removed blocking check for devices with LED segments |
| | | - Enabled CASCADE deletion (automatic segment cleanup) |
| | | - Enhanced delete dialog with segment count warning |
| | | - Toast notifications show deleted segment count |
| 2.8.0 | Oct 10, 2025 | Initial WLED device management system implementation |
| | | - Complete device CRUD operations |
| | | - Real-time connection testing |
| | | - LED segment configuration |
| | | - Animation preview system |
| | | - Settings integration |
| | | - Comprehensive API endpoints |

---

## Support

### Documentation
- **Technical Reference**: This document
- **API Documentation**: Available at `/api/docs` (when enabled)
- **Component Library**: shadcn/ui documentation

### Community
- **Issues**: Report bugs and feature requests via project repository
- **Discussions**: Community discussions for implementation questions
- **Contributions**: Follow project contribution guidelines

### Hardware Support
- **WLED Compatibility**: Supports WLED v0.13+ firmware
- **LED Types**: WS2812B, WS2815, SK6812, and compatible
- **Controllers**: ESP8266, ESP32, and compatible boards

---

*Generated: October 2025*
*System: Next.js 15.2.4 + TypeScript + SQLite*
*Status: Production Ready ✅*