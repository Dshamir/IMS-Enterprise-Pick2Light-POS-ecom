import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, PlusCircle } from "lucide-react"
import ClientCategoryPage from "@/components/client-category-page"
import { slugToCategory, getCategoryDisplayInfo } from "@/lib/category-utils"
import { notFound } from "next/navigation"

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

export default async function DynamicCategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params
  
  // Convert URL slug back to category name and validate it exists
  const categoryName = await slugToCategory(slug)
  
  if (!categoryName) {
    notFound()
  }
  
  // Get display information for this category
  const { title, description, buttonText } = getCategoryDisplayInfo(categoryName)
  
  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
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
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <Button asChild className="mt-4 md:mt-0">
          <Link href={`/products/new?category=${encodeURIComponent(categoryName)}`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {buttonText}
          </Link>
        </Button>
      </div>

      <ClientCategoryPage category={categoryName} />
    </main>
  )
}