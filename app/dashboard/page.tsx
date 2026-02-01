import { createServerSupabaseClient } from "@/lib/supabase/server"
import { InventoryDashboard } from "../components/inventory-dashboard"
import { getLowStockProducts } from "../actions/inventory-transactions"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { AIChatWidget } from "@/components/ai/ai-chat-widget"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // Fetch inventory statistics using SQLite
  const products = sqliteHelpers.getAllProducts()

  // Get total product count
  const totalProducts = products?.length || 0

  // Get total inventory value
  const totalValue = products?.reduce((sum, product) => {
    return sum + (product.price || 0) * (product.stock_quantity || 0)
  }, 0) || 0

  // Get category distribution
  const categories = products?.reduce((acc: Record<string, number>, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1
    return acc
  }, {})

  // Get low stock products
  const { products: lowStockProducts, error: lowStockError } = await getLowStockProducts()

  // For now, use empty transactions since we're focusing on SQLite products
  // TODO: Implement SQLite-based inventory transactions if needed
  const recentTransactions: any[] = []

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-none px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Inventory Dashboard</h1>
          <p className="text-lg text-muted-foreground">Monitor your inventory, track stock levels, and manage products</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
          <div className="xl:col-span-3">
            <InventoryDashboard
              totalProducts={totalProducts}
              totalValue={totalValue}
              categories={categories || {}}
              lowStockProducts={lowStockProducts || []}
              recentTransactions={recentTransactions || []}
            />
          </div>
          
          <div className="xl:col-span-1">
            <div className="sticky top-6">
              <AIChatWidget defaultExpanded={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

