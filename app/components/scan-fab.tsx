"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Barcode } from "lucide-react"

export function ScanFAB() {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show on the scan page
  if (pathname === "/scan") {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 md:hidden">
      <Button size="icon" className="h-14 w-14 rounded-full shadow-lg" onClick={() => router.push("/scan")}>
        <Barcode className="h-6 w-6" />
      </Button>
    </div>
  )
}

