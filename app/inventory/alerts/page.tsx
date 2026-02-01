import { getLowStockProducts } from "@/app/actions/inventory-transactions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, AlertTriangle, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function InventoryAlertsPage() {
  const { products: lowStockProducts, error } = await getLowStockProducts()

  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Inventory Alerts</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items that need attention</CardTitle>
          <CardDescription>Products with stock levels below the minimum threshold</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-6 text-destructive">Error: {error}</div>
          ) : lowStockProducts && lowStockProducts.length > 0 ? (
            <div className="space-y-6">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between border-b pb-6">
                  <div className="flex items-center">
                    <div className="h-16 w-16 relative rounded overflow-hidden mr-4">
                      <Image
                        src={product.image_url || "/placeholder.svg?height=64&width=64"}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <Link href={`/products/${product.id}`}>
                        <h3 className="font-medium hover:underline">{product.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">Category: {product.category}</p>
                      <div className="flex items-center mt-1">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
                        <span className="text-sm font-medium text-amber-500">
                          Low stock: {product.stock_quantity} / {product.min_stock_level} minimum
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/products/${product.id}?tab=stock`}>
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Stock
                      </Button>
                    </Link>
                    <Link href={`/products/${product.id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">No alerts found</h3>
              <p>All products are above their minimum stock levels</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

