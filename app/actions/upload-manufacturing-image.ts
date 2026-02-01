"use server"

export type ManufacturingEntityType = 'projects' | 'production-lines' | 'manufacturing-boms' | 'production-runs'

export async function uploadManufacturingImage(formData: FormData, entityType: ManufacturingEntityType) {
  try {
    const file = formData.get("image") as File

    if (!file) {
      return { error: "No file provided" }
    }

    // Validate entity type
    const validTypes: ManufacturingEntityType[] = ['projects', 'production-lines', 'manufacturing-boms', 'production-runs']
    if (!validTypes.includes(entityType)) {
      return { error: "Invalid entity type" }
    }

    // Create new FormData with the file for the upload API
    const uploadFormData = new FormData()
    uploadFormData.append("image", file)
    uploadFormData.append("entityType", entityType)

    // Use the local upload API - support both localhost and network access
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
    
    const uploadResponse = await fetch(`${baseUrl}/api/upload/manufacturing-image`, {
      method: 'POST',
      body: uploadFormData
    })

    console.log('Manufacturing image upload response status:', uploadResponse.status)
    console.log('Manufacturing image upload response statusText:', uploadResponse.statusText)

    if (!uploadResponse.ok) {
      try {
        const errorData = await uploadResponse.json()
        return { error: errorData.error || 'Failed to upload manufacturing image' }
      } catch (parseError) {
        console.error('Failed to parse upload error response:', parseError)
        return { error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}` }
      }
    }

    const result = await uploadResponse.json()
    return { url: result.url }
  } catch (error) {
    console.error("Error uploading manufacturing image:", error)
    return { error: "Failed to upload manufacturing image" }
  }
}