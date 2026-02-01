"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface Unit {
  id: string
  name: string
  display_name: string
  symbol: string
  created_at: string
  updated_at: string
}

interface UnitSelectorProps {
  selectedUnitId?: string | null
  onUnitChange: (unitId: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UnitSelector({ 
  selectedUnitId, 
  onUnitChange, 
  placeholder = "Select unit...",
  disabled = false
}: UnitSelectorProps) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newUnit, setNewUnit] = useState({
    name: '',
    display_name: '',
    symbol: ''
  })

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/units')
      if (response.ok) {
        const data = await response.json()
        setUnits(data.units || [])
      } else {
        toast.error('Failed to fetch units')
      }
    } catch (error) {
      console.error('Error fetching units:', error)
      toast.error('Error fetching units')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.display_name || !newUnit.symbol) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUnit),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Unit created successfully')
        setNewUnit({ name: '', display_name: '', symbol: '' })
        setIsAddModalOpen(false)
        
        // Refresh units list
        await fetchUnits()
        
        // Select the newly created unit
        if (data.unit) {
          onUnitChange(data.unit.id)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create unit')
      }
    } catch (error) {
      console.error('Error creating unit:', error)
      toast.error('Error creating unit')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedUnit = units.find(unit => unit.id === selectedUnitId)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select 
            value={selectedUnitId || ''} 
            onValueChange={onUnitChange}
            disabled={disabled || loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading units..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.display_name} ({unit.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              title="Add new unit"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                  placeholder="e.g., KILOGRAMS"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="display_name" className="text-right">
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  value={newUnit.display_name}
                  onChange={(e) => setNewUnit({ ...newUnit, display_name: e.target.value })}
                  placeholder="e.g., Kilograms"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="symbol"
                  value={newUnit.symbol}
                  onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                  placeholder="e.g., kg"
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUnit}
                disabled={isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Unit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Show selected unit details */}
      {selectedUnit && (
        <div className="text-sm text-muted-foreground">
          Selected: {selectedUnit.display_name} ({selectedUnit.symbol})
        </div>
      )}
    </div>
  )
}