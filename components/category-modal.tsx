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
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CategoryModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCategoryCreated: (category: any) => void
}

export function CategoryModal({ 
  isOpen, 
  onOpenChange, 
  onCategoryCreated 
}: CategoryModalProps) {
  const [categoryName, setCategoryName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a category name",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create category")
      }

      toast({
        title: "Success",
        description: "Category created successfully!",
      })

      onCategoryCreated(data.category)
      setCategoryName("")
      onOpenChange(false)

    } catch (error: any) {
      console.error("Error creating category:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create category",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isLoading) {
      onOpenChange(open)
      if (!open) {
        setCategoryName("")
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Category
          </DialogTitle>
          <DialogDescription>
            Create a new category for your products. This will be available for all future products.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter category name..."
                disabled={isLoading}
                maxLength={50}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                {categoryName.length}/50 characters
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !categoryName.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}