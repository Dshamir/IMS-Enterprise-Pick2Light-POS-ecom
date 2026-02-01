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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Hash, Eye, RefreshCw, CheckCircle, Upload, Download, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TemplateManagerDialog } from "./template-manager-dialog"
import { type SerialNumberTemplate } from "@/lib/batch-serial-generator"
import { formatSerialNumberWithTemplate, previewTemplateFormat, getAvailablePlaceholders } from "@/lib/serial-template-formatter"

interface SerialNumberGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSerialGenerated: (serial: any) => void
  productionRunId?: string
  productInstanceId?: string
}

interface SerialFormData {
  counter: number
  model: string
  kind: string
  use_case: string
  version: string
  production_year: number
  num_wells: string
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
}

export function SerialNumberGenerator({ 
  open, 
  onOpenChange, 
  onSerialGenerated,
  productionRunId,
  productInstanceId
}: SerialNumberGeneratorProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewSerial, setPreviewSerial] = useState('')
  const [nextCounter, setNextCounter] = useState(1)
  const [recentSerials, setRecentSerials] = useState([])
  const [templates, setTemplates] = useState<SerialNumberTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SerialNumberTemplate | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [generationMode, setGenerationMode] = useState<'template' | 'manual'>('template')
  const [customFormatString, setCustomFormatString] = useState('')
  const [formatPreview, setFormatPreview] = useState('')
  
  const [formData, setFormData] = useState<SerialFormData>({
    counter: 1,
    model: '',
    kind: '',
    use_case: '',
    version: '',
    production_year: new Date().getFullYear(),
    num_wells: '',
    application: '',
    machine_name: '',
    note: '',
    input_specs: '',
    color_code: '',
    color: '',
    self_test_by: '',
    calibrated_by: '',
    used_by: '',
    calibration_date: '',
    recalibration_date: ''
  })

  useEffect(() => {
    if (open) {
      fetchSerialData()
      fetchTemplates()
    }
  }, [open])

  useEffect(() => {
    // Update preview when form data, template, or custom format changes
    generatePreview()
  }, [formData, selectedTemplate, customFormatString, generationMode])
  
  useEffect(() => {
    // Update custom format string when template changes
    if (selectedTemplate && generationMode === 'template') {
      setCustomFormatString(selectedTemplate.format_template || '')
    }
  }, [selectedTemplate, generationMode])

  const fetchSerialData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/serial-registry/generate')
      if (response.ok) {
        const data = await response.json()
        setNextCounter(data.nextCounter)
        setRecentSerials(data.recentSerials)
        
        // Pre-populate form with template data
        setFormData(prev => ({
          ...prev,
          counter: data.nextCounter,
          ...data.templateData
        }))
      }
    } catch (error) {
      console.error('Error fetching serial data:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load serial number data",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/serial-number-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(Array.isArray(data) ? data : [])
        // Set default template if available
        const defaultTemplate = data.find((t: SerialNumberTemplate) => t.is_default)
        if (defaultTemplate) {
          setTemplateId(defaultTemplate.id)
          setSelectedTemplate(defaultTemplate)
          setCustomFormatString(defaultTemplate.format_template || '')
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const generatePreview = () => {
    if (generationMode === 'template' && selectedTemplate) {
      // Use template-based formatting
      const formattedSerial = formatSerialNumberWithTemplate({
        ...formData,
        num_wells: parseInt(formData.num_wells || '0') || 0
      }, selectedTemplate)
      setPreviewSerial(formattedSerial)
      
      // Also generate format preview if custom format is being used
      if (customFormatString && customFormatString !== selectedTemplate.format_template) {
        const customPreview = previewTemplateFormat(customFormatString, {
          ...formData,
          num_wells: parseInt(formData.num_wells || '0') || 0
        })
        setFormatPreview(customPreview)
      } else {
        setFormatPreview('')
      }
    } else {
      // Manual mode - use simple concatenation (updated to include use_case)
      const model = formData.model || ''
      const num_wells = formData.num_wells || ''
      const kind = formData.kind || ''
      const use_case = formData.use_case || ''
      const version = formData.version || ''
      const color_code = formData.color_code || ''
      const counter = formData.counter || 0
      
      // Updated format: MODEL+NUMWELLS-KIND-USECASE-VERSION+COLORCODE-COUNTER
      const serialNumber = `${model}${num_wells}-${kind}-${use_case}-${version}${color_code}-${counter.toString().padStart(5, '0')}`
      setPreviewSerial(serialNumber)
      setFormatPreview('')
    }
  }

  const handleInputChange = (field: keyof SerialFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const requestBody = {
        ...formData,
        production_run_id: productionRunId,
        product_instance_id: productInstanceId,
        generation_mode: generationMode,
        template_id: generationMode === 'template' ? templateId : undefined,
        custom_format: generationMode === 'template' && customFormatString !== selectedTemplate?.format_template ? customFormatString : undefined
      }
      
      const response = await fetch('/api/serial-registry/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success",
          description: `Serial number ${result.serial.serial_number} generated successfully!`,
        })

        onSerialGenerated(result.serial)
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to generate serial number",
        })
      }
    } catch (error) {
      console.error('Error generating serial:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate serial number",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setFormData({
      counter: nextCounter,
      model: '',
      kind: '',
      use_case: '',
      version: '',
      production_year: new Date().getFullYear(),
      num_wells: '',
      application: '',
      machine_name: '',
      note: '',
      input_specs: '',
      color_code: '',
      color: '',
      self_test_by: '',
      calibrated_by: '',
      used_by: '',
      calibration_date: '',
      recalibration_date: ''
    })
    setPreviewSerial('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Serial Number</DialogTitle>
          <DialogDescription>
            Create a new serial number using templates or manual configuration
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Generation Mode Tabs */}
          <Tabs value={generationMode} onValueChange={(value) => setGenerationMode(value as 'manual' | 'template')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">Template-Based</TabsTrigger>
              <TabsTrigger value="manual">Manual Configuration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="template" className="space-y-4">
              {/* Template Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Select Template</CardTitle>
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-select">Template</Label>
                    <Select
                      value={templateId}
                      onValueChange={(value) => {
                        setTemplateId(value)
                        const template = templates.find(t => t.id === value)
                        setSelectedTemplate(template || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
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
                                {template.format_template}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Product Type:</span>
                            <span>{selectedTemplate.product_type}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Custom Format String Editor */}
                  {selectedTemplate && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="custom-format">Custom Format String</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomFormatString(selectedTemplate.format_template || '')}
                        >
                          Reset to Template
                        </Button>
                      </div>
                      <Input
                        id="custom-format"
                        value={customFormatString}
                        onChange={(e) => setCustomFormatString(e.target.value)}
                        placeholder="e.g., {MODEL}{NUM_WELLS}-{KIND}-{YEAR}{MONTH}{VERSION}{COLOR_CODE}-{PREFIX}-{COUNTER}"
                        className="font-mono text-sm"
                      />
                      <div className="text-xs text-muted-foreground">
                        Available placeholders: &#123;MODEL&#125;, &#123;NUM_WELLS&#125;, &#123;KIND&#125;, &#123;YEAR&#125;, &#123;MONTH&#125;, &#123;VERSION&#125;, &#123;COLOR_CODE&#125;, &#123;PREFIX&#125;, &#123;COUNTER&#125;
                      </div>
                      
                      {/* Format Preview */}
                      <div className="space-y-2">
                        <Label>Live Preview</Label>
                        <div className="p-3 bg-white border rounded-lg">
                          <div className="font-mono text-lg">
                            {formatPreview || previewTemplateFormat(customFormatString, {
                              model: formData.model || 'RTPCR',
                              num_wells: parseInt(formData.num_wells || '25'),
                              kind: formData.kind || 'PIV',
                              production_year: formData.production_year,
                              version: formData.version || 'V5',
                              color_code: formData.color_code || 'W',
                              counter: formData.counter,
                              prefix: selectedTemplate.prefix_default || 'LAB'
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Example: RTPCR25PIV-RTPCR-2507V5W-LAB-00001
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Manual mode allows you to specify all parameters individually. For consistent formatting, consider using Template-Based mode.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Counter and Preview Section - Outside of tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Counter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="counter">Next Available:</Label>
                    <Badge variant="outline">{nextCounter}</Badge>
                  </div>
                  <Input
                    id="counter"
                    type="number"
                    min={1}
                    value={formData.counter}
                    onChange={(e) => handleInputChange('counter', parseInt(e.target.value) || 1)}
                    className="text-lg font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Counter must be unique. Next available: {nextCounter}. Format: 5-digit padded (e.g., 00072)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg border font-mono text-lg">
                      {previewSerial || 'Enter parameters to see preview'}
                    </div>
                    {generationMode === 'template' && selectedTemplate && (
                      <div className="text-xs text-muted-foreground">
                        Using template: {selectedTemplate.name}
                        {customFormatString !== selectedTemplate.format_template && ' (customized)'}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePreview}
                    className="w-full"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Parameters</CardTitle>
              <CardDescription>
                Main components that make up the serial number
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="e.g., RTPCR25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kind">Kind</Label>
                  <Input
                    id="kind"
                    value={formData.kind}
                    onChange={(e) => handleInputChange('kind', e.target.value)}
                    placeholder="e.g., RTPCR"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="use_case">Use Case</Label>
                  <Input
                    id="use_case"
                    value={formData.use_case}
                    onChange={(e) => handleInputChange('use_case', e.target.value)}
                    placeholder="e.g., LAB, NEX, MIT, CAE, ARMY"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => handleInputChange('version', e.target.value)}
                    placeholder="e.g., V5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="production_year">Production Year</Label>
                  <Input
                    id="production_year"
                    type="number"
                    value={formData.production_year}
                    onChange={(e) => handleInputChange('production_year', parseInt(e.target.value) || new Date().getFullYear())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="num_wells">Number of Wells</Label>
                  <Input
                    id="num_wells"
                    value={formData.num_wells}
                    onChange={(e) => handleInputChange('num_wells', e.target.value)}
                    placeholder="e.g., PIV"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application">Application</Label>
                  <Input
                    id="application"
                    value={formData.application}
                    onChange={(e) => handleInputChange('application', e.target.value)}
                    placeholder="e.g., Research"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Parameters</CardTitle>
              <CardDescription>
                Optional parameters for detailed tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="machine_name">Machine Name</Label>
                  <Input
                    id="machine_name"
                    value={formData.machine_name}
                    onChange={(e) => handleInputChange('machine_name', e.target.value)}
                    placeholder="e.g., PCR-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color_code">Color Code</Label>
                  <Input
                    id="color_code"
                    value={formData.color_code}
                    onChange={(e) => handleInputChange('color_code', e.target.value)}
                    placeholder="e.g., W"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="self_test_by">Self Test By</Label>
                  <Input
                    id="self_test_by"
                    value={formData.self_test_by}
                    onChange={(e) => handleInputChange('self_test_by', e.target.value)}
                    placeholder="Technician name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calibrated_by">Calibrated By</Label>
                  <Input
                    id="calibrated_by"
                    value={formData.calibrated_by}
                    onChange={(e) => handleInputChange('calibrated_by', e.target.value)}
                    placeholder="Technician name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="used_by">Used By</Label>
                  <Input
                    id="used_by"
                    value={formData.used_by}
                    onChange={(e) => handleInputChange('used_by', e.target.value)}
                    placeholder="Operator name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Notes</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                  placeholder="Additional notes about this serial number..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {previewSerial && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Ready to Generate</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Serial number "{previewSerial}" will be created with counter {formData.counter}
                </p>
              </CardContent>
            </Card>
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
              disabled={!previewSerial || submitting}
            >
              {submitting ? 'Generating...' : 'Generate Serial Number'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Template Manager Dialog */}
      <TemplateManagerDialog
        open={showTemplateManager}
        onOpenChange={(open) => {
          setShowTemplateManager(open)
          if (!open) {
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
    </Dialog>
  )
}