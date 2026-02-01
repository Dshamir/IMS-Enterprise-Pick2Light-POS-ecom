"use client"

import { useState } from "react"
import { Download, Loader2, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ExportPanelProps {
  productForSaleId: string
  productId: string
  status: "pending" | "optimized" | "exported"
}

type Platform = "ebay" | "facebook" | "craigslist"

interface ExportOption {
  platform: Platform
  name: string
  icon: string
  bgColor: string
  action: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    platform: "ebay",
    name: "eBay",
    icon: "🛒",
    bgColor: "bg-blue-100",
    action: "Export CSV",
  },
  {
    platform: "facebook",
    name: "Facebook Marketplace",
    icon: "📱",
    bgColor: "bg-blue-100",
    action: "Copy Text",
  },
  {
    platform: "craigslist",
    name: "Craigslist",
    icon: "📋",
    bgColor: "bg-purple-100",
    action: "Copy Text",
  },
]

export function ExportPanel({
  productForSaleId,
  productId,
  status,
}: ExportPanelProps) {
  const { toast } = useToast()
  const [exportingPlatform, setExportingPlatform] = useState<Platform | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [exportedPlatforms, setExportedPlatforms] = useState<Set<Platform>>(new Set())

  const isReady = status === "optimized" || status === "exported"

  async function handleExport(platform: Platform) {
    if (!isReady) {
      toast({
        title: "Not Ready",
        description: "Please complete the listing optimization before exporting.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setExportingPlatform(platform)

    try {
      if (platform === "ebay") {
        // Download CSV file
        const response = await fetch("/api/for-sale/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            platform,
            action: "download",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Export failed")
        }

        // Download the file
        const blob = await response.blob()
        const filename = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `ebay-${productId}.csv`
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "eBay Export Ready",
          description: "CSV file downloaded successfully.",
          type: "success",
          duration: 3000,
        })
      } else {
        // Copy text to clipboard for Facebook/Craigslist
        const response = await fetch("/api/for-sale/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            platform,
            action: "clipboard",
          }),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Export failed")
        }

        await navigator.clipboard.writeText(result.content)

        const option = EXPORT_OPTIONS.find((o) => o.platform === platform)
        toast({
          title: `${option?.name} Text Copied`,
          description: "Listing text has been copied to clipboard.",
          type: "success",
          duration: 3000,
        })
      }

      setExportedPlatforms((prev) => new Set([...prev, platform]))
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setExportingPlatform(null)
    }
  }

  async function handleDownloadAll() {
    if (!isReady) {
      toast({
        title: "Not Ready",
        description: "Please complete the listing optimization before exporting.",
        type: "error",
        duration: 5000,
      })
      return
    }

    setDownloadingAll(true)

    try {
      const response = await fetch("/api/for-sale/export/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [productId],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Bulk export failed")
      }

      // Download the archive
      const blob = await response.blob()
      const filename = `marketplace-export-${productId}-${Date.now()}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportedPlatforms(new Set(["ebay", "facebook", "craigslist"]))

      toast({
        title: "All Formats Downloaded",
        description: "Export archive has been downloaded.",
        type: "success",
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        type: "error",
        duration: 5000,
      })
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">📤 Export to Marketplace</h3>

      {/* Status Warning */}
      {!isReady && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
          ⚠️ Complete the listing optimization before exporting.
        </div>
      )}

      {/* Export Options */}
      <div className="space-y-2">
        {EXPORT_OPTIONS.map((option) => {
          const isExporting = exportingPlatform === option.platform
          const isExported = exportedPlatforms.has(option.platform)

          return (
            <button
              key={option.platform}
              onClick={() => handleExport(option.platform)}
              disabled={isExporting || !isReady}
              className={cn(
                "w-full flex items-center justify-between p-3 border rounded-lg transition-colors",
                isReady
                  ? "border-gray-200 hover:bg-gray-50 cursor-pointer"
                  : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-center">
                <span
                  className={cn(
                    "w-8 h-8 rounded flex items-center justify-center mr-3",
                    option.bgColor
                  )}
                >
                  {option.icon}
                </span>
                <span className="font-medium">{option.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : isExported ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-sm text-gray-500">{option.action}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Download All Button */}
      <Button
        onClick={handleDownloadAll}
        disabled={downloadingAll || !isReady}
        className="w-full mt-3 bg-gray-900 text-white hover:bg-gray-800"
      >
        {downloadingAll ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download All Formats
      </Button>

      {/* Export History Note */}
      {exportedPlatforms.size > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Exports are tracked in the export history.
        </p>
      )}
    </div>
  )
}
