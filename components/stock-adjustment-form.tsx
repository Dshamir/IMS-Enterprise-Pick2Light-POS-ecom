"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { recordInventoryTransaction } from "@/app/actions/inventory-transactions"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, MinusCircle, RefreshCw } from "lucide-react"

interface StockAdjustmentFormProps {
  productId: string
  currentStock: number
  onComplete?: () => void
}

type AdjustmentType = "addition" | "reduction" | "adjustment"

const REASON_OPTIONS = {
  addition: ["Purchase", "Return", "Correction", "Other"],
  reduction: ["Usage", "Damage", "Loss", "Expiry", "Other"],
  adjustment: ["Inventory Count", "Correction", "Other"],
}

export default function StockAdjustmentForm({ productId, currentStock, onComplete }: StockAdjustmentFormProps) {
  const [type, setType] = useState<AdjustmentType>("addition")
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await recordInventoryTransaction({
        productId,
        type,
        quantity: type === "adjustment" ? quantity : Math.max(1, quantity),
        reason,
        notes: notes.trim() || undefined,
      })

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
          description: `Stock ${type === "addition" ? "added" : type === "reduction" ? "removed" : "adjusted"} successfully`,
          type: "success",
          duration: 3000,
        })

        // Reset form
        setQuantity(1)
        setNotes("")

        // Notify parent component
        if (onComplete) {
          onComplete()
        }
      }
    } catch (error) {
      console.error("Error adjusting stock:", error)
      toast({
        title: "Error",
        description: "Failed to adjust stock",
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
        <CardTitle>Adjust Stock</CardTitle>
        <CardDescription>Add, remove, or adjust inventory quantity</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={type === "addition" ? "default" : "outline"}
                className="flex items-center justify-center"
                onClick={() => {
                  setType("addition")
                  setReason("")
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button
                type="button"
                variant={type === "reduction" ? "default" : "outline"}
                className="flex items-center justify-center"
                onClick={() => {
                  setType("reduction")
                  setReason("")
                }}
              >
                <MinusCircle className="h-4 w-4 mr-2" />
                Remove
              </Button>
              <Button
                type="button"
                variant={type === "adjustment" ? "default" : "outline"}
                className="flex items-center justify-center"
                onClick={() => {
                  setType("adjustment")
                  setQuantity(currentStock)
                  setReason("")
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Set
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {type === "addition" ? "Quantity to Add" : type === "reduction" ? "Quantity to Remove" : "New Quantity"}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={type === "adjustment" ? 0 : 1}
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
            />
            {type === "reduction" && quantity > currentStock && (
              <p className="text-xs text-amber-500">
                Warning: This will reduce stock to zero (current stock: {currentStock})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS[type].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !reason || (type !== "adjustment" && quantity < 1)}>
            {isLoading ? "Processing..." : "Submit"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

