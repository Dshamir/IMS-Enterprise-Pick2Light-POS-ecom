import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProductActions } from "@/app/components/product-actions"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import ProductList from "@/components/product-list"

export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const supabase = createServerSupabaseClient()

  // Fetch initial products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12)

  return (
    <main className="container mx-auto py-4 px-4 md:py-8 md:max-w-none md:w-[90%]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your inventory items</p>
        </div>

        <ProductActions />
      </div>

      <ProductList initialProducts={products || []} />
    </main>
  )
}

