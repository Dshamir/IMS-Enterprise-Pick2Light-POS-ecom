// Quality Validation and Testing Framework for Enhanced OCR Pipeline
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getDatabase } from './database/sqlite'
import { OCRPipelineLogger } from './ocr-pipeline-logger'
import { DualPathProcessor, type ProcessingResult } from './dual-path-processor'

interface TestCase {
  id: string
  imagePath: string
  expectedText: string[]
  expectedObjects: string[]
  minConfidence: number
  category: string
  description: string
}

interface ValidationResult {
  testCaseId: string
  passed: boolean
  score: number
  details: {
    textAccuracy: number
    objectAccuracy: number
    confidenceScore: number
    processingTime: number
    method: string
  }
  issues: string[]
  recommendations: string[]
}

interface QualityReport {
  totalTests: number
  passedTests: number
  averageScore: number
  averageProcessingTime: number
  methodBreakdown: Record<string, number>
  categoryBreakdown: Record<string, number>
  commonIssues: string[]
  recommendations: string[]
  timestamp: string
}

export class QualityValidator {
  private logger: OCRPipelineLogger
  private processor: DualPathProcessor
  private testCases: TestCase[]

  constructor() {
    this.logger = new OCRPipelineLogger('QualityValidator')
    this.processor = new DualPathProcessor({
      enableOCRPath: true,
      enableAIPath: true,
      preferAIForTextExtraction: true,
      confidenceThreshold: 0.7,
      parallelProcessing: true,
      fallbackStrategy: 'best_confidence'
    })
    this.testCases = []
  }

  // Initialize test cases from database or default set
  async initializeTestCases(): Promise<void> {
    this.logger.startCheckpoint('TEST_CASE_INITIALIZATION')
    
    try {
      const db = getDatabase()
      
      // Create test cases table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS quality_test_cases (
          id TEXT PRIMARY KEY,
          image_path TEXT NOT NULL,
          expected_text TEXT NOT NULL,
          expected_objects TEXT NOT NULL,
          min_confidence REAL DEFAULT 0.7,
          category TEXT DEFAULT 'general',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Load existing test cases
      const cases = db.prepare(`
        SELECT * FROM quality_test_cases ORDER BY category, id
      `).all()

      this.testCases = cases.map(testCase => ({
        id: testCase.id,
        imagePath: testCase.image_path,
        expectedText: JSON.parse(testCase.expected_text),
        expectedObjects: JSON.parse(testCase.expected_objects),
        minConfidence: testCase.min_confidence,
        category: testCase.category,
        description: testCase.description
      }))

      // If no test cases exist, create some default ones
      if (this.testCases.length === 0) {
        await this.createDefaultTestCases()
      }

      this.logger.completeCheckpoint('TEST_CASE_INITIALIZATION', {
        testCasesLoaded: this.testCases.length,
        categories: [...new Set(this.testCases.map(tc => tc.category))]
      })

      console.log(`🧪 Initialized ${this.testCases.length} quality test cases`)

    } catch (error) {
      this.logger.failCheckpoint('TEST_CASE_INITIALIZATION', error.message)
      throw error
    }
  }

  // Create default test cases for common scenarios
  private async createDefaultTestCases(): Promise<void> {
    const defaultCases: TestCase[] = [
      {
        id: 'barcode_test',
        imagePath: 'test-images/barcode-sample.jpg',
        expectedText: ['barcode', 'upc', 'product'],
        expectedObjects: ['product', 'labeled_product'],
        minConfidence: 0.8,
        category: 'barcode',
        description: 'Standard barcode detection test'
      },
      {
        id: 'text_label_test',
        imagePath: 'test-images/text-label-sample.jpg',
        expectedText: ['model', 'part', 'number'],
        expectedObjects: ['product', 'labeled_product'],
        minConfidence: 0.7,
        category: 'text_extraction',
        description: 'Product label text extraction test'
      },
      {
        id: 'electronics_test',
        imagePath: 'test-images/electronics-sample.jpg',
        expectedText: ['electronic', 'device', 'voltage'],
        expectedObjects: ['electronics', 'product'],
        minConfidence: 0.6,
        category: 'electronics',
        description: 'Electronics product identification test'
      }
    ]

    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO quality_test_cases 
      (id, image_path, expected_text, expected_objects, min_confidence, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const testCase of defaultCases) {
      stmt.run(
        testCase.id,
        testCase.imagePath,
        JSON.stringify(testCase.expectedText),
        JSON.stringify(testCase.expectedObjects),
        testCase.minConfidence,
        testCase.category,
        testCase.description
      )
    }

    this.testCases = defaultCases
    console.log(`📝 Created ${defaultCases.length} default test cases`)
  }

  // Add a new test case
  async addTestCase(testCase: TestCase): Promise<void> {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO quality_test_cases 
      (id, image_path, expected_text, expected_objects, min_confidence, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      testCase.id,
      testCase.imagePath,
      JSON.stringify(testCase.expectedText),
      JSON.stringify(testCase.expectedObjects),
      testCase.minConfidence,
      testCase.category,
      testCase.description
    )

    this.testCases.push(testCase)
    console.log(`➕ Added test case: ${testCase.id}`)
  }

  // Run validation on a single test case
  async validateTestCase(testCase: TestCase): Promise<ValidationResult> {
    this.logger.startCheckpoint(`VALIDATE_${testCase.id}`)
    
    try {
      const imagePath = join(process.cwd(), 'public', testCase.imagePath)
      
      // Process the image
      const result = await this.processor.processImage(imagePath)
      
      // Calculate accuracy scores
      const textAccuracy = this.calculateTextAccuracy(
        result.finalText,
        testCase.expectedText
      )
      
      const objectAccuracy = this.calculateObjectAccuracy(
        result.finalObjects,
        testCase.expectedObjects
      )
      
      const confidenceScore = result.finalConfidence >= testCase.minConfidence ? 1.0 : 
        result.finalConfidence / testCase.minConfidence
      
      // Overall score (weighted average)
      const score = (textAccuracy * 0.4 + objectAccuracy * 0.3 + confidenceScore * 0.3)
      
      // Determine if test passed
      const passed = score >= 0.7 && result.finalConfidence >= testCase.minConfidence
      
      // Identify issues
      const issues: string[] = []
      const recommendations: string[] = []
      
      if (textAccuracy < 0.7) {
        issues.push('Low text extraction accuracy')
        recommendations.push('Consider adjusting OCR preprocessing or AI prompt')
      }
      
      if (objectAccuracy < 0.7) {
        issues.push('Poor object detection')
        recommendations.push('Improve object detection algorithms or training data')
      }
      
      if (result.finalConfidence < testCase.minConfidence) {
        issues.push('Confidence below threshold')
        recommendations.push('Review confidence calculation or adjust thresholds')
      }
      
      const validationResult: ValidationResult = {
        testCaseId: testCase.id,
        passed,
        score,
        details: {
          textAccuracy,
          objectAccuracy,
          confidenceScore,
          processingTime: result.processingTime,
          method: result.method
        },
        issues,
        recommendations
      }

      this.logger.completeCheckpoint(`VALIDATE_${testCase.id}`, {
        passed,
        score,
        textAccuracy,
        objectAccuracy,
        processingTime: result.processingTime
      })

      return validationResult

    } catch (error) {
      this.logger.failCheckpoint(`VALIDATE_${testCase.id}`, error.message)
      
      return {
        testCaseId: testCase.id,
        passed: false,
        score: 0,
        details: {
          textAccuracy: 0,
          objectAccuracy: 0,
          confidenceScore: 0,
          processingTime: 0,
          method: 'error'
        },
        issues: [`Processing error: ${error.message}`],
        recommendations: ['Fix processing pipeline errors']
      }
    }
  }

  // Run full quality validation suite
  async runFullValidation(): Promise<QualityReport> {
    this.logger.startCheckpoint('FULL_VALIDATION_SUITE')
    
    console.log(`🧪 Running full quality validation on ${this.testCases.length} test cases...`)
    
    try {
      const results: ValidationResult[] = []
      
      // Run all test cases
      for (const testCase of this.testCases) {
        console.log(`🔍 Testing: ${testCase.id} (${testCase.category})`)
        const result = await this.validateTestCase(testCase)
        results.push(result)
      }
      
      // Generate comprehensive report
      const report = this.generateQualityReport(results)
      
      // Store results in database
      await this.storeValidationResults(results, report)
      
      this.logger.completeCheckpoint('FULL_VALIDATION_SUITE', {
        totalTests: report.totalTests,
        passedTests: report.passedTests,
        averageScore: report.averageScore,
        averageProcessingTime: report.averageProcessingTime
      })

      console.log(`✅ Quality validation complete:`, {
        passed: `${report.passedTests}/${report.totalTests}`,
        averageScore: report.averageScore.toFixed(3),
        averageTime: report.averageProcessingTime.toFixed(0) + 'ms'
      })

      return report

    } catch (error) {
      this.logger.failCheckpoint('FULL_VALIDATION_SUITE', error.message)
      throw error
    }
  }

  // Calculate text extraction accuracy
  private calculateTextAccuracy(actualText: string, expectedTexts: string[]): number {
    if (expectedTexts.length === 0) return 1.0
    
    const actualLower = actualText.toLowerCase()
    const foundExpected = expectedTexts.filter(expected => 
      actualLower.includes(expected.toLowerCase())
    )
    
    return foundExpected.length / expectedTexts.length
  }

  // Calculate object detection accuracy
  private calculateObjectAccuracy(actualObjects: string[], expectedObjects: string[]): number {
    if (expectedObjects.length === 0) return 1.0
    
    const foundExpected = expectedObjects.filter(expected => 
      actualObjects.some(actual => actual.toLowerCase() === expected.toLowerCase())
    )
    
    return foundExpected.length / expectedObjects.length
  }

  // Generate comprehensive quality report
  private generateQualityReport(results: ValidationResult[]): QualityReport {
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    
    const totalScore = results.reduce((sum, r) => sum + r.score, 0)
    const averageScore = totalScore / totalTests
    
    const totalTime = results.reduce((sum, r) => sum + r.details.processingTime, 0)
    const averageProcessingTime = totalTime / totalTests
    
    // Method breakdown
    const methodBreakdown: Record<string, number> = {}
    results.forEach(r => {
      methodBreakdown[r.details.method] = (methodBreakdown[r.details.method] || 0) + 1
    })
    
    // Category breakdown (from test cases)
    const categoryBreakdown: Record<string, number> = {}
    this.testCases.forEach(tc => {
      const result = results.find(r => r.testCaseId === tc.id)
      if (result && result.passed) {
        categoryBreakdown[tc.category] = (categoryBreakdown[tc.category] || 0) + 1
      }
    })
    
    // Common issues
    const allIssues = results.flatMap(r => r.issues)
    const issueFrequency: Record<string, number> = {}
    allIssues.forEach(issue => {
      issueFrequency[issue] = (issueFrequency[issue] || 0) + 1
    })
    const commonIssues = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue)
    
    // Common recommendations
    const allRecommendations = results.flatMap(r => r.recommendations)
    const recFrequency: Record<string, number> = {}
    allRecommendations.forEach(rec => {
      recFrequency[rec] = (recFrequency[rec] || 0) + 1
    })
    const recommendations = Object.entries(recFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([rec]) => rec)

    return {
      totalTests,
      passedTests,
      averageScore,
      averageProcessingTime,
      methodBreakdown,
      categoryBreakdown,
      commonIssues,
      recommendations,
      timestamp: new Date().toISOString()
    }
  }

  // Store validation results in database
  private async storeValidationResults(
    results: ValidationResult[], 
    report: QualityReport
  ): Promise<void> {
    const db = getDatabase()
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS quality_validation_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_case_id TEXT,
        passed BOOLEAN,
        score REAL,
        text_accuracy REAL,
        object_accuracy REAL,
        confidence_score REAL,
        processing_time INTEGER,
        method TEXT,
        issues TEXT,
        recommendations TEXT,
        validated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS quality_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_tests INTEGER,
        passed_tests INTEGER,
        average_score REAL,
        average_processing_time REAL,
        method_breakdown TEXT,
        category_breakdown TEXT,
        common_issues TEXT,
        recommendations TEXT,
        report_timestamp TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Store individual results
    const resultStmt = db.prepare(`
      INSERT INTO quality_validation_results 
      (test_case_id, passed, score, text_accuracy, object_accuracy, confidence_score, 
       processing_time, method, issues, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const result of results) {
      resultStmt.run(
        result.testCaseId,
        result.passed,
        result.score,
        result.details.textAccuracy,
        result.details.objectAccuracy,
        result.details.confidenceScore,
        result.details.processingTime,
        result.details.method,
        JSON.stringify(result.issues),
        JSON.stringify(result.recommendations)
      )
    }

    // Store report summary
    const reportStmt = db.prepare(`
      INSERT INTO quality_reports 
      (total_tests, passed_tests, average_score, average_processing_time,
       method_breakdown, category_breakdown, common_issues, recommendations, report_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    reportStmt.run(
      report.totalTests,
      report.passedTests,
      report.averageScore,
      report.averageProcessingTime,
      JSON.stringify(report.methodBreakdown),
      JSON.stringify(report.categoryBreakdown),
      JSON.stringify(report.commonIssues),
      JSON.stringify(report.recommendations),
      report.timestamp
    )
  }

  // Get validation history
  getValidationHistory(limit: number = 10): any[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM quality_reports 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit)
  }

  // Get test case results
  getTestCaseResults(testCaseId: string, limit: number = 5): any[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM quality_validation_results 
      WHERE test_case_id = ?
      ORDER BY validated_at DESC 
      LIMIT ?
    `).all(testCaseId, limit)
  }
}

export { type TestCase, type ValidationResult, type QualityReport }