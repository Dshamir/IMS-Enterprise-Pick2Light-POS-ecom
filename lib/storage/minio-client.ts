/**
 * MinIO S3-Compatible Storage Client
 *
 * Provides S3-compatible object storage for production deployments.
 * Falls back to local filesystem in development for convenience.
 *
 * Environment Variables:
 *   - MINIO_ENDPOINT: MinIO server hostname (default: minio)
 *   - MINIO_PORT: MinIO server port (default: 9000)
 *   - MINIO_ACCESS_KEY: Access key ID
 *   - MINIO_SECRET_KEY: Secret access key
 *   - MINIO_USE_SSL: Enable SSL (default: false)
 *   - MINIO_BUCKET: Bucket name (default: ims-uploads)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

// Check if we're in production with MinIO configured
const isProduction = process.env.NODE_ENV === 'production'
const hasMinioConfig = !!(process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY)

// Bucket name for all uploads
const BUCKET_NAME = process.env.MINIO_BUCKET || 'ims-uploads'

// Initialize S3 client only if MinIO is configured
export const s3Client =
  isProduction && hasMinioConfig
    ? new S3Client({
        endpoint: `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || '9000'}`,
        region: 'us-east-1', // MinIO doesn't care about region, but SDK requires it
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY!,
          secretAccessKey: process.env.MINIO_SECRET_KEY!,
        },
        forcePathStyle: true, // Required for MinIO
      })
    : null

/**
 * Upload a file to storage
 *
 * @param file - File buffer to upload
 * @param key - Storage key (path within bucket)
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToStorage(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Production: Upload to MinIO
  if (s3Client) {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        // Make publicly readable
        ACL: 'public-read',
      },
    })

    await upload.done()

    // Return URL path that nginx will proxy to MinIO
    return `/uploads/${key}`
  }

  // Development: Write to local filesystem
  const { writeFile, mkdir } = await import('fs/promises')
  const { join, dirname } = await import('path')

  const localPath = join(process.cwd(), 'public', 'uploads', key)

  // Ensure directory exists
  await mkdir(dirname(localPath), { recursive: true })

  // Write file
  await writeFile(localPath, file)

  return `/uploads/${key}`
}

/**
 * Delete a file from storage
 *
 * @param key - Storage key to delete
 */
export async function deleteFromStorage(key: string): Promise<void> {
  // Production: Delete from MinIO
  if (s3Client) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    )
    return
  }

  // Development: Delete from local filesystem
  const { unlink } = await import('fs/promises')
  const { join } = await import('path')

  try {
    await unlink(join(process.cwd(), 'public', 'uploads', key))
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

/**
 * Check if a file exists in storage
 *
 * @param key - Storage key to check
 * @returns true if file exists
 */
export async function existsInStorage(key: string): Promise<boolean> {
  // Production: Check MinIO
  if (s3Client) {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }

  // Development: Check local filesystem
  const { access } = await import('fs/promises')
  const { join } = await import('path')

  try {
    await access(join(process.cwd(), 'public', 'uploads', key))
    return true
  } catch {
    return false
  }
}

/**
 * List files in a storage directory
 *
 * @param prefix - Directory prefix to list
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns Array of file keys
 */
export async function listStorageFiles(
  prefix: string,
  maxKeys: number = 1000
): Promise<string[]> {
  // Production: List from MinIO
  if (s3Client) {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: maxKeys,
      })
    )

    return (response.Contents || []).map((item) => item.Key!).filter(Boolean)
  }

  // Development: List from local filesystem
  const { readdir } = await import('fs/promises')
  const { join } = await import('path')

  try {
    const dirPath = join(process.cwd(), 'public', 'uploads', prefix)
    const files = await readdir(dirPath, { recursive: true })
    return files.map((file) => `${prefix}/${file}`)
  } catch {
    return []
  }
}

/**
 * Copy a file within storage
 *
 * @param sourceKey - Source file key
 * @param destKey - Destination file key
 */
export async function copyInStorage(
  sourceKey: string,
  destKey: string
): Promise<string> {
  // Production: Copy in MinIO
  if (s3Client) {
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: `${BUCKET_NAME}/${sourceKey}`,
        Key: destKey,
        ACL: 'public-read',
      })
    )

    return `/uploads/${destKey}`
  }

  // Development: Copy in local filesystem
  const { copyFile, mkdir } = await import('fs/promises')
  const { join, dirname } = await import('path')

  const sourcePath = join(process.cwd(), 'public', 'uploads', sourceKey)
  const destPath = join(process.cwd(), 'public', 'uploads', destKey)

  await mkdir(dirname(destPath), { recursive: true })
  await copyFile(sourcePath, destPath)

  return `/uploads/${destKey}`
}

/**
 * Get the full URL for a storage key
 * In production, this returns a path that nginx proxies to MinIO
 * In development, this returns a local path
 *
 * @param key - Storage key
 * @returns Full URL to access the file
 */
export function getStorageUrl(key: string): string {
  return `/uploads/${key}`
}

/**
 * Extract the storage key from a URL
 *
 * @param url - URL of the file
 * @returns Storage key
 */
export function getKeyFromUrl(url: string): string {
  return url.replace(/^\/uploads\//, '')
}

// Export configuration for debugging
export const storageConfig = {
  isProduction,
  hasMinioConfig,
  bucket: BUCKET_NAME,
  endpoint: isProduction
    ? `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT || '9000'}`
    : 'local filesystem',
}
