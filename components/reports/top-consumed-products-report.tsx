"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Download, ArrowUpRight } from "lucide-react"
import { getTopConsumedProducts } from "@/app/actions/reports"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js"
import Link from "next/link"

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type TimeRange = "7days" | "30days" | "90days" | "year" | "all"

export default function TopConsumedProductsReport() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")
  const [category, setCategory] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [timeRange, category])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getTopConsumedProducts({
        timeRange,
        category: category || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setTopProducts(result.data)

        // Prepare data for chart
        const data = {
          labels: result.data.map((item) => item.name),
          datasets: [
            {
              label: "Quantity Consumed",
              data: result.data.map((item) => item.totalQuantity),
              backgroundColor: "rgba(53, 162, 235, 0.5)",
              borderColor: "rgb(53, 162, 235)",
              borderWidth: 1,
            },
          ],
        }

        setChartData(data)
      }
    } catch (error: any) {
      setError(error.message || "Failed to load top consumed products")
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!topProducts.length) return

    // Create CSV content
    const headers = ["Product", "Category", "Quantity Consumed", "Total Value"]
    const rows = topProducts.map((product) => [
      product.name,
      product.category,
      product.totalQuantity,
      product.totalValue.toFixed(2),
    ])

    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `top-products-${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Top Consumed Products",
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Quantity Consumed",
        },
      },
      y: {
        title: {
          display: true,
          text: "Product",
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Top Consumed Products</CardTitle>
            <CardDescription>Identify the most frequently used items</CardDescription>
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

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="parts">Parts</SelectItem>
                <SelectItem value="consumables">Consumables</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={exportData} disabled={!topProducts.length}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : topProducts.length > 0 ? (
          <div className="space-y-6">
            <div className="h-80">
              <Bar data={chartData} options={chartOptions} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Product</th>
                    <th className="text-left py-2 px-4">Category</th>
                    <th className="text-right py-2 px-4">Quantity</th>
                    <th className="text-right py-2 px-4">Total Value</th>
                    <th className="text-center py-2 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted">
                      <td className="py-2 px-4">{product.name}</td>
                      <td className="py-2 px-4 capitalize">{product.category}</td>
                      <td className="py-2 px-4 text-right">{product.totalQuantity}</td>
                      <td className="py-2 px-4 text-right">${product.totalValue.toFixed(2)}</td>
                      <td className="py-2 px-4 text-center">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/products/${product.id}`}>
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-80 text-muted-foreground">
            No consumption data available for the selected filters
          </div>
        )}
      </CardContent>
    </Card>
  )
}

