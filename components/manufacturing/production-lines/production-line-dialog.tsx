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
import { ImageUpload } from "@/components/manufacturing/image-upload"

interface ProductionLine {
  id: string
  name: string
  description: string
  capacity: number
  hourly_rate: number
  status: string
  shift_hours: number
  department: string
  notes: string
  image_url: string | null
  created_at: string
  updated_at: string
}

interface ProductionLineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productionLine?: ProductionLine | null
  onSave: () => void
}

export function ProductionLineDialog({ 
  open, 
  onOpenChange, 
  productionLine, 
  onSave 
}: ProductionLineDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 100,
    hourly_rate: 0,
    status: 'active',
    shift_hours: 8,
    department: '',
    notes: '',
    image_url: null as string | null
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (productionLine) {
      setFormData({
        name: productionLine.name || '',
        description: productionLine.description || '',
        capacity: productionLine.capacity || 100,
        hourly_rate: productionLine.hourly_rate || 0,
        status: productionLine.status || 'active',
        shift_hours: productionLine.shift_hours || 8,
        department: productionLine.department || '',
        notes: productionLine.notes || '',
        image_url: productionLine.image_url || null
      })
    } else {
      setFormData({
        name: '',
        description: '',
        capacity: 100,
        hourly_rate: 0,
        status: 'active',
        shift_hours: 8,
        department: '',
        notes: '',
        image_url: null
      })
    }
  }, [productionLine, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = productionLine ? `/api/production-lines/${productionLine.id}` : '/api/production-lines'
      const method = productionLine ? 'PUT' : 'POST'

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
        console.error('Failed to save production line:', response.status)
      }
    } catch (error) {
      console.error('Error saving production line:', error)
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

  const calculateDailyCost = () => {
    return formData.hourly_rate * formData.shift_hours
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {productionLine ? 'Edit Production Line' : 'Create New Production Line'}
          </DialogTitle>
          <DialogDescription>
            {productionLine ? 'Update production line details' : 'Add a new recurring manufacturing line'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Line Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter production line name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              placeholder="Enter department name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter production line description"
              rows={3}
            />
          </div>

          <ImageUpload
            entityType="production-lines"
            currentImageUrl={formData.image_url}
            onImageChange={handleImageChange}
            label="Production Line Image"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Daily Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 1)}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift_hours">Shift Hours</Label>
              <Input
                id="shift_hours"
                type="number"
                min="1"
                max="24"
                value={formData.shift_hours}
                onChange={(e) => handleInputChange('shift_hours', parseInt(e.target.value) || 8)}
                placeholder="8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly Rate</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_rate}
              onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            {formData.hourly_rate > 0 && formData.shift_hours > 0 && (
              <p className="text-sm text-muted-foreground">
                Daily cost: {formatCurrency(calculateDailyCost())}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional production line notes"
              rows={3}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : productionLine ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}