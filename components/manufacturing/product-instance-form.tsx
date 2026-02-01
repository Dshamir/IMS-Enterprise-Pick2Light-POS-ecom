'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Package, Hash, FileText, Counter as CounterIcon, Settings, Palette, Users, Calendar, Wrench } from "lucide-react"

interface ProductInstanceData {
  // Phase 1A Core Fields
  model: string
  serial_number_custom: string
  part_number: string
  counter: number
  batch_number?: string
  quality_notes?: string
  
  // Phase 1B Extended Fields
  // Identification & Specification
  kind?: string
  use_case?: string
  version?: string
  production_year?: number
  num_wells?: number
  application?: string
  machine_name?: string
  note?: string
  input_specs?: string
  
  // Appearance & Color
  color_code?: string
  color?: string
  
  // Personnel & Responsibility
  self_test_by?: string
  calibrated_by?: string
  used_by?: string
  
  // Calibration & Maintenance
  calibration_date?: string
  recalibration_date?: string
}

interface ProductInstanceFormProps {
  initialData?: Partial<ProductInstanceData>
  onSubmit: (data: ProductInstanceData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  readOnly?: boolean
}

export function ProductInstanceForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  readOnly = false
}: ProductInstanceFormProps) {
  const [formData, setFormData] = useState<ProductInstanceData>({
    // Phase 1A Core Fields
    model: initialData.model || '',
    serial_number_custom: initialData.serial_number_custom || '',
    part_number: initialData.part_number || '',
    counter: initialData.counter || 1,
    batch_number: initialData.batch_number || '',
    quality_notes: initialData.quality_notes || '',
    
    // Phase 1B Extended Fields
    kind: initialData.kind || '',
    use_case: initialData.use_case || '',
    version: initialData.version || '',
    production_year: initialData.production_year || new Date().getFullYear(),
    num_wells: initialData.num_wells || 0,
    application: initialData.application || '',
    machine_name: initialData.machine_name || '',
    note: initialData.note || '',
    input_specs: initialData.input_specs || '',
    color_code: initialData.color_code || '',
    color: initialData.color || '',
    self_test_by: initialData.self_test_by || '',
    calibrated_by: initialData.calibrated_by || '',
    used_by: initialData.used_by || '',
    calibration_date: initialData.calibration_date || '',
    recalibration_date: initialData.recalibration_date || ''
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ProductInstanceData, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductInstanceData, string>> = {}

    // Core field validation
    if (!formData.model.trim()) {
      newErrors.model = 'Model is required'
    }

    if (!formData.serial_number_custom.trim()) {
      newErrors.serial_number_custom = 'Custom serial number is required'
    }

    if (!formData.part_number.trim()) {
      newErrors.part_number = 'Part number is required'
    }

    if (formData.counter <= 0) {
      newErrors.counter = 'Counter must be greater than 0'
    }

    // Extended field validation
    if (formData.production_year && (formData.production_year < 2000 || formData.production_year > 2100)) {
      newErrors.production_year = 'Production year must be between 2000 and 2100'
    }

    if (formData.num_wells && formData.num_wells < 0) {
      newErrors.num_wells = 'Number of wells cannot be negative'
    }

    // Date validation
    if (formData.calibration_date && formData.recalibration_date) {
      const calibrationDate = new Date(formData.calibration_date)
      const recalibrationDate = new Date(formData.recalibration_date)
      if (recalibrationDate <= calibrationDate) {
        newErrors.recalibration_date = 'Recalibration date must be after calibration date'
      }
    }

    // Serial number format validation
    if (formData.serial_number_custom) {
      const serialPattern = /^[A-Z0-9\s]+$/i
      if (!serialPattern.test(formData.serial_number_custom)) {
        newErrors.serial_number_custom = 'Serial number should only contain letters, numbers, and spaces'
      }
    }

    // Color code validation (if provided)
    if (formData.color_code && formData.color_code.trim()) {
      const colorCodePattern = /^(#[0-9A-Fa-f]{6}|RAL-\d{4}|[A-Z0-9-]+)$/i
      if (!colorCodePattern.test(formData.color_code)) {
        newErrors.color_code = 'Invalid color code format. Use #RRGGBB, RAL-XXXX, or alphanumeric codes'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  const handleInputChange = (field: keyof ProductInstanceData, value: string | number) => {
    // Type-specific validation and conversion
    let processedValue: string | number = value
    
    // Handle numeric fields
    if (field === 'counter' || field === 'production_year' || field === 'num_wells') {
      processedValue = typeof value === 'string' ? parseInt(value) || 0 : value
    }
    
    // Handle string fields - trim whitespace
    if (typeof value === 'string') {
      processedValue = value.trim()
    }
    
    // Special handling for specific fields
    if (field === 'model' || field === 'part_number') {
      processedValue = typeof value === 'string' ? value.toUpperCase() : value
    }
    
    if (field === 'serial_number_custom') {
      processedValue = typeof value === 'string' ? value.toUpperCase() : value
    }
    
    if (field === 'color_code') {
      processedValue = typeof value === 'string' ? value.toUpperCase() : value
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Instance Details
        </CardTitle>
        <CardDescription>
          {readOnly ? 'View product instance information' : 'Configure core identification fields for this product instance'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Identification Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Core Identification</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="e.g., RTPCR"
                  disabled={readOnly || isLoading}
                />
                {errors.model && (
                  <p className="text-sm text-red-500">{errors.model}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="part_number">Part Number (P/N) *</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => handleInputChange('part_number', e.target.value)}
                  placeholder="e.g., P/N-12345678"
                  disabled={readOnly || isLoading}
                />
                {errors.part_number && (
                  <p className="text-sm text-red-500">{errors.part_number}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number_custom">Custom Serial Number (S/N) *</Label>
              <Input
                id="serial_number_custom"
                value={formData.serial_number_custom}
                onChange={(e) => handleInputChange('serial_number_custom', e.target.value)}
                placeholder="e.g., RTPCR P4V3C202103LAB00001xxx"
                disabled={readOnly || isLoading}
              />
              {errors.serial_number_custom && (
                <p className="text-sm text-red-500">{errors.serial_number_custom}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: MODEL P4V3CYYYYMMPREFIX00000xxx
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="counter">Counter *</Label>
              <Input
                id="counter"
                type="number"
                min={1}
                value={formData.counter}
                onChange={(e) => handleInputChange('counter', parseInt(e.target.value) || 1)}
                disabled={readOnly || isLoading}
              />
              {errors.counter && (
                <p className="text-sm text-red-500">{errors.counter}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Extended Identification & Specification Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Identification & Specification</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kind">Kind</Label>
                <Input
                  id="kind"
                  value={formData.kind}
                  onChange={(e) => handleInputChange('kind', e.target.value)}
                  placeholder="Product kind/type"
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="use_case">Use Case</Label>
                <Input
                  id="use_case"
                  value={formData.use_case}
                  onChange={(e) => handleInputChange('use_case', e.target.value)}
                  placeholder="Intended use or purpose"
                  disabled={readOnly || isLoading}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleInputChange('version', e.target.value)}
                  placeholder="e.g., v1.0, P4V3C"
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="production_year">Production Year</Label>
                <Input
                  id="production_year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={formData.production_year}
                  onChange={(e) => handleInputChange('production_year', parseInt(e.target.value) || new Date().getFullYear())}
                  disabled={readOnly || isLoading}
                />
                {errors.production_year && (
                  <p className="text-sm text-red-500">{errors.production_year}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="num_wells">Number of Wells</Label>
                <Input
                  id="num_wells"
                  type="number"
                  min={0}
                  value={formData.num_wells}
                  onChange={(e) => handleInputChange('num_wells', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  disabled={readOnly || isLoading}
                />
                {errors.num_wells && (
                  <p className="text-sm text-red-500">{errors.num_wells}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="application">Application</Label>
                <Input
                  id="application"
                  value={formData.application}
                  onChange={(e) => handleInputChange('application', e.target.value)}
                  placeholder="Specific application context"
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="machine_name">Machine Name</Label>
                <Input
                  id="machine_name"
                  value={formData.machine_name}
                  onChange={(e) => handleInputChange('machine_name', e.target.value)}
                  placeholder="Associated machine/equipment"
                  disabled={readOnly || isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="input_specs">Input Specifications</Label>
              <Textarea
                id="input_specs"
                value={formData.input_specs}
                onChange={(e) => handleInputChange('input_specs', e.target.value)}
                placeholder="Input specifications and requirements"
                rows={2}
                disabled={readOnly || isLoading}
              />
            </div>
          </div>
          
          <Separator />
          
          {/* Appearance & Color Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Appearance & Color</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color_code">Color Code</Label>
                <Input
                  id="color_code"
                  value={formData.color_code}
                  onChange={(e) => handleInputChange('color_code', e.target.value)}
                  placeholder="e.g., #FF0000, RAL-3020"
                  disabled={readOnly || isLoading}
                />
                {errors.color_code && (
                  <p className="text-sm text-red-500">{errors.color_code}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">Color Description</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Red, Blue, Clear"
                  disabled={readOnly || isLoading}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Personnel & Responsibility Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Personnel & Responsibility</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="self_test_by">Self Test By</Label>
                <Input
                  id="self_test_by"
                  value={formData.self_test_by}
                  onChange={(e) => handleInputChange('self_test_by', e.target.value)}
                  placeholder="Person who performed self-test"
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="calibrated_by">Calibrated By</Label>
                <Input
                  id="calibrated_by"
                  value={formData.calibrated_by}
                  onChange={(e) => handleInputChange('calibrated_by', e.target.value)}
                  placeholder="Person who performed calibration"
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="used_by">Used By</Label>
                <Input
                  id="used_by"
                  value={formData.used_by}
                  onChange={(e) => handleInputChange('used_by', e.target.value)}
                  placeholder="Person/department using product"
                  disabled={readOnly || isLoading}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Calibration & Maintenance Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Calibration & Maintenance</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calibration_date">Calibration Date</Label>
                <Input
                  id="calibration_date"
                  type="date"
                  value={formData.calibration_date}
                  onChange={(e) => handleInputChange('calibration_date', e.target.value)}
                  disabled={readOnly || isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recalibration_date">Recalibration Date</Label>
                <Input
                  id="recalibration_date"
                  type="date"
                  value={formData.recalibration_date}
                  onChange={(e) => handleInputChange('recalibration_date', e.target.value)}
                  disabled={readOnly || isLoading}
                />
                {errors.recalibration_date && (
                  <p className="text-sm text-red-500">{errors.recalibration_date}</p>
                )}
              </div>
            </div>
          </div>
          
          <Separator />

          {/* Additional Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Additional Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_number">Batch Number</Label>
              <Input
                id="batch_number"
                value={formData.batch_number}
                onChange={(e) => handleInputChange('batch_number', e.target.value)}
                placeholder="Optional batch identifier"
                disabled={readOnly || isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note">General Notes</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="General notes and observations"
                rows={2}
                disabled={readOnly || isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality_notes">Quality Notes</Label>
              <Textarea
                id="quality_notes"
                value={formData.quality_notes}
                onChange={(e) => handleInputChange('quality_notes', e.target.value)}
                placeholder="Notes about quality, testing, or specifications"
                rows={3}
                disabled={readOnly || isLoading}
              />
            </div>
          </div>

          {/* Enhanced Preview */}
          {formData.serial_number_custom && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-3">Product Instance Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{formData.model}</Badge>
                    <span className="text-muted-foreground">Model</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{formData.part_number}</Badge>
                    <span className="text-muted-foreground">Part Number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{formData.serial_number_custom}</Badge>
                    <span className="text-muted-foreground">Serial Number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">#{formData.counter}</Badge>
                    <span className="text-muted-foreground">Counter</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {formData.kind && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formData.kind}</Badge>
                      <span className="text-muted-foreground">Kind</span>
                    </div>
                  )}
                  {formData.version && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formData.version}</Badge>
                      <span className="text-muted-foreground">Version</span>
                    </div>
                  )}
                  {formData.production_year && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{formData.production_year}</Badge>
                      <span className="text-muted-foreground">Production Year</span>
                    </div>
                  )}
                  {formData.color && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formData.color}</Badge>
                      <span className="text-muted-foreground">Color</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          {!readOnly && (
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Product Instance'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}