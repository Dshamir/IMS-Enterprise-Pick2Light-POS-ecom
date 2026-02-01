"use client"

import { useState, useRef, useEffect } from "react"
import {
  Move,
  RotateCw,
  Save,
  RotateCcw,
  Grid3x3,
  FlipHorizontal,
  FlipVertical,
  MousePointer2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoveUpRight,
  MoveDownRight,
  MoveDownLeft,
  MoveUpLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface WarehouseZone {
  id: string
  zone_name: string
  zone_type: string
  aisles: number
  shelves_per_aisle: number
  bins_per_shelf: number
  position_x: number
  position_y: number
  position_z: number
  dimensions_width: number
  dimensions_height: number
  dimensions_depth: number
  color_code: string
  rotation_degrees: number
  is_active: boolean
  notes?: string
}

type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface InteractiveZoneCanvasProps {
  zones: WarehouseZone[]
  onZonesUpdate: (zones: WarehouseZone[]) => void
  view3D: boolean
}

export default function InteractiveZoneCanvas({ zones, onZonesUpdate, view3D }: InteractiveZoneCanvasProps) {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLDivElement>(null)

  // State management
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [draftZones, setDraftZones] = useState<Map<string, WarehouseZone>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)

  const scale = 2 // Scale factor for visualization

  // Get current zone (either draft or saved)
  const getCurrentZone = (zoneId: string): WarehouseZone => {
    return draftZones.get(zoneId) || zones.find(z => z.id === zoneId)!
  }

  // Update draft zone
  const updateDraftZone = (zoneId: string, updates: Partial<WarehouseZone>) => {
    const currentZone = getCurrentZone(zoneId)
    const newDraft = new Map(draftZones)
    newDraft.set(zoneId, { ...currentZone, ...updates })
    setDraftZones(newDraft)
  }

  // Quick action: Rotate 90 degrees clockwise
  const handleRotate90CW = () => {
    if (!selectedZoneId) return
    const zone = getCurrentZone(selectedZoneId)
    const newRotation = (zone.rotation_degrees + 90) % 360
    updateDraftZone(selectedZoneId, { rotation_degrees: newRotation })
    toast({
      title: "Rotated 90° Clockwise",
      description: `Zone rotation: ${newRotation}°`
    })
  }

  // Quick action: Rotate 90 degrees counter-clockwise
  const handleRotate90CCW = () => {
    if (!selectedZoneId) return
    const zone = getCurrentZone(selectedZoneId)
    const newRotation = (zone.rotation_degrees - 90 + 360) % 360
    updateDraftZone(selectedZoneId, { rotation_degrees: newRotation })
    toast({
      title: "Rotated 90° Counter-Clockwise",
      description: `Zone rotation: ${newRotation}°`
    })
  }

  // Quick action: Flip horizontal
  const handleFlipHorizontal = () => {
    if (!selectedZoneId) return
    const zone = getCurrentZone(selectedZoneId)
    const newRotation = (zone.rotation_degrees + 180) % 360
    updateDraftZone(selectedZoneId, { rotation_degrees: newRotation })
    toast({
      title: "Flipped Horizontally",
      description: "Zone mirrored on horizontal axis"
    })
  }

  // Quick action: Flip vertical
  const handleFlipVertical = () => {
    if (!selectedZoneId) return
    const zone = getCurrentZone(selectedZoneId)
    // Vertical flip: rotate 180° and adjust for proper mirroring
    const newRotation = (360 - zone.rotation_degrees) % 360
    updateDraftZone(selectedZoneId, { rotation_degrees: newRotation })
    toast({
      title: "Flipped Vertically",
      description: "Zone mirrored on vertical axis"
    })
  }

  // Handle mouse down on zone (for moving)
  const handleZoneMouseDown = (e: React.MouseEvent, zone: WarehouseZone) => {
    e.stopPropagation()
    setSelectedZoneId(zone.id)

    setDragStart({
      x: e.clientX,
      y: e.clientY
    })
    setIsDragging(true)
  }

  // Handle mouse down on resize handle
  const handleResizeHandleMouseDown = (e: React.MouseEvent, zone: WarehouseZone, handle: ResizeHandle) => {
    e.stopPropagation()
    setSelectedZoneId(zone.id)
    setResizeHandle(handle)
    setDragStart({
      x: e.clientX,
      y: e.clientY
    })
    setIsDragging(true)
  }

  // Handle mouse move for dragging/resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !selectedZoneId) return

      const currentZone = getCurrentZone(selectedZoneId)
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale

      if (resizeHandle) {
        // RESIZE MODE - Handle was clicked
        let updates: Partial<WarehouseZone> = {}

        // Handle different resize directions
        if (resizeHandle.includes('e')) {
          updates.dimensions_width = Math.max(5, currentZone.dimensions_width + dx)
        }
        if (resizeHandle.includes('w')) {
          const newWidth = Math.max(5, currentZone.dimensions_width - dx)
          const widthDiff = currentZone.dimensions_width - newWidth
          updates.dimensions_width = newWidth
          updates.position_x = currentZone.position_x + widthDiff
        }
        if (resizeHandle.includes('s')) {
          updates.dimensions_depth = Math.max(5, currentZone.dimensions_depth + dy)
        }
        if (resizeHandle.includes('n')) {
          const newDepth = Math.max(5, currentZone.dimensions_depth - dy)
          const depthDiff = currentZone.dimensions_depth - newDepth
          updates.dimensions_depth = newDepth
          updates.position_z = currentZone.position_z + depthDiff
        }

        updateDraftZone(selectedZoneId, updates)
        setDragStart({ x: e.clientX, y: e.clientY })
      } else {
        // MOVE MODE - Zone body was clicked
        updateDraftZone(selectedZoneId, {
          position_x: currentZone.position_x + dx,
          position_z: currentZone.position_z + dy
        })
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setResizeHandle(null)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, selectedZoneId, dragStart, resizeHandle, scale])

  // Save all changes
  const handleSaveChanges = async () => {
    if (draftZones.size === 0) {
      toast({
        title: "No Changes",
        description: "No zones have been modified"
      })
      return
    }

    try {
      // Update each modified zone
      for (const [zoneId, zone] of draftZones) {
        const response = await fetch(`/api/command-center/warehouse-zones/${zoneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zone)
        })

        if (!response.ok) {
          throw new Error(`Failed to update zone ${zone.zone_name}`)
        }
      }

      toast({
        title: "Success",
        description: `${draftZones.size} zone(s) updated successfully`
      })

      // Apply changes to parent
      const updatedZones = zones.map(zone =>
        draftZones.has(zone.id) ? draftZones.get(zone.id)! : zone
      )
      onZonesUpdate(updatedZones)

      // Clear drafts
      setDraftZones(new Map())
      setSelectedZoneId(null)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes"
      })
    }
  }

  // Reset changes
  const handleResetChanges = () => {
    setDraftZones(new Map())
    setSelectedZoneId(null)
    toast({
      title: "Changes Reset",
      description: "All unsaved changes have been discarded"
    })
  }

  // Get arrow icon for resize handle
  const getArrowIcon = (handle: ResizeHandle) => {
    const icons = {
      'n': ChevronUp,
      'ne': MoveUpRight,
      'e': ChevronRight,
      'se': MoveDownRight,
      's': ChevronDown,
      'sw': MoveDownLeft,
      'w': ChevronLeft,
      'nw': MoveUpLeft
    }
    return icons[handle]
  }

  // Render always-visible resize handles with arrow icons
  const renderResizeHandles = (zone: WarehouseZone) => {
    // Only show handles for selected zone
    if (selectedZoneId !== zone.id) return null

    const handles: ResizeHandle[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']

    return handles.map(handle => {
      const ArrowIcon = getArrowIcon(handle)

      let style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 1000
      }

      // Position handle slightly outside the zone
      if (handle.includes('n')) style.top = '-12px'
      if (handle.includes('s')) style.bottom = '-12px'
      if (handle.includes('e')) style.right = '-12px'
      if (handle.includes('w')) style.left = '-12px'
      if (handle === 'n' || handle === 's') style.left = `calc(50% - 12px)`
      if (handle === 'e' || handle === 'w') style.top = `calc(50% - 12px)`

      return (
        <div
          key={handle}
          style={style}
          className="flex items-center justify-center w-6 h-6 bg-gray-800 text-white border-2 border-green-500 rounded cursor-pointer hover:bg-gray-700 hover:scale-110 transition-all"
          onMouseDown={(e) => handleResizeHandleMouseDown(e, zone, handle)}
          title={`Resize ${handle.toUpperCase()}`}
        >
          <ArrowIcon className="h-4 w-4" />
        </div>
      )
    })
  }

  const hasChanges = draftZones.size > 0

  return (
    <div className="space-y-4">
      {/* Fixed Toolbar with All Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg gap-4">
        {/* GROUP 1: Tools (Left) */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-700"
            title="Arrow Pointer - Select, Move & Resize"
          >
            <MousePointer2 className="h-4 w-4 mr-2" />
            Select
          </Button>
          <Button
            variant={showGrid ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="text-white hover:bg-gray-700"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>

        {/* GROUP 2 & 3: Selection Info + Transformation Buttons (Center) */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          {selectedZoneId ? (
            <>
              {/* Selected Zone Info */}
              <div className="text-white text-sm bg-gray-700 px-3 py-1.5 rounded font-medium">
                Selected: {getCurrentZone(selectedZoneId).zone_name}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-600" />

              {/* Transformation Buttons */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRotate90CCW}
                  title="Rotate -90° (Counter-Clockwise)"
                  className="bg-gray-700 hover:bg-gray-600 text-white h-8"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  -90°
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRotate90CW}
                  title="Rotate +90° (Clockwise)"
                  className="bg-gray-700 hover:bg-gray-600 text-white h-8"
                >
                  <RotateCw className="h-4 w-4 mr-1" />
                  +90°
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleFlipHorizontal}
                  title="Flip Horizontal"
                  className="bg-gray-700 hover:bg-gray-600 text-white h-8 w-8 p-0"
                >
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleFlipVertical}
                  title="Flip Vertical"
                  className="bg-gray-700 hover:bg-gray-600 text-white h-8 w-8 p-0"
                >
                  <FlipVertical className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-white/50 text-sm italic">
              Click any zone to select • Drag zone to move • Drag arrow handles to resize
            </div>
          )}
        </div>

        {/* GROUP 4: Save Actions (Right) */}
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
                {draftZones.size} unsaved
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetChanges}
                className="text-white hover:bg-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveChanges}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative bg-gray-900 rounded-xl p-8 min-h-[600px] overflow-auto cursor-default"
        onClick={() => setSelectedZoneId(null)}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: `${10 * scale}px ${10 * scale}px`
            }}
          />
        )}

        {/* Zones */}
        <div className={`relative ${view3D ? 'transform-gpu' : ''}`} style={{
          transformStyle: view3D ? 'preserve-3d' : 'flat',
          perspective: view3D ? '1000px' : 'none'
        }}>
          {zones.map((zone) => {
            const currentZone = getCurrentZone(zone.id)
            const isSelected = selectedZoneId === zone.id
            const hasUnsavedChanges = draftZones.has(zone.id)

            const left = currentZone.position_x * scale
            const top = currentZone.position_z * scale
            const width = currentZone.dimensions_width * scale
            const depth = currentZone.dimensions_depth * scale
            const rotation = currentZone.rotation_degrees || 0

            return (
              <div
                key={zone.id}
                className={`absolute transition-all duration-100 cursor-move ${
                  isSelected ? 'z-50' : 'z-10'
                }`}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${depth}px`,
                  backgroundColor: currentZone.color_code + '40',
                  border: isSelected
                    ? `4px solid #06b6d4`
                    : hasUnsavedChanges
                    ? `4px dashed #fbbf24`
                    : `4px solid ${currentZone.color_code}`,
                  borderRadius: '8px',
                  transform: view3D
                    ? `rotateX(60deg) rotateZ(-45deg) rotate(${rotation}deg)`
                    : `rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  boxShadow: isSelected ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none'
                }}
                onMouseDown={(e) => handleZoneMouseDown(e, zone)}
              >
                <div className="p-3 text-white text-xs font-semibold relative h-full pointer-events-none">
                  <div className="truncate">{currentZone.zone_name}</div>
                  <div className="text-white/70 text-[10px] mt-1">
                    {currentZone.zone_type.toUpperCase()}
                  </div>
                  {isSelected && (
                    <div className="text-white/90 text-[10px] mt-2 font-mono">
                      X: {Math.round(currentZone.position_x)} | Z: {Math.round(currentZone.position_z)}
                      <br />
                      W: {Math.round(currentZone.dimensions_width)} | D: {Math.round(currentZone.dimensions_depth)}
                      {rotation !== 0 && (
                        <>
                          <br />
                          Rotation: {rotation}°
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Rotation Label */}
                {isSelected && rotation !== 0 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none border border-cyan-500/50">
                    Rotated {rotation}°
                  </div>
                )}

                {/* Always-Visible Resize Handles */}
                {renderResizeHandles(zone)}
              </div>
            )
          })}
        </div>

        {/* Instructions */}
        {zones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
            No zones to display. Create a zone to get started.
          </div>
        )}
      </div>
    </div>
  )
}
