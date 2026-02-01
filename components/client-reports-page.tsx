"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ConsumptionTrendsReport from "@/components/reports/consumption-trends-report"
import TopConsumedProductsReport from "@/components/reports/top-consumed-products-report"
import CategoryConsumptionReport from "@/components/reports/category-consumption-report"
import ProductStockHistoryReport from "@/components/reports/product-stock-history-report"

type ReportTab = "trends" | "top-products" | "categories" | "stock-history"

export default function ClientReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("trends")

  return (
    <div className="space-y-6">
      <Tabs defaultValue="trends" onValueChange={(value) => setActiveTab(value as ReportTab)}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="trends">Consumption Trends</TabsTrigger>
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
          <TabsTrigger value="stock-history">Stock History</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <ConsumptionTrendsReport />
        </TabsContent>

        <TabsContent value="top-products" className="space-y-4">
          <TopConsumedProductsReport />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoryConsumptionReport />
        </TabsContent>

        <TabsContent value="stock-history" className="space-y-4">
          <ProductStockHistoryReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}

