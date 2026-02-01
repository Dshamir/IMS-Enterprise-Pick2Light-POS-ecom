// Client-side mock for Supabase - no SQLite import here
export function createClientSupabaseClient() {
  return {
    from: (table: string) => {
      return {
        select: (columns = '*') => ({
          eq: (column: string, value: any) => ({
            single: async () => {
              // Client-side operations will be handled via API routes
              try {
                const response = await fetch(`/api/${table}?${column}=${value}`)
                const data = await response.json()
                return { data: data[0] || null, error: null }
              } catch (error) {
                return { data: null, error }
              }
            }
          }),
          order: (column: string) => ({
            limit: (count: number) => ({
              data: [], // Will be fetched via API
              error: null
            })
          }),
          data: [], // Will be fetched via API
          error: null
        }),
        insert: (data: any) => ({
          select: () => ({
            single: async () => {
              try {
                const response = await fetch(`/api/${table}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                })
                const result = await response.json()
                return { data: result, error: null }
              } catch (error) {
                return { data: null, error }
              }
            }
          })
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => ({
            select: () => ({
              single: async () => {
                try {
                  const response = await fetch(`/api/${table}/${value}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                  })
                  const result = await response.json()
                  return { data: result, error: null }
                } catch (error) {
                  return { data: null, error }
                }
              }
            })
          })
        }),
        delete: () => ({
          eq: (column: string, value: any) => ({
            async data() {
              try {
                await fetch(`/api/${table}/${value}`, { method: 'DELETE' })
                return { data: null, error: null }
              } catch (error) {
                return { data: null, error }
              }
            }
          })
        })
      }
    },

    // Auth mock
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null })
    },

    // Storage mock
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: any) => {
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('path', path)
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            })
            const result = await response.json()
            return { data: { path: result.path }, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `/uploads/${path}` }
        })
      })
    }
  }
}