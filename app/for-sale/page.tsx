import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ForSaleCategoriesView } from "@/components/for-sale/ForSaleCategoriesView"

export default function ForSalePage() {
  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <ForSaleCategoriesView />
    </main>
  )
}
