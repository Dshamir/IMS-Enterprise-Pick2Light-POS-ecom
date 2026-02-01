import { getDatabase } from '@/lib/database/sqlite'
import type { Database } from 'better-sqlite3'

// Data quality enums
export enum DataQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Data validation interfaces
export interface DataValidationRule {
  id: string
  name: string
  description: string
  table: string
  field?: string
  condition: string
  severity: ValidationSeverity
  category: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity'
  enabled: boolean
}

export interface ValidationResult {
  ruleId: string
  ruleName: string
  severity: ValidationSeverity
  category: string
  message: string
  affectedRecords: number
  sampleData?: any[]
  recommendations?: string[]
  timestamp: Date
}

export interface DataQualityReport {
  overall: {
    score: number
    level: DataQualityLevel
    totalRecords: number
    totalIssues: number
  }
  byCategory: {
    [category: string]: {
      score: number
      issues: number
      level: DataQualityLevel
    }
  }
  bySeverity: {
    errors: number
    warnings: number
    info: number
  }
  validationResults: ValidationResult[]
  timestamp: Date
}

export interface DataCleaningResult {
  recordsProcessed: number
  recordsCleaned: number
  recordsSkipped: number
  errors: string[]
  warnings: string[]
  actions: DataCleaningAction[]
}

export interface DataCleaningAction {
  type: 'normalize' | 'standardize' | 'remove_duplicates' | 'fill_missing' | 'fix_format'
  table: string
  field: string
  description: string
  recordsAffected: number
}

/**
 * Data Validation and Quality Framework
 * Provides comprehensive data validation, quality assessment, and cleaning
 */
export class DataValidationEngine {
  private db: Database
  private validationRules: Map<string, DataValidationRule> = new Map()

  constructor() {
    this.db = getDatabase()
    this.initializeDefaultRules()
  }

  /**
   * Initialize default validation rules for manufacturing data
   */
  private initializeDefaultRules(): void {
    const defaultRules: DataValidationRule[] = [
      // Product data validation
      {
        id: 'product_name_required',
        name: 'Product Name Required',
        description: 'All products must have a name',
        table: 'products',
        field: 'name',
        condition: 'name IS NULL OR name = \'\'',
        severity: ValidationSeverity.ERROR,
        category: 'completeness',
        enabled: true
      },
      {
        id: 'product_price_positive',
        name: 'Product Price Must Be Positive',
        description: 'Product prices must be greater than 0',
        table: 'products',
        field: 'price',
        condition: 'price IS NULL OR price <= 0',
        severity: ValidationSeverity.ERROR,
        category: 'validity',
        enabled: true
      },
      {
        id: 'product_stock_non_negative',
        name: 'Stock Quantity Non-Negative',
        description: 'Stock quantities cannot be negative',
        table: 'products',
        field: 'stock_quantity',
        condition: 'stock_quantity < 0',
        severity: ValidationSeverity.ERROR,
        category: 'validity',
        enabled: true
      },
      {
        id: 'product_min_stock_logical',
        name: 'Minimum Stock Level Logical',
        description: 'Min stock should be less than max stock',
        table: 'products',
        field: 'min_stock_level',
        condition: 'min_stock_level >= max_stock_level',
        severity: ValidationSeverity.WARNING,
        category: 'consistency',
        enabled: true
      },
      {
        id: 'product_category_valid',
        name: 'Product Category Valid',
        description: 'Products should have valid categories',
        table: 'products',
        field: 'category',
        condition: 'category IS NULL OR category = \'\'',
        severity: ValidationSeverity.WARNING,
        category: 'consistency',
        enabled: true
      },
      {
        id: 'product_unit_valid',
        name: 'Product Unit Valid',
        description: 'Products should have valid unit references',
        table: 'products',
        field: 'unit_id',
        condition: 'unit_id IS NULL OR unit_id = \'\'',
        severity: ValidationSeverity.WARNING,
        category: 'consistency',
        enabled: true
      },

      // Inventory transaction validation
      {
        id: 'transaction_product_exists',
        name: 'Transaction Product Exists',
        description: 'All transactions must reference existing products',
        table: 'inventory_transactions',
        field: 'product_id',
        condition: 'product_id NOT IN (SELECT id FROM products)',
        severity: ValidationSeverity.ERROR,
        category: 'consistency',
        enabled: true
      },
      {
        id: 'transaction_quantity_non_zero',
        name: 'Transaction Quantity Non-Zero',
        description: 'Transaction quantities should not be zero',
        table: 'inventory_transactions',
        field: 'quantity',
        condition: 'quantity = 0',
        severity: ValidationSeverity.WARNING,
        category: 'validity',
        enabled: true
      },
      {
        id: 'transaction_math_consistent',
        name: 'Transaction Math Consistent',
        description: 'Transaction math should be consistent',
        table: 'inventory_transactions',
        condition: 'previous_quantity + quantity != new_quantity',
        severity: ValidationSeverity.ERROR,
        category: 'accuracy',
        enabled: true
      },

      // Manufacturing BOM validation
      {
        id: 'bom_name_required',
        name: 'BOM Name Required',
        description: 'All BOMs must have a name',
        table: 'manufacturing_boms',
        field: 'name',
        condition: 'name IS NULL OR name = \'\' OR TRIM(name) = \'\'',
        severity: ValidationSeverity.ERROR,
        category: 'completeness',
        enabled: true
      },
      {
        id: 'bom_project_or_line_required',
        name: 'BOM Project or Production Line Required',
        description: 'BOMs must be associated with either a project or production line',
        table: 'manufacturing_boms',
        condition: 'project_id IS NULL AND production_line_id IS NULL',
        severity: ValidationSeverity.ERROR,
        category: 'completeness',
        enabled: true
      },
      {
        id: 'bom_items_exist',
        name: 'BOM Must Have Items',
        description: 'BOMs should have at least one item',
        table: 'manufacturing_boms',
        condition: 'id NOT IN (SELECT DISTINCT bom_id FROM manufacturing_bom_items)',
        severity: ValidationSeverity.WARNING,
        category: 'completeness',
        enabled: true
      },

      // Production run validation
      {
        id: 'production_run_quantity_positive',
        name: 'Production Run Quantity Positive',
        description: 'Production run quantities must be positive',
        table: 'production_runs',
        field: 'planned_quantity',
        condition: 'planned_quantity <= 0',
        severity: ValidationSeverity.ERROR,
        category: 'validity',
        enabled: true
      },
      {
        id: 'production_run_actual_reasonable',
        name: 'Production Run Actual Quantity Reasonable',
        description: 'Actual quantity should not exceed planned by more than 50%',
        table: 'production_runs',
        condition: 'actual_quantity > (planned_quantity * 1.5)',
        severity: ValidationSeverity.WARNING,
        category: 'accuracy',
        enabled: true
      },

      // Product instance validation
      {
        id: 'product_instance_serial_unique',
        name: 'Product Instance Serial Number Unique',
        description: 'Serial numbers should be unique within product',
        table: 'product_instances',
        field: 'serial_number',
        condition: 'serial_number IS NOT NULL AND (product_id, serial_number) IN (SELECT product_id, serial_number FROM product_instances GROUP BY product_id, serial_number HAVING COUNT(*) > 1)',
        severity: ValidationSeverity.ERROR,
        category: 'consistency',
        enabled: true
      },
      {
        id: 'product_instance_dates_logical',
        name: 'Product Instance Dates Logical',
        description: 'Product instance dates should be in logical order',
        table: 'product_instances',
        condition: '(manufacture_date IS NOT NULL AND qa_date IS NOT NULL AND manufacture_date > qa_date) OR (qa_date IS NOT NULL AND release_date IS NOT NULL AND qa_date > release_date) OR (release_date IS NOT NULL AND shipped_date IS NOT NULL AND release_date > shipped_date)',
        severity: ValidationSeverity.WARNING,
        category: 'consistency',
        enabled: true
      },

      // Data freshness validation
      {
        id: 'recent_transactions',
        name: 'Recent Transaction Activity',
        description: 'Should have recent transaction activity',
        table: 'inventory_transactions',
        condition: 'created_at < datetime(\'now\', \'-30 days\')',
        severity: ValidationSeverity.INFO,
        category: 'timeliness',
        enabled: true
      }
    ]

    defaultRules.forEach(rule => {
      this.validationRules.set(rule.id, rule)
    })
  }

  /**
   * Run comprehensive data validation
   */
  async validateData(tables?: string[]): Promise<DataQualityReport> {
    const validationResults: ValidationResult[] = []
    const tablesToValidate = tables || this.getAvailableTables()

    // Run validation rules
    for (const [ruleId, rule] of this.validationRules) {
      if (!rule.enabled) continue
      if (tablesToValidate.length > 0 && !tablesToValidate.includes(rule.table)) continue

      try {
        const result = await this.runValidationRule(rule)
        if (result) {
          validationResults.push(result)
        }
      } catch (error) {
        console.error(`Error running validation rule ${ruleId}:`, error)
        validationResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: ValidationSeverity.ERROR,
          category: rule.category,
          message: `Validation rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          affectedRecords: 0,
          timestamp: new Date()
        })
      }
    }

    // Calculate overall quality metrics
    return this.calculateDataQuality(validationResults)
  }

  /**
   * Run a single validation rule
   */
  private async runValidationRule(rule: DataValidationRule): Promise<ValidationResult | null> {
    try {
      // Check if table exists first
      const tableExists = this.tableExists(rule.table)
      if (!tableExists) {
        console.warn(`Table ${rule.table} does not exist, skipping validation rule ${rule.id}`)
        return null
      }

      // Check if referenced columns exist
      const columnsExist = this.validateRuleColumns(rule)
      if (!columnsExist) {
        console.warn(`Column validation failed for rule ${rule.id}, skipping`)
        return null
      }

      // Validate the condition syntax before executing
      const validCondition = this.validateConditionSyntax(rule.condition, rule.table)
      if (!validCondition) {
        console.warn(`Invalid condition syntax for rule ${rule.id}, skipping`)
        return null
      }

      // Sanitize the condition to ensure proper SQLite syntax
      const sanitizedCondition = rule.condition.replace(/"/g, "'")
      const query = `SELECT COUNT(*) as count FROM ${rule.table} WHERE ${sanitizedCondition}`
      console.log(`Executing validation query: ${query}`)
      const result = this.db.prepare(query).get() as { count: number }
      
      if (result.count === 0) {
        return null // No issues found
      }

      // Get sample data for context
      const sampleQuery = `SELECT * FROM ${rule.table} WHERE ${sanitizedCondition} LIMIT 5`
      const sampleData = this.db.prepare(sampleQuery).all()

      // Generate recommendations
      const recommendations = this.generateRecommendations(rule, result.count)

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        category: rule.category,
        message: `${rule.description}: ${result.count} records affected`,
        affectedRecords: result.count,
        sampleData,
        recommendations,
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to execute validation rule ${rule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a table exists
   */
  private tableExists(tableName: string): boolean {
    try {
      const result = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name = ?
      `).get(tableName) as { name: string } | undefined
      
      return !!result
    } catch (error) {
      console.error(`Error checking table existence for ${tableName}:`, error)
      return false
    }
  }

  /**
   * Validate that columns referenced in rule exist
   */
  private validateRuleColumns(rule: DataValidationRule): boolean {
    try {
      // Get table schema
      const tableInfo = this.db.prepare(`PRAGMA table_info(${rule.table})`).all() as Array<{
        name: string
        type: string
        notnull: number
        dflt_value: string | null
        pk: number
      }>
      
      const columnNames = tableInfo.map(col => col.name)
      
      // Check if the field exists (if specified)
      if (rule.field && !columnNames.includes(rule.field)) {
        console.warn(`Field ${rule.field} does not exist in table ${rule.table}`)
        return false
      }

      // Basic validation: check if condition references non-existent columns
      // This is a simple check - could be enhanced with proper SQL parsing
      const condition = rule.condition.toLowerCase()
      const commonColumns = ['id', 'name', 'created_at', 'updated_at']
      
      // Check for common column references that might not exist
      for (const col of commonColumns) {
        if (condition.includes(col) && !columnNames.includes(col)) {
          console.warn(`Column ${col} referenced in condition but does not exist in table ${rule.table}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error(`Error validating columns for rule ${rule.id}:`, error)
      return false
    }
  }

  /**
   * Validate SQL condition syntax
   */
  private validateConditionSyntax(condition: string, table: string): boolean {
    try {
      // Ensure the condition uses proper SQLite syntax
      // Replace double quotes with single quotes for string literals
      const sanitizedCondition = condition.replace(/= ""/g, "= ''").replace(/!= ""/g, "!= ''")
      const testQuery = `SELECT COUNT(*) as count FROM ${table} WHERE ${sanitizedCondition} LIMIT 1`
      this.db.prepare(testQuery).get()
      return true
    } catch (error) {
      console.error(`Invalid condition syntax: ${condition}`, error)
      return false
    }
  }

  /**
   * Calculate overall data quality metrics
   */
  private calculateDataQuality(validationResults: ValidationResult[]): DataQualityReport {
    const totalRecords = this.getTotalRecords()
    const totalIssues = validationResults.reduce((sum, result) => sum + result.affectedRecords, 0)
    
    // Calculate overall score (0-100)
    const overallScore = Math.max(0, 100 - (totalIssues / totalRecords * 100))
    
    // Determine quality level
    const overallLevel = this.getQualityLevel(overallScore)
    
    // Group by category
    const byCategory: { [category: string]: { score: number; issues: number; level: DataQualityLevel } } = {}
    const categories = ['completeness', 'accuracy', 'consistency', 'timeliness', 'validity']
    
    categories.forEach(category => {
      const categoryResults = validationResults.filter(r => r.category === category)
      const categoryIssues = categoryResults.reduce((sum, result) => sum + result.affectedRecords, 0)
      const categoryScore = Math.max(0, 100 - (categoryIssues / totalRecords * 100))
      
      byCategory[category] = {
        score: categoryScore,
        issues: categoryIssues,
        level: this.getQualityLevel(categoryScore)
      }
    })

    // Group by severity
    const bySeverity = {
      errors: validationResults.filter(r => r.severity === ValidationSeverity.ERROR).length,
      warnings: validationResults.filter(r => r.severity === ValidationSeverity.WARNING).length,
      info: validationResults.filter(r => r.severity === ValidationSeverity.INFO).length
    }

    return {
      overall: {
        score: overallScore,
        level: overallLevel,
        totalRecords,
        totalIssues
      },
      byCategory,
      bySeverity,
      validationResults,
      timestamp: new Date()
    }
  }

  /**
   * Get data quality level from score
   */
  private getQualityLevel(score: number): DataQualityLevel {
    if (score >= 95) return DataQualityLevel.EXCELLENT
    if (score >= 85) return DataQualityLevel.GOOD
    if (score >= 70) return DataQualityLevel.FAIR
    if (score >= 50) return DataQualityLevel.POOR
    return DataQualityLevel.CRITICAL
  }

  /**
   * Generate recommendations for validation issues
   */
  private generateRecommendations(rule: DataValidationRule, affectedRecords: number): string[] {
    const recommendations: string[] = []
    
    switch (rule.category) {
      case 'completeness':
        recommendations.push('Review data entry processes to ensure all required fields are populated')
        recommendations.push('Consider implementing validation at the point of data entry')
        break
      case 'accuracy':
        recommendations.push('Implement automated calculations where possible')
        recommendations.push('Add validation rules to prevent incorrect data entry')
        break
      case 'consistency':
        recommendations.push('Establish data standards and enforce them across all systems')
        recommendations.push('Consider implementing referential integrity constraints')
        break
      case 'timeliness':
        recommendations.push('Review data collection frequency and update schedules')
        recommendations.push('Consider implementing real-time data updates')
        break
      case 'validity':
        recommendations.push('Implement input validation and data type constraints')
        recommendations.push('Create dropdown lists or controlled vocabularies for key fields')
        break
    }

    if (affectedRecords > 100) {
      recommendations.push('Consider batch processing for large-scale data fixes')
    }

    return recommendations
  }

  /**
   * Clean and standardize data
   */
  async cleanData(tables?: string[]): Promise<DataCleaningResult> {
    const result: DataCleaningResult = {
      recordsProcessed: 0,
      recordsCleaned: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: [],
      actions: []
    }

    const tablesToClean = tables || ['products', 'inventory_transactions', 'manufacturing_boms']

    try {
      // Start transaction
      const transaction = this.db.transaction(() => {
        for (const table of tablesToClean) {
          const tableResult = this.cleanTable(table)
          result.recordsProcessed += tableResult.recordsProcessed
          result.recordsCleaned += tableResult.recordsCleaned
          result.recordsSkipped += tableResult.recordsSkipped
          result.actions.push(...tableResult.actions)
        }
      })

      transaction()
    } catch (error) {
      result.errors.push(`Data cleaning failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Clean a specific table
   */
  private cleanTable(table: string): DataCleaningResult {
    const result: DataCleaningResult = {
      recordsProcessed: 0,
      recordsCleaned: 0,
      recordsSkipped: 0,
      errors: [],
      warnings: [],
      actions: []
    }

    try {
      switch (table) {
        case 'products':
          this.cleanProductsTable(result)
          break
        case 'inventory_transactions':
          this.cleanInventoryTransactionsTable(result)
          break
        case 'manufacturing_boms':
          this.cleanManufacturingBomsTable(result)
          break
      }
    } catch (error) {
      result.errors.push(`Error cleaning table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Clean products table
   */
  private cleanProductsTable(result: DataCleaningResult): void {
    // Trim whitespace from text fields
    const trimFields = ['name', 'description', 'category', 'mfgname', 'mfgnum', 'distributor']
    
    for (const field of trimFields) {
      const updateStmt = this.db.prepare(`
        UPDATE products 
        SET ${field} = TRIM(${field})
        WHERE ${field} != TRIM(${field}) AND ${field} IS NOT NULL
      `)
      const updateResult = updateStmt.run()
      
      if (updateResult.changes > 0) {
        result.recordsCleaned += updateResult.changes
        result.actions.push({
          type: 'standardize',
          table: 'products',
          field,
          description: `Trimmed whitespace from ${field}`,
          recordsAffected: updateResult.changes
        })
      }
    }

    // Standardize category names
    const categoryMapping = {
      'part': 'parts',
      'consumable': 'consumables',
      'tool': 'tools',
      'equip': 'equipment'
    }

    for (const [oldValue, newValue] of Object.entries(categoryMapping)) {
      const updateStmt = this.db.prepare(`
        UPDATE products 
        SET category = ? 
        WHERE LOWER(category) = LOWER(?)
      `)
      const updateResult = updateStmt.run(newValue, oldValue)
      
      if (updateResult.changes > 0) {
        result.recordsCleaned += updateResult.changes
        result.actions.push({
          type: 'standardize',
          table: 'products',
          field: 'category',
          description: `Standardized category '${oldValue}' to '${newValue}'`,
          recordsAffected: updateResult.changes
        })
      }
    }
  }

  /**
   * Clean inventory transactions table
   */
  private cleanInventoryTransactionsTable(result: DataCleaningResult): void {
    // Remove transactions with zero quantity (if configured)
    const removeZeroQty = this.db.prepare(`
      DELETE FROM inventory_transactions 
      WHERE quantity = 0 AND reason IS NULL
    `)
    const deleteResult = removeZeroQty.run()
    
    if (deleteResult.changes > 0) {
      result.recordsCleaned += deleteResult.changes
      result.actions.push({
        type: 'remove_duplicates',
        table: 'inventory_transactions',
        field: 'quantity',
        description: 'Removed transactions with zero quantity and no reason',
        recordsAffected: deleteResult.changes
      })
    }
  }

  /**
   * Clean manufacturing BOMs table
   */
  private cleanManufacturingBomsTable(result: DataCleaningResult): void {
    // Trim whitespace from text fields
    const trimFields = ['name', 'description', 'notes']
    
    for (const field of trimFields) {
      const updateStmt = this.db.prepare(`
        UPDATE manufacturing_boms 
        SET ${field} = TRIM(${field})
        WHERE ${field} != TRIM(${field}) AND ${field} IS NOT NULL
      `)
      const updateResult = updateStmt.run()
      
      if (updateResult.changes > 0) {
        result.recordsCleaned += updateResult.changes
        result.actions.push({
          type: 'standardize',
          table: 'manufacturing_boms',
          field,
          description: `Trimmed whitespace from ${field}`,
          recordsAffected: updateResult.changes
        })
      }
    }
  }

  /**
   * Get total records across all tables
   */
  private getTotalRecords(): number {
    const tables = ['products', 'inventory_transactions', 'manufacturing_boms', 'production_runs']
    let total = 0
    
    for (const table of tables) {
      try {
        const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
        total += result.count
      } catch (error) {
        console.error(`Error counting records in ${table}:`, error)
      }
    }
    
    return total
  }

  /**
   * Get available tables for validation
   */
  private getAvailableTables(): string[] {
    const result = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[]
    
    return result.map(row => row.name)
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: DataValidationRule): void {
    this.validationRules.set(rule.id, rule)
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): void {
    this.validationRules.delete(ruleId)
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): DataValidationRule[] {
    return Array.from(this.validationRules.values())
  }

  /**
   * Enable/disable validation rule
   */
  toggleValidationRule(ruleId: string, enabled: boolean): void {
    const rule = this.validationRules.get(ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }
}

// Export singleton instance
export const dataValidationEngine = new DataValidationEngine()