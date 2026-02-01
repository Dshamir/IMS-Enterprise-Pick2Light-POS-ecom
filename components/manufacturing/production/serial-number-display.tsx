'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Hash, 
  Package, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react"

interface SerialNumber {
  id: string
  serial_number: string
  model: string
  part_number: string
  counter: number
  sequence_number: number
  status: 'allocated' | 'assigned' | 'consumed'
  allocated_at: string
  assigned_at?: string
  consumed_at?: string
  assigned_to_instance_id?: string
  template_name: string
  format_template: string
}

interface SerialNumberSummary {
  total_allocated: number
  allocated_count: number
  assigned_count: number
  consumed_count: number
}

interface ProductionRun {
  id: string
  bom_name: string
  planned_quantity: number
  actual_quantity: number
  status: string
}

interface SerialNumberDisplayProps {
  productionRunId: string
  className?: string
}

export function SerialNumberDisplay({ productionRunId, className = "" }: SerialNumberDisplayProps) {
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([])
  const [summary, setSummary] = useState<SerialNumberSummary | null>(null)
  const [productionRun, setProductionRun] = useState<ProductionRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSerialNumbers = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/production-runs/${productionRunId}/serial-numbers`)
      if (response.ok) {
        const data = await response.json()
        setSerialNumbers(data.serial_numbers || [])
        setSummary(data.summary)
        setProductionRun(data.production_run)
      } else {
        console.error('Failed to fetch serial numbers')
      }
    } catch (error) {
      console.error('Error fetching serial numbers:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (productionRunId) {
      fetchSerialNumbers()
    }
  }, [productionRunId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'allocated':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'assigned':
        return <Package className="h-3 w-3 text-orange-500" />
      case 'consumed':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      default:
        return <AlertCircle className="h-3 w-3 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'allocated':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'assigned':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'consumed':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading serial numbers...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.total_allocated === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No serial numbers allocated</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Serial Numbers</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {summary.total_allocated} allocated
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSerialNumbers}
              disabled={refreshing}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Serial numbers for {productionRun?.bom_name} production run
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-lg font-semibold text-blue-700">{summary.allocated_count}</div>
            <div className="text-xs text-blue-600">Allocated</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-lg font-semibold text-orange-700">{summary.assigned_count}</div>
            <div className="text-xs text-orange-600">Assigned</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
            <div className="text-lg font-semibold text-green-700">{summary.consumed_count}</div>
            <div className="text-xs text-green-600">Consumed</div>
          </div>
        </div>

        {expanded && serialNumbers.length > 0 && (
          <>
            <Separator className="mb-3" />
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {serialNumbers.map((serial) => (
                  <div
                    key={serial.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(serial.status)}
                      <div>
                        <div className="font-mono text-sm font-medium">
                          {serial.serial_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #{serial.sequence_number} • {serial.model}
                        </div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(serial.status)}`}
                    >
                      {serial.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {serialNumbers[0]?.template_name && (
              <div className="mt-3 text-xs text-muted-foreground">
                Generated using template: <span className="font-medium">{serialNumbers[0].template_name}</span>
                {serialNumbers[0]?.format_template && (
                  <span className="font-mono ml-1">({serialNumbers[0].format_template})</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}