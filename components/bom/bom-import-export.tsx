'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle,
  CheckCircle,
  FileJson,
  FileSpreadsheet
} from "lucide-react"

interface BOMImportExportProps {
  assemblyId: string
  assemblyName: string
  onImportComplete?: () => void
}

export function BOMImportExport({ assemblyId, assemblyName, onImportComplete }: BOMImportExportProps) {
  const [exportFormat, setExportFormat] = useState('csv')
  const [importFormat, setImportFormat] = useState('csv')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/bom/export?assemblyId=${assemblyId}&format=${exportFormat}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      if (exportFormat === 'json') {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${assemblyName}_BOM.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${assemblyName}_BOM.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export BOM')
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('assemblyId', assemblyId)
      formData.append('format', importFormat)
      
      const response = await fetch('/api/bom/import', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      setImportResult(result)
      
      if (response.ok) {
        onImportComplete?.()
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({ error: 'Failed to import BOM' })
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setSelectedFile(null)
    setImportResult(null)
    setIsImportDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export BOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Comma Separated Values)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON (JavaScript Object Notation)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import BOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import from File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Import BOM</DialogTitle>
                <DialogDescription>
                  Import components from a CSV or JSON file. This will replace all existing components in this assembly.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="import-format">Import Format</Label>
                  <Select value={importFormat} onValueChange={setImportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          CSV File
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON File
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="file-upload">Select File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept={importFormat === 'csv' ? '.csv' : '.json'}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                </div>
                
                {importFormat === 'csv' && (
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
                    <p className="font-medium mb-1">CSV Format Requirements:</p>
                    <p>Required columns: Component Name, Quantity</p>
                    <p>Optional columns: Level, Unit, Type, Reference, Optional, Notes</p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleImport} 
                    disabled={!selectedFile || importing}
                    className="flex-1"
                  >
                    {importing ? 'Importing...' : 'Import'}
                  </Button>
                  <Button variant="outline" onClick={resetImport}>
                    Cancel
                  </Button>
                </div>
                
                {importResult && (
                  <div className="mt-4 p-3 rounded border">
                    {importResult.error ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{importResult.error}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{importResult.message}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Imported: {importResult.imported} components</p>
                          {importResult.failed > 0 && (
                            <p>Failed: {importResult.failed} components</p>
                          )}
                        </div>
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="text-sm text-red-600">
                            <p className="font-medium">Errors:</p>
                            <ul className="list-disc list-inside">
                              {importResult.errors.slice(0, 5).map((error: string, index: number) => (
                                <li key={index}>{error}</li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li>... and {importResult.errors.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sample Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Download sample files to understand the import format:</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Sample CSV
              </Button>
              <Button variant="outline" size="sm">
                <FileJson className="h-4 w-4 mr-2" />
                Sample JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}