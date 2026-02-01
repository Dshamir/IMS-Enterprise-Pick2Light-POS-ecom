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
import { AlertCircle, Hash, Edit2, Save, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface SerialNumberEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serialNumber: any | null
  onSerialUpdated: (serial: any) => void
}

interface EditFormData {
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

export function SerialNumberEditDialog({ 
  open, 
  onOpenChange, 
  serialNumber,
  onSerialUpdated
}: SerialNumberEditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<EditFormData>({
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
    if (open && serialNumber) {
      // Pre-populate form with existing data
      setFormData({
        model: serialNumber.model || '',
        kind: serialNumber.kind || '',
        use_case: serialNumber.use_case || '',
        version: serialNumber.version || '',
        production_year: serialNumber.production_year || new Date().getFullYear(),
        num_wells: serialNumber.num_wells || '',
        application: serialNumber.application || '',
        machine_name: serialNumber.machine_name || '',
        note: serialNumber.note || '',
        input_specs: serialNumber.input_specs || '',
        color_code: serialNumber.color_code || '',
        color: serialNumber.color || '',
        self_test_by: serialNumber.self_test_by || '',
        calibrated_by: serialNumber.calibrated_by || '',
        used_by: serialNumber.used_by || '',
        calibration_date: serialNumber.calibration_date || '',
        recalibration_date: serialNumber.recalibration_date || ''
      })
    }
  }, [open, serialNumber])

  const handleInputChange = (field: keyof EditFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serialNumber) return
    
    setSubmitting(true)

    try {
      const response = await fetch('/api/serial-registry', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: serialNumber.id,
          ...formData
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Success",
          description: `Serial number ${serialNumber.serial_number} updated successfully!`,
        })

        onSerialUpdated(result.serial)
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to update serial number",
        })
      }
    } catch (error) {
      console.error('Error updating serial:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update serial number",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  if (!serialNumber) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Serial Number
          </DialogTitle>
          <DialogDescription>
            Modify the details of serial number {serialNumber.serial_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-only Information */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Serial Number Information
              </CardTitle>
              <CardDescription>
                These fields are read-only and cannot be changed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Serial Number</Label>
                  <div className="p-2 bg-background rounded border font-mono text-sm">
                    {serialNumber.serial_number}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Counter</Label>
                  <div className="p-2 bg-background rounded border font-mono text-sm">
                    {serialNumber.counter.toString().padStart(5, '0')}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="p-2 bg-background rounded border">
                    <Badge variant={serialNumber.status === 'active' ? 'default' : 'destructive'}>
                      {serialNumber.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <div className="p-2 bg-background rounded border text-sm">
                    {new Date(serialNumber.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Core Parameters */}
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
                  <Label htmlFor="color_code">Color Code</Label>
                  <Input
                    id="color_code"
                    value={formData.color_code}
                    onChange={(e) => handleInputChange('color_code', e.target.value)}
                    placeholder="e.g., W"
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
                  <Label htmlFor="application">Application</Label>
                  <Input
                    id="application"
                    value={formData.application}
                    onChange={(e) => handleInputChange('application', e.target.value)}
                    placeholder="e.g., Laboratory Testing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machine_name">Machine Name</Label>
                  <Input
                    id="machine_name"
                    value={formData.machine_name}
                    onChange={(e) => handleInputChange('machine_name', e.target.value)}
                    placeholder="e.g., RTPCR-LAB-001"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calibration_date">Calibration Date</Label>
                  <Input
                    id="calibration_date"
                    type="date"
                    value={formData.calibration_date}
                    onChange={(e) => handleInputChange('calibration_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recalibration_date">Recalibration Date</Label>
                  <Input
                    id="recalibration_date"
                    type="date"
                    value={formData.recalibration_date}
                    onChange={(e) => handleInputChange('recalibration_date', e.target.value)}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}