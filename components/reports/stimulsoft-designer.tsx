'use client'

import { useEffect, useRef, useState } from 'react'

// Extend Window interface to include Stimulsoft
declare global {
  interface Window {
    Stimulsoft: any
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Download, Eye, Settings, Database } from 'lucide-react'

interface StimulsoftDesignerProps {
  onReportSave?: (reportData: any) => void
  onPreview?: (reportData: any) => void
  initialReport?: string
}

export default function StimulsoftDesigner({ 
  onReportSave, 
  onPreview, 
  initialReport 
}: StimulsoftDesignerProps) {
  const designerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stimulsoft, setStimulsoft] = useState<any>(null)
  const [designer, setDesigner] = useState<any>(null)
  const [report, setReport] = useState<any>(null)

  // Initialize Stimulsoft Reports.JS
  useEffect(() => {
    const initializeStimulsoft = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('🚀 Starting Stimulsoft Reports.JS initialization...')

        // Check if we're in the browser
        if (typeof window === 'undefined') {
          throw new Error('Stimulsoft can only be initialized in browser environment')
        }

        // Load Stimulsoft via script tag for better browser compatibility
        const loadStimulsoftScript = () => {
          return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.Stimulsoft) {
              resolve(window.Stimulsoft)
              return
            }

            const script = document.createElement('script')
            script.src = '/node_modules/stimulsoft-reports-js/Scripts/stimulsoft.reports.js'
            script.async = true
            script.onload = () => {
              console.log('📊 Stimulsoft script loaded')
              if (window.Stimulsoft) {
                resolve(window.Stimulsoft)
              } else {
                reject(new Error('Stimulsoft not found after script load'))
              }
            }
            script.onerror = () => reject(new Error('Failed to load Stimulsoft script'))
            document.head.appendChild(script)
          })
        }

        const Stimulsoft = await loadStimulsoftScript() as any
        console.log('📊 Stimulsoft Reports.JS loaded successfully', Object.keys(Stimulsoft))
        setStimulsoft(Stimulsoft)

        // Create report object
        const newReport = Stimulsoft.Report.StiReport.createNewReport()
        setReport(newReport)

        // Check if all required modules are available
        if (!Stimulsoft.Designer || !Stimulsoft.Report) {
          throw new Error('Required Stimulsoft modules not found')
        }

        console.log('⚙️ Configuring designer options...')

        // Configure designer options
        const options = new Stimulsoft.Designer.StiDesignerOptions()
        
        // Enable all panels and features
        options.appearance.fullScreenMode = false
        options.appearance.showTooltips = true
        options.toolbar.showFileMenu = true
        options.toolbar.showNewReportButton = true
        options.toolbar.showOpenButton = true
        options.toolbar.showSaveButton = true
        options.toolbar.showPreviewButton = true
        
        // Data source options
        options.wizards.enabled = true
        options.wizards.showConnectionStringBuilder = true
        options.wizards.showDataSourceWizard = true
        
        // Enable professional features
        options.exports.showExportDialog = true
        if (Stimulsoft.Designer.StiDesignerSpecification?.Developer) {
          options.appearance.designerSpecification = Stimulsoft.Designer.StiDesignerSpecification.Developer
        }

        console.log('🎨 Creating designer instance...')

        // Create designer
        const newDesigner = new Stimulsoft.Designer.StiDesigner(options, 'StiDesigner', false)
        
        // Set the report
        newDesigner.report = newReport
        
        // Designer events
        newDesigner.onSaveReport = (args: any) => {
          console.log('💾 Report saved in designer')
          if (onReportSave) {
            onReportSave(args.report)
          }
        }

        newDesigner.onPreviewReport = (args: any) => {
          console.log('👁️ Report preview requested')
          if (onPreview) {
            onPreview(args.report)
          }
        }

        newDesigner.onDesignReport = (args: any) => {
          console.log('🎨 Report design event')
        }

        // Load initial report if provided
        if (initialReport) {
          newReport.loadFile(initialReport)
        }

        setDesigner(newDesigner)
        console.log('✅ Designer initialized successfully')

      } catch (err) {
        console.error('❌ Failed to initialize Stimulsoft:', err)
        setError(`Failed to initialize designer: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeStimulsoft()
  }, [initialReport, onReportSave, onPreview])

  // Render designer to DOM
  useEffect(() => {
    if (designer && designerRef.current && !isLoading) {
      try {
        // Clear any existing content
        designerRef.current.innerHTML = ''
        
        // Render the designer
        designer.renderHtml(designerRef.current)
        console.log('🎨 Designer rendered to DOM')
        
        // Setup data sources after rendering
        setupDataSources()
        
      } catch (err) {
        console.error('❌ Failed to render designer:', err)
        setError(`Failed to render designer: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }, [designer, isLoading])

  const setupDataSources = async () => {
    if (!stimulsoft || !report) return

    try {
      console.log('🔗 Setting up data sources using Stimulsoft API...')
      
      // Fetch schema from our dedicated Stimulsoft API
      const response = await fetch('/api/reports/stimulsoft?action=schema')
      const schemaData = await response.json()
      
      if (!schemaData.success) {
        throw new Error(schemaData.error || 'Failed to fetch schema')
      }
      
      console.log(`📋 Received schema for ${schemaData.schema.length} tables`)
      
      // Create a database for our schema
      const database = new stimulsoft.Report.StiSqlDatabase(
        'InventoryDatabase', 
        'Inventory Management Database',
        '/api/reports/stimulsoft'
      )
      
      // Add each table from the schema
      schemaData.schema.forEach((tableSchema: any) => {
        try {
          // Create data source for each table
          const dataSource = new stimulsoft.Report.StiSqlSource(
            tableSchema.name,
            tableSchema.description || `${tableSchema.name} table`,
            'InventoryDatabase'
          )
          
          // Set up the query for this table
          dataSource.sqlCommand = `SELECT * FROM ${tableSchema.name}`
          
          // Add columns
          tableSchema.columns.forEach((col: any) => {
            const column = new stimulsoft.Report.StiDataColumn(
              col.name,
              col.name,
              col.description || col.name,
              getStimulsoftSystemType(col.type)
            )
            column.type = getStimulsoftSystemType(col.type)
            dataSource.columns.add(column)
          })
          
          // Add the data source to the report
          report.dataSources.add(dataSource)
          console.log(`✅ Added table: ${tableSchema.name} (${tableSchema.columns.length} columns)`)
          
        } catch (tableErr) {
          console.warn(`⚠️ Could not setup table ${tableSchema.name}:`, tableErr)
        }
      })
      
      // Add the database to the report
      report.dataSources.add(database)
      
      console.log('✅ All data sources configured successfully for Stimulsoft')
      
    } catch (err) {
      console.error('❌ Failed to setup data sources:', err)
      setError(`Data source setup failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const getStimulsoftSystemType = (typeString: string): any => {
    if (!stimulsoft?.System) return typeString
    
    const type = typeString.toLowerCase()
    
    if (type.includes('int32') || type.includes('integer')) {
      return stimulsoft.System.TypeCode.Int32
    }
    if (type.includes('double') || type.includes('float')) {
      return stimulsoft.System.TypeCode.Double
    }
    if (type.includes('decimal')) {
      return stimulsoft.System.TypeCode.Decimal
    }
    if (type.includes('datetime') || type.includes('date')) {
      return stimulsoft.System.TypeCode.DateTime
    }
    if (type.includes('boolean') || type.includes('bool')) {
      return stimulsoft.System.TypeCode.Boolean
    }
    
    return stimulsoft.System.TypeCode.String
  }

  const getStimulsoftType = (dbType: string): any => {
    if (!stimulsoft) return 'String'
    
    const type = dbType.toLowerCase()
    if (type.includes('int') || type.includes('number')) {
      return stimulsoft.System.TypeCode.Int32
    }
    if (type.includes('real') || type.includes('float') || type.includes('decimal')) {
      return stimulsoft.System.TypeCode.Double
    }
    if (type.includes('date') || type.includes('time')) {
      return stimulsoft.System.TypeCode.DateTime
    }
    if (type.includes('bool')) {
      return stimulsoft.System.TypeCode.Boolean
    }
    return stimulsoft.System.TypeCode.String
  }

  const handleSaveReport = () => {
    if (designer && report) {
      try {
        const reportJson = report.saveToJsonString()
        console.log('💾 Saving report:', reportJson.length, 'characters')
        
        // Trigger save callback
        if (onReportSave) {
          onReportSave(report)
        }
        
        // Save to local storage as backup
        localStorage.setItem('stimulsoft_report_backup', reportJson)
        
      } catch (err) {
        console.error('❌ Failed to save report:', err)
        setError(`Failed to save report: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const handlePreview = () => {
    if (designer && report) {
      try {
        console.log('👁️ Opening report preview...')
        designer.showPreviewTab = true
        
        if (onPreview) {
          onPreview(report)
        }
        
      } catch (err) {
        console.error('❌ Failed to preview report:', err)
        setError(`Failed to preview report: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const handleNewReport = () => {
    if (stimulsoft && designer) {
      try {
        const newReport = stimulsoft.Report.StiReport.createNewReport()
        designer.report = newReport
        setReport(newReport)
        setupDataSources()
        console.log('📄 Created new report')
        
      } catch (err) {
        console.error('❌ Failed to create new report:', err)
        setError(`Failed to create new report: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Stimulsoft Report Designer
          </CardTitle>
          <CardDescription>
            Initializing professional visual report designer...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-muted-foreground">
                Setting up Stimulsoft Reports.JS components
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Settings className="h-5 w-5" />
            Designer Initialization Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              The Stimulsoft designer could not be initialized. This might be due to:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Missing Stimulsoft Reports.JS dependencies</li>
              <li>Browser compatibility issues</li>
              <li>Network connectivity problems</li>
            </ul>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Retry Initialization
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Designer Toolbar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleNewReport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              New Report
            </Button>
            <Button
              onClick={handleSaveReport}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              onClick={handlePreview}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <Database className="h-4 w-4" />
              Connected to Inventory Database
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Designer Container */}
      <Card className="min-h-[600px]">
        <CardContent className="p-0">
          <div
            ref={designerRef}
            className="w-full min-h-[600px] bg-gray-50 border rounded-lg"
            style={{ 
              minHeight: '600px',
              width: '100%',
              overflow: 'hidden'
            }}
          />
        </CardContent>
      </Card>

      {/* Status Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Stimulsoft Reports.JS Professional Designer v2025.3.1</span>
            <span>Ready for report design</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}