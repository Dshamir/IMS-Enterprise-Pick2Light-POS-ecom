"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload,
  Download,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap
} from 'lucide-react'

interface CSVImportDialogProps {
  trigger?: React.ReactNode
  onImportComplete?: () => void
}

export function CSVImportDialog({ trigger, onImportComplete }: CSVImportDialogProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [autoCreateLocations, setAutoCreateLocations] = useState(false)
  const [autoSync, setAutoSync] = useState(true)

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<any>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      setValidationResults(null)
      setBatchId(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setUploadedFile(file)
      setValidationResults(null)
      setBatchId(null)
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a CSV file"
      })
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleUploadAndValidate = async () => {
    if (!uploadedFile) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('autoCreateLocations', autoCreateLocations.toString())

      const response = await fetch('/api/wled/import-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        setBatchId(result.batch_id)
        setValidationResults(result)

        if (result.statistics.invalid === 0) {
          toast({
            title: "✅ Validation Complete",
            description: `${result.statistics.valid} rows ready to import`
          })
        } else {
          toast({
            variant: "destructive",
            title: "⚠️ Validation Issues Found",
            description: `${result.statistics.invalid} invalid rows, ${result.statistics.valid} valid`
          })
        }
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: result.error || 'Failed to upload CSV'
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to upload file"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleProcessImport = async () => {
    if (!batchId) return

    setIsProcessing(true)

    try {
      const response = await fetch('/api/wled/import-csv/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId, auto_sync: autoSync })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Import Successful",
          description: `Created ${result.results.created} LED segments in ${result.duration_ms}ms`
        })

        // Trigger auto-sync for affected devices
        if (autoSync && result.auto_sync.devices_affected > 0) {
          toast({
            title: "⚡ Auto-Sync Triggered",
            description: `Syncing ${result.auto_sync.devices_affected} devices...`,
            duration: 5000
          })

          // Trigger bulk sync for each affected device
          for (const syncResult of result.auto_sync.sync_results) {
            if (syncResult.device_id && syncResult.synced) {
              try {
                await fetch(`/api/wled-devices/${syncResult.device_id}/activate-all`, {
                  method: 'POST'
                })
              } catch (syncError) {
                console.error('Auto-sync error:', syncError)
              }
            }
          }
        }

        // Close dialog and refresh parent
        setIsOpen(false)
        resetState()
        onImportComplete?.()
      } else {
        toast({
          variant: "destructive",
          title: "Processing Failed",
          description: result.error || 'Failed to process import'
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to process import"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetState = () => {
    setUploadedFile(null)
    setBatchId(null)
    setValidationResults(null)
  }

  const downloadTemplate = () => {
    window.open('/api/wled/import-csv/template', '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetState()
    }}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV Bulk Import - LED Segments
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk assign LED segments to products. Download the template for correct format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium">CSV Template</h4>
                    <p className="text-sm text-gray-500">Download template with example data and instructions</p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {uploadedFile ? uploadedFile.name : 'Drop CSV file here or click to browse'}
            </p>
            <p className="text-sm text-gray-500">
              Supports .csv files with product SKU, device IP, and LED configuration
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Configuration Toggles */}
          <div className="space-y-4 border p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-create Warehouses & Zones</Label>
                <p className="text-xs text-gray-500">Create missing warehouses and zones automatically</p>
              </div>
              <Switch
                checked={autoCreateLocations}
                onCheckedChange={setAutoCreateLocations}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-sync After Import</Label>
                <p className="text-xs text-gray-500">Automatically sync LED segments to devices after import</p>
              </div>
              <Switch
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>
          </div>

          {/* Upload Button */}
          {uploadedFile && !validationResults && (
            <Button
              onClick={handleUploadAndValidate}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validating CSV...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload & Validate
                </>
              )}
            </Button>
          )}

          {/* Validation Results */}
          {validationResults && (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold">{validationResults.statistics.total_rows}</div>
                    <div className="text-sm text-gray-500">Total Rows</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-700">{validationResults.statistics.valid}</div>
                    <div className="text-sm text-green-600">Valid</div>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-amber-700">{validationResults.statistics.warnings}</div>
                    <div className="text-sm text-amber-600">Warnings</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-700">{validationResults.statistics.invalid}</div>
                    <div className="text-sm text-red-600">Invalid</div>
                  </CardContent>
                </Card>
              </div>

              {/* Validation Details Table (first 20 rows) */}
              {validationResults.validation_results.length > 0 && (
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Product SKU</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.validation_results.slice(0, 50).map((result: any) => (
                        <TableRow key={result.row}>
                          <TableCell className="font-mono">{result.row}</TableCell>
                          <TableCell className="font-mono">{result.product_sku}</TableCell>
                          <TableCell>
                            {result.status === 'valid' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Valid
                              </Badge>
                            )}
                            {result.status === 'warning' && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Warning
                              </Badge>
                            )}
                            {result.status === 'invalid' && (
                              <Badge className="bg-red-100 text-red-700 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                Invalid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.errors.length > 0 && (
                              <div className="text-red-600">
                                {result.errors.map((err: string, i: number) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            )}
                            {result.warnings.length > 0 && (
                              <div className="text-amber-600">
                                {result.warnings.map((warn: string, i: number) => (
                                  <div key={i}>• {warn}</div>
                                ))}
                              </div>
                            )}
                            {result.errors.length === 0 && result.warnings.length === 0 && (
                              <span className="text-green-600">✓ Ready</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validationResults.validation_results.length > 50 && (
                    <div className="p-3 bg-gray-50 text-center text-sm text-gray-500">
                      Showing first 50 of {validationResults.validation_results.length} rows
                    </div>
                  )}
                </div>
              )}

              {/* Process Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleProcessImport}
                  disabled={isProcessing || validationResults.statistics.valid === 0}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing {validationResults.statistics.valid} segments...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Create {validationResults.statistics.valid} Segments
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetState}
                >
                  Cancel
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Note:</strong> After creating segments, use the "Sync All Segments" ⚡ button on each device
                to push configurations to physical hardware. Auto-sync will do this automatically if enabled.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
