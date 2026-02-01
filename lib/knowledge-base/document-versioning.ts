/**
 * Document Versioning System
 *
 * Manages document versions for MDSAP compliance:
 * - Version tracking (1.0, 1.1, 2.0, etc.)
 * - Revision history
 * - Version comparison
 */

import { getDatabase } from '@/lib/database/sqlite'
import {
  getDocument,
  updateDocument,
  logDocumentAction,
  type KBDocument,
} from './document-database'

// ============================================================================
// Type Definitions
// ============================================================================

export interface DocumentVersion {
  version: string
  revisionNumber: number
  createdAt: string
  createdBy: string | null
  notes: string | null
  changesSummary: string | null
}

export interface VersionBumpOptions {
  type: 'major' | 'minor' | 'patch'
  notes?: string
  changesSummary?: string
  updatedBy?: string
}

export interface VersionHistory {
  documentId: string
  documentTitle: string
  currentVersion: string
  currentRevision: number
  versions: DocumentVersion[]
}

// ============================================================================
// Version Parsing & Formatting
// ============================================================================

/**
 * Parse a version string into components
 * Supports formats: "1.0", "1.0.0", "1", etc.
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(p => parseInt(p, 10) || 0)
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  }
}

/**
 * Format version components into a string
 */
export function formatVersion(major: number, minor: number, patch?: number): string {
  if (patch !== undefined && patch > 0) {
    return `${major}.${minor}.${patch}`
  }
  return `${major}.${minor}`
}

/**
 * Get the next version based on bump type
 */
export function getNextVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch'): string {
  const { major, minor, patch } = parseVersion(currentVersion)

  switch (bumpType) {
    case 'major':
      return formatVersion(major + 1, 0, 0)
    case 'minor':
      return formatVersion(major, minor + 1, 0)
    case 'patch':
      return formatVersion(major, minor, patch + 1)
    default:
      return formatVersion(major, minor + 1, 0)
  }
}

// ============================================================================
// Version Management Functions
// ============================================================================

/**
 * Bump document version
 */
export function bumpDocumentVersion(
  documentId: string,
  options: VersionBumpOptions
): KBDocument | null {
  const document = getDocument(documentId)
  if (!document) {
    return null
  }

  const currentVersion = document.version || '1.0'
  const newVersion = getNextVersion(currentVersion, options.type)
  const newRevision = (document.revision_number || 1) + 1

  // Update document
  const updated = updateDocument(documentId, {
    version: newVersion,
    revision_number: newRevision,
    updated_by: options.updatedBy,
  })

  if (updated) {
    // Log the version change
    logDocumentAction({
      document_id: documentId,
      action: 'version_bumped',
      field_changed: 'version',
      old_value: currentVersion,
      new_value: newVersion,
      performed_by: options.updatedBy,
      notes: options.notes || `Version bumped from ${currentVersion} to ${newVersion}`,
    })
  }

  return updated
}

/**
 * Get version history from audit log
 */
export function getVersionHistory(documentId: string): VersionHistory | null {
  const document = getDocument(documentId)
  if (!document) {
    return null
  }

  const db = getDatabase()

  // Get all version-related audit entries
  const versionEntries = db.prepare(`
    SELECT *
    FROM kb_document_audit_log
    WHERE document_id = ?
      AND (action = 'version_bumped' OR action = 'created')
    ORDER BY performed_at DESC
  `).all(documentId) as Array<{
    id: string
    action: string
    old_value: string | null
    new_value: string | null
    performed_by: string | null
    performed_at: string
    notes: string | null
  }>

  const versions: DocumentVersion[] = []

  // Add current version
  versions.push({
    version: document.version || '1.0',
    revisionNumber: document.revision_number || 1,
    createdAt: document.updated_at || document.created_at,
    createdBy: document.updated_by || document.created_by,
    notes: 'Current version',
    changesSummary: null,
  })

  // Add historical versions from audit log
  for (const entry of versionEntries) {
    if (entry.action === 'version_bumped' && entry.old_value) {
      versions.push({
        version: entry.old_value,
        revisionNumber: 0, // Historical, exact revision unknown
        createdAt: entry.performed_at,
        createdBy: entry.performed_by,
        notes: entry.notes,
        changesSummary: null,
      })
    }
  }

  return {
    documentId,
    documentTitle: document.title,
    currentVersion: document.version || '1.0',
    currentRevision: document.revision_number || 1,
    versions,
  }
}

/**
 * Set document to a specific version (for rollback scenarios)
 */
export function setDocumentVersion(
  documentId: string,
  version: string,
  updatedBy?: string,
  notes?: string
): KBDocument | null {
  const document = getDocument(documentId)
  if (!document) {
    return null
  }

  const currentVersion = document.version || '1.0'

  // Update document
  const updated = updateDocument(documentId, {
    version,
    updated_by: updatedBy,
  })

  if (updated) {
    // Log the version change
    logDocumentAction({
      document_id: documentId,
      action: 'version_set',
      field_changed: 'version',
      old_value: currentVersion,
      new_value: version,
      performed_by: updatedBy,
      notes: notes || `Version manually set to ${version}`,
    })
  }

  return updated
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parsed1 = parseVersion(v1)
  const parsed2 = parseVersion(v2)

  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1
  }
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1
  }
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1
  }
  return 0
}

/**
 * Check if document needs review based on review cycle
 */
export function checkReviewDue(documentId: string): {
  isDue: boolean
  daysUntilDue: number | null
  lastReviewDate: string | null
  nextReviewDate: string | null
} {
  const document = getDocument(documentId)
  if (!document) {
    return {
      isDue: false,
      daysUntilDue: null,
      lastReviewDate: null,
      nextReviewDate: null,
    }
  }

  if (!document.review_cycle_days || !document.effective_date) {
    return {
      isDue: false,
      daysUntilDue: null,
      lastReviewDate: null,
      nextReviewDate: null,
    }
  }

  const effectiveDate = new Date(document.effective_date)
  const reviewCycleDays = document.review_cycle_days
  const now = new Date()

  // Calculate next review date
  const nextReviewDate = new Date(effectiveDate)
  while (nextReviewDate < now) {
    nextReviewDate.setDate(nextReviewDate.getDate() + reviewCycleDays)
  }

  const daysUntilDue = Math.ceil((nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isDue = daysUntilDue <= 30 // Due within 30 days

  return {
    isDue,
    daysUntilDue,
    lastReviewDate: document.effective_date,
    nextReviewDate: nextReviewDate.toISOString().split('T')[0],
  }
}

/**
 * Get all documents due for review
 */
export function getDocumentsDueForReview(daysAhead: number = 30): Array<{
  document: KBDocument
  daysUntilDue: number
  nextReviewDate: string
}> {
  const db = getDatabase()

  const documents = db.prepare(`
    SELECT *
    FROM kb_documents
    WHERE review_cycle_days IS NOT NULL
      AND effective_date IS NOT NULL
      AND approval_status = 'approved'
    ORDER BY effective_date ASC
  `).all() as KBDocument[]

  const results: Array<{
    document: KBDocument
    daysUntilDue: number
    nextReviewDate: string
  }> = []

  for (const doc of documents) {
    const reviewStatus = checkReviewDue(doc.id)
    if (reviewStatus.daysUntilDue !== null && reviewStatus.daysUntilDue <= daysAhead) {
      results.push({
        document: doc,
        daysUntilDue: reviewStatus.daysUntilDue,
        nextReviewDate: reviewStatus.nextReviewDate!,
      })
    }
  }

  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
}
