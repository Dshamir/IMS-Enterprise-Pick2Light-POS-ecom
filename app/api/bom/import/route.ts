import { NextRequest, NextResponse } from 'next/server'
import { sqliteHelpers } from '@/lib/database/sqlite'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const assemblyId = formData.get('assemblyId') as string
    const format = formData.get('format') as string || 'csv'
    
    if (!file || !assemblyId) {
      return NextResponse.json(
        { error: 'File and assembly ID are required' },
        { status: 400 }
      )
    }

    const content = await file.text()
    
    if (format === 'json') {
      return await importFromJSON(content, assemblyId)
    } else {
      return await importFromCSV(content, assemblyId)
    }
  } catch (error) {
    console.error('Error importing BOM:', error)
    return NextResponse.json(
      { error: 'Failed to import BOM' },
      { status: 500 }
    )
  }
}

async function importFromJSON(content: string, assemblyId: string) {
  try {
    const data = JSON.parse(content)
    const hierarchy = data.hierarchy || []
    
    // Clear existing components
    const existingComponents = sqliteHelpers.getBOMComponents(assemblyId)
    existingComponents.forEach(component => {
      sqliteHelpers.deleteBOMComponent(component.id)
    })
    
    // Import new components
    const results = await importHierarchy(hierarchy, assemblyId)
    
    return NextResponse.json({
      message: 'BOM imported successfully',
      imported: results.imported,
      failed: results.failed,
      errors: results.errors
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON format' },
      { status: 400 }
    )
  }
}

async function importFromCSV(content: string, assemblyId: string) {
  try {
    const lines = content.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // Validate headers
    const requiredHeaders = ['Component Name', 'Quantity']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Clear existing components
    const existingComponents = sqliteHelpers.getBOMComponents(assemblyId)
    existingComponents.forEach(component => {
      sqliteHelpers.deleteBOMComponent(component.id)
    })
    
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.replace(/"/g, '').trim())
      
      if (row.length < headers.length) continue
      
      const rowData: any = {}
      headers.forEach((header, index) => {
        rowData[header] = row[index]
      })
      
      try {
        // Find product by name
        const products = sqliteHelpers.getAllProducts()
        const product = products.find(p => p.name === rowData['Component Name'])
        
        if (!product) {
          results.failed++
          results.errors.push(`Product not found: ${rowData['Component Name']}`)
          continue
        }
        
        // Create component
        const component = {
          assembly_id: assemblyId,
          component_product_id: product.id,
          quantity: parseFloat(rowData['Quantity']) || 1,
          notes: rowData['Notes'] || null,
          is_assembly: rowData['Type'] === 'assembly' ? 1 : 0,
          sequence_number: parseInt(rowData['Level']) || 0,
          is_optional: rowData['Optional'] === 'Yes' ? 1 : 0,
          reference_designator: rowData['Reference'] || null
        }
        
        sqliteHelpers.createBOMComponent(component)
        results.imported++
      } catch (error) {
        results.failed++
        results.errors.push(`Error processing row ${i}: ${error}`)
      }
    }
    
    return NextResponse.json({
      message: 'BOM imported successfully',
      imported: results.imported,
      failed: results.failed,
      errors: results.errors
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid CSV format' },
      { status: 400 }
    )
  }
}

async function importHierarchy(hierarchy: any[], assemblyId: string, level: number = 0): Promise<any> {
  const results = {
    imported: 0,
    failed: 0,
    errors: [] as string[]
  }
  
  for (const item of hierarchy) {
    try {
      // Find product by name
      const products = sqliteHelpers.getAllProducts()
      const product = products.find(p => p.name === item.component_name)
      
      if (!product) {
        results.failed++
        results.errors.push(`Product not found: ${item.component_name}`)
        continue
      }
      
      // Create component
      const component = {
        assembly_id: assemblyId,
        component_product_id: product.id,
        quantity: item.quantity || 1,
        notes: item.notes || null,
        is_assembly: item.component_type === 'assembly' ? 1 : 0,
        sequence_number: item.sequence_number || 0,
        is_optional: item.is_optional ? 1 : 0,
        reference_designator: item.reference_designator || null
      }
      
      sqliteHelpers.createBOMComponent(component)
      results.imported++
      
      // Process children if any
      if (item.children && item.children.length > 0) {
        const childResults = await importHierarchy(item.children, assemblyId, level + 1)
        results.imported += childResults.imported
        results.failed += childResults.failed
        results.errors.push(...childResults.errors)
      }
    } catch (error) {
      results.failed++
      results.errors.push(`Error processing component ${item.component_name}: ${error}`)
    }
  }
  
  return results
}