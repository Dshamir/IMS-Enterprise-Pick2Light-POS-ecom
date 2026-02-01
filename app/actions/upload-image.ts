"use server"

export async function uploadProductImage(formData: FormData) {
  try {
    const file = formData.get("image") as File

    if (!file) {
      return { error: "No file provided" }
    }

    // Use the local upload API - support both localhost and network access
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
    
    const uploadResponse = await fetch(`${baseUrl}/api/upload/image`, {
      method: 'POST',
      body: formData
    })

    console.log('Upload response status:', uploadResponse.status)
    console.log('Upload response statusText:', uploadResponse.statusText)

    if (!uploadResponse.ok) {
      try {
        const errorData = await uploadResponse.json()
        return { error: errorData.error || 'Failed to upload image' }
      } catch (parseError) {
        console.error('Failed to parse upload error response:', parseError)
        return { error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}` }
      }
    }

    const result = await uploadResponse.json()
    return { url: result.url }
  } catch (error) {
    console.error("Error uploading image:", error)
    return { error: "Failed to upload image" }
  }
}

