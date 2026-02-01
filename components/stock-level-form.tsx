"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { updateStockLevels } from "@/app/actions/inventory-transactions"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"

interface StockLevelFormProps {
  productId: string
  initialMinLevel: number
  initialMaxLevel: number
  initialReorderQuantity: number
}

export default function StockLevelForm({
  productId,
  initialMinLevel,
  initialMaxLevel,
  initialReorderQuantity,
}: StockLevelFormProps) {
  const [minLevel, setMinLevel] = useState(initialMinLevel)
  const [maxLevel, setMaxLevel] = useState(initialMaxLevel)
  const [reorderQuantity, setReorderQuantity] = useState(initialReorderQuantity)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateStockLevels(productId, minLevel, maxLevel, reorderQuantity)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          type: "error",
          duration: 5000,
        })
      } else {
        toast({
          title: "Success",
          description: "Stock levels updated successfully",
          type: "success",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error updating stock levels:", error)
      toast({
        title: "Error",
        description: "Failed to update stock levels",
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Level Settings</CardTitle>
        <CardDescription>Configure minimum and maximum stock levels</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min-level">Minimum Stock Level</Label>
            <Input
              id="min-level"
              type="number"
              min="0"
              value={minLevel}
              onChange={(e) => setMinLevel(Number.parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Alert will be triggered when stock falls below this level</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-level">Maximum Stock Level</Label>
            <Input
              id="max-level"
              type="number"
              min="0"
              value={maxLevel}
              onChange={(e) => setMaxLevel(Number.parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Target maximum inventory to maintain</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reorder-quantity">Reorder Quantity</Label>
            <Input
              id="reorder-quantity"
              type="number"
              min="0"
              value={reorderQuantity}
              onChange={(e) => setReorderQuantity(Number.parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Suggested quantity to order when below minimum level</p>
          </div>

          {minLevel > maxLevel && maxLevel > 0 && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Minimum level should not exceed maximum level
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || (minLevel > maxLevel && maxLevel > 0)}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

