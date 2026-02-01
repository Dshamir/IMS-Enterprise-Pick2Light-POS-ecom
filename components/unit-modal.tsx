"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface UnitModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onUnitCreated: (unit: any) => void
}

export function UnitModal({ 
  isOpen, 
  onOpenChange, 
  onUnitCreated 
}: UnitModalProps) {
  const [unitData, setUnitData] = useState({
    name: "",
    display_name: "",
    symbol: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!unitData.name.trim() || !unitData.display_name.trim() || !unitData.symbol.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(unitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create unit")
      }

      const data = await response.json()
      
      onUnitCreated(data.unit)
      onOpenChange(false)
      setUnitData({ name: "", display_name: "", symbol: "" })
      
      toast({
        title: "Success",
        description: "Unit created successfully!",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create unit",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Unit</DialogTitle>
          <DialogDescription>
            Add a new unit of measurement to your inventory system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={unitData.name}
                onChange={(e) => setUnitData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., KILOGRAMS"
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="display_name" className="text-right">
                Display Name
              </Label>
              <Input
                id="display_name"
                value={unitData.display_name}
                onChange={(e) => setUnitData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="e.g., Kilograms"
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="symbol"
                value={unitData.symbol}
                onChange={(e) => setUnitData(prev => ({ ...prev, symbol: e.target.value }))}
                placeholder="e.g., kg"
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}