import { ScanBarcode } from "../components/scan-barcode"

export default function ScanPage() {
  return (
    <div className="container mx-auto md:max-w-none md:w-[90%] py-6">
      <h1 className="text-3xl font-bold mb-6">Scan Barcode</h1>
      <ScanBarcode />
    </div>
  )
}

