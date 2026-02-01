import { sqliteHelpers } from '@/lib/database/sqlite'

// Convert category name to URL-friendly slug
export function categoryToSlug(categoryName: string): string {
  return categoryName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')  // Replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, '') // Remove special characters except hyphens
}

// Convert URL slug back to category name and validate it exists
export async function slugToCategory(slug: string): Promise<string | null> {
  try {
    // Get all categories from database
    const categories = sqliteHelpers.getAllCategories()
    
    // First try exact match (for categories that might already have hyphens)
    let category = categories.find(cat => 
      categoryToSlug(cat.name) === slug || cat.name.toLowerCase() === slug
    )
    
    // If not found, try converting hyphens back to spaces
    if (!category) {
      const withSpaces = slug.replace(/-/g, ' ')
      category = categories.find(cat => cat.name.toLowerCase() === withSpaces)
    }
    
    return category ? category.name : null
  } catch (error) {
    console.error('Error validating category:', error)
    return null
  }
}

// Check if category exists in database
export function categoryExists(categoryName: string): boolean {
  try {
    const categories = sqliteHelpers.getAllCategories()
    return categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())
  } catch (error) {
    console.error('Error checking category existence:', error)
    return false
  }
}

// Get display information for a category
export function getCategoryDisplayInfo(categoryName: string): {
  title: string
  description: string
  buttonText: string
} {
  const name = categoryName.toLowerCase()
  
  // Predefined descriptions for known categories
  const descriptions: Record<string, string> = {
    'parts': 'Manage mechanical, electrical, and structural parts',
    'consumables': 'Track supplies that need regular replenishment',
    'equipment': 'Manage tools, machines, and other durable items',
    'tools': 'Hand tools, power tools, and maintenance equipment',
    'safety': 'Safety equipment and protective gear',
    'maintenance': 'Maintenance supplies and repair materials',
    'electrical': 'Electrical components and supplies',
    'automotive': 'Vehicle parts and automotive supplies',
    'projects': 'Project-related items and materials',
    'measurement instruments': 'Precision measurement and testing equipment',
    'pcr-defects': 'PCR defect tracking and analysis items',
    'pcr-documents': 'PCR documentation and reference materials',
    'pcr-pcb': 'PCR printed circuit board components',
    'pcr-software': 'PCR software tools and licenses',
    'pcr-testing instruments': 'PCR testing and validation instruments',
    'pcr-parts': 'PCR-specific parts and components',
    'test-category': 'Test items for system validation',
    'other': 'Miscellaneous items and general inventory'
  }

  // Generate title (capitalize first letter of each word)
  const title = categoryName
    .split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') + ' Inventory'

  // Get description or generate a default one
  const description = descriptions[name] || `Manage ${categoryName} inventory items`

  // Generate button text
  const buttonText = `Add New ${categoryName
    .split(/[-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')}`

  return { title, description, buttonText }
}