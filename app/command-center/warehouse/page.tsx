"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Box, RefreshCw, Settings, Maximize2, Eye, EyeOff, Plus, Edit, Trash2, Edit3 } from "lucide-react"
import InteractiveZoneCanvas from "@/components/warehouse/interactive-zone-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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

export default function WarehousePage() {
  const { toast } = useToast()
  const [zones, setZones] = useState<WarehouseZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view3D, setView3D] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<WarehouseZone | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    zone_name: '',
    zone_type: 'storage',
    aisles: 1,
    shelves_per_aisle: 1,
    bins_per_shelf: 1,
    position_x: 0,
    position_y: 0,
    position_z: 0,
    dimensions_width: 10,
    dimensions_height: 10,
    dimensions_depth: 10,
    color_code: '#3B82F6',
    rotation_degrees: 0,
    is_active: true,
    notes: ''
  })

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    try {
      const response = await fetch('/api/command-center/warehouse-zones')
      if (response.ok) {
        const data = await response.json()
        setZones(data)
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to load warehouse zones"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingZone(null)
    setFormData({
      zone_name: '',
      zone_type: 'storage',
      aisles: 1,
      shelves_per_aisle: 1,
      bins_per_shelf: 1,
      position_x: 0,
      position_y: 0,
      position_z: 0,
      dimensions_width: 10,
      dimensions_height: 10,
      dimensions_depth: 10,
      color_code: '#3B82F6',
      rotation_degrees: 0,
      is_active: true,
      notes: ''
    })
    setShowDialog(true)
  }

  const openEditDialog = (zone: WarehouseZone) => {
    setEditingZone(zone)
    setFormData({
      zone_name: zone.zone_name,
      zone_type: zone.zone_type,
      aisles: zone.aisles,
      shelves_per_aisle: zone.shelves_per_aisle,
      bins_per_shelf: zone.bins_per_shelf,
      position_x: zone.position_x,
      position_y: zone.position_y,
      position_z: zone.position_z,
      dimensions_width: zone.dimensions_width,
      dimensions_height: zone.dimensions_height,
      dimensions_depth: zone.dimensions_depth,
      color_code: zone.color_code,
      rotation_degrees: zone.rotation_degrees || 0,
      is_active: zone.is_active,
      notes: zone.notes || ''
    })
    setShowDialog(true)
  }

  const saveZone = async () => {
    try {
      const url = editingZone
        ? `/api/command-center/warehouse-zones/${editingZone.id}`
        : '/api/command-center/warehouse-zones'

      console.log('Saving zone to:', url, 'with data:', formData)

      const response = await fetch(url, {
        method: editingZone ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      console.log('Save response:', result)

      if (response.ok) {
        toast({
          type: "success",
          title: editingZone ? "Zone Updated" : "Zone Created",
          description: "Warehouse zone saved successfully"
        })
        setShowDialog(false)
        loadZones()
      } else {
        toast({
          type: "error",
          title: "Error",
          description: result.error || "Failed to save zone"
        })
      }
    } catch (error) {
      console.error('Save zone error:', error)
      toast({
        type: "error",
        title: "Error",
        description: "Failed to save zone: " + (error instanceof Error ? error.message : String(error))
      })
    }
  }

  const deleteZone = async (zoneId: string, zoneName: string) => {
    if (!confirm(`Are you sure you want to delete zone "${zoneName}"?`)) return

    try {
      const response = await fetch(`/api/command-center/warehouse-zones/${zoneId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          type: "success",
          title: "Zone Deleted",
          description: "Warehouse zone removed successfully"
        })
        loadZones()
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Error",
        description: "Failed to delete zone"
      })
    }
  }

  const getZoneTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      receiving: '#10B981',
      storage: '#3B82F6',
      picking: '#F59E0B',
      packing: '#EC4899',
      shipping: '#8B5CF6',
      quality: '#EAB308',
      returns: '#EF4444'
    }
    return colors[type] || '#6B7280'
  }

  const calculateCapacity = (zone: WarehouseZone) => {
    return zone.aisles * zone.shelves_per_aisle * zone.bins_per_shelf
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="command-center-gradient text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
                <Link href="/command-center">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                  <Box className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">3D Warehouse View</h1>
                  <p className="text-white/90 text-sm">Interactive warehouse visualization</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={openCreateDialog}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`${
                  isEditMode
                    ? 'bg-cyan-500/30 border-cyan-400'
                    : 'bg-white/20 border-white/30'
                } backdrop-blur-md hover:bg-white/30`}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditMode ? 'Exit Edit Mode' : 'Edit Zones'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setView3D(!view3D)}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                {view3D ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {view3D ? '2D View' : '3D View'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadZones}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 3D Warehouse Visualization */}
        <Card className="command-center-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5 text-purple-600" />
              Warehouse Layout
            </CardTitle>
            <CardDescription>
              {zones.length} Active Zones • {view3D ? '3D' : '2D'} View {isEditMode && '• Edit Mode Active'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <InteractiveZoneCanvas
                zones={zones}
                onZonesUpdate={setZones}
                view3D={view3D}
              />
            ) : (
              <div className="relative bg-gray-900 rounded-xl p-8 min-h-[500px] overflow-auto">
                {/* 3D Warehouse Grid */}
                <div className={`relative ${view3D ? 'transform-gpu' : ''}`} style={{
                  transformStyle: view3D ? 'preserve-3d' : 'flat',
                  perspective: view3D ? '1000px' : 'none'
                }}>
                  {zones.map((zone, index) => {
                    const scale = 2 // Scale factor for visualization
                    const left = zone.position_x * scale
                    const top = zone.position_z * scale
                    const width = zone.dimensions_width * scale
                    const depth = zone.dimensions_depth * scale
                    const rotation = zone.rotation_degrees || 0

                    return (
                      <div
                        key={zone.id}
                        className="absolute transition-all duration-300 hover:scale-105 hover:z-10 cursor-pointer"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${depth}px`,
                          backgroundColor: zone.color_code + '40',
                          borderLeft: `4px solid ${zone.color_code}`,
                          borderTop: `4px solid ${zone.color_code}`,
                          borderRadius: '8px',
                          transform: view3D ? `rotateX(60deg) rotateZ(-45deg) rotate(${rotation}deg)` : `rotate(${rotation}deg)`,
                          transformOrigin: 'center'
                        }}
                      >
                        <div className="p-3 text-white text-xs font-semibold">
                          <div className="truncate">{zone.zone_name}</div>
                          <div className="text-white/70 text-[10px] mt-1">
                            {zone.zone_type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Zone Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map((zone) => (
            <Card key={zone.id} className="command-center-card hover:scale-105 transition-transform">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: zone.color_code }}
                    />
                    <CardTitle className="text-lg">{zone.zone_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="command-center-badge-outline">
                      {zone.zone_type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(zone)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteZone(zone.id, zone.zone_name)}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Position: ({zone.position_x}, {zone.position_y}, {zone.position_z})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Aisles</p>
                    <p className="font-semibold">{zone.aisles}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Shelves/Aisle</p>
                    <p className="font-semibold">{zone.shelves_per_aisle}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Bins/Shelf</p>
                    <p className="font-semibold">{zone.bins_per_shelf}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Capacity</p>
                    <p className="font-semibold text-purple-600">
                      {calculateCapacity(zone).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">Dimensions (W×H×D)</p>
                  <p className="text-sm font-mono">
                    {zone.dimensions_width} × {zone.dimensions_height} × {zone.dimensions_depth}m
                  </p>
                </div>
                {zone.rotation_degrees !== 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Rotation</p>
                    <p className="text-sm font-semibold text-purple-600">{zone.rotation_degrees}°</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Zone Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit' : 'Create'} Warehouse Zone</DialogTitle>
            <DialogDescription>
              Configure the warehouse zone layout and capacity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zone_name">Zone Name *</Label>
                <Input
                  id="zone_name"
                  value={formData.zone_name}
                  onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                  placeholder="e.g., Zone A - Receiving"
                />
              </div>

              <div>
                <Label htmlFor="zone_type">Zone Type *</Label>
                <Select
                  value={formData.zone_type}
                  onValueChange={(value) => setFormData({ ...formData, zone_type: value })}
                >
                  <SelectTrigger id="zone_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receiving">Receiving</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="picking">Picking</SelectItem>
                    <SelectItem value="packing">Packing</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="returns">Returns</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Capacity Configuration */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Capacity Configuration</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="aisles">Aisles</Label>
                  <Input
                    id="aisles"
                    type="number"
                    min="1"
                    value={formData.aisles}
                    onChange={(e) => setFormData({ ...formData, aisles: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="shelves_per_aisle">Shelves per Aisle</Label>
                  <Input
                    id="shelves_per_aisle"
                    type="number"
                    min="1"
                    value={formData.shelves_per_aisle}
                    onChange={(e) => setFormData({ ...formData, shelves_per_aisle: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="bins_per_shelf">Bins per Shelf</Label>
                  <Input
                    id="bins_per_shelf"
                    type="number"
                    min="1"
                    value={formData.bins_per_shelf}
                    onChange={(e) => setFormData({ ...formData, bins_per_shelf: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Total Capacity: <span className="font-semibold text-purple-600">
                  {(formData.aisles * formData.shelves_per_aisle * formData.bins_per_shelf).toLocaleString()} bins
                </span>
              </p>
            </div>

            {/* Position (X, Y, Z) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Position (X, Y, Z)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="position_x">X Position</Label>
                  <Input
                    id="position_x"
                    type="number"
                    value={formData.position_x}
                    onChange={(e) => setFormData({ ...formData, position_x: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="position_y">Y Position</Label>
                  <Input
                    id="position_y"
                    type="number"
                    value={formData.position_y}
                    onChange={(e) => setFormData({ ...formData, position_y: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="position_z">Z Position</Label>
                  <Input
                    id="position_z"
                    type="number"
                    value={formData.position_z}
                    onChange={(e) => setFormData({ ...formData, position_z: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Dimensions (W, H, D) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Dimensions (meters)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dimensions_width">Width</Label>
                  <Input
                    id="dimensions_width"
                    type="number"
                    min="1"
                    value={formData.dimensions_width}
                    onChange={(e) => setFormData({ ...formData, dimensions_width: parseFloat(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions_height">Height</Label>
                  <Input
                    id="dimensions_height"
                    type="number"
                    min="1"
                    value={formData.dimensions_height}
                    onChange={(e) => setFormData({ ...formData, dimensions_height: parseFloat(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label htmlFor="dimensions_depth">Depth</Label>
                  <Input
                    id="dimensions_depth"
                    type="number"
                    min="1"
                    value={formData.dimensions_depth}
                    onChange={(e) => setFormData({ ...formData, dimensions_depth: parseFloat(e.target.value) || 10 })}
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Rotation (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rotation_degrees">Rotation in Degrees</Label>
                  <Input
                    id="rotation_degrees"
                    type="number"
                    min="0"
                    max="360"
                    value={formData.rotation_degrees}
                    onChange={(e) => setFormData({ ...formData, rotation_degrees: parseFloat(e.target.value) || 0 })}
                    placeholder="0-360"
                  />
                  <p className="text-xs text-gray-500 mt-1">0° = No rotation, 90° = Quarter turn</p>
                </div>
              </div>
            </div>

            {/* Color Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color_code">Display Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color_code"
                    type="color"
                    value={formData.color_code}
                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.color_code}
                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">Zone is Active</Label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this zone..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveZone} className="command-center-button-primary">
              {editingZone ? 'Update' : 'Create'} Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
