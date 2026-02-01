/**
 * Natural Language to SQL Generator
 * Advanced AI-powered query generation with context awareness
 */

import OpenAI from 'openai'

interface DatabaseSchema {
  tables: {
    name: string
    columns: {
      name: string
      type: string
      nullable: boolean
      primaryKey: boolean
      foreignKey?: {
        table: string
        column: string
      }
    }[]
    relationships: {
      type: 'one-to-many' | 'many-to-one' | 'many-to-many'
      relatedTable: string
      foreignKey: string
      relatedKey: string
    }[]
  }[]
  views: {
    name: string
    definition: string
    description: string
  }[]
}

interface QueryContext {
  userRole: string
  department: string
  accessLevel: 'read' | 'write' | 'admin'
  recentQueries: string[]
  preferredTables: string[]
}

interface NLToSQLRequest {
  naturalLanguage: string
  schema: DatabaseSchema
  context?: QueryContext
  options?: {
    includeExplanation: boolean
    suggestOptimizations: boolean
    validateSyntax: boolean
    limitResults: number
    allowUnsafeOperations: boolean
  }
}

interface NLToSQLResponse {
  success: boolean
  sql: string
  explanation: string
  confidence: number
  alternatives: {
    sql: string
    explanation: string
    confidence: number
  }[]
  optimizations: string[]
  warnings: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  estimatedRows: number
  usedTables: string[]
  requiredPermissions: string[]
}

export class NLToSQLGenerator {
  private openai: OpenAI
  private isInitialized = false

  constructor() {
    this.initializeOpenAI()
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('OpenAI API key not configured for NL-to-SQL')
      return
    }

    this.openai = new OpenAI({
      apiKey: apiKey
    })
    this.isInitialized = true
  }

  async generateSQL(request: NLToSQLRequest): Promise<NLToSQLResponse> {
    if (!this.isInitialized) {
      throw new Error('NL-to-SQL generator not initialized. Please configure OpenAI API key.')
    }

    try {
      // Build enhanced prompt with schema and context
      const prompt = this.buildEnhancedPrompt(request)
      
      // Generate SQL using GPT-4
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      
      // Validate and enhance the response
      return this.validateAndEnhanceResponse(result, request)

    } catch (error) {
      console.error('Error generating SQL from natural language:', error)
      
      return {
        success: false,
        sql: '',
        explanation: 'Failed to generate SQL query',
        confidence: 0,
        alternatives: [],
        optimizations: [],
        warnings: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        estimatedComplexity: 'high',
        estimatedRows: 0,
        usedTables: [],
        requiredPermissions: []
      }
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert SQL query generator that converts natural language into SQL queries.

Your responsibilities:
1. Generate accurate, efficient SQL queries from natural language
2. Provide clear explanations of what the query does
3. Suggest optimizations when possible
4. Identify potential security issues
5. Estimate query complexity and performance

Response format (JSON):
{
  "success": boolean,
  "sql": "SELECT statement here",
  "explanation": "Clear explanation of what the query does",
  "confidence": 0.0-1.0,
  "alternatives": [
    {
      "sql": "Alternative query",
      "explanation": "Why this alternative might be better",
      "confidence": 0.0-1.0
    }
  ],
  "optimizations": ["Suggestion 1", "Suggestion 2"],
  "warnings": ["Warning 1", "Warning 2"],
  "estimatedComplexity": "low|medium|high",
  "estimatedRows": estimated_number_of_rows,
  "usedTables": ["table1", "table2"],
  "requiredPermissions": ["permission1", "permission2"]
}

Key guidelines:
- Always use proper SQL syntax (SQLite compatible)
- Use table and column names exactly as provided in schema
- Add appropriate JOINs when querying multiple tables
- Include proper WHERE clauses for filtering
- Use ORDER BY and LIMIT when appropriate
- Be conservative with UPDATE/DELETE operations
- Suggest indexes when queries might be slow
- Flag potentially dangerous operations`
  }

  private buildEnhancedPrompt(request: NLToSQLRequest): string {
    const { naturalLanguage, schema, context, options } = request

    let prompt = `Convert this natural language query to SQL:
"${naturalLanguage}"

Database Schema:
${this.formatSchema(schema)}
`

    if (context) {
      prompt += `\nUser Context:
- Role: ${context.userRole}
- Department: ${context.department}
- Access Level: ${context.accessLevel}
- Recent Queries: ${context.recentQueries.slice(0, 3).join(', ')}
- Preferred Tables: ${context.preferredTables.join(', ')}
`
    }

    if (options) {
      prompt += `\nOptions:
- Include Explanation: ${options.includeExplanation}
- Suggest Optimizations: ${options.suggestOptimizations}
- Validate Syntax: ${options.validateSyntax}
- Limit Results: ${options.limitResults}
- Allow Unsafe Operations: ${options.allowUnsafeOperations}
`
    }

    prompt += `\nGenerate a comprehensive JSON response with the SQL query and analysis.`

    return prompt
  }

  private formatSchema(schema: DatabaseSchema): string {
    let schemaStr = 'Tables:\n'
    
    schema.tables.forEach(table => {
      schemaStr += `\n${table.name}:\n`
      table.columns.forEach(col => {
        const nullable = col.nullable ? 'NULL' : 'NOT NULL'
        const pk = col.primaryKey ? ' (PRIMARY KEY)' : ''
        const fk = col.foreignKey ? ` -> ${col.foreignKey.table}.${col.foreignKey.column}` : ''
        schemaStr += `  - ${col.name}: ${col.type} ${nullable}${pk}${fk}\n`
      })
      
      if (table.relationships.length > 0) {
        schemaStr += `  Relationships:\n`
        table.relationships.forEach(rel => {
          schemaStr += `    - ${rel.type} with ${rel.relatedTable} via ${rel.foreignKey} -> ${rel.relatedKey}\n`
        })
      }
    })

    if (schema.views.length > 0) {
      schemaStr += '\nViews:\n'
      schema.views.forEach(view => {
        schemaStr += `\n${view.name}: ${view.description}\n`
      })
    }

    return schemaStr
  }

  private validateAndEnhanceResponse(result: any, request: NLToSQLRequest): NLToSQLResponse {
    // Ensure required fields exist
    const response: NLToSQLResponse = {
      success: result.success || false,
      sql: result.sql || '',
      explanation: result.explanation || 'No explanation provided',
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      alternatives: result.alternatives || [],
      optimizations: result.optimizations || [],
      warnings: result.warnings || [],
      estimatedComplexity: ['low', 'medium', 'high'].includes(result.estimatedComplexity) 
        ? result.estimatedComplexity 
        : 'medium',
      estimatedRows: Math.max(0, result.estimatedRows || 0),
      usedTables: result.usedTables || [],
      requiredPermissions: result.requiredPermissions || []
    }

    // Additional validation
    if (response.sql) {
      // Basic SQL injection protection
      const suspiciousPatterns = [
        /;\s*drop\s+table/i,
        /;\s*delete\s+from.*where\s+1\s*=\s*1/i,
        /union\s+select.*password/i,
        /'.*or.*'.*=.*'/i
      ]

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(response.sql)) {
          response.warnings.push('Potentially dangerous SQL pattern detected')
          response.confidence = Math.min(response.confidence, 0.3)
        }
      }

      // Check if query is too broad without limits
      if (response.sql.toLowerCase().includes('select') && 
          !response.sql.toLowerCase().includes('limit') &&
          !response.sql.toLowerCase().includes('where')) {
        response.warnings.push('Query may return too many results - consider adding WHERE clause or LIMIT')
        response.estimatedRows = Math.max(response.estimatedRows, 10000)
      }
    }

    return response
  }

  /**
   * Generate SQL with intelligent suggestions based on query history
   */
  async generateIntelligentSQL(
    naturalLanguage: string,
    schema: DatabaseSchema,
    queryHistory: string[] = []
  ): Promise<NLToSQLResponse> {
    // Analyze query patterns from history
    const patterns = this.analyzeQueryPatterns(queryHistory)
    
    const context: QueryContext = {
      userRole: 'analyst',
      department: 'general',
      accessLevel: 'read',
      recentQueries: queryHistory.slice(-5),
      preferredTables: patterns.commonTables
    }

    return this.generateSQL({
      naturalLanguage,
      schema,
      context,
      options: {
        includeExplanation: true,
        suggestOptimizations: true,
        validateSyntax: true,
        limitResults: 1000,
        allowUnsafeOperations: false
      }
    })
  }

  private analyzeQueryPatterns(queryHistory: string[]) {
    const tablePattern = /from\s+(\w+)/gi
    const commonTables: string[] = []
    const tableFrequency: Record<string, number> = {}

    queryHistory.forEach(query => {
      let match
      while ((match = tablePattern.exec(query)) !== null) {
        const table = match[1].toLowerCase()
        tableFrequency[table] = (tableFrequency[table] || 0) + 1
      }
    })

    // Get most common tables
    Object.entries(tableFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([table]) => commonTables.push(table))

    return { commonTables }
  }

  /**
   * Get current database schema for the application
   */
  static getCurrentSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'description', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'price', type: 'DECIMAL', nullable: true, primaryKey: false },
            { name: 'stock_quantity', type: 'INTEGER', nullable: false, primaryKey: false },
            { name: 'min_stock_level', type: 'INTEGER', nullable: true, primaryKey: false },
            { name: 'max_stock_level', type: 'INTEGER', nullable: true, primaryKey: false },
            { name: 'category', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'barcode', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'mfgname', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'mfgnum', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'Location', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'unit_id', type: 'TEXT', nullable: true, primaryKey: false, foreignKey: { table: 'units', column: 'id' } },
            { name: 'created_at', type: 'DATETIME', nullable: false, primaryKey: false },
            { name: 'updated_at', type: 'DATETIME', nullable: false, primaryKey: false }
          ],
          relationships: [
            { type: 'many-to-one', relatedTable: 'units', foreignKey: 'unit_id', relatedKey: 'id' },
            { type: 'one-to-many', relatedTable: 'manufacturing_boms', foreignKey: 'id', relatedKey: 'product_id' }
          ]
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'customer_name', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'total_amount', type: 'DECIMAL', nullable: false, primaryKey: false },
            { name: 'status', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'order_date', type: 'DATETIME', nullable: false, primaryKey: false },
            { name: 'created_at', type: 'DATETIME', nullable: false, primaryKey: false }
          ],
          relationships: []
        },
        {
          name: 'manufacturing_boms',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true },
            { name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'product_id', type: 'INTEGER', nullable: true, primaryKey: false, foreignKey: { table: 'products', column: 'id' } },
            { name: 'description', type: 'TEXT', nullable: true, primaryKey: false },
            { name: 'created_at', type: 'DATETIME', nullable: false, primaryKey: false }
          ],
          relationships: [
            { type: 'many-to-one', relatedTable: 'products', foreignKey: 'product_id', relatedKey: 'id' }
          ]
        },
        {
          name: 'units',
          columns: [
            { name: 'id', type: 'TEXT', nullable: false, primaryKey: true },
            { name: 'name', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'symbol', type: 'TEXT', nullable: false, primaryKey: false },
            { name: 'category', type: 'TEXT', nullable: false, primaryKey: false }
          ],
          relationships: [
            { type: 'one-to-many', relatedTable: 'products', foreignKey: 'id', relatedKey: 'unit_id' }
          ]
        }
      ],
      views: [
        {
          name: 'low_stock_products',
          definition: 'SELECT * FROM products WHERE stock_quantity <= min_stock_level',
          description: 'Products that are at or below minimum stock level'
        },
        {
          name: 'product_summary',
          definition: 'SELECT category, COUNT(*) as product_count, AVG(price) as avg_price FROM products GROUP BY category',
          description: 'Summary statistics by product category'
        }
      ]
    }
  }
}

// Export singleton instance
export const nlToSQLGenerator = new NLToSQLGenerator()