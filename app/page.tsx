import type React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, Wrench, Search, PlusCircle, BarChart3, FileBarChart, MessageSquare, Shield, Cog, Folder, Hammer, Zap, Truck, Box } from "lucide-react"
import { sqliteHelpers } from "@/lib/database/sqlite"
import { AIDashboardChat } from "@/components/ai/ai-dashboard-chat"
import { formatCurrency, calculateCategoryTotalValue } from "@/lib/utils"

// Force dynamic rendering - this page needs database access
export const dynamic = 'force-dynamic'

// Icon mapping for different categories
function getCategoryIcon(categoryName: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    parts: <Wrench className="h-12 w-12" />,
    consumables: <ShoppingCart className="h-12 w-12" />,
    equipment: <Package className="h-12 w-12" />,
    tools: <Hammer className="h-12 w-12" />,
    safety: <Shield className="h-12 w-12" />,
    maintenance: <Cog className="h-12 w-12" />,
    electrical: <Zap className="h-12 w-12" />,
    automotive: <Truck className="h-12 w-12" />,
    other: <Box className="h-12 w-12" />
  }
  
  return iconMap[categoryName.toLowerCase()] || <Folder className="h-12 w-12" />
}

// Generate category description based on category name
function getCategoryDescription(categoryName: string): string {
  const descriptionMap: Record<string, string> = {
    parts: "Manage mechanical, electrical, and structural parts",
    consumables: "Track supplies that need regular replenishment", 
    equipment: "Manage tools, machines, and other durable items",
    tools: "Hand tools, power tools, and maintenance equipment",
    safety: "Safety equipment and protective gear",
    maintenance: "Maintenance supplies and repair materials",
    electrical: "Electrical components and supplies",
    automotive: "Vehicle parts and automotive supplies",
    other: "Miscellaneous items and general inventory"
  }
  
  return descriptionMap[categoryName.toLowerCase()] || `Manage ${categoryName} inventory items`
}

// Generate category link - use dedicated routes for all categories
function getCategoryLink(categoryName: string): string {
  // Convert category name to URL-friendly slug
  const slug = categoryName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, '') // Remove special characters except hyphens
  
  return `/${slug}`
}

export default function WelcomePage() {
  // Get actual category counts from database
  const products = sqliteHelpers.getAllProducts()
  const categoryCounts = products.reduce((acc: Record<string, number>, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1
    return acc
  }, {})

  // Get all categories and filter those with more than 1 item
  const allCategories = sqliteHelpers.getAllCategories()
  const categoriesToDisplay = allCategories.filter(category => 
    (categoryCounts[category.name] || 0) >= 0
  )

  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Nexless Inventory Management</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your parts, consumables, and equipment in one place
        </p>
      </div>

      {/* Dynamic Category Cards - Show all categories with more than 1 item */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {categoriesToDisplay.map((category) => {
          const totalValue = calculateCategoryTotalValue(products, category.name)
          return (
            <CategoryCard
              key={category.id}
              title={category.name.charAt(0).toUpperCase() + category.name.slice(1)}
              description={getCategoryDescription(category.name)}
              icon={getCategoryIcon(category.name)}
              href={getCategoryLink(category.name)}
              count={categoryCounts[category.name] || 0}
              totalValue={totalValue}
            />
          )
        })}
        
        {/* Show message if no categories have more than 1 item */}
        {categoriesToDisplay.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">
              No categories have more than 1 item in inventory. Add some products to see category cards here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/products/new">Add Your First Items</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Button asChild className="justify-start" variant="outline">
              <Link href="/search">
                <Search className="mr-2 h-4 w-4" />
                Search Inventory
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/products/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Item
              </Link>
            </Button>
            <Button asChild className="justify-start" variant="outline">
              <Link href="/reports">
                <FileBarChart className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40">
              <BarChart3 className="h-24 w-24 text-muted-foreground" />
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">View Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* AI Assistant Chat Section */}
      <div className="mt-8">
        <AIDashboardChat />
      </div>
    </main>
  )
}

interface CategoryCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  count: number
  totalValue: number
}

function CategoryCard({ title, description, icon, href, count, totalValue }: CategoryCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-start">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold">
            {count}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col items-center mb-4">
          <div className="text-primary mb-4">{icon}</div>
          <div className="text-center mb-3">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
          <CardDescription className="text-center">{description}</CardDescription>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>Browse {title}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

