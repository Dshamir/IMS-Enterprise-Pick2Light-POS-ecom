"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Lightbulb, Info, Wifi } from 'lucide-react'
import { LEDSegmentCard } from './led-segment-card'
import { LEDConfigModal } from './led-config-modal'
import { useToast } from '@/hooks/use-toast'

interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
}

interface LEDSegment {
  id?: string
  wled_device_id: string
  start_led: number
  led_count: number
  location_color: string
  location_behavior: string
  stock_mode: string
  stock_behavior: string
  alert_mode: string
  alert_behavior: string
  segment_behavior: string

  // Additional colors for manual modes
  stock_color_1?: string
  stock_color_2?: string
  stock_color_3?: string
  stock_color_4?: string
  alert_color_1?: string
  alert_color_2?: string
  alert_color_3?: string
  alert_color_4?: string

  // Locate override configuration
  locate_override_enabled?: number
  locate_override_color?: string | null
  locate_override_behavior?: string

  // Device info (from join - only for loaded segments)
  device_name?: string
  ip_address?: string
  total_leds?: number
}

interface LEDLocationSectionProps {
  segments: LEDSegment[]
  onSegmentsChange: (segments: LEDSegment[]) => void
  disabled?: boolean
  productId?: string // For edit mode
}

export function LEDLocationSection({
  segments,
  onSegmentsChange,
  disabled = false,
  productId
}: LEDLocationSectionProps) {
  const [devices, setDevices] = useState<WLEDDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(true)
  const [configModalSegment, setConfigModalSegment] = useState<{
    segment: LEDSegment
    index: number
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadDevices()
  }, [])

  // Load existing segments for edit mode
  useEffect(() => {
    if (productId && segments.length === 0) {
      loadExistingSegments()
    }
  }, [productId])

  const loadDevices = async () => {
    try {
      setIsLoadingDevices(true)
      const response = await fetch('/api/wled-devices')
      if (response.ok) {
        const devicesData = await response.json()
        setDevices(devicesData)
      } else {
        console.error('Failed to load WLED devices')
      }
    } catch (error) {
      console.error('Error loading WLED devices:', error)
    } finally {
      setIsLoadingDevices(false)
    }
  }

  const loadExistingSegments = async () => {
    if (!productId) return

    try {
      const response = await fetch(`/api/led-segments?product_id=${productId}`)
      if (response.ok) {
        const segmentsData = await response.json()
        if (segmentsData.length > 0) {
          onSegmentsChange(segmentsData)
        }
      } else {
        console.error('Failed to load existing LED segments')
      }
    } catch (error) {
      console.error('Error loading existing LED segments:', error)
    }
  }

  const createDefaultSegment = (): LEDSegment => ({
    wled_device_id: '',
    start_led: 0,
    led_count: 12,
    location_color: '#FF5733',
    location_behavior: 'solid',
    stock_mode: 'auto',
    stock_behavior: 'solid',
    alert_mode: 'auto',
    alert_behavior: 'solid',
    segment_behavior: 'none',
    stock_color_1: '#4CAF50',
    stock_color_2: '#4CAF50',
    stock_color_3: '#4CAF50',
    stock_color_4: '#4CAF50',
    alert_color_1: '#333333',
    alert_color_2: '#333333',
    alert_color_3: '#333333',
    alert_color_4: '#333333'
  })

  const addLEDSegment = () => {
    const newSegment = createDefaultSegment()

    // Auto-suggest start LED based on existing segments
    if (segments.length > 0) {
      const maxEndLed = Math.max(
        ...segments
          .filter(s => s.wled_device_id) // Only consider segments with devices
          .map(s => s.start_led + s.led_count)
      )
      if (maxEndLed >= 0) {
        newSegment.start_led = maxEndLed
      }
    }

    // Auto-select the first available device
    if (devices.length > 0) {
      newSegment.wled_device_id = devices[0].id
    }

    onSegmentsChange([...segments, newSegment])
  }

  const updateSegment = (index: number, updates: Partial<LEDSegment>) => {
    const updatedSegments = segments.map((segment, i) =>
      i === index ? { ...segment, ...updates } : segment
    )
    onSegmentsChange(updatedSegments)
  }

  const removeSegment = (index: number) => {
    const updatedSegments = segments.filter((_, i) => i !== index)
    onSegmentsChange(updatedSegments)
  }

  const openAdvancedConfig = (index: number) => {
    setConfigModalSegment({
      segment: segments[index],
      index
    })
  }

  const handleConfigSave = async (updatedSegment: LEDSegment) => {
    if (!configModalSegment) return

    console.log('💾 Saving LED segment configuration:', {
      id: updatedSegment.id,
      locate_override_enabled: updatedSegment.locate_override_enabled,
      locate_override_color: updatedSegment.locate_override_color,
      locate_override_behavior: updatedSegment.locate_override_behavior
    })

    // If segment has an ID, it exists in database - update via API immediately
    if (updatedSegment.id) {
      try {
        // Filter out read-only JOIN fields (device_name, ip_address, etc.) before sending to API
        const { device_name, ip_address, total_leds, status, signal_strength, last_seen, ...segmentDataToSave } = updatedSegment

        console.log('📤 Sending to API (filtered):', segmentDataToSave)

        const response = await fetch(`/api/led-segments/${updatedSegment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(segmentDataToSave)
        })

        if (response.ok) {
          console.log('✅ LED segment saved successfully')
          // Update local state
          updateSegment(configModalSegment.index, updatedSegment)

          // Reload segments from database to ensure we have latest data
          if (productId) {
            await loadExistingSegments()
          }

          toast({
            title: "Configuration Saved",
            description: "LED segment configuration updated successfully"
          })
          setConfigModalSegment(null)
        } else {
          const error = await response.json()
          console.error('❌ LED segment save failed:', error)
          toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.error || "Failed to save configuration"
          })
          // Don't close modal on error
        }
      } catch (error) {
        console.error('❌ Network error saving LED segment:', error)
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Could not connect to server"
        })
        // Don't close modal on error
      }
    } else {
      // New segment - just update local state (will be saved when product is saved)
      console.log('📝 New segment - updating local state only')
      updateSegment(configModalSegment.index, updatedSegment)
      setConfigModalSegment(null)
    }
  }

  // Validation for overlapping LED ranges
  const validateSegments = () => {
    const conflicts: string[] = []
    const deviceSegments = new Map<string, LEDSegment[]>()

    // Group segments by device
    segments.forEach((segment, index) => {
      if (!segment.wled_device_id) return

      if (!deviceSegments.has(segment.wled_device_id)) {
        deviceSegments.set(segment.wled_device_id, [])
      }
      deviceSegments.get(segment.wled_device_id)!.push({ ...segment, index } as LEDSegment & { index: number })
    })

    // Check for overlaps within each device
    deviceSegments.forEach((deviceSegs, deviceId) => {
      for (let i = 0; i < deviceSegs.length; i++) {
        for (let j = i + 1; j < deviceSegs.length; j++) {
          const seg1 = deviceSegs[i]
          const seg2 = deviceSegs[j]

          const seg1End = seg1.start_led + seg1.led_count - 1
          const seg2End = seg2.start_led + seg2.led_count - 1

          const overlaps = (
            (seg1.start_led <= seg2End && seg1End >= seg2.start_led) ||
            (seg2.start_led <= seg1End && seg2End >= seg1.start_led)
          )

          if (overlaps) {
            const device = devices.find(d => d.id === deviceId)
            const deviceName = device?.device_name || 'Unknown Device'
            conflicts.push(
              `Segments ${(seg1 as any).index + 1} and ${(seg2 as any).index + 1} overlap on ${deviceName}`
            )
          }
        }
      }
    })

    return conflicts
  }

  const conflicts = validateSegments()

  const InfoBox = () => (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
          <Lightbulb className="h-5 w-5" />
          LED Location System
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
            Visual Tracking
          </Badge>
        </CardTitle>
        <CardDescription className="text-blue-700">
          Connect this item to physical LED indicators for real-time visual tracking and stock status monitoring.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 text-blue-600" />
          <div>
            <p className="font-medium">How it works:</p>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• LEDs 0-3: Location identification with your custom color</li>
              <li>• LEDs 4-7: Stock status (auto-calculated from inventory levels)</li>
              <li>• LEDs 8-11: Alert indicators for reorder points</li>
              <li>• Search for this item to light up all its LED segments</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <InfoBox />

      {/* Loading state while fetching devices */}
      {isLoadingDevices && (
        <div className="text-center py-4 text-gray-500">
          <Wifi className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading WLED devices...</p>
        </div>
      )}

      {/* LED Segments */}
      <div className="space-y-4">
        {segments.map((segment, index) => (
          <LEDSegmentCard
            key={`segment-${index}`}
            segment={segment}
            segmentIndex={index}
            devices={devices}
            onUpdate={updateSegment}
            onRemove={removeSegment}
            onAdvancedConfig={openAdvancedConfig}
            readOnly={disabled}
          />
        ))}

        {/* Add Segment Button */}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            onClick={addLEDSegment}
            className="w-full h-16 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <Plus className="h-5 w-5" />
            Add LED Segment
          </Button>
        )}

        {/* Validation Errors */}
        {conflicts.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-800 text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                LED Range Conflicts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-red-700">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Helpful Information */}
        {segments.length > 0 && (
          <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            💡 Tip: Add multiple LED segments if this item is stored in multiple locations
          </div>
        )}
      </div>

      {/* Advanced Configuration Modal */}
      {configModalSegment && (
        <LEDConfigModal
          segment={configModalSegment.segment}
          onSave={handleConfigSave}
          open={true}
          onOpenChange={(open) => !open && setConfigModalSegment(null)}
        />
      )}
    </div>
  )
}