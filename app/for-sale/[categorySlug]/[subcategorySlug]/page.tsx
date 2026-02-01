import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ForSaleItemsListView } from "@/components/for-sale/ForSaleItemsListView"

interface Props {
  params: Promise<{ categorySlug: string; subcategorySlug: string }>
}

export default async function ItemsListPage({ params }: Props) {
  const { categorySlug, subcategorySlug } = await params

  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/for-sale/${categorySlug}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Subcategories
          </Link>
        </Button>
      </div>

      <ForSaleItemsListView
        categorySlug={categorySlug}
        subcategorySlug={subcategorySlug}
      />
    </main>
  )
}
