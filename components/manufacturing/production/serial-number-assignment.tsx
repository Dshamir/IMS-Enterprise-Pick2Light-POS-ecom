'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Hash, 
  Package, 
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Target
} from "lucide-react"

interface AvailableSerial {
  id: string
  serial_number: string
  model: string
  part_number: string
  counter: number
  sequence_number: number
  status: 'allocated' | 'assigned' | 'consumed'
  template_name: string
  format_template: string
}

interface SerialNumberAssignmentProps {
  productionRunId: string
  onSerialAssigned?: (serialId: string, serialNumber: string) => void
  selectedSerialId?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function SerialNumberAssignment({ 
  productionRunId, 
  onSerialAssigned,
  selectedSerialId,
  disabled = false,
  placeholder = "Select a serial number...",
  className = ""
}: SerialNumberAssignmentProps) {
  const [availableSerials, setAvailableSerials] = useState<AvailableSerial[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableSerials = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch only allocated (unassigned) serial numbers
      const response = await fetch(`/api/production-runs/${productionRunId}/serial-numbers?status=allocated`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSerials(data.serial_numbers || [])
      } else {
        setError('Failed to fetch available serial numbers')
      }
    } catch (error) {
      console.error('Error fetching available serials:', error)
      setError('Error loading serial numbers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productionRunId) {
      fetchAvailableSerials()
    }
  }, [productionRunId])

  const handleSerialSelection = async (serialId: string) => {
    if (!serialId || assigning) return

    const selectedSerial = availableSerials.find(s => s.id === serialId)
    if (!selectedSerial) return

    setAssigning(true)
    try {
      // Update the serial status to 'assigned' via API
      const response = await fetch(`/api/production-runs/${productionRunId}/serial-numbers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_id: serialId,
          status: 'assigned'
        })
      })

      if (response.ok) {
        // Notify parent component
        onSerialAssigned?.(serialId, selectedSerial.serial_number)
        
        // Refresh the available serials list
        await fetchAvailableSerials()
      } else {
        setError('Failed to assign serial number')
      }
    } catch (error) {
      console.error('Error assigning serial:', error)
      setError('Error assigning serial number')
    } finally {
      setAssigning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'allocated':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'assigned':
        return <Package className="h-3 w-3 text-orange-500" />
      case 'consumed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>Serial Number Assignment</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading serial numbers...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>Serial Number Assignment</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchAvailableSerials}
            className="ml-auto h-6 px-2 text-red-600"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (availableSerials.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>Serial Number Assignment</Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-orange-50 border-orange-200">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-600">
            No unassigned serial numbers available for this production run
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <Label>Serial Number Assignment</Label>
        <Badge variant="secondary" className="text-xs">
          {availableSerials.length} available
        </Badge>
      </div>
      
      <Select 
        value={selectedSerialId || ""} 
        onValueChange={handleSerialSelection}
        disabled={disabled || assigning || availableSerials.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={assigning ? "Assigning..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableSerials.map((serial) => (
            <SelectItem key={serial.id} value={serial.id}>
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center gap-2">
                  {getStatusIcon(serial.status)}
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {serial.serial_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{serial.sequence_number} • {serial.model}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="ml-auto text-xs bg-blue-50 text-blue-700 border-blue-200"
                >
                  allocated
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Preview of selected serial */}
      {selectedSerialId && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Ready to assign serial number
              </span>
            </div>
            {(() => {
              const selected = availableSerials.find(s => s.id === selectedSerialId)
              return selected ? (
                <div className="mt-2 text-xs text-green-700">
                  <div className="font-mono">{selected.serial_number}</div>
                  <div>Generated from {selected.template_name} template</div>
                </div>
              ) : null
            })()}
          </CardContent>
        </Card>
      )}

      {availableSerials.length > 0 && availableSerials[0].template_name && (
        <div className="text-xs text-muted-foreground">
          Serial numbers generated using: <span className="font-medium">{availableSerials[0].template_name}</span>
          {availableSerials[0].format_template && (
            <span className="font-mono ml-1">({availableSerials[0].format_template})</span>
          )}
        </div>
      )}
    </div>
  )
}