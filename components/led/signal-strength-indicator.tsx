"use client"

import React from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignalStrengthIndicatorProps {
  rssi?: number
  isChecking?: boolean
  showText?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SignalStrengthIndicator({
  rssi,
  isChecking = false,
  showText = false,
  className,
  size = 'md'
}: SignalStrengthIndicatorProps) {
  // Determine signal quality based on RSSI (dBm)
  const getSignalQuality = (): { level: number; label: string; color: string } => {
    if (rssi === undefined || rssi === null) {
      return { level: 0, label: 'Unknown', color: 'text-gray-400' }
    }

    if (rssi >= -50) {
      return { level: 4, label: 'Excellent', color: 'text-green-500' }
    } else if (rssi >= -65) {
      return { level: 3, label: 'Good', color: 'text-green-500' }
    } else if (rssi >= -75) {
      return { level: 2, label: 'Fair', color: 'text-yellow-500' }
    } else {
      return { level: 1, label: 'Poor', color: 'text-orange-500' }
    }
  }

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const iconSize = sizeClasses[size]
  const quality = getSignalQuality()

  // Show loading spinner when checking connectivity
  if (isChecking) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Loader2 className={cn(iconSize, "animate-spin text-blue-500")} />
        {showText && <span className="text-xs text-gray-500">Checking...</span>}
      </div>
    )
  }

  // Show offline icon when no RSSI value
  if (rssi === undefined || rssi === null) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <WifiOff className={cn(iconSize, "text-red-500")} />
        {showText && <span className="text-xs text-gray-500">Offline</span>}
      </div>
    )
  }

  // Signal strength bars visualization
  const WifiStrengthBars = () => {
    const bars = [1, 2, 3, 4]

    return (
      <div className="relative inline-flex items-end gap-0.5" style={{ height: size === 'sm' ? '12px' : size === 'lg' ? '20px' : '16px' }}>
        {bars.map((bar) => {
          const isActive = bar <= quality.level
          const height = size === 'sm'
            ? `${bar * 3}px`
            : size === 'lg'
            ? `${bar * 5}px`
            : `${bar * 4}px`

          return (
            <div
              key={bar}
              className={cn(
                "w-1 rounded-sm transition-colors",
                isActive ? quality.color.replace('text-', 'bg-') : 'bg-gray-300'
              )}
              style={{ height }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <WifiStrengthBars />
      {showText && (
        <div className="flex flex-col text-xs">
          <span className={cn("font-medium", quality.color)}>{quality.label}</span>
          <span className="text-gray-500">{rssi} dBm</span>
        </div>
      )}
    </div>
  )
}
