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
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Code,
  Hash,
  Calendar,
  MapPin,
  Wand2,
  Database
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { validateTemplate, parseTemplateFormat, type SerialNumberTemplate } from "@/lib/batch-serial-generator"

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: SerialNumberTemplate | null
  onSave: (template: SerialNumberTemplate) => void
}

interface TemplateFormData {
  name: string
  description: string
  format_template: string
  model_pattern: string
  version_pattern: string
  num_wells_pattern: string
  kind_pattern: string
  color_code_pattern: string
  year_format: string
  month_format: string
  prefix_default: string
  counter_padding: number
  suffix_pattern: string
  counter_start: number
  counter_increment: number
  validation_regex: string
  product_type: string
  facility_code: string
  is_active: boolean
  is_default: boolean
}

const PLACEHOLDER_INFO = [
  { key: '{MODEL}', description: 'Product model identifier', example: 'RTPCR25' },
  { key: '{VERSION}', description: 'Version identifier', example: 'V5' },
  { key: '{NUM_WELLS}', description: 'Number of wells identifier', example: 'PIV' },
  { key: '{KIND}', description: 'Device kind/type', example: 'RTPCR' },
  { key: '{COLOR_CODE}', description: 'Color code identifier', example: 'W' },
  { key: '{YEAR}', description: 'Year (YY or YYYY format)', example: '25' },
  { key: '{MONTH}', description: 'Month (MM or M format)', example: '07' },
  { key: '{PREFIX}', description: 'Use case prefix', example: 'LAB' },
  { key: '{COUNTER}', description: 'Sequential counter (padded)', example: '00001' },
  { key: '{SUFFIX}', description: 'Fixed suffix pattern', example: 'xxx' },
  { key: '{FACILITY}', description: 'Facility code', example: 'FAC1' },
  { key: '{PRODUCTION_RUN}', description: 'Production run short ID', example: 'abcd1234' }
]

const PRESET_FORMATS = [
  {
    name: 'RTPCR Standard',
    format: '{MODEL}{NUM_WELLS}-{KIND}-{VERSION}{COLOR_CODE}-{COUNTER}',
    description: 'Standard RTPCR format like RTPCR25PIV-RTPCR-V5W-00072'
  },
  {
    name: 'Legacy Lab Format',
    format: '{MODEL} P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx',
    description: 'Legacy format like RTPCR P4V3C202103LAB00001xxx'
  },
  {
    name: 'Generic Equipment',
    format: '{MODEL}-{YEAR}-{MONTH}-{COUNTER}',
    description: 'Simple format like LAB-2025-07-00001'
  },
  {
    name: 'Kimera Format',
    format: 'KIMERA-P4V3C{YEAR}{MONTH}{PREFIX}{COUNTER}xxx',
    description: 'Kimera specific format'
  }
]

export function TemplateEditorDialog({ 
  open, 
  onOpenChange, 
  template,
  onSave 
}: TemplateEditorDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<string[]>([])
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[] }>({ valid: true, errors: [] })
  const [showPlaceholderHelp, setShowPlaceholderHelp] = useState(false)
  const [showRegistryAnalysis, setShowRegistryAnalysis] = useState(false)
  const [registryPatterns, setRegistryPatterns] = useState<any[]>([])
  const [loadingRegistry, setLoadingRegistry] = useState(false)
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    format_template: '',
    model_pattern: 'RTPCR25',
    version_pattern: 'V5',
    num_wells_pattern: 'PIV',
    kind_pattern: 'RTPCR',
    color_code_pattern: 'W',
    year_format: 'YY',
    month_format: 'MM',
    prefix_default: 'LAB',
    counter_padding: 5,
    suffix_pattern: '',
    counter_start: 1,
    counter_increment: 1,
    validation_regex: '',
    product_type: 'RT-qPCR Device',
    facility_code: '',
    is_active: true,
    is_default: false
  })

  useEffect(() => {
    if (open && template) {
      // Edit mode - populate form with template data
      setFormData({
        name: template.name || '',
        description: template.description || '',
        format_template: template.format_template || '',
        model_pattern: template.model_pattern || 'RTPCR25',
        version_pattern: template.version_pattern || 'V5',
        num_wells_pattern: template.num_wells_pattern || 'PIV',
        kind_pattern: template.kind_pattern || 'RTPCR',
        color_code_pattern: template.color_code_pattern || 'W',
        year_format: template.year_format || 'YY',
        month_format: template.month_format || 'MM',
        prefix_default: template.prefix_default || 'LAB',
        counter_padding: template.counter_padding || 5,
        suffix_pattern: template.suffix_pattern || '',
        counter_start: template.counter_start || 1,
        counter_increment: template.counter_increment || 1,
        validation_regex: template.validation_regex || '',
        product_type: template.product_type || 'RT-qPCR Device',
        facility_code: template.facility_code || '',
        is_active: template.is_active !== false,
        is_default: template.is_default || false
      })
    } else if (open && !template) {
      // Create mode - reset to defaults
      setFormData({
        name: '',
        description: '',
        format_template: '',
        model_pattern: 'RTPCR25',
        version_pattern: 'V5',
        num_wells_pattern: 'PIV',
        kind_pattern: 'RTPCR',
        color_code_pattern: 'W',
        year_format: 'YY',
        month_format: 'MM',
        prefix_default: 'LAB',
        counter_padding: 5,
        suffix_pattern: '',
        counter_start: 1,
        counter_increment: 1,
        validation_regex: '',
        product_type: 'RT-qPCR Device',
        facility_code: '',
        is_active: true,
        is_default: false
      })
    }
  }, [open, template])

  useEffect(() => {
    if (formData.format_template) {
      validateAndPreview()
    }
  }, [formData])

  const validateAndPreview = () => {
    const templateForValidation: SerialNumberTemplate = {
      id: template?.id || 'preview',
      ...formData
    }
    
    // Validate template
    const validation = validateTemplate(templateForValidation)
    setValidationResult(validation)
    
    // Generate preview if valid
    if (validation.valid && formData.format_template) {
      try {
        const parsed = parseTemplateFormat(formData.format_template)
        const examples = []
        
        // Generate 3 example serial numbers
        for (let i = 0; i < 3; i++) {
          let example = formData.format_template
          const sampleValues = {
            MODEL: formData.model_pattern || 'RTPCR25',
            VERSION: formData.version_pattern || 'V5',
            NUM_WELLS: formData.num_wells_pattern || 'PIV',
            KIND: formData.kind_pattern || 'RTPCR',
            COLOR_CODE: formData.color_code_pattern || 'W',
            YEAR: formData.year_format === 'YYYY' ? '2025' : '25',
            MONTH: formData.month_format === 'MM' ? '07' : '7',
            PREFIX: formData.prefix_default || 'LAB',
            COUNTER: (formData.counter_start + i).toString().padStart(formData.counter_padding, '0'),
            SUFFIX: formData.suffix_pattern || 'xxx',
            FACILITY: formData.facility_code || 'FAC1',
            PRODUCTION_RUN: 'abcd1234'
          }
          
          Object.entries(sampleValues).forEach(([key, value]) => {
            example = example.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
          })
          
          examples.push(example)
        }
        
        setPreview(examples)
      } catch (error) {
        setPreview([`Error: ${error.message}`])
      }
    } else {
      setPreview([])
    }
  }

  const handleInputChange = (field: keyof TemplateFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePresetSelect = (preset: typeof PRESET_FORMATS[0]) => {
    setFormData(prev => ({
      ...prev,
      format_template: preset.format,
      name: prev.name || preset.name,
      description: prev.description || preset.description
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validationResult.valid) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix the validation errors before saving.",
      })
      return
    }

    setSubmitting(true)
    try {
      const templateData: SerialNumberTemplate = {
        id: template?.id || '',
        ...formData
      }

      const url = template?.id 
        ? `/api/serial-number-templates/${template.id}`
        : '/api/serial-number-templates'
      
      const method = template?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData)
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success",
          description: `Template ${template?.id ? 'updated' : 'created'} successfully!`,
        })

        onSave(result)
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || `Failed to ${template?.id ? 'update' : 'create'} template`,
        })
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${template?.id ? 'update' : 'create'} template`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const insertPlaceholder = (placeholder: string) => {
    const currentFormat = formData.format_template
    const newFormat = currentFormat + placeholder
    handleInputChange('format_template', newFormat)
  }

  const analyzeRegistry = async () => {
    setLoadingRegistry(true)
    try {
      const response = await fetch('/api/serial-number-templates/analyze-registry')
      if (response.ok) {
        const data = await response.json()
        setRegistryPatterns(data.suggestions || [])
        setShowRegistryAnalysis(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to analyze registry data",
        })
      }
    } catch (error) {
      console.error('Error analyzing registry:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to analyze registry data",
      })
    } finally {
      setLoadingRegistry(false)
    }
  }

  const applyRegistryPattern = (pattern: any) => {
    setFormData(prev => ({
      ...prev,
      name: pattern.name,
      description: pattern.description,
      format_template: pattern.format_template,
      model_pattern: pattern.model_pattern || prev.model_pattern,
      version_pattern: pattern.version_pattern || prev.version_pattern,
      prefix_default: pattern.prefix_default || prev.prefix_default,
      counter_padding: pattern.counter_padding || prev.counter_padding,
      suffix_pattern: pattern.suffix_pattern || prev.suffix_pattern,
      validation_regex: pattern.validation_regex || prev.validation_regex,
      product_type: pattern.product_type || prev.product_type,
    }))
    setShowRegistryAnalysis(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription>
            {template ? 'Modify template settings and format' : 'Create a new serial number template with custom format and rules'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., RTPCR Standard Format"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_type">Product Type</Label>
                  <Input
                    id="product_type"
                    value={formData.product_type}
                    onChange={(e) => handleInputChange('product_type', e.target.value)}
                    placeholder="e.g., RT-qPCR Device"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe when and how to use this template..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Format */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                Template Format
              </CardTitle>
              <CardDescription>
                Define the serial number format using placeholders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Start Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Quick Start Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={analyzeRegistry}
                    disabled={loadingRegistry}
                    className="flex items-center gap-2"
                  >
                    <Database className="h-3 w-3" />
                    {loadingRegistry ? 'Analyzing...' : 'Generate from Registry'}
                  </Button>
                </div>
                
                {/* Preset Templates */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Preset Formats</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {PRESET_FORMATS.map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        className="h-auto p-3 text-left justify-start"
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {preset.format}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Format Template Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="format_template">Format Template *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaceholderHelp(!showPlaceholderHelp)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Placeholder Help
                  </Button>
                </div>
                <Textarea
                  id="format_template"
                  value={formData.format_template}
                  onChange={(e) => handleInputChange('format_template', e.target.value)}
                  placeholder="e.g., {MODEL}{NUM_WELLS}-{KIND}-{VERSION}{COLOR_CODE}-{COUNTER}"
                  className="font-mono text-sm"
                  rows={3}
                  required
                />
              </div>
              
              {/* Placeholder Helper */}
              {showPlaceholderHelp && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="font-medium text-sm">Available Placeholders:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {PLACEHOLDER_INFO.map((placeholder, index) => (
                          <div key={index} className="space-y-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-2 w-full justify-start"
                              onClick={() => insertPlaceholder(placeholder.key)}
                            >
                              <div className="text-left space-y-1">
                                <div className="font-mono text-xs text-blue-600">
                                  {placeholder.key}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {placeholder.description}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Example: {placeholder.example}
                                </div>
                              </div>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Validation Results */}
              {!validationResult.valid && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-medium text-red-800">Validation Errors:</div>
                        <ul className="text-sm text-red-700 space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          {preview.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-green-800 font-medium">
                    Example serial numbers:
                  </div>
                  {preview.map((serial, index) => (
                    <div key={index} className="font-mono text-sm bg-white px-3 py-2 rounded border">
                      {serial}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Configuration Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model_pattern">Default Model</Label>
                  <Input
                    id="model_pattern"
                    value={formData.model_pattern}
                    onChange={(e) => handleInputChange('model_pattern', e.target.value)}
                    placeholder="e.g., RTPCR25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version_pattern">Default Version</Label>
                  <Input
                    id="version_pattern"
                    value={formData.version_pattern}
                    onChange={(e) => handleInputChange('version_pattern', e.target.value)}
                    placeholder="e.g., V5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefix_default">Default Prefix</Label>
                  <Input
                    id="prefix_default"
                    value={formData.prefix_default}
                    onChange={(e) => handleInputChange('prefix_default', e.target.value)}
                    placeholder="e.g., LAB"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num_wells_pattern">Default Num Wells</Label>
                  <Input
                    id="num_wells_pattern"
                    value={formData.num_wells_pattern}
                    onChange={(e) => handleInputChange('num_wells_pattern', e.target.value)}
                    placeholder="e.g., PIV, 25, XXL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kind_pattern">Default Kind</Label>
                  <Input
                    id="kind_pattern"
                    value={formData.kind_pattern}
                    onChange={(e) => handleInputChange('kind_pattern', e.target.value)}
                    placeholder="e.g., RTPCR, KIMERA, LAB"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color_code_pattern">Default Color Code</Label>
                  <Input
                    id="color_code_pattern"
                    value={formData.color_code_pattern}
                    onChange={(e) => handleInputChange('color_code_pattern', e.target.value)}
                    placeholder="e.g., W, R, B, GREEN"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="counter_padding">Counter Padding</Label>
                  <Input
                    id="counter_padding"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.counter_padding}
                    onChange={(e) => handleInputChange('counter_padding', parseInt(e.target.value) || 5)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counter_start">Counter Start</Label>
                  <Input
                    id="counter_start"
                    type="number"
                    min={1}
                    value={formData.counter_start}
                    onChange={(e) => handleInputChange('counter_start', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counter_increment">Counter Increment</Label>
                  <Input
                    id="counter_increment"
                    type="number"
                    min={1}
                    value={formData.counter_increment}
                    onChange={(e) => handleInputChange('counter_increment', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_format">Year Format</Label>
                  <Select
                    value={formData.year_format}
                    onValueChange={(value) => handleInputChange('year_format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YY">YY (25)</SelectItem>
                      <SelectItem value="YYYY">YYYY (2025)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suffix_pattern">Default Suffix</Label>
                  <Input
                    id="suffix_pattern"
                    value={formData.suffix_pattern}
                    onChange={(e) => handleInputChange('suffix_pattern', e.target.value)}
                    placeholder="e.g., xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facility_code">Facility Code</Label>
                  <Input
                    id="facility_code"
                    value={formData.facility_code}
                    onChange={(e) => handleInputChange('facility_code', e.target.value)}
                    placeholder="e.g., FAC1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="validation_regex">Validation Regex (Optional)</Label>
                <Input
                  id="validation_regex"
                  value={formData.validation_regex}
                  onChange={(e) => handleInputChange('validation_regex', e.target.value)}
                  placeholder="e.g., ^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-\\d{5}$"
                  className="font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground">
                  Optional: Regular expression to validate generated serial numbers
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Template</Label>
                  <div className="text-sm text-muted-foreground">
                    Only active templates appear in selection lists
                  </div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default Template</Label>
                  <div className="text-sm text-muted-foreground">
                    This template will be selected by default
                  </div>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!validationResult.valid || submitting || !formData.name || !formData.format_template}
            >
              {submitting ? (template ? 'Updating...' : 'Creating...') : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Registry Analysis Dialog */}
      <Dialog open={showRegistryAnalysis} onOpenChange={setShowRegistryAnalysis}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generated Templates from Registry Data
            </DialogTitle>
            <DialogDescription>
              Select a template pattern based on your existing serial numbers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {registryPatterns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No patterns found in registry data
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Found {registryPatterns.length} template patterns from your serial number registry:
                </div>
                <div className="space-y-3">
                  {registryPatterns.map((pattern, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{pattern.name}</div>
                            <Button
                              size="sm"
                              onClick={() => applyRegistryPattern(pattern)}
                            >
                              Use This Pattern
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Format:</span>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {pattern.format_template}
                              </code>
                            </div>
                            
                            {pattern.description && (
                              <div className="text-sm text-muted-foreground">
                                {pattern.description}
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {pattern.model_pattern && (
                                <div>
                                  <span className="text-muted-foreground">Model:</span> {pattern.model_pattern}
                                </div>
                              )}
                              {pattern.version_pattern && (
                                <div>
                                  <span className="text-muted-foreground">Version:</span> {pattern.version_pattern}
                                </div>
                              )}
                              {pattern.prefix_default && (
                                <div>
                                  <span className="text-muted-foreground">Prefix:</span> {pattern.prefix_default}
                                </div>
                              )}
                              {pattern.counter_padding && (
                                <div>
                                  <span className="text-muted-foreground">Counter:</span> {pattern.counter_padding} digits
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegistryAnalysis(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}