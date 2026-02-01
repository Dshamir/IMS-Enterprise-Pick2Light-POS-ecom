"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { getCategoryConsumption } from "@/app/actions/reports"
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartOptions } from "chart.js"

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend)

type TimeRange = "7days" | "30days" | "90days" | "year" | "all"

export default function CategoryConsumptionReport() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [categoryData, setCategoryData] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getCategoryConsumption({
        timeRange,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setCategoryData(result.data)

        // Define colors for categories
        const backgroundColors = [
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
        ]

        // Prepare data for chart
        const data = {
          labels: result.data.map((item) => item.category),
          datasets: [
            {
              label: "Consumption by Category",
              data: result.data.map((item) => item.totalQuantity),
              backgroundColor: backgroundColors.slice(0, result.data.length),
              borderColor: backgroundColors.map((color) => color.replace("0.6", "1")),
              borderWidth: 1,
            },
          ],
        }

        setChartData(data)
      }
    } catch (error: any) {
      setError(error.message || "Failed to load category consumption data")
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!categoryData.length) return

    // Create CSV content
    const headers = ["Category", "Quantity Consumed", "Percentage"]
    const totalQuantity = categoryData.reduce((sum, category) => sum + category.totalQuantity, 0)

    const rows = categoryData.map((category) => [
      category.category,
      category.totalQuantity,
      ((category.totalQuantity / totalQuantity) * 100).toFixed(2) + "%",
    ])

    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `category-consumption-${timeRange}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const chartOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: true,
        text: "Consumption by Category",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ""
            const value = context.raw as number
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number
            const percentage = ((value / total) * 100).toFixed(2)
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Category Consumption</CardTitle>
            <CardDescription>Analyze consumption patterns by category</CardDescription>
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

            <Button variant="outline" size="icon" onClick={exportData} disabled={!categoryData.length}>
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
        ) : categoryData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 flex items-center justify-center">
              <Pie data={chartData} options={chartOptions} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Category</th>
                    <th className="text-right py-2 px-4">Quantity</th>
                    <th className="text-right py-2 px-4">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((category, index) => {
                    const totalQuantity = categoryData.reduce((sum, cat) => sum + cat.totalQuantity, 0)
                    const percentage = ((category.totalQuantity / totalQuantity) * 100).toFixed(2)

                    return (
                      <tr key={index} className="border-b hover:bg-muted">
                        <td className="py-2 px-4 capitalize">{category.category}</td>
                        <td className="py-2 px-4 text-right">{category.totalQuantity}</td>
                        <td className="py-2 px-4 text-right">{percentage}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-80 text-muted-foreground">
            No consumption data available for the selected time range
          </div>
        )}
      </CardContent>
    </Card>
  )
}

