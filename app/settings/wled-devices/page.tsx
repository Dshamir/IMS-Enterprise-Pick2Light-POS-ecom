import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Router } from "lucide-react"
import { WLEDDeviceManager } from "@/components/wled/wled-device-manager"

export default function WLEDDevicesPage() {
  return (
    <main className="container mx-auto md:max-w-none md:w-[90%] py-4 px-4 md:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Settings
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Router className="h-6 w-6" />
            WLED Devices
          </h1>
          <p className="text-muted-foreground">
            Manage WLED devices for LED location tracking and inventory visualization
          </p>
        </div>
      </div>

      <WLEDDeviceManager />
    </main>
  )
}