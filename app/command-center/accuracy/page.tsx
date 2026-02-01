"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"

export default function AccuracyPage() {
  const { toast } = useToast()
  const [accuracy, setAccuracy] = useState(98.5)
  const [trend, setTrend] = useState(0.3)
  const [isLoading, setIsLoading] = useState(false)

  const loadAccuracy = async () => {
    setIsLoading(true)
    try {
      // Fetch products to calculate accuracy
      const response = await fetch('/api/products')
      if (response.ok) {
        const products = await response.json()
        // Mock calculation - in real implementation, compare with physical counts
        const totalProducts = products.length
        const accurateProducts = Math.floor(totalProducts * 0.985)
        const calculatedAccuracy = (accurateProducts / totalProducts) * 100
        setAccuracy(calculatedAccuracy)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load accuracy metrics"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAccuracy()
    const interval = setInterval(loadAccuracy, 5000)
    return () => clearInterval(interval)
  }, [])

  const getAccuracyStatus = () => {
    if (accuracy >= 98) return { label: 'Excellent', class: 'accuracy-excellent', icon: CheckCircle2 }
    if (accuracy >= 95) return { label: 'Good', class: 'accuracy-good', icon: CheckCircle2 }
    if (accuracy >= 90) return { label: 'Warning', class: 'accuracy-warning', icon: AlertTriangle }
    return { label: 'Critical', class: 'accuracy-critical', icon: AlertTriangle }
  }

  const status = getAccuracyStatus()
  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="command-center-gradient text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
                <Link href="/command-center">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Accuracy Tracking</h1>
                  <p className="text-white/90 text-sm">Real-time inventory accuracy monitoring</p>
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadAccuracy}
              disabled={isLoading}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Accuracy Card */}
        <Card className="command-center-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Accuracy</span>
              <Badge className={`${status.class} border rounded-full px-4 py-1`}>
                <StatusIcon className="h-4 w-4 mr-2" />
                {status.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Live inventory accuracy tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {accuracy.toFixed(2)}%
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                {trend >= 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">+{trend.toFixed(2)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">{trend.toFixed(2)}%</span>
                  </>
                )}
                <span className="text-gray-500">vs. last period</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Overall Accuracy</span>
                  <span className="text-gray-500">{accuracy.toFixed(1)}%</span>
                </div>
                <Progress value={accuracy} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-600">{Math.floor(accuracy * 10)}</p>
                  <p className="text-xs text-gray-600">Accurate Items</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-2xl font-bold text-amber-600">{Math.floor((100 - accuracy) * 10)}</p>
                  <p className="text-xs text-gray-600">Discrepancies</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">1000</p>
                  <p className="text-xs text-gray-600">Total Items</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone Accuracy Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { zone: 'Zone A - Receiving', accuracy: 99.2, status: 'excellent' },
            { zone: 'Zone B - Main Storage', accuracy: 98.7, status: 'excellent' },
            { zone: 'Zone C - Pick Area', accuracy: 97.8, status: 'good' },
            { zone: 'Zone D - Packing', accuracy: 98.1, status: 'good' },
            { zone: 'Zone E - Shipping', accuracy: 99.5, status: 'excellent' },
          ].map((zone, index) => (
            <Card key={index} className="command-center-card">
              <CardHeader>
                <CardTitle className="text-lg">{zone.zone}</CardTitle>
                <CardDescription>Zone accuracy tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-4">
                  {zone.accuracy.toFixed(1)}%
                </div>
                <Progress value={zone.accuracy} className="h-2 mb-3" />
                <Badge className={`accuracy-${zone.status} border rounded-full`}>
                  {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommendations */}
        <Card className="command-center-card mt-8">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Actions to improve accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Overall accuracy is excellent</p>
                  <p className="text-sm text-blue-700">Maintain current processes</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Zone C accuracy could be improved</p>
                  <p className="text-sm text-amber-700">Consider a spot audit in the Pick Area</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
