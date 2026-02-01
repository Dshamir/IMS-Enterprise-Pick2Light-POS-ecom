"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, PlusCircle, MinusCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TransactionHistoryProps {
  productId: string
  limit?: number
}

interface Transaction {
  id: string
  transaction_type: string
  quantity: number
  previous_quantity: number
  new_quantity: number
  reason: string | null
  notes: string | null
  created_at: string
}

export default function TransactionHistory({ productId, limit = 10 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/products/${productId}/transactions?limit=${showAll ? 100 : limit}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setTransactions(data.transactions || [])
      }
    } catch (error: any) {
      setError(error.message || "Failed to load transaction history")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [productId, limit, showAll])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "addition":
        return <PlusCircle className="h-4 w-4 text-green-500" />
      case "reduction":
        return <MinusCircle className="h-4 w-4 text-red-500" />
      case "adjustment":
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case "addition":
        return "Added"
      case "reduction":
        return "Removed"
      case "adjustment":
        return "Adjusted"
      default:
        return type
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Record of inventory changes</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">No transactions recorded yet</div>
            <div className="text-sm text-muted-foreground">
              Transactions will appear here when you:
            </div>
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              <div>• Add or remove stock using the Inventory tab</div>
              <div>• Make stock adjustments through the stock adjustment form</div>
              <div>• Record inventory changes</div>
            </div>
            <div className="text-xs text-muted-foreground mt-4 px-4">
              Tip: Use the "Add Stock" or "Reduce Stock" buttons above to create your first transaction
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transaction_type)}
                      <div className="ml-2">
                        <div className="font-medium flex items-center">
                          {formatTransactionType(transaction.transaction_type)}
                          <Badge variant="outline" className="ml-2">
                            {transaction.transaction_type === "adjustment"
                              ? `${transaction.previous_quantity} → ${transaction.new_quantity}`
                              : transaction.quantity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.reason || "No reason provided"}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <div>{new Date(transaction.created_at).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {transaction.notes && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                      {transaction.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {transactions.length >= limit && !showAll && (
              <div className="text-center">
                <Button variant="outline" onClick={() => setShowAll(true)}>
                  View All Transactions
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

