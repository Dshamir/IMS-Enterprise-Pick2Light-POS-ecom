"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { getConsumptionTrends } from "@/app/actions/reports"
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

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type TimeRange = "7days" | "30days" | "90days" | "year" | "all"
type GroupBy = "day" | "week" | "month"

export default function ConsumptionTrendsReport() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days")
  const [category, setCategory] = useState<string>("")
  const [groupBy, setGroupBy] = useState<GroupBy>("day")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [timeRange, category, groupBy])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getConsumptionTrends({
        timeRange,
        category: category || undefined,
        groupBy,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        // Prepare data for chart
        const data = {
          labels: result.data.map((item) => item.displayDate),
          datasets: [
            {
              label: "Consumption Quantity",
              data: result.data.map((item) => item.totalQuantity),
              borderColor: "rgb(53, 162, 235)",
              backgroundColor: "rgba(53, 162, 235, 0.5)",
              tension: 0.3,
            },
          ],
        }

        setChartData(data)
      }
    } catch (error: any) {
      setError(error.message || "Failed to load consumption trends")
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = () => {
    if (!chartData) return

    // Create CSV content
    const headers = ["Period", "Consumption Quantity"]
    const rows = chartData.labels.map((label: string, index: number) => [label, chartData.datasets[0].data[index]])

    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.join(","))].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `consumption-trends-${timeRange}.csv`)
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
        text: "Consumption Trends Over Time",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Quantity Consumed",
        },
      },
      x: {
        title: {
          display: true,
          text: "Time Period",
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Consumption Trends</CardTitle>
            <CardDescription>Analyze how inventory is consumed over time</CardDescription>
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

            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Group By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={exportData} disabled={!chartData}>
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
        ) : chartData && chartData.labels.length > 0 ? (
          <div className="h-80">
            <Line data={chartData} options={chartOptions} />
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

