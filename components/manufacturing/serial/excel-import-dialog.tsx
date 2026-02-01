'use client'

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import * as XLSX from 'xlsx'

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
  nextCounter: number
  totalRows: number
}

export function ExcelImportDialog({ 
  open, 
  onOpenChange, 
  onImportComplete 
}: ExcelImportDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [registryStats, setRegistryStats] = useState<any>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ]
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an Excel file (.xlsx or .xls)",
        })
        return
      }

      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/serial-registry/import-excel', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const result = await response.json()
        setImportResult(result)
        
        toast({
          title: "Import Successful",
          description: `Imported ${result.imported} serial numbers. Next counter: ${result.nextCounter}`,
        })

        // Fetch updated registry stats
        await fetchRegistryStats()

        if (onImportComplete) {
          onImportComplete()
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "Failed to import Excel file",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const fetchRegistryStats = async () => {
    try {
      const response = await fetch('/api/serial-registry/import-excel')
      if (response.ok) {
        const data = await response.json()
        setRegistryStats(data)
      }
    } catch (error) {
      console.error('Error fetching registry stats:', error)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setImportResult(null)
    setRegistryStats(null)
    setUploadProgress(0)
    onOpenChange(false)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const downloadTemplate = () => {
    try {
      // Sample data with the exact format expected by the import API
      const sampleData = [
        {
          'Model': 'RTPCR25',
          'SN': '', // Can be empty - will be generated
          'P/N': 'RTPCR25PIV',
          'COUNTER': 1,
          'KIND': 'RTPCR',
          'USE': 'LAB',
          'NUM WELLS': 'PIV',
          'BATCH/CHEM': 'CHARCOAL',
          'COLOR CODE': 'W',
          'COLOR': 'WHITE',
          'PRODUCTION YEAR': 250709,
          'APPLICATION': 'Laboratory Testing',
          'MACHINE NAME': 'RTPCR-LAB-001',
          'NOTE': 'Sample data for testing',
          'VERSION': 'V5'
        },
        {
          'Model': 'RTPCR25',
          'SN': '', // Can be empty - will be generated
          'P/N': 'RTPCR25PIV',
          'COUNTER': 2,
          'KIND': 'RTPCR',
          'USE': 'NEX',
          'NUM WELLS': 'PIV',
          'BATCH/CHEM': 'CHARCOAL',
          'COLOR CODE': 'W',
          'COLOR': 'WHITE',
          'PRODUCTION YEAR': 250709,
          'APPLICATION': 'Research',
          'MACHINE NAME': 'RTPCR-NEX-002',
          'NOTE': 'Sample data for testing',
          'VERSION': 'V5'
        },
        {
          'Model': 'RTPCR25',
          'SN': '', // Can be empty - will be generated
          'P/N': 'RTPCR25PIV',
          'COUNTER': 3,
          'KIND': 'RTPCR',
          'USE': 'MIT',
          'NUM WELLS': 'PIV',
          'BATCH/CHEM': 'CHARCOAL',
          'COLOR CODE': 'W',
          'COLOR': 'WHITE',
          'PRODUCTION YEAR': 250709,
          'APPLICATION': 'Academic Research',
          'MACHINE NAME': 'RTPCR-MIT-003',
          'NOTE': 'Sample data for testing',
          'VERSION': 'V5'
        }
      ]

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(sampleData)

      // Set column widths for better readability
      const columnWidths = [
        { wch: 12 }, // Model
        { wch: 25 }, // SN
        { wch: 15 }, // P/N
        { wch: 10 }, // COUNTER
        { wch: 12 }, // KIND
        { wch: 12 }, // USE
        { wch: 12 }, // NUM WELLS
        { wch: 15 }, // BATCH/CHEM
        { wch: 12 }, // COLOR CODE
        { wch: 12 }, // COLOR
        { wch: 15 }, // PRODUCTION YEAR
        { wch: 20 }, // APPLICATION
        { wch: 20 }, // MACHINE NAME
        { wch: 30 }, // NOTE
        { wch: 12 }, // VERSION
      ]
      worksheet['!cols'] = columnWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Serial Numbers Template')

      // Save file
      const filename = 'serial_numbers_import_template.xlsx'
      XLSX.writeFile(workbook, filename)

      toast({
        title: "Template Downloaded",
        description: `Import template saved as ${filename}`,
      })
    } catch (error) {
      console.error('Error generating template:', error)
      toast({
        variant: "destructive",
        title: "Template Generation Failed",
        description: "Failed to generate import template",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Serial Numbers from Excel
          </DialogTitle>
          <DialogDescription>
            Upload your MACHINES SN DESCRIPTION ONE.xlsx file to populate the serial number registry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download Section */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Import Template
              </CardTitle>
              <CardDescription>
                Get the correct Excel template with sample data and proper column structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-2">Expected Column Structure:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span><strong>A:</strong> Model (e.g., RTPCR25)</span>
                    <span><strong>B:</strong> SN (Serial Number - can be empty)</span>
                    <span><strong>C:</strong> P/N (Part Number)</span>
                    <span><strong>D:</strong> COUNTER (1, 2, 3, etc.)</span>
                    <span><strong>E:</strong> KIND (e.g., RTPCR)</span>
                    <span><strong>F:</strong> USE (LAB, NEX, MIT, CAE, ARMY)</span>
                    <span><strong>G:</strong> NUM WELLS (e.g., PIV)</span>
                    <span><strong>H:</strong> BATCH/CHEM</span>
                    <span><strong>I:</strong> COLOR CODE (e.g., W)</span>
                    <span><strong>J:</strong> COLOR</span>
                    <span><strong>K:</strong> PRODUCTION YEAR</span>
                    <span><strong>L:</strong> APPLICATION</span>
                    <span><strong>M:</strong> MACHINE NAME</span>
                    <span><strong>N:</strong> NOTE</span>
                    <span><strong>O:</strong> VERSION (e.g., V5)</span>
                  </div>
                </div>
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Registry Stats */}
          {registryStats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Registry Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Serials</div>
                    <div className="font-medium">{registryStats.stats?.total_serials || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Active</div>
                    <div className="font-medium">{registryStats.stats?.active_serials || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Highest Counter</div>
                    <div className="font-medium">{registryStats.stats?.highest_counter || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Next Counter</div>
                    <div className="font-medium text-blue-600">{registryStats.nextCounter}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Upload Area */}
          <Card>
            <CardContent className="pt-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-3">
                    <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      onClick={triggerFileInput}
                      variant="outline"
                      size="sm"
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">Upload Excel File</p>
                      <p className="text-sm text-muted-foreground">
                        Drag and drop your Excel file here, or click to browse
                      </p>
                    </div>
                    <Button onClick={triggerFileInput} variant="outline">
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Importing Excel file...</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Processing your Excel file and importing serial numbers
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card className={importResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Total Rows</div>
                      <div className="font-medium">{importResult.totalRows}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Imported</div>
                      <div className="font-medium text-green-600">{importResult.imported}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Skipped</div>
                      <div className="font-medium text-yellow-600">{importResult.skipped}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Next Counter</div>
                      <div className="font-medium text-blue-600">{importResult.nextCounter}</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600 mb-2">Errors:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <p key={index} className="text-sm text-red-600 bg-red-100 p-2 rounded">
                            {error}
                          </p>
                        ))}
                        {importResult.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground italic">
                            ... and {importResult.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {importResult.success && importResult.imported > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Success!</strong> Your serial number registry has been populated with {importResult.imported} existing serial numbers. 
                        The next available counter is <strong>{importResult.nextCounter}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          
          {selectedFile && !importResult && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Importing...' : 'Import Excel File'}
            </Button>
          )}
          
          {!registryStats && (
            <Button
              variant="outline"
              onClick={fetchRegistryStats}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Registry Status
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}