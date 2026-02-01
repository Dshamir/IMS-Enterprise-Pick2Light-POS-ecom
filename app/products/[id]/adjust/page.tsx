import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import ClientStockAdjustmentPage from "@/components/client-stock-adjustment-page"

interface StockAdjustmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StockAdjustmentPage({ params }: StockAdjustmentPageProps) {
  const { id } = await params
  
  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/products/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Product
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Manage Inventory</h1>
      </div>

      <ClientStockAdjustmentPage id={id} />
    </div>
  )
}

