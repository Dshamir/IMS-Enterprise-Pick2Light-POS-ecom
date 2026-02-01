import { getDatabase, sqliteHelpers } from '@/lib/database/sqlite'
import type { Database } from '@/lib/database.types'

// Mock Supabase-like interface for SQLite
export function createServerSupabaseClient() {
  const db = getDatabase()
  
  return {
    from: (table: string) => {
      switch (table) {
        case 'products':
          return {
            select: (columns = '*') => ({
              eq: (column: string, value: any) => ({
                single: () => {
                  if (column === 'id') {
                    return { data: sqliteHelpers.getProductById(value), error: null }
                  }
                  return { data: null, error: new Error('Not implemented') }
                }
              }),
              gt: (column: string, value: any) => ({
                order: (orderBy: string, options?: { ascending?: boolean }) => ({
                  data: sqliteHelpers.getAllProducts(),
                  error: null
                }),
                data: sqliteHelpers.getAllProducts(),
                error: null
              }),
              lte: (column: string, value: any) => ({
                order: (orderBy: string, options?: { ascending?: boolean }) => ({
                  data: column === 'stock_quantity' ? sqliteHelpers.getLowStockProducts() : [],
                  error: null
                })
              }),
              order: (column: string, options?: { ascending?: boolean }) => ({
                limit: (count: number) => ({
                  data: sqliteHelpers.getAllProducts().slice(0, count),
                  error: null
                }),
                data: sqliteHelpers.getAllProducts(),
                error: null
              }),
              limit: (count: number) => ({
                data: sqliteHelpers.getAllProducts().slice(0, count),
                error: null
              }),
              data: sqliteHelpers.getAllProducts(),
              error: null
            }),
            insert: (data: any) => ({
              select: () => ({
                single: () => {
                  try {
                    const result = sqliteHelpers.createProduct(data)
                    const newProduct = sqliteHelpers.getProductById(result.lastInsertRowid.toString())
                    return { data: newProduct, error: null }
                  } catch (error) {
                    return { data: null, error }
                  }
                }
              })
            }),
            update: (data: any) => ({
              eq: (column: string, value: any) => ({
                select: () => ({
                  single: () => {
                    try {
                      sqliteHelpers.updateProduct(value, data)
                      const updatedProduct = sqliteHelpers.getProductById(value)
                      return { data: updatedProduct, error: null }
                    } catch (error) {
                      return { data: null, error }
                    }
                  }
                })
              })
            }),
            delete: () => ({
              eq: (column: string, value: any) => {
                try {
                  sqliteHelpers.deleteProduct(value)
                  return { data: null, error: null }
                } catch (error) {
                  return { data: null, error }
                }
              }
            })
          }

        case 'inventory_transactions':
          return {
            select: (columns = '*') => ({
              eq: (column: string, value: any) => ({
                gte: (gteColumn: string, gteValue: any) => ({
                  order: (orderBy: string, options?: { ascending?: boolean }) => ({
                    data: sqliteHelpers.getInventoryTransactions().filter(t => 
                      (column === 'transaction_type' ? t.transaction_type === value : true) &&
                      (gteColumn === 'created_at' ? new Date(t.created_at) >= new Date(gteValue) : true)
                    ),
                    error: null
                  }),
                  data: sqliteHelpers.getInventoryTransactions().filter(t => 
                    (column === 'transaction_type' ? t.transaction_type === value : true) &&
                    (gteColumn === 'created_at' ? new Date(t.created_at) >= new Date(gteValue) : true)
                  ),
                  error: null
                }),
                order: (orderBy: string, options?: { ascending?: boolean }) => ({
                  limit: (count: number) => ({
                    data: sqliteHelpers.getInventoryTransactions(value).slice(0, count),
                    error: null
                  }),
                  data: sqliteHelpers.getInventoryTransactions(value),
                  error: null
                })
              }),
              order: (orderBy: string, options?: { ascending?: boolean }) => ({
                limit: (count: number) => ({
                  data: sqliteHelpers.getInventoryTransactions().slice(0, count),
                  error: null
                }),
                data: sqliteHelpers.getInventoryTransactions(),
                error: null
              }),
              limit: (count: number) => ({
                data: sqliteHelpers.getInventoryTransactions().slice(0, count),
                error: null
              }),
              data: sqliteHelpers.getInventoryTransactions(),
              error: null
            }),
            insert: (data: any) => ({
              select: () => ({
                single: () => {
                  try {
                    sqliteHelpers.createInventoryTransaction(data)
                    return { data: data, error: null }
                  } catch (error) {
                    return { data: null, error }
                  }
                }
              })
            })
          }

        default:
          return {
            select: () => ({ 
              data: [], 
              error: null,
              not: () => ({ data: [], error: null }),
              gt: () => ({ data: [], error: null }),
              lte: () => ({ data: [], error: null }),
              order: () => ({ data: [], error: null }),
              limit: () => ({ data: [], error: null })
            }),
            insert: () => ({ data: null, error: new Error('Table not implemented') }),
            update: () => ({ data: null, error: new Error('Table not implemented') }),
            delete: () => ({ data: null, error: new Error('Table not implemented') })
          }
      }
    },
    
    // Storage mock (for image uploads)
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, file: any) => ({
          data: { path: `/uploads/${path}` },
          error: null
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `/uploads/${path}` }
        })
      })
    },

    // RPC mock for vector search
    rpc: (functionName: string, params: any) => {
      if (functionName === 'search_similar_products') {
        // Simple text-based search fallback
        const searchResults = sqliteHelpers.searchProducts(params.query_text || '')
        return { data: searchResults, error: null }
      }
      return { data: [], error: null }
    }
  }
}