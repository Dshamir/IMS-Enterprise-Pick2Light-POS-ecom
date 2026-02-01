"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Settings, TestTube, Lightbulb, Power } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SignalStrengthIndicator } from './signal-strength-indicator'

interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
  signal_strength?: number
  last_seen?: string
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

  // Animation control parameters
  animation_speed?: number        // 0-255, controls WLED sx parameter
  animation_intensity?: number    // 0-255, controls WLED ix parameter
  animation_duration?: number     // milliseconds, for CSS preview animations

  // Device info (from join)
  device_name?: string
  ip_address?: string
  total_leds?: number
}

interface LEDSegmentCardProps {
  segment: LEDSegment
  segmentIndex: number
  devices: WLEDDevice[]
  onUpdate: (index: number, updates: Partial<LEDSegment>) => void
  onRemove: (index: number) => void
  onAdvancedConfig?: (index: number) => void
  readOnly?: boolean
}

export function LEDSegmentCard({
  segment,
  segmentIndex,
  devices,
  onUpdate,
  onRemove,
  onAdvancedConfig,
  readOnly = false
}: LEDSegmentCardProps) {
  const [isTesting, setIsTesting] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{ online: boolean; signal_strength?: number; last_seen?: string } | null>(null)
  const { toast } = useToast()

  const selectedDevice = devices.find(d => d.id === segment.wled_device_id)

  // Real-time connectivity checking when device is selected
  useEffect(() => {
    if (!selectedDevice?.id || readOnly) return

    const checkConnectivity = async () => {
      setIsCheckingConnectivity(true)
      try {
        const response = await fetch(`/api/wled-devices/${selectedDevice.id}/info`)
        const data = await response.json()

        if (response.ok) {
          setDeviceInfo({
            online: data.online,
            signal_strength: data.wifi?.rssi,
            last_seen: data.lastSeen
          })
        } else {
          setDeviceInfo({ online: false })
        }
      } catch (error) {
        console.error('Error checking connectivity:', error)
        setDeviceInfo({ online: false })
      } finally {
        setIsCheckingConnectivity(false)
      }
    }

    // Check immediately when device is selected
    checkConnectivity()

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkConnectivity, 30000)

    return () => clearInterval(interval)
  }, [selectedDevice?.id, readOnly])

  const handleFieldUpdate = (field: keyof LEDSegment, value: any) => {
    onUpdate(segmentIndex, { [field]: value })
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFieldUpdate('location_color', e.target.value)
  }

  const testLEDSegment = async () => {
    if (!selectedDevice || isTesting) return

    setIsTesting(true)
    try {
      const response = await fetch('/api/led-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wled_ip: selectedDevice.ip_address,
          start_led: segment.start_led,
          led_count: segment.led_count,
          test_color: segment.location_color,
          behavior: segment.location_behavior || 'solid',
          animation_speed: segment.animation_speed || 128,
          animation_intensity: segment.animation_intensity || 128
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "LED Test Successful",
          description: `LEDs ${segment.start_led}-${segment.start_led + segment.led_count - 1} should be lighting up with ${segment.location_behavior || 'solid'} animation!`,
          duration: 3000
        })
      } else {
        toast({
          title: "LED Test Failed",
          description: result.error || "Failed to communicate with WLED device",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to send test command to WLED device",
        variant: "destructive"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const activateProfile = async () => {
    if (!selectedDevice || !segment.id || isActivating) return

    setIsActivating(true)
    try {
      const response = await fetch(`/api/wled-devices/${selectedDevice.id}/sync-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Profile Activated",
          description: result.message || "LED segment profile has been activated on the device",
          duration: 3000
        })
      } else {
        toast({
          title: "Activation Failed",
          description: result.error || "Failed to activate profile on WLED device",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to communicate with WLED device",
        variant: "destructive"
      })
    } finally {
      setIsActivating(false)
    }
  }

  const getSegmentStatusBadges = () => {
    const badges = []

    if (segment.segment_behavior !== 'none') {
      badges.push(
        <Badge key="override" variant="secondary">
          Override: {segment.segment_behavior}
        </Badge>
      )
    }

    badges.push(
      <Badge key="stock" variant={segment.stock_mode === 'auto' ? 'default' : 'outline'}>
        Stock: {segment.stock_mode}
      </Badge>
    )

    badges.push(
      <Badge key="alert" variant={segment.alert_mode === 'auto' ? 'default' : 'outline'}>
        Alert: {segment.alert_mode}
      </Badge>
    )

    return badges
  }

  // LED Preview component with accurate color display
  const LEDPreview = () => {
    // Helper function to get the correct color for each LED based on its index
    const getLEDColor = (index: number): string => {
      // Location LEDs (0-3)
      if (index < 4) {
        return segment.location_color
      }

      // Stock LEDs (4-7)
      if (index >= 4 && index < 8) {
        const stockIndex = index - 4 // 0-3
        if (segment.stock_mode === 'manual') {
          // Use manual colors if available
          const manualColors = [
            segment.stock_color_1,
            segment.stock_color_2,
            segment.stock_color_3,
            segment.stock_color_4
          ]
          return manualColors[stockIndex] || '#4CAF50' // Fallback to green
        }
        // Auto mode: use default green
        return '#4CAF50'
      }

      // Alert LEDs (8-11)
      if (index >= 8 && index < 12) {
        const alertIndex = index - 8 // 0-3
        if (segment.alert_mode === 'manual') {
          // Use manual colors if available
          const manualColors = [
            segment.alert_color_1,
            segment.alert_color_2,
            segment.alert_color_3,
            segment.alert_color_4
          ]
          return manualColors[alertIndex] || '#333333' // Fallback to dark gray
        }
        // Auto mode: use default dark gray
        return '#333333'
      }

      // Default fallback
      return '#888888'
    }

    const leds = Array.from({ length: segment.led_count }, (_, i) => (
      <div
        key={i}
        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs font-mono"
        style={{
          backgroundColor: getLEDColor(i)
        }}
      >
        {segment.start_led + i}
      </div>
    ))

    return (
      <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-md">
        <div className="w-full text-xs text-gray-500 mb-2">
          LED Preview (Start: {segment.start_led}, Count: {segment.led_count})
        </div>
        {leds}
      </div>
    )
  }

  return (
    <Card className={`relative ${readOnly ? 'bg-gray-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-orange-500" />
            LED Segment {segmentIndex + 1}
          </CardTitle>
          <div className="flex gap-2">
            {!readOnly && (
              <>
                {segment.id && selectedDevice && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={activateProfile}
                    disabled={!deviceInfo?.online || isActivating}
                    className="flex items-center gap-1"
                  >
                    <Power className="h-4 w-4" />
                    {isActivating ? 'Activating...' : 'Activate'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testLEDSegment}
                  disabled={!selectedDevice || isTesting}
                  className="flex items-center gap-1"
                >
                  <TestTube className="h-4 w-4" />
                  {isTesting ? 'Testing...' : 'Test'}
                </Button>
                {onAdvancedConfig && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAdvancedConfig(segmentIndex)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(segmentIndex)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {getSegmentStatusBadges().length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {getSegmentStatusBadges()}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* WLED Device Selection */}
        <div className="space-y-2">
          <Label>WLED Device</Label>
          <Select
            value={segment.wled_device_id}
            onValueChange={(value) => handleFieldUpdate('wled_device_id', value)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select WLED device..." />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  <div className="flex items-center gap-3">
                    {device.id === segment.wled_device_id && deviceInfo ? (
                      <SignalStrengthIndicator
                        rssi={deviceInfo.signal_strength}
                        isChecking={isCheckingConnectivity}
                        size="sm"
                      />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    )}
                    <span>{device.device_name} - {device.ip_address} ({device.total_leds} LEDs)</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* LED Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Start LED</Label>
            <Input
              type="number"
              min="0"
              max={selectedDevice ? selectedDevice.total_leds - 1 : undefined}
              value={segment.start_led}
              onChange={(e) => handleFieldUpdate('start_led', parseInt(e.target.value) || 0)}
              placeholder="0"
              readOnly={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>LED Count</Label>
            <Select
              value={segment.led_count.toString()}
              onValueChange={(value) => handleFieldUpdate('led_count', parseInt(value))}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9 LEDs (Compact)</SelectItem>
                <SelectItem value="12">12 LEDs (Standard)</SelectItem>
                <SelectItem value="15">15 LEDs (Extended)</SelectItem>
                <SelectItem value="18">18 LEDs (Large)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location Color</Label>
            <div className="flex gap-2">
              <div
                className="w-10 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: segment.location_color }}
                onClick={() => !readOnly && document.getElementById(`color-${segmentIndex}`)?.click()}
              />
              <Input
                id={`color-${segmentIndex}`}
                type="color"
                value={segment.location_color}
                onChange={handleColorChange}
                className="hidden"
                disabled={readOnly}
              />
              <Input
                type="text"
                value={segment.location_color}
                onChange={(e) => handleFieldUpdate('location_color', e.target.value)}
                placeholder="#FF5733"
                className="flex-1"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        {/* LED Preview */}
        <LEDPreview />

        {/* Device Info */}
        {selectedDevice && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Device: {selectedDevice.device_name}</div>
                <div>IP: {selectedDevice.ip_address} | Total LEDs: {selectedDevice.total_leds}</div>
              </div>
              {deviceInfo && (
                <div className="flex items-center gap-2">
                  <SignalStrengthIndicator
                    rssi={deviceInfo.signal_strength}
                    isChecking={isCheckingConnectivity}
                    showText={true}
                  />
                </div>
              )}
            </div>
            {deviceInfo?.last_seen && (
              <div className="text-xs text-gray-500">
                Last seen: {new Date(deviceInfo.last_seen).toLocaleString()}
              </div>
            )}
            {segment.start_led + segment.led_count > selectedDevice.total_leds && (
              <div className="text-red-600 font-medium mt-1">
                ⚠️ LED range exceeds device capacity!
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}