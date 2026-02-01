"use client"

import Link from "next/link"
import { ArrowLeft, BarChart3, Activity, TrendingUp, Package, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AnalyticsPage() {
  const metrics = [
    { label: 'Total Operations', value: '1,234', change: '+12%', icon: Activity },
    { label: 'Products Tracked', value: '856', change: '+5%', icon: Package },
    { label: 'Accuracy Score', value: '98.5%', change: '+0.3%', icon: TrendingUp },
    { label: 'Value Managed', value: '$45K', change: '+8%', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50">
      {/* Header */}
      <div className="command-center-gradient text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
              <Link href="/command-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-white/90 text-sm">Command Center performance metrics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon
            return (
              <Card key={index} className="command-center-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <IconComponent className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
                  <div className="text-sm text-green-600">{metric.change}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Placeholder */}
        <Card className="command-center-card">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>
              Historical command center metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-purple-300">
              <p className="text-gray-500">Charts and visualizations coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
