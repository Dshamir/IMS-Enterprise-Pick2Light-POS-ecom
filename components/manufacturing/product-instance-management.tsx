'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ProductInstanceForm } from "./product-instance-form"
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Package, 
  Calendar, 
  User, 
  Settings,
  Download,
  RefreshCw
} from "lucide-react"

interface ProductInstance {
  id: string
  product_id: string
  production_run_id: string
  serial_number: string
  serial_number_custom: string
  model: string
  part_number: string
  counter: number
  kind: string
  use_case: string
  version: string
  production_year: number
  num_wells: number
  application: string
  machine_name: string
  note: string
  input_specs: string
  color_code: string
  color: string
  self_test_by: string
  calibrated_by: string
  used_by: string
  calibration_date: string
  recalibration_date: string
  batch_number: string
  instance_status: string
  manufacture_date: string
  location: string
  created_at: string
  updated_at: string
}

interface ProductInstanceManagementProps {
  productionRunId?: string
}

export function ProductInstanceManagement({ productionRunId }: ProductInstanceManagementProps) {
  const [instances, setInstances] = useState<ProductInstance[]>([])
  const [filteredInstances, setFilteredInstances] = useState<ProductInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstance, setSelectedInstance] = useState<ProductInstance | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')

  useEffect(() => {
    fetchInstances()
  }, [productionRunId])

  useEffect(() => {
    filterInstances()
  }, [instances, searchTerm, statusFilter, modelFilter])

  const fetchInstances = async () => {
    setLoading(true)
    try {
      const url = productionRunId 
        ? `/api/product-instances?production_run_id=${productionRunId}`
        : '/api/product-instances'
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Error fetching product instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterInstances = () => {
    let filtered = instances

    if (searchTerm) {
      filtered = filtered.filter(instance =>
        instance.serial_number_custom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.kind?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(instance => instance.instance_status === statusFilter)
    }

    if (modelFilter !== 'all') {
      filtered = filtered.filter(instance => instance.model === modelFilter)
    }

    setFilteredInstances(filtered)
  }

  const handleViewInstance = (instance: ProductInstance) => {
    setSelectedInstance(instance)
    setIsViewDialogOpen(true)
  }

  const handleEditInstance = (instance: ProductInstance) => {
    setSelectedInstance(instance)
    setIsEditDialogOpen(true)
  }

  const handleUpdateInstance = async (updatedData: any) => {
    if (!selectedInstance) return

    try {
      const response = await fetch(`/api/product-instances/${selectedInstance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      })

      if (response.ok) {
        await fetchInstances()
        setIsEditDialogOpen(false)
        setSelectedInstance(null)
      }
    } catch (error) {
      console.error('Error updating product instance:', error)
    }
  }

  const getUniqueModels = () => {
    const models = instances.map(instance => instance.model).filter(Boolean)
    return [...new Set(models)]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'produced': return 'bg-blue-100 text-blue-800'
      case 'in_qa': return 'bg-yellow-100 text-yellow-800'
      case 'released': return 'bg-green-100 text-green-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'defective': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Serial Number', 'Model', 'Part Number', 'Kind', 'Version', 'Production Year',
      'Status', 'Use Case', 'Application', 'Color', 'Calibrated By', 'Used By',
      'Calibration Date', 'Recalibration Date', 'Created At'
    ]
    
    const csvData = filteredInstances.map(instance => [
      instance.serial_number_custom || '',
      instance.model || '',
      instance.part_number || '',
      instance.kind || '',
      instance.version || '',
      instance.production_year || '',
      instance.instance_status || '',
      instance.use_case || '',
      instance.application || '',
      instance.color || '',
      instance.calibrated_by || '',
      instance.used_by || '',
      instance.calibration_date || '',
      instance.recalibration_date || '',
      instance.created_at || ''
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `product-instances-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Product Instance Management</h2>
          <p className="text-muted-foreground">
            Manage and track individual product instances with comprehensive serial number data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={fetchInstances} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search serial number, model, part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="produced">Produced</option>
                <option value="in_qa">In QA</option>
                <option value="released">Released</option>
                <option value="shipped">Shipped</option>
                <option value="defective">Defective</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Model</Label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Models</option>
                {getUniqueModels().map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {filteredInstances.length} of {instances.length} instances</span>
        {searchTerm && (
          <Badge variant="secondary">
            Search: "{searchTerm}"
          </Badge>
        )}
        {statusFilter !== 'all' && (
          <Badge variant="secondary">
            Status: {statusFilter}
          </Badge>
        )}
        {modelFilter !== 'all' && (
          <Badge variant="secondary">
            Model: {modelFilter}
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Instances</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Production Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading instances...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInstances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No product instances found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstances.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-mono text-sm">
                        {instance.serial_number_custom || instance.serial_number}
                      </TableCell>
                      <TableCell>{instance.model}</TableCell>
                      <TableCell>{instance.part_number}</TableCell>
                      <TableCell>{instance.kind}</TableCell>
                      <TableCell>{instance.version}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(instance.instance_status)}>
                          {instance.instance_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{instance.production_year}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInstance(instance)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInstance(instance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Product Instance Details</DialogTitle>
            <DialogDescription>
              View comprehensive information for this product instance
            </DialogDescription>
          </DialogHeader>
          
          {selectedInstance && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="personnel">Personnel</TabsTrigger>
                <TabsTrigger value="calibration">Calibration</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <div className="font-mono text-sm p-2 bg-gray-50 rounded">
                      {selectedInstance.serial_number_custom || selectedInstance.serial_number}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.model}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Part Number</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.part_number}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="p-2 bg-gray-50 rounded">
                      <Badge className={getStatusColor(selectedInstance.instance_status)}>
                        {selectedInstance.instance_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="specifications" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kind</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.kind || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.version || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Production Year</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.production_year || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Wells</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.num_wells || 0}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Application</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.application || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.color || 'Not specified'}</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="personnel" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Self Test By</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.self_test_by || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Calibrated By</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.calibrated_by || 'Not specified'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Used By</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.used_by || 'Not specified'}</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="calibration" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Calibration Date</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.calibration_date || 'Not set'}</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Recalibration Date</Label>
                    <div className="p-2 bg-gray-50 rounded">{selectedInstance.recalibration_date || 'Not set'}</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Product Instance</DialogTitle>
            <DialogDescription>
              Update the information for this product instance
            </DialogDescription>
          </DialogHeader>
          
          {selectedInstance && (
            <ScrollArea className="h-[600px]">
              <ProductInstanceForm
                initialData={selectedInstance}
                onSubmit={handleUpdateInstance}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}