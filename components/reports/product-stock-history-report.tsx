"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Search } from "lucide-react"
import { getStockLevelHistory } from "@/app/actions/reports"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import { Input } from "@/components/ui/input"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type TimeRange = "7days" | "30days" | "90days" | "year" | "all"

export default function ProductStockHistoryReport() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")
  const [productId, setProductId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [productOptions, setProductOptions] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Search for products
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setProductOptions([])
        return
      }

      setIsSearching(true)

      try {
        const response = await fetch(`/api/products?query=${encodeURIComponent(searchQuery)}&limit=10`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        setProductOptions(data.products || [])
      } catch (error) {
        console.error("Error searching products:", error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(() => {
      searchProducts()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Fetch stock history when product changes
  useEffect(() => {
    if (productId) {
      fetchStockHistory()
    } else {
      setChartData(null)
      setSelectedProduct(null)
    }
  }, [productId, timeRange])

  // Add UUID validation to the fetchStockHistory function
  const fetchStockHistory = async () => {
    setIsLoading(true)
    setError(null)

    // Check if the productId is a valid hex string (SQLite format)
    if (!productId || !/^[0-9a-f]{32}$/i.test(productId)) {
      setError("Please select a valid product")
      setIsLoading(false)
      return
    }

    try {
      const result = await getStockLevelHistory(productId, timeRange)

      if (result.error) {
        setError(result.error)
      } else if (result.data && result.product) {
        setSelectedProduct(result.product)

        // Format dates for display
        const formattedData = result.data.map((item) => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString(),
        }))

        // Prepare data for chart
        const data = {
          labels: formattedData.map((item) => item.formattedDate),
          datasets: [
            {
              label: "Stock Level",
              data: formattedData.map((item) => item.quantity),
              borderColor: "rgb(53, 162, 235)",
              backgroundColor: "rgba(53, 162, 235, 0.5)",
              tension: 0.3,
            },
            {
              label: "Min Stock Level",
              data: formattedData.map(() => result.product.minStockLevel),
              borderColor: "rgba(255, 99, 132, 0.8)",
              backgroundColor: "rgba(255, 99, 132, 0.1)",
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
            },
          ],
        }

        // Add max stock level if set
        if (result.product.maxStockLevel > 0) {
          data.datasets.push({
            label: "Max Stock Level",
            data: formattedData.map(() => result.product.maxStockLevel),
            borderColor: "rgba(75, 192, 192, 0.8)",
            backgroundColor: "rgba(75, 192, 192, 0.1)",
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
          })
        }

        setChartData(data)
      }
    } catch (error: any) {
      setError(error.message || "Failed to load stock history")
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!chartData) return

    // Create CSV content
    const headers = ["Date", "Stock Level"]
    const rows = chartData.labels.map((label: string, index: number) => [label, chartData.datasets[0].data[index]])

    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `stock-history-${productId}-${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: selectedProduct ? `Stock History: ${selectedProduct.name}` : "Stock History",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Stock Quantity",
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Stock Level History</CardTitle>
            <CardDescription>Track how stock levels change over time</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {chartData && (
              <Button variant="outline" size="icon" onClick={exportData}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search for a product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <Button variant="outline" disabled={!productId} onClick={() => fetchStockHistory()}>
                <Search className="h-4 w-4 mr-2" />
                View History
              </Button>
            </div>

            {productOptions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-md max-h-60 overflow-y-auto">
                {productOptions.map((product) => (
                  <div
                    key={product.id}
                    className="p-2 hover:bg-muted cursor-pointer flex justify-between"
                    onClick={() => {
                      setProductId(product.id)
                      setSearchQuery(product.name)
                      setProductOptions([])
                    }}
                  >
                    <span>{product.name}</span>
                    <span className="text-muted-foreground capitalize">{product.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : !productId ? (
            <div className="flex justify-center items-center h-80 text-muted-foreground">
              Search for a product to view its stock history
            </div>
          ) : chartData && chartData.labels.length > 0 ? (
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="flex justify-center items-center h-80 text-muted-foreground">
              No stock history available for the selected product and time range
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

