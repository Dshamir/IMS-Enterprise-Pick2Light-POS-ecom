"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { recordInventoryTransaction } from "@/app/actions/inventory-transactions"

const formSchema = z.object({
  type: z.enum(["addition", "reduction", "adjustment"], {
    required_error: "Please select a transaction type",
  }),
  quantity: z.coerce.number().min(1, {
    message: "Quantity must be at least 1",
  }),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

interface StockAdjustmentFormProps {
  productId: string
  onComplete?: () => void
  compact?: boolean
}

export function StockAdjustmentForm({ productId, onComplete, compact = false }: StockAdjustmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "addition",
      quantity: 1,
      reason: "",
      notes: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      const result = await recordInventoryTransaction({
        productId,
        type: values.type,
        quantity: values.quantity,
        reason: values.reason,
        notes: values.notes,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      toast.success(
        `Stock ${
          values.type === "addition" ? "added" : values.type === "reduction" ? "reduced" : "adjusted"
        } successfully`,
      )

      // Reset form
      form.reset({
        type: "addition",
        quantity: 1,
        reason: "",
        notes: "",
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transaction Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="addition">Add Stock</SelectItem>
                  <SelectItem value="reduction">Reduce Stock</SelectItem>
                  <SelectItem value="adjustment">Set Stock Level</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="damage">Damage/Loss</SelectItem>
                  <SelectItem value="correction">Inventory Correction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {!compact && (
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional notes" {...field} />
                </FormControl>
                <FormDescription>Optional details about this transaction</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </Form>
  )
}

