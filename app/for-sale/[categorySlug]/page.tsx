import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ForSaleSubcategoriesView } from "@/components/for-sale/ForSaleSubcategoriesView"

interface Props {
  params: Promise<{ categorySlug: string }>
}

export default async function SubcategoriesPage({ params }: Props) {
  const { categorySlug } = await params

  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/for-sale">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Categories
          </Link>
        </Button>
      </div>

      <ForSaleSubcategoriesView categorySlug={categorySlug} />
    </main>
  )
}
