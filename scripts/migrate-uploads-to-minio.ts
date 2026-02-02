/**
 * Upload Migration Script - Local Filesystem to MinIO
 *
 * This script migrates existing uploads from local filesystem
 * to MinIO S3-compatible storage.
 *
 * Usage:
 *   npx ts-node scripts/migrate-uploads-to-minio.ts
 *
 * Prerequisites:
 *   - MinIO server running and accessible
 *   - Environment variables configured (MINIO_ENDPOINT, MINIO_ACCESS_KEY, etc.)
 *   - ims-uploads bucket created
 *
 * Features:
 *   - Parallel uploads for performance
 *   - Progress tracking
 *   - Error logging with retry capability
 *   - Dry-run mode for testing
 */

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from 'fs'
import { join, extname } from 'path'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const PARALLEL_UPLOADS = 5
const BUCKET_NAME = process.env.MINIO_BUCKET || 'ims-uploads'

// Folders to migrate
const UPLOAD_FOLDERS = [
  'products',
  'projects',
  'production-lines',
  'manufacturing-boms',
  'production-runs',
  'image-cataloging',
]

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

// Statistics
let stats = {
  total: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  totalBytes: 0,
}

// Failed files for retry
const failedFiles: string[] = []

// Initialize S3 client
function createS3Client(): S3Client | null {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY

  if (!endpoint || !accessKey || !secretKey) {
    console.error('❌ Missing MinIO configuration!')
    console.error('   Required environment variables:')
    console.error('   - MINIO_ENDPOINT')
    console.error('   - MINIO_ACCESS_KEY')
    console.error('   - MINIO_SECRET_KEY')
    return null
  }

  const port = process.env.MINIO_PORT || '9000'
  const useSSL = process.env.MINIO_USE_SSL === 'true'

  return new S3Client({
    endpoint: `http${useSSL ? 's' : ''}://${endpoint}:${port}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  })
}

// Check if file already exists in MinIO
async function fileExistsInMinio(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }))
    return true
  } catch {
    return false
  }
}

// Upload a single file to MinIO
async function uploadFile(
  client: S3Client,
  localPath: string,
  key: string
): Promise<boolean> {
  try {
    const buffer = readFileSync(localPath)
    const ext = extname(localPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would upload: ${key}`)
      return true
    }

    await client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }))

    stats.totalBytes += buffer.length
    return true
  } catch (error: any) {
    console.error(`  ❌ Failed: ${key} - ${error.message}`)
    failedFiles.push(localPath)
    return false
  }
}

// Get all files in a directory recursively
function getFilesRecursively(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath, baseDir))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

// Process files in batches
async function processBatch(
  client: S3Client,
  files: Array<{ localPath: string; key: string }>,
  batchSize: number
): Promise<void> {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)

    await Promise.all(
      batch.map(async ({ localPath, key }) => {
        // Check if already uploaded
        const exists = await fileExistsInMinio(client, key)
        if (exists) {
          console.log(`  ⏭️  Skipped (exists): ${key}`)
          stats.skipped++
          return
        }

        const success = await uploadFile(client, localPath, key)
        if (success) {
          console.log(`  ✅ Uploaded: ${key}`)
          stats.uploaded++
        } else {
          stats.failed++
        }
      })
    )

    // Progress update
    const progress = Math.min(i + batchSize, files.length)
    const percent = Math.round((progress / files.length) * 100)
    console.log(`\n  Progress: ${progress}/${files.length} (${percent}%)\n`)
  }
}

// Format bytes to human-readable
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// Main migration function
async function migrateUploads(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║           IMS Upload Migration - Local to MinIO           ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  if (DRY_RUN) {
    console.log('🔍 Running in DRY RUN mode - no files will be uploaded\n')
  }

  // Initialize S3 client
  const client = createS3Client()
  if (!client) {
    process.exit(1)
  }

  console.log(`📦 Target bucket: ${BUCKET_NAME}`)
  console.log(`⚡ Parallel uploads: ${PARALLEL_UPLOADS}\n`)

  const uploadsDir = join(process.cwd(), 'public', 'uploads')

  if (!existsSync(uploadsDir)) {
    console.log('❌ Uploads directory not found:', uploadsDir)
    process.exit(1)
  }

  // Collect all files to migrate
  const filesToMigrate: Array<{ localPath: string; key: string }> = []

  for (const folder of UPLOAD_FOLDERS) {
    const folderPath = join(uploadsDir, folder)

    if (!existsSync(folderPath)) {
      console.log(`⏭️  Skipping ${folder}/ (not found)`)
      continue
    }

    const files = getFilesRecursively(folderPath)
    console.log(`📂 ${folder}/: ${files.length} files`)

    for (const file of files) {
      const relativePath = file.replace(uploadsDir + '/', '').replace(uploadsDir + '\\', '')
      const key = relativePath.replace(/\\/g, '/') // Normalize Windows paths

      filesToMigrate.push({ localPath: file, key })
    }
  }

  stats.total = filesToMigrate.length
  console.log(`\n📊 Total files to process: ${stats.total}\n`)

  if (stats.total === 0) {
    console.log('✅ No files to migrate!')
    return
  }

  // Process migration
  console.log('🚀 Starting migration...\n')
  const startTime = Date.now()

  await processBatch(client, filesToMigrate, PARALLEL_UPLOADS)

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                    Migration Complete                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  console.log(`  Total files:    ${stats.total}`)
  console.log(`  ✅ Uploaded:    ${stats.uploaded}`)
  console.log(`  ⏭️  Skipped:     ${stats.skipped}`)
  console.log(`  ❌ Failed:      ${stats.failed}`)
  console.log(`  📦 Data:        ${formatBytes(stats.totalBytes)}`)
  console.log(`  ⏱️  Duration:    ${duration}s\n`)

  // Write failed files to log
  if (failedFiles.length > 0) {
    const logPath = join(process.cwd(), 'migration-failed.log')
    writeFileSync(logPath, failedFiles.join('\n'))
    console.log(`❌ Failed files written to: ${logPath}`)
    console.log('   Re-run with same command to retry failed files\n')
  }
}

// Run migration
migrateUploads().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
