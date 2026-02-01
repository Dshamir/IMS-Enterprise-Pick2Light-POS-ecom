"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Import, Download, Upload, AlertTriangle, FileSpreadsheet, Check, Loader2, RefreshCw, Eye, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { dynamicUpdateSerialNumbersFromCSV } from "@/app/actions/serial-dynamic-update"
import { serialNumberHeaders, generateSerialNumberUpdateTemplate } from "@/lib/serial-csv-utils"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Papa from "papaparse"

export function SerialCSVImportExport() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("export")
  const [isDynamicUpdating, setIsDynamicUpdating] = useState(false)
  const [dynamicUpdatePreview, setDynamicUpdatePreview] = useState<{ headers: string[], sampleData: any[] } | null>(null)
  const [dynamicUpdateErrors, setDynamicUpdateErrors] = useState<string[]>([])
  const [dynamicUpdateSuccess, setDynamicUpdateSuccess] = useState<{ updated: number, failed: number, errors: string[], filename?: string } | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const handleExportTemplate = () => {
    try {
      const templateCSV = generateSerialNumberUpdateTemplate()
      
      // Create and download the CSV file
      const blob = new Blob([templateCSV], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      link.setAttribute("href", url)
      link.setAttribute("download", `serial_numbers_update_template_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      toast({
        title: "Template downloaded",
        description: "Serial number update template has been downloaded",
        type: "success",
        duration: 3000,
      })
    } catch (error: any) {
      console.error("Template export error:", error)
      toast({
        title: "Export failed",
        description: error.message || "Failed to generate template",
        type: "error",
        duration: 5000,
      })
    }
  }

  const handleDynamicUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsDynamicUpdating(true)
    setDynamicUpdateErrors([])
    setDynamicUpdateSuccess(null)
    setDynamicUpdatePreview(null)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await dynamicUpdateSerialNumbersFromCSV(formData)

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
          updated: result.updated || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
          filename: result.filename
        })

        toast({
          title: "Dynamic update completed",
          description: `Successfully updated ${result.updated} serial numbers${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
          type: "success",
          duration: 5000,
        })

        // Clear the form
        ;(event.target as HTMLFormElement).reset()
        setSelectedFileName(null)
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

  const handleFilePreview = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        const csvText = e.target?.result as string
        try {
          const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            preview: 5 // Only show first 5 rows for preview
          })

          if (result.data.length > 0) {
            setDynamicUpdatePreview({
              headers: Object.keys(result.data[0]),
              sampleData: result.data
            })
          }
        } catch (error) {
          console.error("Preview error:", error)
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Template</TabsTrigger>
          <TabsTrigger value="dynamic-update">Dynamic Update</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Update Template
              </CardTitle>
              <CardDescription>
                Download a CSV template for updating serial number data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-2">Template includes these fields:</h4>
                <div className="text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {serialNumberHeaders.map(header => (
                      <div key={header} className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className={header === 'serial_number' ? 'font-medium text-blue-600' : ''}>
                          {header}
                        </span>
                        {header === 'serial_number' && <span className="text-xs text-blue-500">(identifier)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Template Usage</AlertTitle>
                <AlertDescription>
                  The template includes example data showing the proper format. The <strong>serial_number</strong> field 
                  is required as the identifier for updates. Only include the fields you want to update.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExportTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Update Template
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="dynamic-update" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Dynamic Serial Number Update
              </CardTitle>
              <CardDescription>
                Update existing serial numbers by uploading a CSV file with serial_number as the identifier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>How it works</AlertTitle>
                <AlertDescription>
                  Upload a CSV with <strong>serial_number</strong> column and the fields you want to update. 
                  Only matching serial numbers will be updated with the provided field values.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleDynamicUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="dynamic-csv-file" className="text-sm font-medium">
                    Select CSV File for Dynamic Update
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="dynamic-csv-file"
                        name="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFilePreview}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isDynamicUpdating}>
                      {isDynamicUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Update
                        </>
                      )}
                    </Button>
                  </div>
                  {selectedFileName && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFileName}
                    </p>
                  )}
                </div>
              </form>

              {/* CSV Preview */}
              {dynamicUpdatePreview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <h4 className="text-sm font-medium">CSV Preview</h4>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {dynamicUpdatePreview.headers.map(header => (
                            <TableHead key={header} className="text-xs">
                              {header}
                              {header === 'serial_number' && <span className="ml-1 text-blue-500">*</span>}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dynamicUpdatePreview.sampleData.slice(0, 3).map((row, index) => (
                          <TableRow key={index}>
                            {dynamicUpdatePreview.headers.map(header => (
                              <TableCell key={header} className="text-xs">
                                {row[header] || ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Showing first 3 rows. * indicates identifier field.
                  </p>
                </div>
              )}

              {/* Error Messages */}
              {dynamicUpdateErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dynamic Update Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {dynamicUpdateErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {dynamicUpdateSuccess && (
                <Alert variant={dynamicUpdateSuccess.failed > 0 ? "default" : "default"}>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Dynamic Update Complete</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        ✅ Successfully updated: <strong>{dynamicUpdateSuccess.updated}</strong> serial numbers
                        {dynamicUpdateSuccess.failed > 0 && (
                          <span> | ❌ Failed: <strong>{dynamicUpdateSuccess.failed}</strong></span>
                        )}
                      </p>
                      {dynamicUpdateSuccess.errors.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">
                            View errors ({dynamicUpdateSuccess.errors.length})
                          </summary>
                          <ul className="list-disc list-inside space-y-1 mt-1 text-sm">
                            {dynamicUpdateSuccess.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}