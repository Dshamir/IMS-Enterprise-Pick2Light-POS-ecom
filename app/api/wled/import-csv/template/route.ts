import { NextResponse } from 'next/server'

/**
 * GET /api/wled/import-csv/template
 *
 * Download CSV template for LED segment bulk import
 *
 * Returns a CSV file with:
 * - Header row with column names
 * - 3 example rows with sample data
 * - Comments explaining each field
 */
export async function GET() {
  try {
    // CSV template with examples
    const csvContent = `product_sku,warehouse_code,zone_name,device_ip,start_led,led_count,location_color,location_behavior,use_device_defaults
PROD-001,WH-A,Receiving,192.168.0.156,0,12,#FF5733,solid,1
PROD-002,WH-A,Receiving,192.168.0.156,12,12,#33FF57,flash,1
PROD-003,WH-B,Zone-A,192.168.0.147,0,12,#5733FF,solid,0
PROD-004,WH-A,Storage,192.168.0.156,24,12,#FFD700,chaser-loop,1

# Column Descriptions:
# - product_sku: REQUIRED - Product SKU (must exist in products table)
# - warehouse_code: OPTIONAL - Warehouse code (e.g., WH-A, LA-01, NY-02)
# - zone_name: OPTIONAL - Zone name within warehouse (e.g., Receiving, Zone-A)
# - device_ip: REQUIRED - WLED device IP address (must exist in wled_devices table)
# - start_led: REQUIRED - First LED index (0-based, e.g., 0, 12, 24)
# - led_count: OPTIONAL - Number of LEDs (default: 12, options: 9, 12, 15, 18)
# - location_color: OPTIONAL - Hex color for location identification (default: #FF5733)
# - location_behavior: OPTIONAL - Animation (solid, flash, flash-solid, chaser-loop, chaser-twice, off) (default: solid)
# - use_device_defaults: OPTIONAL - Use device default behaviors (1=yes, 0=no) (default: 1)
#
# Important Notes:
# 1. Each product segment uses 12 LEDs by default (0-11)
# 2. LED ranges must not overlap on the same device
# 3. Products and devices must exist before import
# 4. Warehouse/zone will be auto-created if autoCreateLocations=true
# 5. After import, use "Sync All Segments" button to push to hardware
#
# Example LED Layout per Segment (12 LEDs):
# - LEDs 0-3: Location (your custom color)
# - LEDs 4-7: Stock status (auto-calculated)
# - LEDs 8-11: Alert indicators (auto-calculated)
`

    // Return as downloadable CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="led_import_template.csv"',
      },
    })

  } catch (error: any) {
    console.error('❌ Error generating CSV template:', error)
    return NextResponse.json(
      { error: 'Failed to generate template', message: error.message },
      { status: 500 }
    )
  }
}
