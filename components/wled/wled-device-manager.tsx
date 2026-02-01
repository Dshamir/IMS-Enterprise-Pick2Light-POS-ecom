"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Router,
  AlertCircle,
  ActivitySquare,
  Zap,
  Upload
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { WLEDDeviceForm } from './wled-device-form'
import { SignalStrengthIndicator } from '../led/signal-strength-indicator'
import { CSVImportDialog } from './csv-import-dialog'

interface WLEDDevice {
  id: string
  device_name: string
  ip_address: string
  total_leds: number
  status: 'online' | 'offline'
  signal_strength?: number
  last_seen?: string
  created_at: string
  updated_at: string
}

export function WLEDDeviceManager() {
  const { toast } = useToast()

  const [devices, setDevices] = useState<WLEDDevice[]>([])
  const [filteredDevices, setFilteredDevices] = useState<WLEDDevice[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingDevice, setEditingDevice] = useState<WLEDDevice | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  // Delete state
  const [deviceToDelete, setDeviceToDelete] = useState<WLEDDevice | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deviceSegmentCount, setDeviceSegmentCount] = useState<number>(0)

  // Real-time connectivity state
  const [deviceInfo, setDeviceInfo] = useState<Record<string, { online: boolean; signal_strength?: number; last_seen?: string }>>({})
  const [checkingDevices, setCheckingDevices] = useState<Set<string>>(new Set())

  // Bulk sync state
  const [syncingDevices, setSyncingDevices] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadDevices()
  }, [])

  // Background connectivity checking for all devices
  useEffect(() => {
    if (devices.length === 0) return

    const checkAllDevices = async () => {
      // Mark all devices as being checked
      setCheckingDevices(new Set(devices.map(d => d.id)))

      // Check all devices in parallel (non-blocking)
      const checkPromises = devices.map(async (device) => {
        try {
          const response = await fetch(`/api/wled-devices/${device.id}/info`)
          const data = await response.json()

          if (response.ok) {
            return {
              deviceId: device.id,
              info: {
                online: data.online,
                signal_strength: data.wifi?.rssi,
                last_seen: data.lastSeen
              }
            }
          } else {
            return {
              deviceId: device.id,
              info: { online: false }
            }
          }
        } catch (error) {
          return {
            deviceId: device.id,
            info: { online: false }
          }
        }
      })

      // Wait for all checks to complete
      const results = await Promise.all(checkPromises)

      // Update device info state with all results at once
      setDeviceInfo(prev => {
        const newInfo = { ...prev }
        results.forEach(result => {
          newInfo[result.deviceId] = result.info
        })
        return newInfo
      })

      // Clear checking state
      setCheckingDevices(new Set())
    }

    // Check immediately when devices load
    checkAllDevices()

    // Auto-refresh every 30 minutes (background polling)
    const interval = setInterval(checkAllDevices, 1800000)

    return () => clearInterval(interval)
  }, [devices])

  useEffect(() => {
    // Filter devices based on search term
    if (!searchTerm.trim()) {
      setFilteredDevices(devices)
    } else {
      const filtered = devices.filter(device =>
        device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address.includes(searchTerm)
      )
      setFilteredDevices(filtered)
    }
  }, [devices, searchTerm])

  const loadDevices = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/wled-devices')

      if (response.ok) {
        const devicesData = await response.json()
        setDevices(devicesData)
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Load Devices",
          description: "Could not fetch WLED devices from server"
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to load WLED devices"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDevices = async () => {
    setIsRefreshing(true)
    await loadDevices()
    setIsRefreshing(false)

    toast({
      title: "Devices Refreshed",
      description: "WLED device list has been updated"
    })
  }

  const checkConnectivity = async () => {
    if (devices.length === 0) {
      toast({
        title: "No Devices",
        description: "Add devices first to check connectivity"
      })
      return
    }

    setIsCheckingConnectivity(true)

    try {
      // Mark all devices as being checked
      setCheckingDevices(new Set(devices.map(d => d.id)))

      // Check all devices in parallel (non-blocking)
      const checkPromises = devices.map(async (device) => {
        try {
          const response = await fetch(`/api/wled-devices/${device.id}/info`)
          const data = await response.json()

          if (response.ok) {
            return {
              deviceId: device.id,
              info: {
                online: data.online,
                signal_strength: data.wifi?.rssi,
                last_seen: data.lastSeen
              }
            }
          } else {
            return {
              deviceId: device.id,
              info: { online: false }
            }
          }
        } catch (error) {
          return {
            deviceId: device.id,
            info: { online: false }
          }
        }
      })

      // Wait for all checks to complete
      const results = await Promise.all(checkPromises)

      // Update device info state with all results at once
      setDeviceInfo(prev => {
        const newInfo = { ...prev }
        results.forEach(result => {
          newInfo[result.deviceId] = result.info
        })
        return newInfo
      })

      // Count online/offline
      const onlineCount = results.filter(r => r.info.online).length
      const offlineCount = results.length - onlineCount

      toast({
        title: "Connectivity Check Complete",
        description: `${onlineCount} online, ${offlineCount} offline`
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: "Failed to check device connectivity"
      })
    } finally {
      setCheckingDevices(new Set())
      setIsCheckingConnectivity(false)
    }
  }

  const handleAddDevice = () => {
    setEditingDevice(null)
    setFormMode('create')
    setShowForm(true)
  }

  const handleEditDevice = (device: WLEDDevice) => {
    setEditingDevice(device)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleDeleteClick = async (device: WLEDDevice) => {
    // Fetch segment count before showing dialog
    try {
      const response = await fetch(`/api/led-segments?device_id=${device.id}`)
      if (response.ok) {
        const segments = await response.json()
        setDeviceSegmentCount(Array.isArray(segments) ? segments.length : 0)
      } else {
        setDeviceSegmentCount(0)
      }
    } catch (error) {
      setDeviceSegmentCount(0)
    }
    setDeviceToDelete(device)
  }

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/wled-devices/${deviceToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Device Deleted",
          description: result.message
        })
        setDevices(prev => prev.filter(d => d.id !== deviceToDelete.id))
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Delete Device",
          description: result.error || 'Unknown error occurred'
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to delete WLED device"
      })
    } finally {
      setIsDeleting(false)
      setDeviceToDelete(null)
      setDeviceSegmentCount(0)
    }
  }

  const handleSaveDevice = (savedDevice: WLEDDevice) => {
    if (formMode === 'create') {
      // Refresh the list to get the new device with proper ID
      loadDevices()
    } else {
      // Update existing device in the list
      setDevices(prev =>
        prev.map(d => d.id === savedDevice.id ? { ...d, ...savedDevice } : d)
      )
    }
  }

  const handleSyncAllSegments = async (device: WLEDDevice) => {
    if (syncingDevices.has(device.id)) return // Prevent double-click

    setSyncingDevices(prev => new Set(prev).add(device.id))

    try {
      const response = await fetch(`/api/wled-devices/${device.id}/activate-all`, {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "✅ Bulk Sync Complete",
          description: `Synced ${result.synced_segments} segments for ${device.device_name} in ${result.duration_ms}ms (${result.segments_per_second}/sec)`
        })
      } else {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: result.error || result.message || 'Failed to sync segments'
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: "Failed to communicate with server"
      })
    } finally {
      setSyncingDevices(prev => {
        const newSet = new Set(prev)
        newSet.delete(device.id)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: 'online' | 'offline') => {
    return (
      <Badge variant={status === 'online' ? 'default' : 'secondary'}>
        {status === 'online' ? (
          <Wifi className="h-3 w-3 mr-1" />
        ) : (
          <WifiOff className="h-3 w-3 mr-1" />
        )}
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading WLED devices...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            WLED Device Management
          </CardTitle>
          <CardDescription>
            Manage WLED devices for LED location tracking. Add new devices or modify existing ones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleAddDevice} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Device
              </Button>
              <CSVImportDialog
                trigger={
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                }
                onImportComplete={loadDevices}
              />
              <Button
                variant="outline"
                onClick={refreshDevices}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={checkConnectivity}
                disabled={isCheckingConnectivity || devices.length === 0}
                className="flex items-center gap-2"
              >
                <ActivitySquare className={`h-4 w-4 ${isCheckingConnectivity ? 'animate-pulse' : ''}`} />
                Check Connectivity
              </Button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Devices Table */}
          {filteredDevices.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm ? (
                <div>
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                  <p className="text-gray-500">No devices match your search criteria.</p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <div>
                  <Router className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No WLED devices</h3>
                  <p className="text-gray-500 mb-4">
                    Get started by adding your first WLED device for LED location tracking.
                  </p>
                  <Button onClick={handleAddDevice} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First Device
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>LEDs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signal Strength</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.device_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.ip_address}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {device.total_leds} LEDs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={deviceInfo[device.id]?.online ?? (device.status === 'online') ? 'default' : 'secondary'}>
                          {deviceInfo[device.id]?.online ?? (device.status === 'online') ? (
                            <Wifi className="h-3 w-3 mr-1" />
                          ) : (
                            <WifiOff className="h-3 w-3 mr-1" />
                          )}
                          {deviceInfo[device.id]?.online ?? (device.status === 'online') ? 'online' : 'offline'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SignalStrengthIndicator
                          rssi={deviceInfo[device.id]?.signal_strength}
                          isChecking={checkingDevices.has(device.id)}
                          showText={true}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {deviceInfo[device.id]?.last_seen
                          ? new Date(deviceInfo[device.id].last_seen!).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncAllSegments(device)}
                            disabled={syncingDevices.has(device.id) || (deviceInfo[device.id]?.online === false)}
                            className="flex items-center gap-1"
                            title="Sync all LED segments for this device"
                          >
                            {syncingDevices.has(device.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDevice(device)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(device)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete WLED Device</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <div className="space-y-2">
                                    <p>Are you sure you want to delete "{deviceToDelete?.device_name}"?</p>
                                    <p>This action cannot be undone and will remove the device permanently.</p>
                                    {deviceSegmentCount > 0 && (
                                      <p className="text-amber-600 font-medium">
                                        ⚠️ This device has {deviceSegmentCount} LED segment{deviceSegmentCount !== 1 ? 's' : ''} that will also be deleted.
                                      </p>
                                    )}
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteDevice}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete Device'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Device count summary */}
          {devices.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredDevices.length} of {devices.length} devices
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Form Modal */}
      <WLEDDeviceForm
        device={editingDevice}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveDevice}
        mode={formMode}
      />
    </>
  )
}