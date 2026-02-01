import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assemblyId = searchParams.get('assemblyId')
    const format = searchParams.get('format') || 'csv'
    
    if (!assemblyId) {
      return NextResponse.json(
        { error: 'Assembly ID is required' },
        { status: 400 }
      )
    }

    // Get assembly info
    const assembly = sqliteHelpers.getBOMAssemblyById(assemblyId)
    if (!assembly) {
      return NextResponse.json(
        { error: 'Assembly not found' },
        { status: 404 }
      )
    }

    // Get BOM hierarchy
    const hierarchy = sqliteHelpers.getBOMHierarchy(assemblyId)
    
    if (format === 'json') {
      return NextResponse.json({
        assembly: assembly,
        hierarchy: hierarchy,
        exported_at: new Date().toISOString()
      })
    }

    // CSV format
    const csvData = generateCSV(assembly, hierarchy)
    
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${assembly.name}_BOM.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting BOM:', error)
    return NextResponse.json(
      { error: 'Failed to export BOM' },
      { status: 500 }
    )
  }
}

function generateCSV(assembly: any, hierarchy: any[]): string {
  const headers = [
    'Level',
    'Component Name',
    'Quantity',
    'Unit',
    'Unit Cost',
    'Total Cost',
    'Type',
    'Reference',
    'Optional',
    'Notes',
    'Stock Available'
  ]
  
  const rows = [headers.join(',')]
  
  function processHierarchy(items: any[], level: number = 0) {
    items.forEach(item => {
      const row = [
        level.toString(),
        `"${item.component_name || ''}"`,
        item.quantity || 0,
        `"${item.unit_symbol || ''}"`,
        item.component_price || 0,
        (item.quantity * item.component_price) || 0,
        item.component_type || 'component',
        `"${item.reference_designator || ''}"`,
        item.is_optional ? 'Yes' : 'No',
        `"${item.notes || ''}"`,
        item.component_stock || 0
      ]
      rows.push(row.join(','))
      
      if (item.children && item.children.length > 0) {
        processHierarchy(item.children, level + 1)
      }
    })
  }
  
  processHierarchy(hierarchy)
  return rows.join('\n')
}