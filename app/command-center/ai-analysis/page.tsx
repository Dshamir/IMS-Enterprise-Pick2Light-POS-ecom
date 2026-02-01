"use client"

import Link from "next/link"
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AIAnalysisPage() {
  const insights = [
    {
      type: 'opportunity',
      icon: Lightbulb,
      title: 'Optimization Opportunity',
      description: 'Consider consolidating Zone B inventory to reduce picking time by 15%',
      priority: 'medium',
      impact: '+15% efficiency'
    },
    {
      type: 'success',
      icon: CheckCircle2,
      title: 'Performance Excellent',
      description: 'Accuracy has maintained above 98% for 30 consecutive days',
      priority: 'low',
      impact: 'Maintain current'
    },
    {
      type: 'warning',
      icon: AlertTriangle,
      title: 'Stock Pattern Detected',
      description: '12 products show recurring stockouts every 3rd week',
      priority: 'high',
      impact: 'Adjust reorder points'
    },
    {
      type: 'trend',
      icon: TrendingUp,
      title: 'Positive Trend',
      description: 'Warehouse throughput increased 8% month-over-month',
      priority: 'low',
      impact: '+8% throughput'
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300'
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
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
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">AI Analysis</h1>
                <p className="text-white/90 text-sm">Intelligent insights and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* AI Insights */}
        <div className="grid gap-6">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon
            return (
              <Card key={index} className="command-center-card hover:scale-[1.02] transition-transform">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                        <Badge className={`${getPriorityColor(insight.priority)} border rounded-full`}>
                          {insight.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{insight.description}</p>
                      <div className="flex items-center gap-4">
                        <Badge className="command-center-badge-outline">
                          Impact: {insight.impact}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* AI Agent Integration */}
        <Card className="command-center-card mt-8">
          <CardHeader>
            <CardTitle>AI Agent Integration</CardTitle>
            <CardDescription>
              Connect with AI Assistant for detailed analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="command-center-button-primary">
              <Link href="/ai-assistant">
                Open AI Assistant
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
