"use client"

import { useEffect, useState } from "react"
import ProductList from "@/components/product-list"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function ClientSearchPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClientSupabaseClient()

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6)

        if (error) {
          throw error
        }

        setProducts(data || [])
      } catch (err) {
        console.error("Error fetching products:", err)
        setError("Failed to load products. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading products...</span>
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

  return <ProductList initialProducts={products} />
}

