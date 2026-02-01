import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MarketplaceEditor } from "@/components/for-sale/MarketplaceEditor"

interface Props {
  params: Promise<{ productId: string }>
}

export default async function EditorPage({ params }: Props) {
  const { productId } = await params

  return (
    <main className="container mx-auto md:max-w-none md:w-[95%] py-4 px-4 md:py-6">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/for-sale">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to For Sale
          </Link>
        </Button>
      </div>

      <MarketplaceEditor productId={productId} />
    </main>
  )
}
