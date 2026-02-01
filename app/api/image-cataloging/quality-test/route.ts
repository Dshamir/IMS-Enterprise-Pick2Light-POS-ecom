// Quality Testing API Endpoint for Enhanced OCR Pipeline
import { NextRequest, NextResponse } from "next/server"
import { QualityValidator } from "@/lib/quality-validator"

// POST /api/image-cataloging/quality-test - Run quality validation
export async function POST(request: NextRequest) {
  try {
    const { testType, testCaseId } = await request.json()
    
    const validator = new QualityValidator()
    await validator.initializeTestCases()
    
    let results: any
    
    if (testType === 'full') {
      console.log('🧪 Running full quality validation suite...')
      results = await validator.runFullValidation()
      
      return NextResponse.json({
        success: true,
        message: "Full quality validation completed",
        report: results,
        summary: {
          passRate: `${results.passedTests}/${results.totalTests}`,
          averageScore: results.averageScore.toFixed(3),
          averageTime: results.averageProcessingTime.toFixed(0) + 'ms'
        }
      })
      
    } else if (testType === 'single' && testCaseId) {
      console.log(`🔍 Running single test case: ${testCaseId}`)
      
      const testCases = await validator['testCases'] // Access private property for demo
      const testCase = testCases.find((tc: any) => tc.id === testCaseId)
      
      if (!testCase) {
        return NextResponse.json({
          success: false,
          error: "Test case not found"
        }, { status: 404 })
      }
      
      results = await validator.validateTestCase(testCase)
      
      return NextResponse.json({
        success: true,
        message: "Single test case validation completed",
        result: results
      })
      
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid test type. Use 'full' or 'single' with testCaseId"
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error("Error running quality validation:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to run quality validation: " + error.message
    }, { status: 500 })
  }
}

// GET /api/image-cataloging/quality-test - Get validation history and test cases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'history'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const validator = new QualityValidator()
    await validator.initializeTestCases()
    
    if (action === 'history') {
      const history = validator.getValidationHistory(limit)
      
      return NextResponse.json({
        success: true,
        history: history.map(record => ({
          ...record,
          method_breakdown: JSON.parse(record.method_breakdown || '{}'),
          category_breakdown: JSON.parse(record.category_breakdown || '{}'),
          common_issues: JSON.parse(record.common_issues || '[]'),
          recommendations: JSON.parse(record.recommendations || '[]')
        }))
      })
      
    } else if (action === 'test-cases') {
      return NextResponse.json({
        success: true,
        testCases: validator['testCases'] // Access test cases
      })
      
    } else if (action === 'results') {
      const testCaseId = searchParams.get('testCaseId')
      if (!testCaseId) {
        return NextResponse.json({
          success: false,
          error: "testCaseId required for results action"
        }, { status: 400 })
      }
      
      const results = validator.getTestCaseResults(testCaseId, limit)
      
      return NextResponse.json({
        success: true,
        results: results.map(result => ({
          ...result,
          issues: JSON.parse(result.issues || '[]'),
          recommendations: JSON.parse(result.recommendations || '[]')
        }))
      })
      
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid action. Use 'history', 'test-cases', or 'results'"
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error("Error getting quality validation data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get quality validation data: " + error.message
    }, { status: 500 })
  }
}

// PUT /api/image-cataloging/quality-test - Add or update test case
export async function PUT(request: NextRequest) {
  try {
    const testCase = await request.json()
    
    // Validate required fields
    if (!testCase.id || !testCase.imagePath || !testCase.expectedText || !testCase.expectedObjects) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: id, imagePath, expectedText, expectedObjects"
      }, { status: 400 })
    }
    
    const validator = new QualityValidator()
    await validator.initializeTestCases()
    
    // Set defaults
    const fullTestCase = {
      minConfidence: 0.7,
      category: 'general',
      description: '',
      ...testCase
    }
    
    await validator.addTestCase(fullTestCase)
    
    return NextResponse.json({
      success: true,
      message: "Test case added successfully",
      testCase: fullTestCase
    })
    
  } catch (error) {
    console.error("Error adding test case:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to add test case: " + error.message
    }, { status: 500 })
  }
}