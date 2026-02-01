'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Briefcase, Building, Package, DollarSign, Calendar, Users, TrendingUp, Activity, Factory, Plus } from "lucide-react"
import { ProjectList } from "../projects/project-list"
import { ProductionLineList } from "../production-lines/production-line-list"
import { ManufacturingBOMList } from "../boms/manufacturing-bom-list"
import { ProductionRunManager } from "../production/production-run-manager"
import { ProductionHistory } from "../production/production-history"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExcelImportDialog } from "@/components/manufacturing/serial/excel-import-dialog"

interface DashboardStats {
  activeProjects: number
  activeProductionLines: number
  totalBOMs: number
  totalValue: number
  activeProductionRuns: number
  recentActivity: {
    projects: number
    productionLines: number
    boms: number
    productionRuns: number
  }
}

export function ManufacturingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    activeProductionLines: 0,
    totalBOMs: 0,
    totalValue: 0,
    activeProductionRuns: 0,
    recentActivity: {
      projects: 0,
      productionLines: 0,
      boms: 0,
      productionRuns: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [showExcelImport, setShowExcelImport] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const [projectsRes, productionLinesRes, bomsRes, productionRunsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/production-lines'),
        fetch('/api/manufacturing-boms'),
        fetch('/api/production-runs')
      ])

      const [projects, productionLines, boms, productionRuns] = await Promise.all([
        projectsRes.ok ? projectsRes.json() : [],
        productionLinesRes.ok ? productionLinesRes.json() : [],
        bomsRes.ok ? bomsRes.json() : [],
        productionRunsRes.ok ? productionRunsRes.json() : []
      ])

      const activeProjects = Array.isArray(projects) ? projects.filter(p => p.status === 'active').length : 0
      const activeProductionLines = Array.isArray(productionLines) ? productionLines.filter(pl => pl.status === 'active').length : 0
      const totalBOMs = Array.isArray(boms) ? boms.length : 0
      const totalValue = Array.isArray(boms) ? boms.reduce((sum, bom) => sum + (bom.total_cost || 0), 0) : 0
      const activeProductionRuns = Array.isArray(productionRuns) ? productionRuns.filter(pr => pr.status === 'in_progress').length : 0

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentProjects = Array.isArray(projects) ? projects.filter(p => new Date(p.created_at) >= sevenDaysAgo).length : 0
      const recentProductionLines = Array.isArray(productionLines) ? productionLines.filter(pl => new Date(pl.created_at) >= sevenDaysAgo).length : 0
      const recentBOMs = Array.isArray(boms) ? boms.filter(b => new Date(b.created_at) >= sevenDaysAgo).length : 0
      const recentProductionRuns = Array.isArray(productionRuns) ? productionRuns.filter(pr => new Date(pr.created_at) >= sevenDaysAgo).length : 0

      setStats({
        activeProjects,
        activeProductionLines,
        totalBOMs,
        totalValue,
        activeProductionRuns,
        recentActivity: {
          projects: recentProjects,
          productionLines: recentProductionLines,
          boms: recentBOMs,
          productionRuns: recentProductionRuns
        }
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Manufacturing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage projects, production lines, and Bills of Materials
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/products/new?category=Manufactured Products&manufactured=true">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Finished Product
            </Button>
          </Link>
          <Button 
            variant="outline"
            onClick={() => setShowExcelImport(true)}
          >
            <Package className="h-4 w-4 mr-2" />
            Import Serial Numbers
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentActivity.projects > 0 
                ? `+${stats.recentActivity.projects} this week`
                : 'No new projects this week'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Lines</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProductionLines}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentActivity.productionLines > 0 
                ? `+${stats.recentActivity.productionLines} this week`
                : 'No new lines this week'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manufacturing BOMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBOMs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentActivity.boms > 0 
                ? `+${stats.recentActivity.boms} this week`
                : 'No new BOMs this week'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total BOM Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Material costs across all BOMs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Runs</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProductionRuns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.recentActivity.productionRuns > 0 
                ? `+${stats.recentActivity.productionRuns} this week`
                : 'No new runs this week'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                {stats.recentActivity.projects} new projects
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-green-500" />
              <span className="text-sm">
                {stats.recentActivity.productionLines} new production lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span className="text-sm">
                {stats.recentActivity.boms} new BOMs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-orange-500" />
              <span className="text-sm">
                {stats.recentActivity.productionRuns} new production runs
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="production-lines" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Production Lines
          </TabsTrigger>
          <TabsTrigger value="boms" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Manufacturing BOMs
          </TabsTrigger>
          <TabsTrigger value="production-runs" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Runs
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ProjectList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production-lines" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ProductionLineList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="boms" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ManufacturingBOMList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production-runs" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ProductionRunManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <ProductionHistory />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Excel Import Dialog */}
      <ExcelImportDialog
        open={showExcelImport}
        onOpenChange={setShowExcelImport}
        onImportComplete={() => {
          // Refresh dashboard stats after import
          fetchDashboardStats()
        }}
      />
    </div>
  )
}