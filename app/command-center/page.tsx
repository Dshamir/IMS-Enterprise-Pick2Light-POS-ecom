"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Zap,
  Box,
  Target,
  Mic,
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Settings,
  BarChart3,
  Package
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface RealtimeMetrics {
  totalProducts: number
  totalValue: number
  accuracy: number
  activeZones: number
  lowStockCount: number
  lastUpdate: string
}

export default function CommandCenterPage() {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    totalProducts: 0,
    totalValue: 0,
    accuracy: 0,
    activeZones: 0,
    lowStockCount: 0,
    lastUpdate: new Date().toISOString()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(1000) // Default 1 second

  // Load configuration and metrics
  useEffect(() => {
    loadConfig()
    loadMetrics()
  }, [])

  // Real-time data refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/command-center/config')
      if (response.ok) {
        const config = await response.json()
        const refreshConfig = config.find((c: any) => c.key === 'refresh_interval_ms')
        if (refreshConfig) {
          setRefreshInterval(Number(refreshConfig.value))
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const loadMetrics = async () => {
    try {
      // Fetch real-time metrics from various endpoints
      const [productsRes, zonesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/command-center/warehouse-zones')
      ])

      if (productsRes.ok && zonesRes.ok) {
        const productsData = await productsRes.json()
        const zones = await zonesRes.json()

        // Extract products array from response (API returns { products: [...], total: ..., searchMethod: ... })
        const products = Array.isArray(productsData) ? productsData : (productsData.products || [])

        // Calculate metrics
        const totalProducts = products.length
        const totalValue = products.reduce((sum: number, p: any) =>
          sum + (p.price * p.stock_quantity), 0
        )
        const lowStockCount = products.filter((p: any) =>
          p.stock_quantity <= p.min_stock_level
        ).length

        // Calculate accuracy (mock for now - will be real from accuracy metrics)
        const accuracy = 98.5

        setMetrics({
          totalProducts,
          totalValue,
          accuracy,
          activeZones: zones.filter((z: any) => z.is_active).length,
          lowStockCount,
          lastUpdate: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    {
      key: 'warehouse_3d',
      name: '3D Warehouse View',
      description: 'Interactive 3D visualization of warehouse zones',
      icon: Box,
      href: '/command-center/warehouse',
      color: 'from-blue-500 to-cyan-500',
      stats: `${metrics.activeZones} Active Zones`
    },
    {
      key: 'accuracy_tracker',
      name: 'Accuracy Tracking',
      description: 'Real-time inventory accuracy monitoring',
      icon: Target,
      href: '/command-center/accuracy',
      color: 'from-green-500 to-emerald-500',
      stats: `${metrics.accuracy.toFixed(1)}% Accuracy`
    },
    {
      key: 'voice_commands',
      name: 'Voice Control',
      description: 'Voice-activated command interface',
      icon: Mic,
      href: '/command-center/voice',
      color: 'from-purple-500 to-pink-500',
      stats: 'Voice Ready'
    },
    {
      key: 'ai_analysis',
      name: 'AI Analysis',
      description: 'Intelligent insights and recommendations',
      icon: Brain,
      href: '/command-center/ai-analysis',
      color: 'from-indigo-500 to-purple-500',
      stats: 'AI Powered'
    },
    {
      key: 'autopilot',
      name: 'Autopilot',
      description: 'Automated inventory management',
      icon: Zap,
      href: '/command-center/autopilot',
      color: 'from-yellow-500 to-orange-500',
      stats: 'Automation Ready'
    },
    {
      key: 'reports',
      name: 'Analytics',
      description: 'Command Center performance metrics',
      icon: BarChart3,
      href: '/command-center/analytics',
      color: 'from-pink-500 to-rose-500',
      stats: 'Live Data'
    }
  ]

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 98) return { label: 'Excellent', class: 'accuracy-excellent' }
    if (accuracy >= 95) return { label: 'Good', class: 'accuracy-good' }
    if (accuracy >= 90) return { label: 'Warning', class: 'accuracy-warning' }
    return { label: 'Critical', class: 'accuracy-critical' }
  }

  const accuracyStatus = getAccuracyStatus(metrics.accuracy)

  return (
    <div className="min-h-screen">
      {/* Animated gradient header */}
      <div className="command-center-animated-gradient text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                  <Zap className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">AI Command Center</h1>
                  <p className="text-white/90 mt-1">Real-time inventory intelligence</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadMetrics}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 border-white/30"
              >
                <Link href="/settings?tab=command-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Real-time status */}
          <div className="flex items-center gap-2 text-sm text-white/80">
            <div className="w-2 h-2 bg-green-400 rounded-full command-center-pulse" />
            <span>Live • Updates every {refreshInterval / 1000}s</span>
            <span className="ml-4">Last update: {new Date(metrics.lastUpdate).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Real-time metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Products */}
          <div className="command-center-metric-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Total Products</p>
                <h3 className="text-3xl font-bold text-purple-900">{metrics.totalProducts}</h3>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <Package className="h-6 w-6 text-purple-700" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <Activity className="h-4 w-4" />
              <span>Real-time tracking</span>
            </div>
          </div>

          {/* Total Value */}
          <div className="command-center-metric-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Inventory Value</p>
                <h3 className="text-3xl font-bold text-purple-900">
                  ${metrics.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </h3>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-700" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Total assets</span>
            </div>
          </div>

          {/* Accuracy */}
          <div className="command-center-metric-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Accuracy</p>
                <h3 className="text-3xl font-bold text-purple-900">{metrics.accuracy.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <Target className="h-6 w-6 text-blue-700" />
              </div>
            </div>
            <Badge className={`${accuracyStatus.class} border rounded-full`}>
              {accuracyStatus.label}
            </Badge>
          </div>

          {/* Low Stock Alerts */}
          <div className="command-center-metric-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-1">Low Stock Alerts</p>
                <h3 className="text-3xl font-bold text-purple-900">{metrics.lowStockCount}</h3>
              </div>
              <div className="p-3 bg-amber-200 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-amber-700" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              {metrics.lowStockCount > 0 ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span>Requires attention</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All stock levels good</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Feature tiles */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Command Center Features
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Link
                key={feature.key}
                href={feature.disabled ? '#' : feature.href}
                className={feature.disabled ? 'pointer-events-none opacity-60' : ''}
              >
                <div className="command-center-feature-tile group h-full">
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-4 bg-gradient-to-br ${feature.color} rounded-xl text-white shadow-lg`}>
                        <feature.icon className="h-8 w-8" />
                      </div>
                      {feature.disabled ? (
                        <Badge variant="outline" className="text-xs">
                          Coming Soon
                        </Badge>
                      ) : (
                        <ArrowRight className="h-5 w-5 text-purple-400 transform group-hover:translate-x-1 transition-transform" />
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {feature.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-purple-600">
                        {feature.stats}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
          <h3 className="text-lg font-bold text-purple-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="command-center-button-secondary">
              <Link href="/command-center/warehouse">
                <Box className="h-4 w-4 mr-2" />
                View 3D Warehouse
              </Link>
            </Button>
            <Button asChild className="command-center-button-secondary">
              <Link href="/command-center/accuracy">
                <Target className="h-4 w-4 mr-2" />
                Check Accuracy
              </Link>
            </Button>
            <Button asChild className="command-center-button-secondary">
              <Link href="/settings?tab=command-center">
                <Settings className="h-4 w-4 mr-2" />
                Configure Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
