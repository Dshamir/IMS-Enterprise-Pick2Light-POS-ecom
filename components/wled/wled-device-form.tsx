"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wifi, WifiOff, TestTube, Plus, Edit } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WLEDDevice {
  id?: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
}

interface WLEDDeviceFormProps {
  device?: WLEDDevice | null
  isOpen: boolean
  onClose: () => void
  onSave: (device: WLEDDevice) => void
  mode?: 'create' | 'edit'
}

export function WLEDDeviceForm({
  device,
  isOpen,
  onClose,
  onSave,
  mode = 'create'
}: WLEDDeviceFormProps) {
  const { toast } = useToast()

  const [formData, setFormData] = useState<WLEDDevice>({
    device_name: '',
    ip_address: '',
    total_leds: 60,
    status: 'online'
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Reset form when device or mode changes
  useEffect(() => {
    if (device) {
      setFormData({
        id: device.id,
        device_name: device.device_name || '',
        ip_address: device.ip_address || '',
        total_leds: device.total_leds || 60,
        status: device.status || 'online'
      })
    } else {
      setFormData({
        device_name: '',
        ip_address: '',
        total_leds: 60,
        status: 'online'
      })
    }
    setConnectionStatus('idle')
  }, [device, isOpen])

  const handleInputChange = (field: keyof WLEDDevice, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Reset connection status when IP changes
    if (field === 'ip_address') {
      setConnectionStatus('idle')
    }
  }

  const validateForm = () => {
    if (!formData.device_name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Device name is required"
      })
      return false
    }

    if (!formData.ip_address.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "IP address is required"
      })
      return false
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(formData.ip_address)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid IP address (e.g., 192.168.1.100)"
      })
      return false
    }

    // Validate IP address ranges
    const parts = formData.ip_address.split('.').map(Number)
    if (parts.some(part => part < 0 || part > 255)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "IP address parts must be between 0 and 255"
      })
      return false
    }

    if (formData.total_leds <= 0 || formData.total_leds > 1000) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Total LEDs must be between 1 and 1000"
      })
      return false
    }

    return true
  }

  const testConnection = async () => {
    if (!formData.ip_address.trim() || !validateForm()) {
      return
    }

    setIsTesting(true)
    setConnectionStatus('idle')

    try {
      // Test WLED device connectivity by flashing LEDs 0-11 in RED
      const response = await fetch('/api/led-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wled_ip: formData.ip_address,
          start_led: 0,               // Start from first LED
          led_count: 12,              // Test full segment (12 LEDs)
          test_color: '#FF0000',      // Bright RED for visibility
          behavior: 'flash',          // Flash animation for clear feedback
          animation_speed: 200,       // Fast flashing
          animation_intensity: 255    // Maximum brightness
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setConnectionStatus('success')
        toast({
          title: "✅ Connection Test Successful",
          description: result.message || `LEDs 0-11 should be flashing RED on ${formData.ip_address}`
        })
      } else {
        setConnectionStatus('error')
        toast({
          variant: "destructive",
          title: "Connection Test Failed",
          description: result.error || `Cannot reach WLED device at ${formData.ip_address}`
        })
      }
    } catch (error) {
      setConnectionStatus('error')
      toast({
        variant: "destructive",
        title: "Network Error",
        description: `Failed to communicate with ${formData.ip_address}`
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const url = mode === 'edit' && formData.id
        ? `/api/wled-devices/${formData.id}`
        : '/api/wled-devices'

      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_name: formData.device_name.trim(),
          ip_address: formData.ip_address.trim(),
          total_leds: formData.total_leds,
          status: formData.status
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: `Device ${mode === 'edit' ? 'Updated' : 'Created'}`,
          description: result.message
        })
        onSave(formData)
        onClose()
      } else {
        toast({
          variant: "destructive",
          title: `Failed to ${mode === 'edit' ? 'Update' : 'Create'} Device`,
          description: result.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: `Failed to ${mode === 'edit' ? 'update' : 'create'} WLED device`
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' ? (
              <>
                <Edit className="h-5 w-5" />
                Edit WLED Device
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New WLED Device
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the WLED device configuration below.'
              : 'Configure a new WLED device for LED location tracking.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device_name">Device Name</Label>
            <Input
              id="device_name"
              value={formData.device_name}
              onChange={(e) => handleInputChange('device_name', e.target.value)}
              placeholder="e.g., Main Storage Rack"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip_address">IP Address</Label>
            <div className="flex gap-2">
              <Input
                id="ip_address"
                value={formData.ip_address}
                onChange={(e) => handleInputChange('ip_address', e.target.value)}
                placeholder="e.g., 192.168.1.100"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={!formData.ip_address.trim() || isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test
              </Button>
            </div>

            {connectionStatus !== 'idle' && (
              <div className="flex items-center gap-2">
                {connectionStatus === 'success' ? (
                  <Badge variant="default" className="text-xs">
                    <Wifi className="h-3 w-3 mr-1" />
                    Connection successful
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Connection failed
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_leds">Total LEDs</Label>
            <Input
              id="total_leds"
              type="number"
              min="1"
              max="1000"
              value={formData.total_leds}
              onChange={(e) => handleInputChange('total_leds', parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value as 'online' | 'offline')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    Online
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4 text-red-500" />
                    Offline
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {mode === 'edit' ? 'Update Device' : 'Create Device'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}