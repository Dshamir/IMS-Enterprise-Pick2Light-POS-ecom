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
import { BOMItemSelector } from "./bom-item-selector"
import { ImageUpload } from "@/components/manufacturing/image-upload"

interface ManufacturingBOM {
  id: string
  name: string
  description: string
  project_id: string
  production_line_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  name: string
  status: string
}

interface ProductionLine {
  id: string
  name: string
  status: string
}

interface ManufacturingBOMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bom?: ManufacturingBOM | null
  onSave: () => void
  defaultProjectId?: string
  defaultProductionLineId?: string
}

export function ManufacturingBOMDialog({ 
  open, 
  onOpenChange, 
  bom, 
  onSave,
  defaultProjectId,
  defaultProductionLineId
}: ManufacturingBOMDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: defaultProjectId || '',
    production_line_id: defaultProductionLineId || '',
    quantity: 1,
    notes: '',
    image_url: null as string | null
  })
  const [projects, setProjects] = useState<Project[]>([])
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (open) {
      fetchProjects()
      fetchProductionLines()
    }
  }, [open])

  useEffect(() => {
    if (bom) {
      setFormData({
        name: bom.name || '',
        description: bom.description || '',
        project_id: bom.project_id || '',
        production_line_id: bom.production_line_id || '',
        quantity: bom.quantity || 1,
        notes: bom.notes || '',
        image_url: bom.image_url || null
      })
    } else {
      setFormData({
        name: '',
        description: '',
        project_id: defaultProjectId || '',
        production_line_id: defaultProductionLineId || '',
        quantity: 1,
        notes: '',
        image_url: null
      })
    }
    setStep(1)
  }, [bom, open, defaultProjectId, defaultProductionLineId])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(Array.isArray(data) ? data.filter(p => p.status === 'active') : [])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchProductionLines = async () => {
    try {
      const response = await fetch('/api/production-lines')
      if (response.ok) {
        const data = await response.json()
        setProductionLines(Array.isArray(data) ? data.filter(pl => pl.status === 'active') : [])
      }
    } catch (error) {
      console.error('Error fetching production lines:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = bom ? `/api/manufacturing-boms/${bom.id}` : '/api/manufacturing-boms'
      const method = bom ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSave()
        onOpenChange(false)
      } else {
        console.error('Failed to save BOM:', response.status)
      }
    } catch (error) {
      console.error('Error saving BOM:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageChange = (imageUrl: string | null) => {
    setFormData(prev => ({
      ...prev,
      image_url: imageUrl
    }))
  }

  const handleContextChange = (value: string) => {
    const [type, id] = value.split(':')
    if (type === 'project') {
      setFormData(prev => ({
        ...prev,
        project_id: id,
        production_line_id: ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        project_id: '',
        production_line_id: id
      }))
    }
  }

  const getContextValue = () => {
    if (formData.project_id) return `project:${formData.project_id}`
    if (formData.production_line_id) return `production_line:${formData.production_line_id}`
    return ''
  }

  const canProceed = () => {
    return formData.name.trim() && (formData.project_id || formData.production_line_id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {bom ? 'Edit Manufacturing BOM' : 'Create Manufacturing BOM'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? 'Set up BOM details and context' 
              : 'Select products from inventory for this BOM'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">BOM Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter BOM name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context *</Label>
              <Select
                value={getContextValue()}
                onValueChange={handleContextChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project or production line" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 && (
                    <>
                      <SelectItem value="projects-header" disabled>Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={`project:${project.id}`}>
                          📋 {project.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {productionLines.length > 0 && (
                    <>
                      <SelectItem value="production-lines-header" disabled>Production Lines</SelectItem>
                      {productionLines.map((line) => (
                        <SelectItem key={line.id} value={`production_line:${line.id}`}>
                          🏭 {line.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter BOM description"
                rows={3}
              />
            </div>

            <ImageUpload
              entityType="manufacturing-boms"
              currentImageUrl={formData.image_url}
              onImageChange={handleImageChange}
              label="BOM Image"
            />

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => setStep(2)}
                disabled={!canProceed()}
              >
                {bom ? 'Edit Items' : 'Next: Select Items'}
              </Button>
              {bom && (
                <Button type="submit" disabled={loading || !canProceed()}>
                  {loading ? 'Saving...' : 'Update BOM Info'}
                </Button>
              )}
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">{formData.name}</h3>
              <p className="text-sm text-muted-foreground">
                {formData.project_id 
                  ? `Project: ${projects.find(p => p.id === formData.project_id)?.name}`
                  : `Production Line: ${productionLines.find(pl => pl.id === formData.production_line_id)?.name}`
                }
              </p>
            </div>

            <BOMItemSelector
              bomData={formData}
              bomId={bom?.id}
              onSave={onSave}
              onCancel={() => onOpenChange(false)}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}