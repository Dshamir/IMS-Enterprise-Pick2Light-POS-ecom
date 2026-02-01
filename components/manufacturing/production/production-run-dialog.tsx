'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Package, AlertCircle, Hash, Settings, Eye, RefreshCw, CheckCircle, Plus, Edit } from "lucide-react"
import { generateBatchSerialNumbers, previewSerialNumbers, type SerialNumberTemplate } from "@/lib/batch-serial-generator"
import { SerialNumberGenerator } from "@/components/manufacturing/serial/serial-number-generator"
import { TemplateManagerDialog } from "@/components/manufacturing/serial/template-manager-dialog"
import { TemplateEditorDialog } from "@/components/manufacturing/serial/template-editor-dialog"
import { ImageUpload } from "@/components/manufacturing/image-upload"

interface ManufacturingBOM {
  id: string
  name: string
  description: string
  quantity: number
  total_cost: number
  project_name?: string
  production_line_name?: string
  item_count?: number
}

interface FinishedProduct {
  id: string
  name: string
  description: string
  category: string
  is_manufactured: number
  bom_id?: string
}

interface SerialAllocation {
  serial_number: string
  sequence_number: number
  model: string
  counter: number
  allocated: boolean
}

interface ProductionRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  selectedBomId?: string
}

export function ProductionRunDialog({ 
  open, 
  onOpenChange, 
  onSave,
  selectedBomId 
}: ProductionRunDialogProps) {
  const [boms, setBOMs] = useState<ManufacturingBOM[]>([])
  const [selectedBOM, setSelectedBOM] = useState<ManufacturingBOM | null>(null)
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form data
  const [bomId, setBomId] = useState(selectedBomId || '')
  const [plannedQuantity, setPlannedQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [targetProductId, setTargetProductId] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  
  // Serial number template and allocation
  const [templates, setTemplates] = useState<SerialNumberTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SerialNumberTemplate | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [preAllocatedSerials, setPreAllocatedSerials] = useState<SerialAllocation[]>([])
  const [serialPreview, setSerialPreview] = useState<string[]>([])
  const [showSerialPreview, setShowSerialPreview] = useState(false)
  const [showSerialGenerator, setShowSerialGenerator] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SerialNumberTemplate | null>(null)
  const [generatedSerials, setGeneratedSerials] = useState<any[]>([])
  
  // Serial number configuration
  const [serialConfig, setSerialConfig] = useState({
    model: '',
    partNumberPrefix: 'P/N',
    useCustomFormat: true,
    counterStart: 1
  })

  useEffect(() => {
    if (open) {
      fetchBOMs()
      fetchTemplates()
      fetchFinishedProducts()
      if (selectedBomId) {
        setBomId(selectedBomId)
      }
    }
  }, [open, selectedBomId])

  useEffect(() => {
    if (bomId) {
      const bom = boms.find(b => b.id === bomId)
      setSelectedBOM(bom || null)
      if (bom) {
        setPlannedQuantity(bom.quantity)
        // Auto-populate serial config from BOM name
        setSerialConfig(prev => ({
          ...prev,
          model: bom.name.split(' ')[0] || bom.name
        }))
      }
    }
  }, [bomId, boms])
  
  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      setSelectedTemplate(template || null)
    }
  }, [templateId, templates])
  
  useEffect(() => {
    if (selectedTemplate && plannedQuantity > 0) {
      generateSerialPreview()
    }
  }, [selectedTemplate, plannedQuantity])

  const fetchBOMs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/manufacturing-boms')
      if (response.ok) {
        const data = await response.json()
        setBOMs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching BOMs:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTemplates = async () => {
    try {
      console.log('Fetching serial number templates...')
      const response = await fetch('/api/serial-number-templates')
      if (response.ok) {
        const data = await response.json()
        console.log('Templates API response:', data)
        setTemplates(Array.isArray(data) ? data : [])
        // Set default template if available
        const defaultTemplate = data.find((t: SerialNumberTemplate) => t.is_default)
        console.log('Default template found:', defaultTemplate)
        if (defaultTemplate) {
          setTemplateId(defaultTemplate.id)
          setSelectedTemplate(defaultTemplate)
        }
      } else {
        console.error('Templates API response not ok:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }
  
  const fetchFinishedProducts = async () => {
    try {
      const response = await fetch('/api/products?manufactured=true')
      if (response.ok) {
        const data = await response.json()
        console.log('Finished products API response:', data)
        
        // Handle the correct response structure: { products: [...] }
        const products = data.products || data
        const finishedProducts = Array.isArray(products) ? products : []
        
        console.log('Finished products filtered:', finishedProducts)
        setFinishedProducts(finishedProducts)
      } else {
        console.error('API response not ok:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching finished products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bomId || plannedQuantity <= 0 || !templateId) {
      return
    }

    setSubmitting(true)
    try {
      // First create the production run
      const response = await fetch('/api/production-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bom_id: bomId,
          planned_quantity: plannedQuantity,
          notes: notes,
          status: 'planned',
          serial_config: serialConfig,
          template_id: templateId,
          target_product_id: targetProductId,
          image_url: imageUrl
        })
      })

      if (response.ok) {
        const productionRun = await response.json()
        
        // Then allocate serial numbers for the production run
        const allocationSuccess = await allocateSerialNumbers(productionRun.id)
        
        if (allocationSuccess) {
          onSave()
          handleClose()
        } else {
          console.error('Failed to allocate serial numbers')
        }
      } else {
        console.error('Failed to create production run')
      }
    } catch (error) {
      console.error('Error creating production run:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setBomId(selectedBomId || '')
    setPlannedQuantity(1)
    setNotes('')
    setTargetProductId('')
    setSelectedBOM(null)
    setTemplateId('')
    setSelectedTemplate(null)
    setPreAllocatedSerials([])
    setSerialPreview([])
    setShowSerialPreview(false)
    setGeneratedSerials([])
    setSerialConfig({
      model: '',
      partNumberPrefix: 'P/N',
      useCustomFormat: true,
      counterStart: 1
    })
    onOpenChange(false)
  }

  const handleSerialGenerated = (serial: any) => {
    setGeneratedSerials(prev => [...prev, serial])
  }

  const generateSerialPreview = async () => {
    console.log('🔍 generateSerialPreview called')
    console.log('selectedTemplate:', selectedTemplate)
    console.log('plannedQuantity:', plannedQuantity)
    
    if (!selectedTemplate || plannedQuantity <= 0) {
      console.log('❌ Missing template or quantity, clearing preview')
      setSerialPreview([])
      return
    }

    try {
      const overrides = {
        model: serialConfig.model || selectedTemplate.model_pattern || 'MODEL',
        prefix: serialConfig.partNumberPrefix || selectedTemplate.prefix_default || 'LAB'
      }

      console.log('🔧 Serial config overrides:', overrides)

      // previewSerialNumbers returns string[] directly, not {success, serials}
      const serialNumbers = previewSerialNumbers({
        template: selectedTemplate,
        productionRunId: 'preview',
        quantity: Math.min(plannedQuantity, 10), // Limit preview to 10
        overrides
      })

      console.log('✅ Serial preview generated:', serialNumbers)
      setSerialPreview(serialNumbers)
    } catch (error) {
      console.error('❌ Error generating serial preview:', error)
      setSerialPreview([])
    }
  }

  const allocateSerialNumbers = async (productionRunId: string) => {
    if (!selectedTemplate || plannedQuantity <= 0) return false

    try {
      const overrides = {
        model: serialConfig.model || selectedTemplate.model_pattern || 'MODEL',
        prefix: serialConfig.partNumberPrefix || selectedTemplate.prefix_default || 'LAB'
      }

      const response = await fetch('/api/serial-number-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          production_run_id: productionRunId,
          quantity: plannedQuantity,
          overrides
        })
      })

      if (!response.ok) {
        console.error('Failed to allocate serial numbers')
        return false
      }

      const result = await response.json()
      setPreAllocatedSerials(result.serials || [])
      return true
    } catch (error) {
      console.error('Error allocating serial numbers:', error)
      return false
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Production Run</DialogTitle>
          <DialogDescription>
            Create a new production run for a manufacturing BOM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BOM Selection */}
          <div className="space-y-2">
            <Label htmlFor="bom">Manufacturing BOM *</Label>
            <Select
              value={bomId}
              onValueChange={setBomId}
              disabled={loading || !!selectedBomId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a BOM to manufacture" />
              </SelectTrigger>
              <SelectContent>
                {boms.map((bom) => (
                  <SelectItem key={bom.id} value={bom.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{bom.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {bom.production_line_name || bom.project_name} • {bom.item_count || 0} items
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected BOM Details */}
          {selectedBOM && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  BOM Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <div className="font-medium">{selectedBOM.name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Context:</span>
                    <div className="font-medium">
                      {selectedBOM.production_line_name || selectedBOM.project_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Items:</span>
                    <div className="font-medium">{selectedBOM.item_count || 0} components</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Cost:</span>
                    <div className="font-medium">{formatCurrency(selectedBOM.total_cost / selectedBOM.quantity)}</div>
                  </div>
                </div>
                {selectedBOM.description && (
                  <div>
                    <span className="text-muted-foreground text-sm">Description:</span>
                    <div className="text-sm">{selectedBOM.description}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Target Finished Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-product">Target Finished Product (Optional)</Label>
            <Select
              value={targetProductId}
              onValueChange={setTargetProductId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target finished product" />
              </SelectTrigger>
              <SelectContent>
                {finishedProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {product.category} {product.description && `• ${product.description}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {finishedProducts.length === 0 && (
                  <SelectItem value="no-products" disabled>
                    No finished products available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Link this production run to a specific finished product for better tracking.
              {finishedProducts.length === 0 && (
                <span className="text-orange-600 ml-1">
                  Create finished products first in the Products section.
                </span>
              )}
            </div>
          </div>

          {/* Planned Quantity */}
          <div className="space-y-2">
            <Label htmlFor="planned-quantity">Planned Quantity *</Label>
            <Input
              id="planned-quantity"
              type="number"
              min={1}
              value={plannedQuantity}
              onChange={(e) => setPlannedQuantity(parseInt(e.target.value) || 1)}
              placeholder="Enter quantity to produce"
            />
            {selectedBOM && (
              <div className="text-sm text-muted-foreground">
                Estimated total cost: {formatCurrency((selectedBOM.total_cost / selectedBOM.quantity) * plannedQuantity)}
              </div>
            )}
          </div>

          <Separator />
          
          {/* Serial Number Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Serial Number Management</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSerialGenerator(true)}
                className="flex items-center gap-2"
              >
                <Hash className="h-3 w-3" />
                Generate Serial Numbers
              </Button>
            </div>
            
            {/* Show generated serials */}
            {generatedSerials.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Generated Serial Numbers ({generatedSerials.length})</span>
                    </div>
                    <div className="space-y-1">
                      {generatedSerials.slice(0, 5).map((serial, index) => (
                        <div key={index} className="text-sm font-mono bg-white px-2 py-1 rounded border">
                          {serial.serial_number}
                        </div>
                      ))}
                      {generatedSerials.length > 5 && (
                        <div className="text-sm text-green-700 italic">
                          ... and {generatedSerials.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Separator />
          
          {/* Serial Number Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Template-Based Generation</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateManager(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                Manage Templates
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template">Template *</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={templateId}
                  onValueChange={setTemplateId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a serial number template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.is_active).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {template.format_template} • {template.product_type}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {templates.filter(t => t.is_active).length === 0 && (
                      <SelectItem value="no-templates" disabled>
                        No active templates available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {/* Add New Template Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null)
                    setShowTemplateEditor(true)
                  }}
                  className="flex-shrink-0"
                  title="Add new template"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                
                {/* Edit Template Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedTemplate) {
                      setEditingTemplate(selectedTemplate)
                      setShowTemplateEditor(true)
                    }
                  }}
                  disabled={!selectedTemplate}
                  className="flex-shrink-0"
                  title="Edit selected template"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {selectedTemplate && (
              <Card className="bg-gray-50">
                <CardContent className="p-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-mono">{selectedTemplate.format_template}</span>
                    </div>
                    {selectedTemplate.description && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span>{selectedTemplate.description}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <Separator />
          
          {/* Special Additional Serial Number Configurations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Special Additional Serial Number Configurations</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={serialConfig.model}
                  onChange={(e) => setSerialConfig(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g., RTPCR"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="part-prefix">Part Number Prefix</Label>
                <Input
                  id="part-prefix"
                  value={serialConfig.partNumberPrefix}
                  onChange={(e) => setSerialConfig(prev => ({ ...prev, partNumberPrefix: e.target.value }))}
                  placeholder="e.g., P/N"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="counter-start">Counter Start</Label>
              <Input
                id="counter-start"
                type="number"
                min={1}
                value={serialConfig.counterStart}
                onChange={(e) => setSerialConfig(prev => ({ ...prev, counterStart: parseInt(e.target.value) || 1 }))}
                placeholder="Starting counter value"
              />
            </div>
            
            {/* Serial Number Preview */}
            {selectedTemplate && plannedQuantity > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Serial Number Preview</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSerialPreview(!showSerialPreview)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    {showSerialPreview ? 'Hide' : 'Preview'}
                  </Button>
                </div>
                
                {showSerialPreview && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                      <div className="text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-blue-800">
                            Preview ({Math.min(plannedQuantity, 10)} of {plannedQuantity})
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={generateSerialPreview}
                            className="h-6 px-2 text-blue-700"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                        <ScrollArea className="h-20">
                          <div className="space-y-1">
                            {serialPreview.map((serial, index) => (
                              <div key={index} className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                {serial}
                              </div>
                            ))}
                            {plannedQuantity > 10 && (
                              <div className="text-xs text-blue-600 italic">
                                ... and {plannedQuantity - 10} more
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          
          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Production Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for this production run..."
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <ImageUpload
            entityType="production-runs"
            currentImageUrl={imageUrl}
            onImageChange={setImageUrl}
            label="Production Run Image"
          />

          {/* Validation Warnings */}
          {bomId && selectedBOM && templateId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800">Production Run Ready</div>
                  <div className="text-blue-700">
                    This will create a production run for {plannedQuantity} units of "{selectedBOM.name}" 
                    with {plannedQuantity} pre-allocated serial numbers using the "{selectedTemplate?.name}" template.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {bomId && selectedBOM && !templateId && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">Template Required</div>
                  <div className="text-orange-700">
                    Please select a serial number template to proceed with production run creation.
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!bomId || plannedQuantity <= 0 || !templateId || submitting}
            >
              {submitting ? 'Creating...' : 'Create Production Run'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Serial Number Generator Dialog */}
      <SerialNumberGenerator
        open={showSerialGenerator}
        onOpenChange={setShowSerialGenerator}
        onSerialGenerated={handleSerialGenerated}
        productionRunId={bomId} // Will be set to actual production run ID after creation
      />
      
      {/* Template Manager Dialog */}
      <TemplateManagerDialog
        open={showTemplateManager}
        onOpenChange={(open) => {
          setShowTemplateManager(open)
          if (!open) {
            // Refresh templates when manager is closed
            fetchTemplates()
          }
        }}
        onTemplateSelect={(template) => {
          setTemplateId(template.id)
          setSelectedTemplate(template)
          setShowTemplateManager(false)
        }}
        selectMode={false}
      />
      
      {/* Template Editor Dialog */}
      <TemplateEditorDialog
        open={showTemplateEditor}
        onOpenChange={setShowTemplateEditor}
        template={editingTemplate}
        onSave={(savedTemplate) => {
          // Refresh templates after saving
          fetchTemplates()
          // If this was a new template, select it
          if (!editingTemplate) {
            setTemplateId(savedTemplate.id)
            setSelectedTemplate(savedTemplate)
          } else if (editingTemplate.id === templateId) {
            // If we edited the currently selected template, update it
            setSelectedTemplate(savedTemplate)
          }
          setShowTemplateEditor(false)
          setEditingTemplate(null)
        }}
      />
    </Dialog>
  )
}