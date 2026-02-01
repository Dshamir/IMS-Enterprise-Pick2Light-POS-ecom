"use client"

import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
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

interface WLEDDeviceSelectorProps {
  selectedDeviceId?: string
  onDeviceChange: (deviceId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function WLEDDeviceSelector({
  selectedDeviceId,
  onDeviceChange,
  placeholder = "Select WLED device...",
  disabled = false,
  className
}: WLEDDeviceSelectorProps) {
  const [devices, setDevices] = useState<WLEDDevice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<Record<string, { online: boolean; signal_strength?: number; last_seen?: string }>>({})

  useEffect(() => {
    loadDevices()
  }, [])

  // Real-time connectivity checking for selected device
  useEffect(() => {
    if (!selectedDeviceId) return

    const checkConnectivity = async () => {
      setIsCheckingConnectivity(true)
      try {
        const response = await fetch(`/api/wled-devices/${selectedDeviceId}/info`)
        const data = await response.json()

        if (response.ok) {
          setDeviceInfo(prev => ({
            ...prev,
            [selectedDeviceId]: {
              online: data.online,
              signal_strength: data.wifi?.rssi,
              last_seen: data.lastSeen
            }
          }))
        } else {
          setDeviceInfo(prev => ({
            ...prev,
            [selectedDeviceId]: { online: false }
          }))
        }
      } catch (error) {
        console.error('Error checking connectivity:', error)
        setDeviceInfo(prev => ({
          ...prev,
          [selectedDeviceId]: { online: false }
        }))
      } finally {
        setIsCheckingConnectivity(false)
      }
    }

    // Check immediately when device is selected
    checkConnectivity()

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkConnectivity, 30000)

    return () => clearInterval(interval)
  }, [selectedDeviceId])

  const loadDevices = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/wled-devices')
      if (!response.ok) {
        throw new Error(`Failed to load devices: ${response.statusText}`)
      }

      const devicesData = await response.json()
      setDevices(devicesData)
    } catch (err: any) {
      console.error('Error loading WLED devices:', err)
      setError(err.message || 'Failed to load WLED devices')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading devices...</span>
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className={`${className} border-red-300`}>
          <span className="text-red-600">Error loading devices</span>
        </SelectTrigger>
      </Select>
    )
  }

  if (devices.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={`${className} border-yellow-300`}>
          <span className="text-yellow-600">No WLED devices available</span>
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={selectedDeviceId}
      onValueChange={onDeviceChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedDevice && (
            <div className="flex items-center gap-2">
              <SignalStrengthIndicator
                rssi={deviceInfo[selectedDevice.id]?.signal_strength}
                isChecking={isCheckingConnectivity}
                size="sm"
              />
              <span>{selectedDevice.device_name}</span>
              <Badge variant={deviceInfo[selectedDevice.id]?.online ? 'default' : 'secondary'} className="text-xs">
                {selectedDevice.total_leds} LEDs
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {devices.map((device) => (
          <SelectItem key={device.id} value={device.id}>
            <div className="flex items-center gap-3 py-1">
              <div className="flex items-center gap-2">
                <SignalStrengthIndicator
                  rssi={deviceInfo[device.id]?.signal_strength}
                  isChecking={device.id === selectedDeviceId && isCheckingConnectivity}
                  size="sm"
                />
                <div>
                  <div className="font-medium">{device.device_name}</div>
                  <div className="text-xs text-gray-500">
                    {device.ip_address} • {device.total_leds} LEDs
                  </div>
                </div>
              </div>
              <div className="ml-auto">
                <Badge
                  variant={deviceInfo[device.id]?.online ?? (device.status === 'online') ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {deviceInfo[device.id]?.online ?? (device.status === 'online') ? 'online' : 'offline'}
                </Badge>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}