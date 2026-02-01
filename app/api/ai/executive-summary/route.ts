import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(request: NextRequest) {
  let data: any[] = []
  let query: any = {}
  let context: any = {}
  
  try {
    const requestData = await request.json()
    data = requestData.data || []
    query = requestData.query || {}
    context = requestData.context || {}

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        error: 'No data provided for analysis'
      }, { status: 400 })
    }

    // Prepare data summary for AI analysis
    const dataSnapshot = data.slice(0, 50) // Limit to first 50 records for analysis
    const fields = Object.keys(dataSnapshot[0] || {})
    const recordCount = data.length
    
    // Generate basic statistics
    const statistics = generateDataStatistics(data)
    
    // Create prompt for AI analysis
    const prompt = `
As an executive business analyst, analyze the following manufacturing/inventory data and provide a comprehensive executive summary.

CONTEXT:
- Report Type: ${context.reportType || 'Operational'}
- Date Range: ${context.dateRange || 'Current Period'}
- Department: ${context.department || 'Operations'}
- Total Records: ${recordCount}
- Data Fields: ${fields.join(', ')}

DATA STATISTICS:
${JSON.stringify(statistics, null, 2)}

SAMPLE DATA (first 10 records):
${JSON.stringify(dataSnapshot.slice(0, 10), null, 2)}

Please provide:
1. EXECUTIVE_SUMMARY: A 2-3 sentence high-level summary suitable for C-level executives
2. KEY_METRICS: 3-5 important KPIs with values, targets, and status (good/warning/critical)
3. INSIGHTS: 3-5 key business insights that executives should know
4. RECOMMENDATIONS: 3-5 strategic recommendations for action

Format your response as valid JSON with the structure:
{
  "summary": "executive summary text",
  "metrics": [
    {
      "id": "metric-id",
      "name": "Metric Name",
      "value": number,
      "target": number,
      "unit": "unit",
      "trend": "up|down|stable",
      "status": "good|warning|critical",
      "description": "brief description"
    }
  ],
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}

Focus on business impact, financial implications, and strategic importance. Use executive-level language.
`

    // Call OpenAI API (only if available)
    if (!openai) {
      // Use fallback when OpenAI is not available
      return NextResponse.json({
        summary: generateBasicSummary(data, context),
        metrics: generateFallbackMetrics(data),
        insights: generateBasicInsights(data, context),
        recommendations: generateBasicRecommendations(data, context)
      })
    }
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert executive business analyst specializing in manufacturing and inventory management. You provide clear, actionable insights for C-level executives.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI service')
    }

    // Parse AI response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (error) {
      // Fallback if JSON parsing fails
      parsedResponse = {
        summary: aiResponse,
        metrics: generateFallbackMetrics(data),
        insights: ['AI analysis generated comprehensive overview of operational data'],
        recommendations: ['Continue monitoring key performance indicators', 'Review operational efficiency metrics']
      }
    }

    return NextResponse.json(parsedResponse)

  } catch (error) {
    console.error('Error generating executive summary:', error)
    
    // Return fallback response
    return NextResponse.json({
      summary: generateBasicSummary(data, context),
      metrics: generateFallbackMetrics(data),
      insights: generateBasicInsights(data, context),
      recommendations: generateBasicRecommendations(data, context)
    })
  }
}

function generateDataStatistics(data: any[]) {
  const statistics: any = {
    totalRecords: data.length,
    fields: Object.keys(data[0] || {}),
    summary: {}
  }

  // Generate basic statistics for numeric fields
  const numericFields = ['price', 'stock_quantity', 'min_stock_level', 'max_stock_level']
  
  numericFields.forEach(field => {
    const values = data.map(item => item[field]).filter(val => typeof val === 'number')
    if (values.length > 0) {
      statistics.summary[field] = {
        count: values.length,
        total: values.reduce((sum, val) => sum + val, 0),
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    }
  })

  // Generate category statistics
  if (data[0]?.category) {
    const categories = data.map(item => item.category).filter(Boolean)
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    statistics.summary.categories = {
      unique: Object.keys(categoryCount).length,
      distribution: categoryCount
    }
  }

  return statistics
}

function generateFallbackMetrics(data: any[]) {
  const metrics = []
  
  // Total records metric
  metrics.push({
    id: 'total-records',
    name: 'Total Records',
    value: data.length,
    target: Math.ceil(data.length * 1.1),
    unit: 'records',
    trend: 'stable',
    status: 'good',
    description: 'Total number of records in the analysis'
  })

  // Average price if available
  if (data[0]?.price) {
    const prices = data.map(item => item.price).filter(p => typeof p === 'number')
    if (prices.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
      metrics.push({
        id: 'avg-price',
        name: 'Average Price',
        value: Math.round(avgPrice * 100) / 100,
        target: Math.round(avgPrice * 1.05 * 100) / 100,
        unit: '$',
        trend: 'stable',
        status: 'good',
        description: 'Average price across all items'
      })
    }
  }

  // Stock levels if available
  if (data[0]?.stock_quantity) {
    const totalStock = data.reduce((sum, item) => sum + (item.stock_quantity || 0), 0)
    const lowStock = data.filter(item => item.stock_quantity < item.min_stock_level).length
    
    metrics.push({
      id: 'total-stock',
      name: 'Total Stock',
      value: totalStock,
      target: Math.ceil(totalStock * 1.2),
      unit: 'units',
      trend: lowStock > 0 ? 'down' : 'stable',
      status: lowStock > 0 ? 'warning' : 'good',
      description: 'Total stock quantity across all products'
    })
  }

  return metrics
}

function generateBasicSummary(data: any[], context: any) {
  const recordCount = data.length
  const currentDate = new Date().toLocaleDateString()
  const reportType = context.reportType || 'operational'
  const department = context.department || 'Operations'
  
  return `This ${reportType} report contains analysis of ${recordCount} records as of ${currentDate}. The data shows current operational status across ${department} with key performance indicators and trend analysis. ${recordCount > 100 ? 'The comprehensive dataset provides detailed insights into operational performance.' : 'The focused dataset enables targeted analysis of key metrics.'}`
}

function generateBasicInsights(data: any[], context: any) {
  const insights: string[] = []
  
  if (data.length > 0) {
    insights.push(`Analysis covers ${data.length} records providing comprehensive operational visibility.`)
    
    const fields = Object.keys(data[0] || {})
    insights.push(`Data encompasses ${fields.length} key performance attributes for thorough analysis.`)
    
    if (fields.includes('category')) {
      const categories = [...new Set(data.map(item => item.category).filter(Boolean))]
      insights.push(`Operations span ${categories.length} distinct categories, demonstrating operational diversity.`)
    }
    
    if (fields.includes('stock_quantity')) {
      const lowStock = data.filter(item => item.stock_quantity < (item.min_stock_level || 0)).length
      if (lowStock > 0) {
        insights.push(`${lowStock} items currently below minimum stock levels, requiring immediate attention.`)
      } else {
        insights.push(`All items maintain adequate stock levels above minimum thresholds.`)
      }
    }
    
    if (fields.includes('price')) {
      const avgPrice = data.reduce((sum, item) => sum + (item.price || 0), 0) / data.length
      insights.push(`Average price point of $${avgPrice.toFixed(2)} indicates healthy pricing strategy.`)
    }
  }

  return insights
}

function generateBasicRecommendations(data: any[], context: any) {
  const recommendations: string[] = []
  
  if (data.length > 0) {
    recommendations.push('Continue monitoring key performance indicators through regular reporting cycles.')
    
    const fields = Object.keys(data[0] || {})
    
    if (fields.includes('stock_quantity')) {
      const lowStock = data.filter(item => item.stock_quantity < (item.min_stock_level || 0)).length
      if (lowStock > 0) {
        recommendations.push(`Prioritize restocking of ${lowStock} items currently below minimum levels to prevent stockouts.`)
      } else {
        recommendations.push('Maintain current inventory management practices to sustain optimal stock levels.')
      }
    }
    
    if (fields.includes('price')) {
      recommendations.push('Review pricing strategy quarterly to ensure competitiveness and profitability.')
    }
    
    recommendations.push('Implement automated alerting for critical threshold breaches to enable proactive management.')
    recommendations.push('Schedule monthly executive reviews to assess operational performance against strategic objectives.')
    
    if (context.reportType === 'monthly' || context.reportType === 'quarterly') {
      recommendations.push('Consider expanding reporting frequency for critical metrics to enable faster response times.')
    }
  }

  return recommendations
}