"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Import, Download, Upload, AlertTriangle, FileSpreadsheet, Check, Loader2, RefreshCw, Eye, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { exportProductsToCSVSQLite, importProductsFromCSVSQLite } from "@/app/actions/csv"
import { dynamicUpdateProductsFromCSV } from "@/app/actions/csv-dynamic-update"
import { productHeaders } from "@/lib/csv-utils"
import { useToast } from "@/hooks/use-toast"

export function CSVImportExport() {
  const router = useRouter()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importSuccess, setImportSuccess] = useState<{ count: number } | null>(null)
  const [activeTab, setActiveTab] = useState("export")
  const [isDynamicUpdating, setIsDynamicUpdating] = useState(false)
  const [dynamicUpdatePreview, setDynamicUpdatePreview] = useState<{ headers: string[], sampleData: any[] } | null>(null)
  const [dynamicUpdateErrors, setDynamicUpdateErrors] = useState<string[]>([])
  const [dynamicUpdateSuccess, setDynamicUpdateSuccess] = useState<{ updated: number, failed: number, errors: string[], filename?: string } | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportProductsToCSVSQLite()

      if (result.error) {
        toast({
          title: "Export failed",
          description: result.error,
          type: "error",
          duration: 5000,
        })
        return
      }

      if (result.csvContent) {
        // Create and download the CSV file
        const blob = new Blob([result.csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")

        link.setAttribute("href", url)
        link.setAttribute("download", `inventory-products-${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        toast({
          title: "Export successful",
          description: `Exported ${result.count || 0} products`,
          type: "success",
          duration: 3000,
        })
      }
    } catch (error: any) {
      console.error("Export error:", error)
      toast({
        title: "Export failed",
        description: error.message || "An unexpected error occurred",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsImporting(true)
    setValidationErrors([])
    setImportSuccess(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await importProductsFromCSVSQLite(formData)

      if (result.error) {
        if (result.details) {
          setValidationErrors(Array.isArray(result.details) ? result.details : [result.details])
        } else {
          toast({
            title: "Import failed",
            description: result.error,
            type: "error",
            duration: 5000,
          })
        }
        return
      }

      if (result.success) {
        setImportSuccess({ count: result.importedCount || 0 })
        toast({
          title: "Import successful",
          description: `Imported ${result.importedCount} products`,
          type: "success",
          duration: 3000,
        })
        router.refresh()
      }
    } catch (error: any) {
      console.error("Import error:", error)
      toast({
        title: "Import failed",
        description: error.message || "An unexpected error occurred",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDynamicUpdatePreview = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setDynamicUpdatePreview(null)
      setSelectedFileName(null)
      return
    }

    try {
      const csvText = await file.text()
      const lines = csvText.split('\n').filter(line => line.trim())
      if (lines.length < 2) return

      const headers = lines[0].split(',').map(h => h.trim())
      const sampleData = lines.slice(1, 4).map(line => 
        line.split(',').map(cell => cell.trim())
      )

      setDynamicUpdatePreview({ headers, sampleData })
      setSelectedFileName(file.name)
      setDynamicUpdateErrors([])
      setDynamicUpdateSuccess(null)
    } catch (error) {
      console.error('Preview error:', error)
    }
  }

  const clearDynamicUpdate = () => {
    setDynamicUpdatePreview(null)
    setDynamicUpdateErrors([])
    setDynamicUpdateSuccess(null)
    setSelectedFileName(null)
    
    // Clear the file input
    const fileInput = document.getElementById('dynamicCsvFile') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleDynamicUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsDynamicUpdating(true)
    setDynamicUpdateErrors([])
    setDynamicUpdateSuccess(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await dynamicUpdateProductsFromCSV(formData)

      if (result.error) {
        if (result.details) {
          setDynamicUpdateErrors(Array.isArray(result.details) ? result.details : [result.details])
        } else {
          toast({
            title: "Dynamic update failed",
            description: result.error,
            type: "error",
            duration: 5000,
          })
        }
        return
      }

      if (result.success) {
        setDynamicUpdateSuccess({ 
          updated: result.updatedCount || 0,
          failed: result.failedCount || 0,
          errors: result.errors || [],
          filename: result.filename || selectedFileName || 'unknown.csv'
        })
        toast({
          title: "Dynamic update completed successfully",
          description: `Updated ${result.updatedCount} products from ${result.filename || selectedFileName}${result.failedCount > 0 ? `, ${result.failedCount} failed` : ''}`,
          type: "success",
          duration: 4000,
        })
        
        router.refresh()
      }
    } catch (error: any) {
      console.error("Dynamic update error:", error)
      toast({
        title: "Dynamic update failed",
        description: error.message || "An unexpected error occurred",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsDynamicUpdating(false)
    }
  }

  // Create CSV template with headers only
  const downloadTemplate = () => {
    const csvContent = productHeaders.join(",") + "\n"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.setAttribute("href", url)
    link.setAttribute("download", "product-import-template.csv")
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6 grid w-full grid-cols-3">
        <TabsTrigger value="export">
          <Download className="mr-2 h-4 w-4" />
          Export Products
        </TabsTrigger>
        <TabsTrigger value="import">
          <Upload className="mr-2 h-4 w-4" />
          Import Products
        </TabsTrigger>
        <TabsTrigger value="dynamic-update">
          <RefreshCw className="mr-2 h-4 w-4" />
          Dynamic Update
        </TabsTrigger>
      </TabsList>

      <TabsContent value="export">
        <Card>
          <CardHeader>
            <CardTitle>Export Products to CSV</CardTitle>
            <CardDescription>Download all your product data as a CSV file for backup or editing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">This will export all your product data including:</p>
              <ul className="list-disc pl-5 text-sm">
                <li>Product names, descriptions, and prices</li>
                <li>Stock quantities and reorder levels</li>
                <li>Barcodes and categories</li>
                <li>Unit information and measurement types</li>
                <li>Image URLs</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Note: The CSV file can be edited in spreadsheet applications and re-imported later.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export All Products
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="import">
        <Card>
          <CardHeader>
            <CardTitle>Import Products from CSV</CardTitle>
            <CardDescription>Upload a CSV file to add or update products in bulk</CardDescription>
          </CardHeader>
          <CardContent>
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-sm mt-2">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle>Import Successful</AlertTitle>
                <AlertDescription>Successfully imported {importSuccess.count} products.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <p className="text-sm">Upload a CSV file with product data. The file should include these headers:</p>
              <div className="bg-muted p-2 rounded-md overflow-x-auto">
                <code className="text-xs">{productHeaders.join(", ")}</code>
              </div>

              <p className="text-sm text-muted-foreground">
                The required fields are: name, price, and category. Unit information defaults to 'UNITS' if not specified. You can use either unit names (like "UNITS", "PIECES", "METERS") or unit IDs. All other fields are optional.
              </p>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  Download Template
                </Button>
              </div>

              <form onSubmit={handleImport} className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <label htmlFor="csvFile" className="text-sm font-medium">
                    Select CSV File
                  </label>
                  <input
                    id="csvFile"
                    name="csvFile"
                    type="file"
                    accept=".csv"
                    className="cursor-pointer file:cursor-pointer file:border-0 file:bg-primary/10 file:text-primary file:rounded file:px-2 file:py-1 file:mr-2 text-sm"
                    required
                  />
                </div>

                <Button type="submit" disabled={isImporting} className="w-full">
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Import className="mr-2 h-4 w-4" />
                      Import Products
                    </>
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dynamic-update">
        <Card>
          <CardHeader>
            <CardTitle>Dynamic Update Import</CardTitle>
            <CardDescription>Update existing products dynamically based on CSV columns using barcode matching</CardDescription>
          </CardHeader>
          <CardContent>
            {dynamicUpdateErrors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Update Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-sm mt-2">
                    {dynamicUpdateErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {dynamicUpdateSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-600" />
                <AlertTitle>✅ Dynamic Update Completed Successfully</AlertTitle>
                <AlertDescription>
                  <div className="font-medium text-green-800">
                    Successfully updated {dynamicUpdateSuccess.updated} product{dynamicUpdateSuccess.updated !== 1 ? 's' : ''} from <span className="font-mono text-sm bg-green-100 px-1 rounded">{dynamicUpdateSuccess.filename}</span>
                  </div>
                  {dynamicUpdateSuccess.failed > 0 && (
                    <div className="mt-2 text-orange-700 font-medium">
                      ⚠️ {dynamicUpdateSuccess.failed} product{dynamicUpdateSuccess.failed !== 1 ? 's' : ''} failed to update.
                    </div>
                  )}
                  {dynamicUpdateSuccess.failed === 0 && dynamicUpdateSuccess.updated > 0 && (
                    <div className="mt-1 text-green-700 text-sm">
                      All products were updated without errors. Use "Clear for New Update" to start another import.
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-600">
                    📝 This operation has been logged to the audit trail with timestamp.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900">How Dynamic Update Works</h4>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• CSV must contain a 'barcode' column for matching existing products</li>
                      <li>• Only fields present in your CSV will be updated</li>
                      <li>• Updates are applied only to products with matching barcodes</li>
                      <li>• For unit_id: Use either unit names ("UNITS", "PIECES") or unit IDs</li>
                      <li>• Example: CSV with [barcode, price, Location] will update only price and Location</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-sm">Valid updateable fields:</p>
              <div className="bg-muted p-2 rounded-md overflow-x-auto">
                <code className="text-xs">description, category, name, mfgname, mfgnum, price, Location, loc_tag, stock_quantity, min_stock_level, max_stock_level, reorder_quantity, distributor, image_url, Product_url_1, Product_url_2, Product_url_3, unit_id</code>
              </div>

              <form onSubmit={handleDynamicUpdate} className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <label htmlFor="dynamicCsvFile" className="text-sm font-medium">
                    Select CSV File for Dynamic Update
                  </label>
                  <input
                    id="dynamicCsvFile"
                    name="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleDynamicUpdatePreview}
                    className="cursor-pointer file:cursor-pointer file:border-0 file:bg-primary/10 file:text-primary file:rounded file:px-2 file:py-1 file:mr-2 text-sm"
                    required
                  />
                </div>

                {dynamicUpdatePreview && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        CSV Preview
                      </h4>
                      <div className="text-sm">
                        <div className="mb-2">
                          <span className="font-medium">Detected columns:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dynamicUpdatePreview.headers.map((header, index) => (
                              <span 
                                key={index}
                                className={`px-2 py-1 rounded text-xs ${
                                  header.toLowerCase() === 'barcode' 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {header}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="font-medium">Sample data (first 3 rows):</span>
                          <div className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  {dynamicUpdatePreview.headers.map((header, index) => (
                                    <th key={index} className="text-left px-2 py-1 border-b">{header}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dynamicUpdatePreview.sampleData.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                      <td key={cellIndex} className="px-2 py-1 border-b">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button type="submit" disabled={isDynamicUpdating || !dynamicUpdatePreview} className="w-full">
                    {isDynamicUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Products...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Update Products Dynamically
                      </>
                    )}
                  </Button>
                  
                  {(dynamicUpdatePreview || dynamicUpdateSuccess || dynamicUpdateErrors.length > 0) && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={clearDynamicUpdate}
                      className="w-full"
                      disabled={isDynamicUpdating}
                    >
                      🆕 Clear for New Update
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

