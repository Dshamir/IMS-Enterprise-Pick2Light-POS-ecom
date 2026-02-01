"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Upload, 
  Settings, 
  Table,
  Clock,
  HardDrive,
  Zap,
  AlertTriangle,
  FileDown
} from "lucide-react"
import { toast } from "sonner"
import type { DatabaseStats, TableSchema } from "@/app/actions/database"
import { 
  getDatabaseStatus, 
  getDatabaseSchema, 
  createDatabaseBackup, 
  getBackupList,
  optimizeDatabase,
  testDatabaseConnection
} from "@/app/actions/database"

export function DatabaseManagement() {
  const [status, setStatus] = useState<DatabaseStats | null>(null)
  const [schema, setSchema] = useState<TableSchema[]>([])
  const [backups, setBackups] = useState<Array<{ filename: string; size: string; created: string }>>([])
  const [loading, setLoading] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [exportingSchema, setExportingSchema] = useState(false)

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true)
      const [statusData, schemaData, backupData] = await Promise.all([
        getDatabaseStatus(),
        getDatabaseSchema(),
        getBackupList()
      ])
      
      setStatus(statusData)
      setSchema(schemaData)
      setBackups(backupData)
    } catch (error) {
      console.error("Error loading database info:", error)
      toast.error("Failed to load database information")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatabaseInfo()
  }, [])

  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const result = await testDatabaseConnection()
      if (result.connected) {
        toast.success(`${result.message} (${result.responseTime}ms)`)
      } else {
        toast.error(result.message)
      }
      // Refresh status after test
      const newStatus = await getDatabaseStatus()
      setStatus(newStatus)
    } catch (error) {
      toast.error("Failed to test database connection")
    } finally {
      setTestingConnection(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      const result = await createDatabaseBackup()
      if (result.success) {
        toast.success(`Backup created: ${result.filename}`)
        // Refresh backup list
        const newBackups = await getBackupList()
        setBackups(newBackups)
      } else {
        toast.error(result.error || "Failed to create backup")
      }
    } catch (error) {
      toast.error("Failed to create backup")
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleOptimizeDatabase = async () => {
    setOptimizing(true)
    try {
      const result = await optimizeDatabase()
      if (result.success) {
        toast.success(result.message)
        // Refresh status
        const newStatus = await getDatabaseStatus()
        setStatus(newStatus)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to optimize database")
    } finally {
      setOptimizing(false)
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/database/backup/${filename}`)
      
      if (!response.ok) {
        throw new Error(`Failed to download backup: ${response.statusText}`)
      }
      
      // Create a blob from the response
      const blob = await response.blob()
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Downloaded ${filename}`)
    } catch (error: any) {
      console.error("Error downloading backup:", error)
      toast.error(`Failed to download backup: ${error.message}`)
    }
  }

  const handleExportSchema = async () => {
    setExportingSchema(true)
    try {
      const response = await fetch('/api/database/schema')
      
      if (!response.ok) {
        throw new Error(`Failed to export schema: ${response.statusText}`)
      }
      
      // Create a blob from the response
      const blob = await response.blob()
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'database-schema.sql'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/)
        if (match) {
          filename = match[1]
        }
      }
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Schema exported as ${filename}`)
    } catch (error: any) {
      console.error("Error exporting schema:", error)
      toast.error(`Failed to export schema: ${error.message}`)
    } finally {
      setExportingSchema(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading database information...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection Status
          </CardTitle>
          <CardDescription>Current database connection and basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {status?.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              {testingConnection ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
          </div>

          {status?.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {status?.connected && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Database Path</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded truncate">
                  {status.dbPath}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Database Size</Label>
                <p className="text-sm font-medium">{status.dbSize}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Tables</Label>
                <p className="text-sm font-medium">{status.tableCount}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Last Backup</Label>
                <p className="text-sm font-medium">
                  {status.lastBackup 
                    ? new Date(status.lastBackup).toLocaleDateString()
                    : "Never"
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="schema" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schema">Database Schema</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Database Schema Tab */}
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Database Schema
              </CardTitle>
              <CardDescription>
                Table structures and record counts in your database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {status?.recordCounts && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {Object.entries(status.recordCounts).map(([table, count]) => (
                      <div key={table} className="bg-muted p-3 rounded-lg">
                        <div className="font-medium text-sm">{table}</div>
                        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">records</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {schema.map((table) => (
                    <Card key={table.name} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{table.name}</span>
                          <Badge variant="outline">
                            {table.columns.length} columns
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {table.columns.map((column) => (
                            <div 
                              key={column.name} 
                              className="flex items-center justify-between py-2 border-b last:border-b-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{column.name}</span>
                                {column.primaryKey && (
                                  <Badge variant="secondary" className="text-xs">PK</Badge>
                                )}
                                {!column.nullable && (
                                  <Badge variant="outline" className="text-xs">NOT NULL</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {column.type}
                                {column.defaultValue && (
                                  <span className="ml-2">
                                    default: {column.defaultValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {table.indexes.length > 0 && (
                          <div className="mt-4">
                            <Label className="text-sm font-medium">Indexes:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {table.indexes.map((index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {index}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Restore Tab */}
        <TabsContent value="backup">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Create Backup
                </CardTitle>
                <CardDescription>
                  Create a backup of your current database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="w-full md:w-auto"
                >
                  {creatingBackup ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  Create Backup Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Backup History
                </CardTitle>
                <CardDescription>
                  Previous database backups
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No backups found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div 
                        key={backup.filename} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{backup.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(backup.created).toLocaleString()} • {backup.size}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadBackup(backup.filename)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Maintenance
              </CardTitle>
              <CardDescription>
                Optimize and maintain your database performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Optimize Database</Label>
                    <p className="text-sm text-muted-foreground">
                      Run VACUUM and ANALYZE to optimize database performance
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleOptimizeDatabase}
                    disabled={optimizing}
                  >
                    {optimizing ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Optimize
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Database Integrity Check</Label>
                    <p className="text-sm text-muted-foreground">
                      Check database for corruption or inconsistencies
                    </p>
                  </div>
                  <Button variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Integrity
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Export Schema</Label>
                    <p className="text-sm text-muted-foreground">
                      Export database schema as SQL file
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleExportSchema}
                    disabled={exportingSchema}
                  >
                    {exportingSchema ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export Schema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}