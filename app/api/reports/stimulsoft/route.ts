import { NextRequest, NextResponse } from 'next/server'
import { reportQueryEngine } from '@/lib/reports'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'schema':
        return handleGetSchema()
      case 'data':
        return handleGetData(searchParams)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in Stimulsoft API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'execute':
        return handleExecuteQuery(body)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in Stimulsoft POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleGetSchema() {
  try {
    console.log('🔗 Stimulsoft: Getting database schema...')
    
    const tables = await reportQueryEngine.getAvailableTables()
    console.log(`📋 Found ${tables.length} tables for Stimulsoft`)
    
    // Transform to Stimulsoft-compatible schema format
    const schema = await Promise.all(tables.map(async tableName => {
      try {
        const columnInfo = await reportQueryEngine.getTableSchema(tableName)
        const columns = columnInfo.map((col: any) => ({
          name: col.name,
          type: mapToStimulsoftType(col.type),
          nullable: col.notnull === 0,
          primaryKey: col.pk === 1,
          description: `${col.type} column`
        }))
        
        return {
          name: tableName,
          type: 'table',
          columns,
          description: `${tableName} table with ${columns.length} columns`,
          connectionString: 'inventory_database'
        }
      } catch (tableError) {
        console.error(`Error getting schema for table ${tableName}:`, tableError)
        return null
      }
    }))
    
    const validSchema = schema.filter(Boolean)
    
    console.log(`✅ Stimulsoft schema prepared: ${validSchema.length} tables`)
    
    return NextResponse.json({
      success: true,
      schema: validSchema,
      connectionInfo: {
        name: 'Inventory Database',
        type: 'SQLite',
        description: 'Main inventory management database'
      }
    })
    
  } catch (error) {
    console.error('❌ Failed to get schema for Stimulsoft:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema fetch failed'
    }, { status: 500 })
  }
}

async function handleGetData(searchParams: URLSearchParams) {
  try {
    const tableName = searchParams.get('table')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (!tableName) {
      return NextResponse.json({ error: 'Table name required' }, { status: 400 })
    }
    
    console.log(`📊 Stimulsoft: Getting data from ${tableName} (limit: ${limit})`)
    
    // Execute query using our existing engine
    const query = {
      table: tableName,
      fields: [{ name: '*', alias: 'all', type: 'auto' }],
      limit: Math.min(limit, 1000) // Cap at 1000 for safety
    }
    
    const result = await reportQueryEngine.executeQuery(query)
    
    console.log(`✅ Stimulsoft data retrieved: ${result.data.length} rows from ${tableName}`)
    
    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        table: tableName,
        rowCount: result.data.length,
        executionTime: result.executionTime,
        query: result.query
      }
    })
    
  } catch (error) {
    console.error('❌ Failed to get data for Stimulsoft:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Data fetch failed'
    }, { status: 500 })
  }
}

async function handleExecuteQuery(body: any) {
  try {
    const { query: stimulsoftQuery, parameters } = body
    
    console.log('🔄 Stimulsoft: Executing custom query...')
    console.log('Query:', stimulsoftQuery)
    
    // Convert Stimulsoft query to our format if needed
    // For now, try to execute as-is through our engine
    
    if (!stimulsoftQuery || !stimulsoftQuery.table) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query format'
      }, { status: 400 })
    }
    
    const result = await reportQueryEngine.executeQuery(stimulsoftQuery)
    
    console.log(`✅ Stimulsoft query executed: ${result.data.length} rows`)
    
    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        totalRecords: result.data.length,
        executionTime: result.executionTime,
        query: result.query
      }
    })
    
  } catch (error) {
    console.error('❌ Failed to execute Stimulsoft query:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed'
    }, { status: 500 })
  }
}

function mapToStimulsoftType(dbType: string): string {
  const type = dbType.toLowerCase()
  
  if (type.includes('int') || type.includes('integer')) {
    return 'Int32'
  }
  if (type.includes('real') || type.includes('float') || type.includes('double')) {
    return 'Double'
  }
  if (type.includes('decimal') || type.includes('numeric')) {
    return 'Decimal'
  }
  if (type.includes('date')) {
    return 'DateTime'
  }
  if (type.includes('time')) {
    return 'DateTime'
  }
  if (type.includes('bool')) {
    return 'Boolean'
  }
  if (type.includes('text') || type.includes('varchar') || type.includes('char')) {
    return 'String'
  }
  if (type.includes('blob') || type.includes('binary')) {
    return 'Byte[]'
  }
  
  return 'String' // Default fallback
}