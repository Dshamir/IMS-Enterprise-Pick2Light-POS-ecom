import { getDatabase } from '@/lib/database/sqlite'

// Create a wrapper that provides the database access pattern expected by the API files
export const sqliteHelpers = {
  // Direct database access for complex queries
  db: {
    get: (query: string, params?: any[]) => {
      const db = getDatabase()
      return db.prepare(query).get(...(params || []))
    },
    all: (query: string, params?: any[]) => {
      const db = getDatabase()
      return db.prepare(query).all(...(params || []))
    },
    run: (query: string, params?: any[]) => {
      const db = getDatabase()
      return db.prepare(query).run(...(params || []))
    }
  }
}