'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Filter, Download, Plus, Edit, Trash2, Hash, Settings, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, CheckSquare, Square, Minus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import * as XLSX from 'xlsx'
import { SerialNumberGenerator } from '@/components/manufacturing/serial/serial-number-generator'
import { ExcelImportDialog } from '@/components/manufacturing/serial/excel-import-dialog'
import { SerialNumberEditDialog } from '@/components/manufacturing/serial/serial-number-edit-dialog'
import { SerialCSVImportExport } from '@/app/components/serial-csv-import-export'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatSerialNumberWithTemplate, getDefaultTemplateFormat } from '@/lib/serial-template-formatter'
import { type SerialNumberTemplate } from '@/lib/batch-serial-generator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SerialNumber {
  id: string
  serial_number: string
  counter: number
  model: string
  kind: string
  use_case: string
  version: string
  production_year: number
  num_wells: number
  application: string
  machine_name: string
  status: 'active' | 'deprecated' | 'assigned'
  created_at: string
  updated_at: string
  assigned_to_production_run_id?: string
  assigned_to_product_instance_id?: string
  imported_from_excel: boolean
}

export default function SerialNumbersPage() {
  const { toast } = useToast()
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [filteredSerials, setFilteredSerials] = useState<SerialNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')
  const [showGenerator, setShowGenerator] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showImportExportDialog, setShowImportExportDialog] = useState(false)
  const [editingSerial, setEditingSerial] = useState<SerialNumber | null>(null)
  const [deletingSerial, setDeletingSerial] = useState<SerialNumber | null>(null)
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [defaultTemplate, setDefaultTemplate] = useState<SerialNumberTemplate | null>(null)
  const [sortField, setSortField] = useState('counter')
  const [sortOrder, setSortOrder] = useState('asc')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    deprecated: 0,
    assigned: 0,
    imported: 0
  })

  useEffect(() => {
    fetchSerialNumbers()
    fetchDefaultTemplate()
  }, [])

  useEffect(() => {
    filterSerialNumbers()
  }, [serialNumbers, searchTerm, statusFilter, modelFilter])
  
  useEffect(() => {
    fetchSerialNumbers()
  }, [sortField, sortOrder])

  const fetchSerialNumbers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sort: sortField,
        order: sortOrder
      })
      
      const response = await fetch(`/api/serial-registry?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSerialNumbers(data.serials || [])
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching serial numbers:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDefaultTemplate = async () => {
    try {
      const response = await fetch('/api/serial-number-templates?active=true')
      if (response.ok) {
        const templates = await response.json()
        // Find the default template or the first active one
        const defaultTpl = templates.find((t: SerialNumberTemplate) => t.is_default) || templates[0]
        setDefaultTemplate(defaultTpl || null)
      }
    } catch (error) {
      console.error('Error fetching default template:', error)
    }
  }

  const filterSerialNumbers = () => {
    let filtered = [...serialNumbers]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(serial =>
        serial.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serial.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serial.kind?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        serial.counter.toString().includes(searchTerm)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(serial => serial.status === statusFilter)
    }

    // Model filter
    if (modelFilter !== 'all') {
      filtered = filtered.filter(serial => serial.model === modelFilter)
    }

    setFilteredSerials(filtered)
  }

  const getUniqueModels = () => {
    const models = [...new Set(serialNumbers.map(s => s.model).filter(Boolean))]
    return models.sort()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      deprecated: 'destructive',
      assigned: 'secondary'
    }
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    )
  }

  const handleSerialGenerated = (serial: any) => {
    fetchSerialNumbers() // Refresh the list
  }

  const handleImportComplete = () => {
    fetchSerialNumbers() // Refresh the list
  }
  
  const handleEditSerial = (serial: SerialNumber) => {
    setEditingSerial(serial)
    setShowEditDialog(true)
  }
  
  const handleDeleteSerial = (serial: SerialNumber) => {
    setDeletingSerial(serial)
    setShowDeleteDialog(true)
  }
  
  const handleSerialUpdated = (updatedSerial: any) => {
    fetchSerialNumbers() // Refresh the list
  }
  
  const handleSelectSerial = (serialId: string, checked: boolean) => {
    const newSelected = new Set(selectedSerials)
    if (checked) {
      newSelected.add(serialId)
    } else {
      newSelected.delete(serialId)
      setSelectAll(false)
    }
    setSelectedSerials(newSelected)
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredSerials.map(s => s.id))
      setSelectedSerials(allIds)
      setSelectAll(true)
    } else {
      setSelectedSerials(new Set())
      setSelectAll(false)
    }
  }
  
  const handleBulkDelete = () => {
    if (selectedSerials.size === 0) return
    setShowBulkDeleteDialog(true)
  }
  
  const confirmBulkDelete = async () => {
    if (selectedSerials.size === 0) return
    
    try {
      const deletePromises = Array.from(selectedSerials).map(async (serialId) => {
        const response = await fetch(`/api/serial-registry?id=${serialId}`, {
          method: 'DELETE'
        })
        return { id: serialId, success: response.ok }
      })
      
      const results = await Promise.all(deletePromises)
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      if (successful > 0) {
        toast({
          title: "Bulk delete completed",
          description: `Successfully deleted ${successful} serial numbers${failed > 0 ? `, ${failed} failed` : ''}`,
        })
        fetchSerialNumbers() // Refresh the list
        setSelectedSerials(new Set())
        setSelectAll(false)
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete selected serial numbers",
      })
    }
    
    setShowBulkDeleteDialog(false)
  }
  
  const confirmDelete = async () => {
    if (!deletingSerial) return
    
    try {
      const response = await fetch(`/api/serial-registry?id=${deletingSerial.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Serial number ${deletingSerial.serial_number} deleted successfully!`,
        })
        fetchSerialNumbers() // Refresh the list
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to delete serial number",
        })
      }
    } catch (error) {
      console.error('Error deleting serial:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete serial number",
      })
    }
    
    setShowDeleteDialog(false)
    setDeletingSerial(null)
  }

  const exportToExcel = () => {
    try {
      // Prepare data for export with exact column structure from import API
      const exportData = serialNumbers.map(serial => ({
        'Model': serial.model || '',
        'SN': serial.serial_number || '',
        'P/N': '', // Part number - not stored in current system
        'COUNTER': serial.counter || 0,
        'KIND': serial.kind || '',
        'USE': serial.use_case || '',
        'NUM WELLS': serial.num_wells || '',
        'BATCH/CHEM': serial.input_specs || '',
        'COLOR CODE': serial.color_code || '',
        'COLOR': serial.color || '',
        'PRODUCTION YEAR': serial.production_year || '',
        'APPLICATION': serial.application || '',
        'MACHINE NAME': serial.machine_name || '',
        'NOTE': serial.note || '',
        'VERSION': serial.version || ''
      }))

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)

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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Serial Numbers')

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0]
      const filename = `serial_numbers_export_${currentDate}.xlsx`

      // Save file
      XLSX.writeFile(workbook, filename)

      toast({
        title: "Export Successful",
        description: `${serialNumbers.length} serial numbers exported to ${filename}`,
      })
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export serial numbers to Excel",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to ascending
      setSortField(field)
      setSortOrder('asc')
    }
  }
  
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Serial Number Management</h1>
          <p className="text-muted-foreground">
            View, manage, and maintain your serial number registry
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          {/* Bulk Actions (show when items selected) */}
          {selectedSerials.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">
                {selectedSerials.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete Selected
              </Button>
            </div>
          )}
          
          {/* Main Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowImportExportDialog(true)}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import/Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Import Excel
            </Button>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <Button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate New
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Serial Numbers</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deprecated</CardTitle>
            <div className="h-2 w-2 bg-red-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deprecated}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported</CardTitle>
            <div className="h-2 w-2 bg-purple-500 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.imported}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search serial numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All models" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  {getUniqueModels().map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Results</label>
              <div className="flex items-center h-10 px-3 bg-muted rounded-md">
                <span className="text-sm font-medium">
                  {filteredSerials.length} of {serialNumbers.length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serial Numbers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Serial Numbers</CardTitle>
          <CardDescription>
            Manage your serial number registry
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredSerials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No serial numbers found matching your filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all serial numbers"
                    />
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('counter')}
                  >
                    <div className="flex items-center gap-2">
                      Counter
                      {getSortIcon('counter')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('serial_number')}
                  >
                    <div className="flex items-center gap-2">
                      Serial Number
                      {getSortIcon('serial_number')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('model')}
                  >
                    <div className="flex items-center gap-2">
                      Model
                      {getSortIcon('model')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('kind')}
                  >
                    <div className="flex items-center gap-2">
                      Kind
                      {getSortIcon('kind')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSerials.map((serial) => (
                  <TableRow key={serial.id} className={selectedSerials.has(serial.id) ? 'bg-blue-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSerials.has(serial.id)}
                        onCheckedChange={(checked) => handleSelectSerial(serial.id, checked as boolean)}
                        aria-label={`Select serial number ${serial.serial_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono">
                      {serial.counter.toString().padStart(5, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-medium">
                          {defaultTemplate ? 
                            formatSerialNumberWithTemplate(serial, defaultTemplate) : 
                            serial.serial_number
                          }
                        </div>
                        {defaultTemplate && (
                          <div className="text-xs text-muted-foreground">
                            Raw: {serial.serial_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{serial.model}</TableCell>
                    <TableCell>{serial.kind}</TableCell>
                    <TableCell>{getStatusBadge(serial.status)}</TableCell>
                    <TableCell>{formatDate(serial.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditSerial(serial)}
                          title="Edit serial number"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteSerial(serial)}
                          title="Delete serial number"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Serial Number Generator Dialog */}
      <SerialNumberGenerator
        open={showGenerator}
        onOpenChange={setShowGenerator}
        onSerialGenerated={handleSerialGenerated}
      />

      {/* Excel Import Dialog */}
      <ExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImportComplete={handleImportComplete}
      />
      
      {/* Serial Number Edit Dialog */}
      <SerialNumberEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        serialNumber={editingSerial}
        onSerialUpdated={handleSerialUpdated}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Serial Number</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete serial number <strong>{deletingSerial?.serial_number}</strong>?
              This action cannot be undone.
              {deletingSerial?.assigned_to_production_run_id && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Warning: This serial number is assigned to a production run and cannot be deleted.
                  Consider deprecating it instead.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={!!deletingSerial?.assigned_to_production_run_id}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Serial Numbers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedSerials.size}</strong> selected serial numbers?
              This action cannot be undone.
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Note: Serial numbers assigned to production runs will be skipped.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBulkDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete {selectedSerials.size} Serial Numbers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Import/Export CSV Dialog */}
      <Dialog open={showImportExportDialog} onOpenChange={setShowImportExportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Serial Number CSV Import/Export</DialogTitle>
            <DialogDescription>
              Import and export serial number data using CSV files with dynamic update capabilities
            </DialogDescription>
          </DialogHeader>
          <SerialCSVImportExport />
        </DialogContent>
      </Dialog>
    </div>
  )
}