"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Settings, Lightbulb, Activity, AlertTriangle, Palette, Zap } from 'lucide-react'

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

  // Stock colors (for manual mode)
  stock_color_1?: string
  stock_color_2?: string
  stock_color_3?: string
  stock_color_4?: string

  // Alert colors (for manual mode)
  alert_color_1?: string
  alert_color_2?: string
  alert_color_3?: string
  alert_color_4?: string

  // Animation control parameters
  animation_speed?: number        // 0-255, controls WLED sx parameter
  animation_intensity?: number    // 0-255, controls WLED ix parameter
  animation_duration?: number     // milliseconds, for CSS preview animations

  // Locate override parameters
  locate_override_enabled?: number    // 0 = disabled, 1 = enabled
  locate_override_color?: string | null  // Override color for locate mode
  locate_override_behavior?: string   // Override behavior for locate mode
}

interface LEDConfigModalProps {
  segment: LEDSegment
  onSave: (updatedSegment: LEDSegment) => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const BEHAVIOR_OPTIONS = [
  { value: 'solid', label: 'Solid', description: 'Constant color' },
  { value: 'flash', label: 'Flash', description: 'Blinking on/off' },
  { value: 'flash-solid', label: 'Flash-Solid', description: 'Flash then stay on' },
  { value: 'chaser-loop', label: 'Chaser Loop', description: 'Moving light pattern' },
  { value: 'chaser-twice', label: 'Chaser Twice', description: 'Two passes then stop' },
  { value: 'off', label: 'Off', description: 'LEDs disabled' },
]

const SEGMENT_BEHAVIOR_OPTIONS = [
  { value: 'none', label: 'None', description: 'No override - use section behaviors' },
  { value: 'solid', label: 'Solid', description: 'Override all sections with solid' },
  { value: 'flash', label: 'Flash', description: 'Override all sections with flash' },
  { value: 'flash-solid', label: 'Flash-Solid', description: 'Override all sections with flash-solid' },
  { value: 'chaser-loop', label: 'Chaser Loop', description: 'Override all sections with chaser' },
  { value: 'chaser-twice', label: 'Chaser Twice', description: 'Override all sections with double chaser' },
]

export function LEDConfigModal({
  segment,
  onSave,
  trigger,
  open,
  onOpenChange
}: LEDConfigModalProps) {
  const [localSegment, setLocalSegment] = useState<LEDSegment>(segment)
  const [isOpen, setIsOpen] = useState(open || false)

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  useEffect(() => {
    setLocalSegment(segment)
  }, [segment])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const handleSave = () => {
    onSave(localSegment)
    handleOpenChange(false)
  }

  const handleFieldChange = (field: keyof LEDSegment, value: any) => {
    setLocalSegment(prev => {
      const updates: Partial<LEDSegment> = { [field]: value }

      // Mutual exclusivity: Locate Override vs Segment Behavior Override
      if (field === 'locate_override_enabled' && value === 1) {
        // Enabling locate override → disable segment override
        updates.segment_behavior = 'none'
      }
      if (field === 'segment_behavior' && value !== 'none') {
        // Enabling segment override → disable locate override
        updates.locate_override_enabled = 0
      }

      return { ...prev, ...updates }
    })
  }

  const ColorPicker = ({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) => (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded border cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => document.getElementById(`color-input-${label}`)?.click()}
      />
      <Input
        id={`color-input-${label}`}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono text-sm"
        placeholder="#FFFFFF"
      />
    </div>
  )

  const BehaviorSelector = ({ value, onChange, options = BEHAVIOR_OPTIONS }: {
    value: string
    onChange: (value: string) => void
    options?: typeof BEHAVIOR_OPTIONS
  }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div>
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const LEDPreview = () => {
    const getAnimationClass = (behavior: string) => {
      switch (behavior) {
        case 'flash':
          return 'led-flash'
        case 'flash-solid':
          return 'led-flash-solid'
        case 'chaser-loop':
          return 'led-chaser'
        case 'chaser-twice':
          return 'led-chaser-twice'
        case 'off':
          return 'led-off'
        default:
          return ''
      }
    }

    const leds = Array.from({ length: Math.min(localSegment.led_count, 12) }, (_, i) => {
      let color = '#333333'
      let section = ''
      let behavior = 'solid'
      let animationDelay = 0

      // Determine section and properties
      if (i < 4) {
        color = localSegment.location_color
        section = 'Location'
        behavior = localSegment.location_behavior
      } else if (i < 8) {
        // Show appropriate stock color based on LED position
        const stockColorIndex = i - 3 // LED 4 = stock_color_1, LED 5 = stock_color_2, etc.
        color = localSegment[`stock_color_${stockColorIndex}` as keyof LEDSegment] as string || '#4CAF50'
        section = 'Stock'
        behavior = localSegment.stock_behavior
      } else {
        // Show appropriate alert color based on LED position
        const alertColorIndex = i - 7 // LED 8 = alert_color_1, LED 9 = alert_color_2, etc.
        color = localSegment[`alert_color_${alertColorIndex}` as keyof LEDSegment] as string || '#333333'
        section = 'Alert'
        behavior = localSegment.alert_behavior
      }

      // PRIORITY 1: Override with Locate Override if enabled (affects ALL LEDs)
      if (localSegment.locate_override_enabled === 1 && localSegment.locate_override_color) {
        color = localSegment.locate_override_color
        behavior = localSegment.locate_override_behavior || 'flash'
      }
      // PRIORITY 2: Override with segment behavior if set (affects ALL LEDs)
      else if (localSegment.segment_behavior !== 'none') {
        behavior = localSegment.segment_behavior
      }

      // Handle off state
      if (behavior === 'off') {
        color = '#333333'
      }

      // Calculate animation delay for chaser effects
      if (behavior.includes('chaser')) {
        animationDelay = i * 100 // 100ms delay between each LED
      }

      const animationClass = getAnimationClass(behavior)

      // Calculate dynamic animation duration based on user settings
      const animationDuration = localSegment.animation_duration || 3000
      const speed = localSegment.animation_speed || 128
      // Scale duration inversely with speed: higher speed = shorter duration
      const scaledDuration = animationDuration * (128 / Math.max(speed, 1))

      return (
        <div key={i} className="text-center">
          <div
            className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-mono font-bold text-white shadow-sm transition-all duration-200 ${animationClass}`}
            style={{
              backgroundColor: color,
              animationDelay: behavior.includes('chaser') ? `${animationDelay}ms` : undefined,
              animationDuration: behavior !== 'solid' && behavior !== 'off' ? `${scaledDuration}ms` : undefined
            }}
          >
            {localSegment.start_led + i}
          </div>
          <div className="text-xs mt-1 text-gray-500">{section}</div>
        </div>
      )
    })

    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          LED Preview - Live Animation
          {localSegment.locate_override_enabled === 1 && localSegment.locate_override_color && (
            <Badge variant="outline" className="text-xs bg-cyan-100 text-cyan-700 border-cyan-300">
              Locate Override: {localSegment.locate_override_behavior || 'flash'}
            </Badge>
          )}
          {localSegment.locate_override_enabled !== 1 && localSegment.segment_behavior !== 'none' && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
              Segment Override: {localSegment.segment_behavior}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {leds}
          {localSegment.led_count > 12 && (
            <div className="flex items-center justify-center text-gray-500">
              <span className="text-sm">+{localSegment.led_count - 12} more...</span>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-gray-600 text-center">
          {localSegment.locate_override_enabled === 1 && localSegment.locate_override_color ? (
            <span className="text-cyan-700 font-medium">
              Preview: Locate Override ({localSegment.locate_override_behavior || 'flash'}) -
              ALL LEDs show {localSegment.locate_override_color}
            </span>
          ) : localSegment.segment_behavior !== 'none' ? (
            <span className="text-amber-700 font-medium">
              Current animations: ALL sections → {localSegment.segment_behavior}
            </span>
          ) : (
            <span>
              Current animations: Location ({localSegment.location_behavior}),
              Stock ({localSegment.stock_behavior}),
              Alert ({localSegment.alert_behavior})
            </span>
          )}
        </div>
      </div>
    )
  }

  const modalContent = (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Advanced LED Configuration
        </DialogTitle>
        <DialogDescription>
          Configure detailed LED behaviors, colors, and automation for this segment.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* LED Preview */}
        <LEDPreview />

        <Tabs defaultValue="location" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="location" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Location
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="alert" className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Alert
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Identification (LEDs 0-3)</CardTitle>
                <CardDescription>
                  Configure the visual identification color and animation for this item's location.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location Color</Label>
                    <ColorPicker
                      value={localSegment.location_color}
                      onChange={(color) => handleFieldChange('location_color', color)}
                      label="location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Animation Behavior</Label>
                    <BehaviorSelector
                      value={localSegment.location_behavior}
                      onChange={(behavior) => handleFieldChange('location_behavior', behavior)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Status Indication (LEDs 4-7)</CardTitle>
                <CardDescription>
                  Configure how stock levels are displayed. Auto mode uses inventory levels, manual mode uses custom colors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={localSegment.stock_mode === 'manual'}
                    onCheckedChange={(checked) =>
                      handleFieldChange('stock_mode', checked ? 'manual' : 'auto')
                    }
                  />
                  <Label>Manual Color Control</Label>
                  <Badge variant={localSegment.stock_mode === 'auto' ? 'default' : 'secondary'}>
                    {localSegment.stock_mode === 'auto' ? 'Automatic' : 'Manual'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>Animation Behavior</Label>
                  <BehaviorSelector
                    value={localSegment.stock_behavior}
                    onChange={(behavior) => handleFieldChange('stock_behavior', behavior)}
                  />
                </div>

                {localSegment.stock_mode === 'manual' && (
                  <div className="space-y-4 border-l-4 border-blue-500 pl-4">
                    <Label className="text-sm font-medium">Manual Stock Colors (LEDs 4-7)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="space-y-2">
                          <Label>LED {3 + num} Color</Label>
                          <ColorPicker
                            value={localSegment[`stock_color_${num}` as keyof LEDSegment] as string || '#4CAF50'}
                            onChange={(color) => handleFieldChange(`stock_color_${num}`, color)}
                            label={`stock-${num}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alert Tab */}
          <TabsContent value="alert" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alert Indication (LEDs 8-11)</CardTitle>
                <CardDescription>
                  Configure alert colors for reorder points and critical stock levels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={localSegment.alert_mode === 'manual'}
                    onCheckedChange={(checked) =>
                      handleFieldChange('alert_mode', checked ? 'manual' : 'auto')
                    }
                  />
                  <Label>Manual Color Control</Label>
                  <Badge variant={localSegment.alert_mode === 'auto' ? 'default' : 'secondary'}>
                    {localSegment.alert_mode === 'auto' ? 'Automatic' : 'Manual'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label>Animation Behavior</Label>
                  <BehaviorSelector
                    value={localSegment.alert_behavior}
                    onChange={(behavior) => handleFieldChange('alert_behavior', behavior)}
                  />
                </div>

                {localSegment.alert_mode === 'manual' && (
                  <div className="space-y-4 border-l-4 border-red-500 pl-4">
                    <Label className="text-sm font-medium">Manual Alert Colors (LEDs 8-11)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((num) => (
                        <div key={num} className="space-y-2">
                          <Label>LED {7 + num} Color</Label>
                          <ColorPicker
                            value={localSegment[`alert_color_${num}` as keyof LEDSegment] as string || '#333333'}
                            onChange={(color) => handleFieldChange(`alert_color_${num}`, color)}
                            label={`alert-${num}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Segment-wide Settings</CardTitle>
                <CardDescription>
                  Override all section behaviors with a single animation pattern.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Segment Behavior Override</Label>
                  <BehaviorSelector
                    value={localSegment.segment_behavior}
                    onChange={(behavior) => handleFieldChange('segment_behavior', behavior)}
                    options={SEGMENT_BEHAVIOR_OPTIONS}
                  />
                  {localSegment.segment_behavior !== 'none' && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                      <strong>Override Active:</strong> This will override all individual section behaviors with "{localSegment.segment_behavior}".
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">Current Configuration Summary</Label>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>Start LED: <span className="font-mono">{localSegment.start_led}</span></div>
                    <div>LED Count: <span className="font-mono">{localSegment.led_count}</span></div>
                    <div>End LED: <span className="font-mono">{localSegment.start_led + localSegment.led_count - 1}</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locate Override Settings Card */}
            <Card className="border-cyan-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-cyan-500" />
                  Locate Override Color
                </CardTitle>
                <CardDescription>
                  When enabled, pressing Locate will light up ALL LEDs (Location, Stock, Alert) with this color instead of just the Location section.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={localSegment.locate_override_enabled === 1}
                    onCheckedChange={(checked) =>
                      handleFieldChange('locate_override_enabled', checked ? 1 : 0)
                    }
                  />
                  <Label>Enable Locate Override</Label>
                  <Badge variant={localSegment.locate_override_enabled === 1 ? 'default' : 'secondary'}>
                    {localSegment.locate_override_enabled === 1 ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                {localSegment.locate_override_enabled === 1 && (
                  <div className="space-y-4 border-l-4 border-cyan-500 pl-4">
                    {/* Override Color Picker */}
                    <div className="space-y-2">
                      <Label>Override Color</Label>
                      <ColorPicker
                        value={localSegment.locate_override_color || '#00FFFF'}
                        onChange={(color) => handleFieldChange('locate_override_color', color)}
                        label="locate-override"
                      />
                      <div className="text-xs text-gray-600 bg-cyan-50 p-2 rounded">
                        Choose a high-visibility color (e.g., bright cyan, magenta) to make products stand out clearly during locate operations.
                      </div>
                    </div>

                    {/* Override Behavior Selector */}
                    <div className="space-y-2">
                      <Label>Override Animation Behavior</Label>
                      <BehaviorSelector
                        value={localSegment.locate_override_behavior || 'flash'}
                        onChange={(behavior) => handleFieldChange('locate_override_behavior', behavior)}
                      />
                    </div>

                    {/* Info Box */}
                    <div className="text-sm text-cyan-700 bg-cyan-50 p-3 rounded-md">
                      <strong>How it works:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Locate button pressed:</strong> ALL 12 LEDs light up with override color</li>
                        <li><strong>Stop button pressed:</strong> Location LEDs turn OFF, Stock & Alert restore to their dynamic state</li>
                      </ul>
                    </div>
                  </div>
                )}

                {localSegment.locate_override_enabled === 0 && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    When disabled, the Locate button will only light up the Location section (LEDs 0-3) using the Location Color.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Animation Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Animation Settings
                </CardTitle>
                <CardDescription>
                  Control the speed, intensity, and duration of flash and chase animations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Speed Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Animation Speed</Label>
                    <Badge variant="outline" className="font-mono">
                      {localSegment.animation_speed || 128}
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={localSegment.animation_speed || 128}
                    onChange={(e) => handleFieldChange('animation_speed', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 (Slowest)</span>
                    <span>128 (Normal)</span>
                    <span>255 (Fastest)</span>
                  </div>
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                    Controls the speed of flash and chase animations. Higher values = faster animations.
                  </div>
                </div>

                {/* Intensity Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brightness Intensity</Label>
                    <Badge variant="outline" className="font-mono">
                      {localSegment.animation_intensity || 128}
                    </Badge>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={localSegment.animation_intensity || 128}
                    onChange={(e) => handleFieldChange('animation_intensity', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 (Dimmest)</span>
                    <span>128 (Normal)</span>
                    <span>255 (Brightest)</span>
                  </div>
                  <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                    Controls the brightness intensity of LEDs. Higher values = brighter light.
                  </div>
                </div>

                {/* Duration Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Preview Animation Duration (ms)</Label>
                    <Badge variant="outline" className="font-mono">
                      {localSegment.animation_duration || 3000}ms
                    </Badge>
                  </div>
                  <Input
                    type="number"
                    min="500"
                    max="10000"
                    step="100"
                    value={localSegment.animation_duration || 3000}
                    onChange={(e) => handleFieldChange('animation_duration', parseInt(e.target.value) || 3000)}
                    className="font-mono"
                  />
                  <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded">
                    Controls the duration for CSS preview animations (for visual feedback only, not sent to WLED).
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-medium">Speed Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFieldChange('animation_speed', 64)
                        handleFieldChange('animation_duration', 5000)
                      }}
                      className="text-xs"
                    >
                      Slow
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFieldChange('animation_speed', 128)
                        handleFieldChange('animation_duration', 3000)
                      }}
                      className="text-xs"
                    >
                      Normal
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFieldChange('animation_speed', 192)
                        handleFieldChange('animation_duration', 1500)
                      }}
                      className="text-xs"
                    >
                      Fast
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleFieldChange('animation_speed', 255)
                        handleFieldChange('animation_duration', 800)
                      }}
                      className="text-xs"
                    >
                      Very Fast
                    </Button>
                  </div>
                </div>

                {/* Current Values Summary */}
                <div className="pt-4 border-t bg-gray-50 p-3 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Current Animation Parameters</Label>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>WLED Speed (sx):</span>
                      <span className="font-mono font-bold">{localSegment.animation_speed || 128}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>WLED Intensity (ix):</span>
                      <span className="font-mono font-bold">{localSegment.animation_intensity || 128}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preview Duration:</span>
                      <span className="font-mono font-bold">{localSegment.animation_duration || 3000}ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </DialogFooter>
    </DialogContent>
  )

  if (trigger) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {modalContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {modalContent}
    </Dialog>
  )
}