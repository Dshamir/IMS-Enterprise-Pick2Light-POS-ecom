"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Search, Camera, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  onSearch: (query: string) => void
  onImageSearch: (file: File) => void
  category?: string
}

export default function SearchBar({ onSearch, onImageSearch, category }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        onImageSearch(file)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const clearImage = () => {
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onSearch("") // Reset to normal search
  }

  const placeholderText = category ? `Search ${category}...` : "Search products..."

  return (
    <div className="w-full space-y-2">
      <form onSubmit={handleTextSearch} className="flex w-full items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholderText}
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        <Button type="button" variant="outline" onClick={triggerFileInput}>
          <Camera className="h-4 w-4" />
          <span className="sr-only">Search by image</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </form>

      {imagePreview && (
        <div className="relative inline-block">
          <img
            src={imagePreview || "/placeholder.svg"}
            alt="Search by this image"
            className="h-16 w-16 object-cover rounded-md border"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
          >
            <X size={12} />
          </button>
          <span className="text-xs text-muted-foreground block mt-1">Searching by image...</span>
        </div>
      )}
    </div>
  )
}

