"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Loader2, Package, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LEDSegment {
  id: string
  wled_device_id: string
  start_led: number
  led_count: number
  location_color: string
  location_behavior: string
  device_name: string
  ip_address: string
  total_leds: number
  status: string
  signal_strength: number | null
  last_seen: string | null
  animation_duration?: number

  // Stock and Alert configuration
  stock_mode: string
  stock_behavior: string
  stock_color_1?: string
  stock_color_2?: string
  stock_color_3?: string
  stock_color_4?: string
  alert_mode: string
  alert_behavior: string
  alert_color_1?: string
  alert_color_2?: string
  alert_color_3?: string
  alert_color_4?: string
  segment_behavior: string

  // Locate override configuration
  locate_override_enabled?: number
  locate_override_color?: string | null
  locate_override_behavior?: string
}

interface Product {
  id: string
  name: string
  description: string | null
  part_number: string | null
  barcode: string | null
  price: number
  stock_quantity: number
  min_stock_level: number
  max_stock_level: number
  category_id: string | null
  category_name: string | null
  Location: string | null
  created_at: string
  led_segment_count: number
  led_segments: LEDSegment[]
  image_url?: string | null
}

interface ItemCardProps {
  product: Product
  onStockChange: (productId: string, newQuantity: number) => void
}

export function ItemCard({ product, onStockChange }: ItemCardProps) {
  const { toast } = useToast()
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isLocateActive, setIsLocateActive] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const locateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate stock status
  const getStockStatus = () => {
    const { stock_quantity, min_stock_level, max_stock_level } = product
    if (stock_quantity <= 0) return { status: "critical", color: "bg-red-500", label: "OUT OF STOCK" }
    if (stock_quantity <= min_stock_level) return { status: "low", color: "bg-orange-500", label: "LOW STOCK" }
    if (stock_quantity >= max_stock_level) return { status: "overstock", color: "bg-blue-500", label: "OVERSTOCK" }
    return { status: "good", color: "bg-green-500", label: "IN STOCK" }
  }

  const stockStatus = getStockStatus()

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locateIntervalRef.current) {
        clearInterval(locateIntervalRef.current)
        locateIntervalRef.current = null
      }
    }
  }, [])

  // Handle stock adjustment
  const handleStockAdjust = async (delta: number) => {
    setIsAdjusting(true)
    try {
      const response = await fetch(`/api/pick2light/adjust-stock/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta })
      })

      if (response.ok) {
        const data = await response.json()
        onStockChange(product.id, data.product.stock_quantity)
        toast({
          title: "Stock Updated",
          description: `Stock ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to adjust stock"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while adjusting stock"
      })
    } finally {
      setIsAdjusting(false)
    }
  }

  // Handle LED locate toggle
  const handleLocate = async () => {
    if (product.led_segment_count === 0) {
      toast({
        variant: "destructive",
        title: "No LED Segments",
        description: "This product has no LED segments configured"
      })
      return
    }

    // If currently active, stop the loop
    if (isLocateActive) {
      setIsLocating(true)

      // Clear the interval
      if (locateIntervalRef.current) {
        clearInterval(locateIntervalRef.current)
        locateIntervalRef.current = null
      }

      try {
        // Call stop API to turn off LEDs
        const response = await fetch(`/api/pick2light/stop/${product.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        })

        if (response.ok) {
          setIsLocateActive(false)
          toast({
            title: "Location Stopped",
            description: "LED indicators turned off"
          })
        } else {
          const error = await response.json()
          toast({
            variant: "destructive",
            title: "Error",
            description: error.error || "Failed to stop LED location"
          })
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Network error while stopping LED"
        })
      } finally {
        setIsLocating(false)
      }
      return
    }

    // If not active, start the loop
    setIsLocating(true)

    const triggerLocate = async () => {
      try {
        const response = await fetch(`/api/pick2light/locate/${product.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "start" })
        })

        if (response.ok) {
          const data = await response.json()
          return data.animation_duration || 12000 // Default to 12 seconds
        }
      } catch (error) {
        console.error("Error triggering LED:", error)
      }
      return 12000 // Default fallback
    }

    try {
      // Trigger first locate and get animation duration
      const animationDuration = await triggerLocate()

      setIsLocateActive(true)
      toast({
        title: "Location Active",
        description: `LED indicators looping every ${animationDuration / 1000}s`
      })

      // Set up interval to repeat
      locateIntervalRef.current = setInterval(() => {
        triggerLocate()
      }, animationDuration)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Network error while triggering LED"
      })
    } finally {
      setIsLocating(false)
    }
  }

  // Handle manual LED sync
  const handleSyncLEDs = async () => {
    if (product.led_segment_count === 0) {
      toast({
        variant: "destructive",
        title: "No LED Segments",
        description: "This product has no LED segments configured"
      })
      return
    }

    setIsSyncing(true)
    try {
      const response = await fetch(`/api/pick2light/update-stock-leds/${product.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "LEDs Synchronized",
          description: `Updated ${data.segments?.length || 0} LED segments to match stock status`
        })
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: error.error || "Failed to synchronize LED colors"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Could not connect to LED controller"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Format last seen
  const formatLastSeen = (lastSeenStr: string | null) => {
    if (!lastSeenStr) return "Never"
    const lastSeen = new Date(lastSeenStr)
    const now = new Date()
    const diffMs = now.getTime() - lastSeen.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  // Get signal strength quality
  const getSignalQuality = (signalStrength: number | null) => {
    if (!signalStrength) return { label: "Unknown", color: "text-gray-400", bars: 0 }

    if (signalStrength >= -50) {
      return { label: "Excellent", color: "text-green-500", bars: 4 }
    } else if (signalStrength >= -60) {
      return { label: "Good", color: "text-green-500", bars: 3 }
    } else if (signalStrength >= -70) {
      return { label: "Fair", color: "text-yellow-500", bars: 2 }
    } else {
      return { label: "Weak", color: "text-orange-500", bars: 1 }
    }
  }

  // Signal bars component
  const SignalBars = ({ bars, color }: { bars: number; color: string }) => (
    <svg className={`h-4 w-4 ${color}`} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="18" width="3" height="6" opacity={bars >= 1 ? 1 : 0.3} />
      <rect x="7" y="14" width="3" height="10" opacity={bars >= 2 ? 1 : 0.3} />
      <rect x="12" y="10" width="3" height="14" opacity={bars >= 3 ? 1 : 0.3} />
      <rect x="17" y="6" width="3" height="18" opacity={bars >= 4 ? 1 : 0.3} />
    </svg>
  )

  return (
    <Card className="bg-[#2d3748] border-[#4a5568] overflow-hidden">
      {/* Product Image Section */}
      <div className="bg-[#4a5568] h-[180px] flex items-center justify-center relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-20 w-20 text-gray-600" />
        )}
        {/* LED Count Badge - Top Left */}
        <Badge
          variant="outline"
          className="absolute top-2 left-2 border-[#ffd60a] bg-black text-[#ffd60a] text-xs font-semibold px-2 py-1"
        >
          {product.led_segment_count}
        </Badge>
        {/* Category Badge - Top Right - Always Visible */}
        <Badge className="absolute top-2 right-2 bg-[#ffd60a] text-black text-sm font-bold px-3 py-1.5 shadow-lg">
          {product.category_name || "Uncategorized"}
        </Badge>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-3">
        {/* Part Number (Prominent Display) */}
        {product.part_number && (
          <div className="bg-[#ffd60a] text-black px-4 py-2 rounded-md -mt-2">
            <div className="font-bold text-xl">{product.part_number}</div>
          </div>
        )}

        {/* Product Barcode */}
        {product.barcode && (
          <div className="bg-[#ffd60a] text-black px-4 py-2 rounded-md">
            <div className="font-bold text-base">{product.barcode}</div>
          </div>
        )}

        {/* Product Description */}
        <h3 className="text-white font-normal text-sm leading-tight text-gray-300">
          {product.description || 'No description'}
        </h3>

        {/* Price and Stock Badge */}
        <div className="flex items-center justify-between">
          <div className="text-white text-3xl font-bold">
            ${product.price?.toFixed(2) || '0.00'}
          </div>
          <Badge className="bg-[#ffd60a] text-black text-sm font-semibold px-3 py-1">
            In Stock: {product.stock_quantity}
          </Badge>
        </div>

        {/* Stock Status and Min/Max Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs mb-1">Stock Status</div>
            <div className="flex items-center space-x-2">
              <div className="text-white font-semibold">{stockStatus.label.split(' ')[0]}</div>
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Min / Max</div>
            <div className="text-white font-semibold">
              {product.min_stock_level} / {product.max_stock_level}
            </div>
          </div>
        </div>

        {/* Device Information Panel */}
        {product.led_segments.length > 0 && (
          <div className={`bg-[#1a1a1a] rounded-md p-3 space-y-2 border-2 ${product.led_segments.some(s => s.status === 'online') ? 'border-green-500' : 'border-[#EF4444]'}`}>
            {product.led_segments.map((segment, idx) => (
              <div key={segment.id} className="space-y-1">
                {idx > 0 && <div className="border-t border-gray-700 my-2"></div>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {segment.status === 'online' ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-white font-medium text-sm">Device: {segment.device_name}</span>
                  </div>
                  <Badge className={`${segment.status === 'online' ? 'bg-green-500' : 'bg-[#EF4444]'} text-white text-xs font-semibold`}>
                    {segment.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                </div>
                {/* WiFi Signal Strength */}
                {segment.status === 'online' && segment.signal_strength && (
                  <div className="flex items-center gap-2 bg-gray-800/50 rounded px-2 py-1">
                    <SignalBars bars={getSignalQuality(segment.signal_strength).bars} color={getSignalQuality(segment.signal_strength).color} />
                    <span className={`text-xs font-medium ${getSignalQuality(segment.signal_strength).color}`}>
                      {getSignalQuality(segment.signal_strength).label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {segment.signal_strength} dBm
                    </span>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  IP: <span className="text-gray-300">{segment.ip_address}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Total LEDs: <span className="text-gray-300">{segment.total_leds}</span> |
                  Segment: <span className="text-gray-300">{segment.start_led}-{segment.start_led + segment.led_count - 1}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Last seen: <span className="text-gray-300">{formatLastSeen(segment.last_seen)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LED Preview - Live Animation */}
        {product.led_segments.length > 0 && (
          <div className="bg-[#1a1a1a] rounded-md p-3 border-2 border-[#FFD60A]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                LED Preview - Live Animation
              </span>
              {/* Show Locate Override badge when locate is active and override is enabled */}
              {isLocateActive && product.led_segments.some(s =>
                s.locate_override_enabled === 1 && s.locate_override_color
              ) && (
                <Badge className="bg-cyan-500 text-white text-xs px-2 py-0.5">
                  Locate Override: {product.led_segments[0].locate_override_behavior || 'flash'}
                </Badge>
              )}
              {/* Show Segment Override badge when locate is NOT active */}
              {!isLocateActive && product.led_segments.some(s => s.segment_behavior && s.segment_behavior !== 'none') && (
                <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">
                  Override: {product.led_segments[0].segment_behavior}
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              {product.led_segments.map((segment, segmentIdx) => {
                // Helper function to get LED color by index
                const getLEDColor = (index: number): string => {
                  const ledIndex = index - segment.start_led

                  // PRIORITY 1: Locate Override (when locate button is active)
                  if (isLocateActive &&
                      segment.locate_override_enabled === 1 &&
                      segment.locate_override_color) {
                    return segment.locate_override_color  // ALL LEDs use override color
                  }

                  // Location LEDs (0-3) - No stock-based changes
                  if (ledIndex >= 0 && ledIndex < 4) {
                    return segment.location_color
                  }

                  // Stock LEDs (4-7) - Dynamic based on stock level
                  if (ledIndex >= 4 && ledIndex < 8) {
                    // DYNAMIC: Override to ORANGE if stock is below minimum threshold (including zero)
                    if (product.stock_quantity < product.min_stock_level) {
                      return '#FF8C00' // Orange for low stock warning
                    }

                    // Otherwise use configured colors
                    const stockIndex = ledIndex - 4 // 0-3
                    if (segment.stock_mode === 'manual') {
                      const manualColors = [
                        segment.stock_color_1,
                        segment.stock_color_2,
                        segment.stock_color_3,
                        segment.stock_color_4
                      ]
                      return manualColors[stockIndex] || '#4CAF50'
                    }
                    return '#4CAF50' // Auto mode green
                  }

                  // Alert LEDs (8-11) - Dynamic based on stock level
                  if (ledIndex >= 8 && ledIndex < 12) {
                    // DYNAMIC: Override to RED if stock is zero
                    if (product.stock_quantity === 0) {
                      return '#EF4444' // Red for out of stock alert
                    }

                    // Otherwise use configured colors
                    const alertIndex = ledIndex - 8 // 0-3
                    if (segment.alert_mode === 'manual') {
                      const manualColors = [
                        segment.alert_color_1,
                        segment.alert_color_2,
                        segment.alert_color_3,
                        segment.alert_color_4
                      ]
                      return manualColors[alertIndex] || '#333333'
                    }
                    return '#333333' // Auto mode dark gray
                  }

                  return '#888888' // Default fallback
                }

                // Helper function to get LED label
                const getLEDLabel = (index: number): string => {
                  const ledIndex = index - segment.start_led
                  if (ledIndex >= 0 && ledIndex < 4) return 'Location'
                  if (ledIndex >= 4 && ledIndex < 8) return 'Stock'
                  if (ledIndex >= 8 && ledIndex < 12) return 'Alert'
                  return ''
                }

                // Helper function to get animation class
                const getLEDAnimationClass = (index: number): string => {
                  const ledIndex = index - segment.start_led

                  // PRIORITY 1: Locate Override (when locate button is active) - affects ALL LEDs
                  if (isLocateActive &&
                      segment.locate_override_enabled === 1 &&
                      segment.locate_override_color) {
                    const behavior = segment.locate_override_behavior || 'flash'
                    if (behavior === 'solid') return ''
                    if (behavior === 'flash') return 'led-flash'
                    if (behavior === 'chaser-loop') return 'led-chaser'
                    if (behavior === 'flash-solid') return 'led-flash-solid'
                    if (behavior === 'chaser-twice') return 'led-chaser-twice'
                    return ''
                  }

                  // Location LEDs (0-3) - Respond to Locate button (if no override active)
                  if (ledIndex >= 0 && ledIndex < 4) {
                    if (!isLocateActive) return 'led-off'
                    const behavior = segment.location_behavior || 'solid'
                    if (behavior === 'solid') return ''
                    if (behavior === 'flash') return 'led-flash'
                    if (behavior === 'chaser-loop') return 'led-chaser'
                    if (behavior === 'flash-solid') return 'led-flash-solid'
                    if (behavior === 'chaser-twice') return 'led-chaser-twice'
                  }

                  // For Stock and Alert LEDs, check segment override first
                  if (segment.segment_behavior && segment.segment_behavior !== 'none') {
                    if (segment.segment_behavior === 'solid') return ''
                    if (segment.segment_behavior === 'flash') return 'led-flash'
                    if (segment.segment_behavior === 'chaser-loop') return 'led-chaser'
                    if (segment.segment_behavior === 'flash-solid') return 'led-flash-solid'
                    if (segment.segment_behavior === 'off') return 'led-off'
                  }

                  // Stock LEDs (4-7)
                  if (ledIndex >= 4 && ledIndex < 8) {
                    const behavior = segment.stock_behavior || 'solid'
                    if (behavior === 'solid') return ''
                    if (behavior === 'flash') return 'led-flash'
                    if (behavior === 'chaser-loop') return 'led-chaser'
                    if (behavior === 'flash-solid') return 'led-flash-solid'
                  }

                  // Alert LEDs (8-11)
                  if (ledIndex >= 8 && ledIndex < 12) {
                    const behavior = segment.alert_behavior || 'solid'
                    if (behavior === 'solid') return ''
                    if (behavior === 'flash') return 'led-flash'
                    if (behavior === 'chaser-loop') return 'led-chaser'
                    if (behavior === 'flash-solid') return 'led-flash-solid'
                  }

                  return ''
                }

                // Helper function to get animation delay for chaser effects
                const getLEDAnimationDelay = (index: number): number => {
                  const ledIndex = index - segment.start_led

                  // Location LEDs (0-3)
                  if (ledIndex >= 0 && ledIndex < 4) {
                    return ledIndex * 0.5 // 0s, 0.5s, 1.0s, 1.5s
                  }

                  // Stock LEDs (4-7)
                  if (ledIndex >= 4 && ledIndex < 8) {
                    return (ledIndex - 4) * 0.5
                  }

                  // Alert LEDs (8-11)
                  if (ledIndex >= 8 && ledIndex < 12) {
                    return (ledIndex - 8) * 0.5
                  }

                  return 0
                }

                // Generate array of LED numbers for this segment
                const ledNumbers = Array.from(
                  { length: segment.led_count },
                  (_, i) => segment.start_led + i
                )

                // Get current animation descriptions
                const getAnimationStatus = () => {
                  // PRIORITY 1: Check Locate Override (when locate is active)
                  if (isLocateActive &&
                      segment.locate_override_enabled === 1 &&
                      segment.locate_override_color) {
                    return `Locate Override (${segment.locate_override_behavior || 'flash'}) - ALL LEDs`
                  }

                  // PRIORITY 2: Check Segment Behavior Override
                  if (segment.segment_behavior && segment.segment_behavior !== 'none') {
                    return `All LEDs → Overridden by ${segment.segment_behavior}`
                  }

                  // Normal animations
                  const parts: string[] = []

                  const locationBehavior = segment.location_behavior || 'solid'
                  parts.push(`Location (${isLocateActive ? locationBehavior : 'off'})`)

                  const stockBehavior = segment.stock_behavior || 'solid'
                  parts.push(`Stock (${stockBehavior})`)

                  const alertBehavior = segment.alert_behavior || 'solid'
                  parts.push(`Alert (${alertBehavior})`)

                  return `Current animations: ${parts.join(', ')}`
                }

                // Group LEDs by section
                const locationLEDs = ledNumbers.filter(num => (num - segment.start_led) >= 0 && (num - segment.start_led) < 4)
                const stockLEDs = ledNumbers.filter(num => (num - segment.start_led) >= 4 && (num - segment.start_led) < 8)
                const alertLEDs = ledNumbers.filter(num => (num - segment.start_led) >= 8 && (num - segment.start_led) < 12)

                const renderLEDSection = (leds: number[], sectionName: string) => (
                  <div className="flex gap-2 justify-center items-center">
                    <span className="text-xs text-gray-400 font-semibold mr-1">{sectionName}:</span>
                    {leds.map((ledNum) => {
                      const color = getLEDColor(ledNum)
                      const label = getLEDLabel(ledNum)
                      const animationClass = getLEDAnimationClass(ledNum)
                      const animationDelay = getLEDAnimationDelay(ledNum)

                      // Get animation duration from database (convert ms to seconds)
                      const animationDuration = segment.animation_duration
                        ? (segment.animation_duration / 1000)
                        : 2 // Default fallback to 2 seconds if not set

                      return (
                        <div key={ledNum} className="flex flex-col items-center gap-0.5">
                          <div
                            className={`
                              flex items-center justify-center
                              w-8 h-8 rounded-full border-2 border-gray-400
                              text-xs font-bold text-white
                              transition-all duration-300
                              ${animationClass}
                            `}
                            style={{
                              backgroundColor: color,
                              color: 'white',
                              animationDelay: `${animationDelay}s`,
                              animationDuration: `${animationDuration}s`
                            }}
                          >
                            {ledNum}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )

                return (
                  <div key={segment.id} className="space-y-2">
                    {segmentIdx > 0 && <div className="border-t border-gray-700 pt-2"></div>}

                    {/* LED Display - Organized by Section */}
                    <div className="space-y-1.5">
                      {locationLEDs.length > 0 && renderLEDSection(locationLEDs, 'Location')}
                      {stockLEDs.length > 0 && renderLEDSection(stockLEDs, 'Stock')}
                      {alertLEDs.length > 0 && renderLEDSection(alertLEDs, 'Alert')}
                    </div>

                    {/* Animation Status */}
                    <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-800">
                      {getAnimationStatus()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="lg"
            onClick={() => handleStockAdjust(-1)}
            disabled={isAdjusting || product.stock_quantity <= 0}
            className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-lg h-12 disabled:opacity-50 disabled:bg-[#EF4444]"
          >
            {isAdjusting ? <Loader2 className="h-5 w-5 animate-spin" /> : "−"}
          </Button>
          <Button
            size="lg"
            onClick={() => handleStockAdjust(1)}
            disabled={isAdjusting}
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg h-12 disabled:opacity-50 disabled:bg-[#10B981]"
          >
            {isAdjusting ? <Loader2 className="h-5 w-5 animate-spin" /> : "+"}
          </Button>
          <Button
            size="lg"
            onClick={handleLocate}
            disabled={isLocating || product.led_segment_count === 0}
            className={`flex-1 ${isLocateActive ? 'bg-[#9333EA] hover:bg-[#7E22CE]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'} text-white font-bold text-base h-12 disabled:opacity-50 flex items-center justify-center gap-2`}
            style={isLocateActive ? { backgroundColor: '#9333EA' } : {}}
          >
            {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {isLocateActive ? "Stop" : "Locate"}
              </>
            )}
          </Button>
        </div>

        {/* Sync LEDs Button - Full Width Below Actions */}
        <div className="pt-2">
          <Button
            size="lg"
            onClick={handleSyncLEDs}
            disabled={isSyncing || product.led_segment_count === 0}
            className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-base h-12 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Sync LEDs to Stock Status
              </>
            )}
          </Button>
        </div>

        {/* Added Date Badge */}
        <div className="pt-2">
          <Badge variant="outline" className="border-[#ffd60a] text-[#ffd60a] text-xs">
            Added on {formatDate(product.created_at).replace(',', '')}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
