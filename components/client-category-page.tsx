"use client"

import { useEffect, useState } from "react"
import ProductList from "@/components/product-list"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface ClientCategoryPageProps {
  category: string
}

export default function ClientCategoryPage({ category }: ClientCategoryPageProps) {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      setError(null)

      try {
        // Use the API route instead of direct Supabase calls
        const params = new URLSearchParams()
        params.append('category', category)
        
        const response = await fetch(`/api/products?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }

        setProducts(result.products || [])
      } catch (err) {
        console.error(`Error fetching ${category}:`, err)
        setError(`Failed to load ${category}. Please try again later.`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [category])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading {category}...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return <ProductList initialProducts={products} category={category} />
}

