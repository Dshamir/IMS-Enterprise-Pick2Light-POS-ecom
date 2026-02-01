import { NextRequest, NextResponse } from 'next/server'
import { 
  dynamicReportGenerator, 
  reportConfigManager, 
  reportQueryEngine,
  performanceMonitor,
  type GenerateReportOptions 
} from '@/lib/reports'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'templates':
        return handleGetTemplates(searchParams)
      case 'categories':
        return handleGetCategories()
      case 'health':
        return handleGetHealth()
      case 'statistics':
        return handleGetStatistics(searchParams)
      case 'tables':
        return handleGetTables()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in dynamic reports GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...options } = body
    
    switch (action) {
      case 'generate':
        return handleGenerateReport(options)
      case 'export':
        return handleExportReport(options)
      case 'dashboard':
        return handleGenerateDashboard(options)
      case 'alert':
        return handleCreateAlert(options)
      case 'preview':
        return handlePreviewQuery(options)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in dynamic reports POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleGetTemplates(searchParams: URLSearchParams) {
  const category = searchParams.get('category') || undefined
  const isPublic = searchParams.get('public') === 'true' ? true : undefined
  const search = searchParams.get('search')
  
  console.log('🔍 Templates request:', { category, isPublic, search })
  
  let templates = reportConfigManager.getTemplates(category, isPublic)
  console.log('📋 Found templates:', templates.length, templates.map(t => ({ id: t.id, name: t.name, active: t.isActive })))
  
  if (search) {
    templates = reportConfigManager.searchTemplates(search)
    console.log('🔍 Search filtered templates:', templates.length)
  }
  
  console.log('✅ Returning templates:', templates.length)
  return NextResponse.json({ templates })
}

async function handleGetCategories() {
  const categories = reportConfigManager.getCategories()
  return NextResponse.json({ categories })
}

async function handleGetHealth() {
  const { reportSystemUtils } = await import('@/lib/reports')
  const health = await reportSystemUtils.getSystemHealth()
  return NextResponse.json(health)
}

async function handleGetStatistics(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId') || undefined
  const statistics = await dynamicReportGenerator.getReportStatistics(userId)
  return NextResponse.json(statistics)
}

async function handleGenerateReport(options: GenerateReportOptions) {
  const result = await dynamicReportGenerator.generateReport(options)
  return NextResponse.json(result)
}

async function handleExportReport(options: {
  reportResult: any
  format: 'csv' | 'xlsx' | 'pdf' | 'json'
  filename?: string
  includeMetadata?: boolean
}) {
  const exportResult = await dynamicReportGenerator.exportReport(
    options.reportResult,
    options.format,
    {
      filename: options.filename,
      includeMetadata: options.includeMetadata
    }
  )
  
  return new NextResponse(exportResult.data, {
    headers: {
      'Content-Type': exportResult.contentType,
      'Content-Disposition': `attachment; filename="${exportResult.filename}"`
    }
  })
}

async function handleGenerateDashboard(options: { userId: string; type?: string }) {
  const { userId, type = 'inventory' } = options
  
  let dashboard
  switch (type) {
    case 'inventory':
      dashboard = await dynamicReportGenerator.generateInventoryDashboard(userId)
      break
    default:
      return NextResponse.json({ error: 'Invalid dashboard type' }, { status: 400 })
  }
  
  return NextResponse.json(dashboard)
}

async function handleCreateAlert(options: {
  name: string
  description: string
  conditions: any[]
  actions: any[]
  createdBy: string
}) {
  const alert = await dynamicReportGenerator.createInventoryAlert(
    options.name,
    options.description,
    options.conditions,
    options.actions,
    options.createdBy
  )
  
  return NextResponse.json(alert)
}

async function handleGetTables() {
  try {
    const tables = await reportQueryEngine.getAvailableTables()
    
    console.log(`Found ${tables.length} available tables for reporting:`, tables)
    
    // Transform to include column information
    const tableSchemas = await Promise.all(tables.map(async tableName => {
      try {
        const columnInfo = await reportQueryEngine.getTableSchema(tableName)
        const columns = columnInfo.map((col: any) => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          primaryKey: col.pk === 1,
          defaultValue: col.dflt_value
        }))
        
        return {
          name: tableName,
          columns,
          columnCount: columns.length
        }
      } catch (tableError) {
        console.error(`Error getting schema for table ${tableName}:`, tableError)
        return {
          name: tableName,
          columns: [],
          columnCount: 0,
          error: tableError instanceof Error ? tableError.message : 'Schema fetch failed'
        }
      }
    }))
    
    // Filter out tables with errors for the success response, but log them
    const validTables = tableSchemas.filter(table => !table.error)
    const errorTables = tableSchemas.filter(table => table.error)
    
    if (errorTables.length > 0) {
      console.warn(`${errorTables.length} tables had schema errors:`, errorTables.map(t => t.name))
    }
    
    return NextResponse.json({ 
      success: true,
      tables: validTables,
      totalTables: tables.length,
      validTables: validTables.length,
      errorTables: errorTables.length
    })
  } catch (error) {
    console.error('Error getting tables:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tables',
      details: 'Check server logs for more information'
    }, { status: 500 })
  }
}

async function handlePreviewQuery(options: { query: any }) {
  try {
    const { query } = options
    
    if (!query || !query.table) {
      return NextResponse.json({
        success: false,
        error: 'Query and table are required',
        details: 'Please provide a valid query object with a table property'
      }, { status: 400 })
    }
    
    console.log('Executing query preview:', JSON.stringify(query, null, 2))
    
    // Execute the query with the report query engine
    const result = await reportQueryEngine.executeQuery(query)
    
    console.log(`Query executed successfully: ${result.data.length} rows returned in ${result.executionTime}ms`)
    
    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        totalCount: result.totalCount,
        executionTime: result.executionTime,
        query: result.query,
        rowCount: result.data.length
      }
    })
  } catch (error) {
    console.error('Error previewing query:', error)
    
    // Provide more detailed error information
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Failed to preview query',
      query: options.query,
      stack: error instanceof Error ? error.stack : undefined
    }
    
    return NextResponse.json({
      success: false,
      error: errorDetails.message,
      details: 'Query execution failed. Check query syntax and table/column names.',
      debugInfo: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 })
  }
}