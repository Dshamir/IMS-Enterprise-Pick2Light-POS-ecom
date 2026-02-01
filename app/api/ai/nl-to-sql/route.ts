import { NextRequest, NextResponse } from 'next/server'
import { nlToSQLGenerator, NLToSQLGenerator } from '@/lib/ai/nl-to-sql'
import { usageLogger } from '@/lib/ai/usage-logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { naturalLanguage, includeHistory = false } = body

    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      return NextResponse.json(
        { error: 'Natural language query is required' },
        { status: 400 }
      )
    }

    // Get current database schema
    const schema = NLToSQLGenerator.getCurrentSchema()

    // Generate SQL using AI
    const startTime = Date.now()

    const result = await nlToSQLGenerator.generateIntelligentSQL(
      naturalLanguage,
      schema,
      includeHistory ? [] : undefined // TODO: Get actual query history from database
    )

    const duration = Date.now() - startTime

    // Log AI usage (NL-to-SQL typically uses OpenAI provider)
    try {
      await usageLogger.logFromResponse(
        undefined, // Provider ID not easily accessible here
        undefined, // No agent ID for NL-to-SQL
        result.model || 'gpt-3.5-turbo', // Model from result or default
        result.usage, // Usage data if available from result
        duration,
        'nl_to_sql',
        naturalLanguage,
        result.success || false,
        result.success ? undefined : 'sql_generation_failed'
      )
    } catch (logError) {
      console.warn('Failed to log NL-to-SQL usage:', logError)
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in NL-to-SQL API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate SQL from natural language',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return available examples and schema info
    const schema = NLToSQLGenerator.getCurrentSchema()
    
    const examples = [
      {
        naturalLanguage: "Show me all products with low stock",
        expectedSQL: "SELECT * FROM products WHERE stock_quantity <= min_stock_level",
        category: "inventory"
      },
      {
        naturalLanguage: "What are the top 10 most expensive products?",
        expectedSQL: "SELECT name, price FROM products ORDER BY price DESC LIMIT 10",
        category: "analytics"
      },
      {
        naturalLanguage: "How many products do we have in each category?",
        expectedSQL: "SELECT category, COUNT(*) as product_count FROM products GROUP BY category",
        category: "summary"
      },
      {
        naturalLanguage: "Show me products that need reordering",
        expectedSQL: "SELECT name, stock_quantity, min_stock_level FROM products WHERE stock_quantity <= min_stock_level",
        category: "inventory"
      },
      {
        naturalLanguage: "What's the average price by category?",
        expectedSQL: "SELECT category, AVG(price) as average_price FROM products GROUP BY category",
        category: "analytics"
      },
      {
        naturalLanguage: "List all orders from the last 30 days",
        expectedSQL: "SELECT * FROM orders WHERE order_date >= datetime('now', '-30 days')",
        category: "orders"
      }
    ]

    return NextResponse.json({
      schema: {
        tables: schema.tables.map(t => ({
          name: t.name,
          columnCount: t.columns.length,
          hasRelationships: t.relationships.length > 0
        })),
        views: schema.views.map(v => ({
          name: v.name,
          description: v.description
        }))
      },
      examples,
      capabilities: [
        "Convert natural language to SQL",
        "Support for complex JOINs",
        "Aggregation queries",
        "Filtering and sorting",
        "Query optimization suggestions",
        "Security validation",
        "Performance estimation"
      ]
    })

  } catch (error) {
    console.error('Error in NL-to-SQL GET API:', error)
    
    return NextResponse.json(
      { error: 'Failed to get NL-to-SQL information' },
      { status: 500 }
    )
  }
}