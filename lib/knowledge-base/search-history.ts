/**
 * Search History for Knowledge Base
 *
 * Client-side search history using localStorage.
 * Stores the last N searches with timestamps for quick re-search.
 */

const STORAGE_KEY = 'kb_search_history'
const MAX_HISTORY = 10

export interface SearchHistoryItem {
  query: string
  timestamp: number
}

/**
 * Get search history from localStorage
 */
export function getHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const history = JSON.parse(stored) as SearchHistoryItem[]

    // Validate and clean up
    return history
      .filter(item => item.query && typeof item.query === 'string' && item.timestamp)
      .slice(0, MAX_HISTORY)
  } catch (error) {
    console.error('Failed to load search history:', error)
    return []
  }
}

/**
 * Add a query to search history
 * Moves to top if already exists, removes oldest if at limit
 */
export function addToHistory(query: string): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []

  const trimmedQuery = query.trim()
  if (!trimmedQuery) return getHistory()

  try {
    let history = getHistory()

    // Remove existing entry with same query (case-insensitive)
    history = history.filter(
      item => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
    )

    // Add new entry at the beginning
    history.unshift({
      query: trimmedQuery,
      timestamp: Date.now()
    })

    // Keep only MAX_HISTORY items
    history = history.slice(0, MAX_HISTORY)

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))

    return history
  } catch (error) {
    console.error('Failed to save search history:', error)
    return getHistory()
  }
}

/**
 * Remove a specific query from history
 */
export function removeFromHistory(query: string): SearchHistoryItem[] {
  if (typeof window === 'undefined') return []

  try {
    let history = getHistory()

    // Remove matching entry (case-insensitive)
    history = history.filter(
      item => item.query.toLowerCase() !== query.toLowerCase()
    )

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))

    return history
  } catch (error) {
    console.error('Failed to remove from search history:', error)
    return getHistory()
  }
}

/**
 * Clear all search history
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear search history:', error)
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  // For older entries, show date
  return new Date(timestamp).toLocaleDateString()
}
