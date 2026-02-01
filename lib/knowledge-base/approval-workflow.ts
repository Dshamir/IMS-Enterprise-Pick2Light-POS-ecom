/**
 * Document Approval Workflow
 *
 * MDSAP-compliant approval workflow with:
 * - Status transitions: draft → pending_review → approved/rejected
 * - Approval chain management
 * - Review comments and rejection reasons
 */

import {
  getDocument,
  updateDocument,
  logDocumentAction,
  type KBDocument,
} from './document-database'

// ============================================================================
// Type Definitions
// ============================================================================

export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'obsolete'

export interface ApprovalAction {
  documentId: string
  action: 'submit_for_review' | 'approve' | 'reject' | 'obsolete' | 'revert_to_draft'
  performedBy?: string
  comments?: string
}

export interface ApprovalResult {
  success: boolean
  document?: KBDocument
  previousStatus?: ApprovalStatus
  newStatus?: ApprovalStatus
  error?: string
}

export interface ApprovalHistory {
  documentId: string
  documentTitle: string
  currentStatus: ApprovalStatus
  entries: Array<{
    action: string
    previousStatus: string | null
    newStatus: string | null
    performedBy: string | null
    performedAt: string
    comments: string | null
  }>
}

// ============================================================================
// Status Validation
// ============================================================================

/**
 * Valid status transitions
 */
const validTransitions: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['approved', 'rejected', 'draft'],
  approved: ['obsolete', 'pending_review'], // Can submit for re-review
  rejected: ['draft', 'pending_review'],
  obsolete: [], // Terminal state, no transitions allowed
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return validTransitions[from]?.includes(to) || false
}

/**
 * Get available next statuses from current status
 */
export function getAvailableTransitions(currentStatus: ApprovalStatus): ApprovalStatus[] {
  return validTransitions[currentStatus] || []
}

// ============================================================================
// Approval Actions
// ============================================================================

/**
 * Submit document for review
 */
export function submitForReview(
  documentId: string,
  performedBy?: string,
  comments?: string
): ApprovalResult {
  const document = getDocument(documentId)
  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
  const newStatus: ApprovalStatus = 'pending_review'

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot submit for review from status: ${currentStatus}`,
      previousStatus: currentStatus,
    }
  }

  const updated = updateDocument(documentId, {
    approval_status: newStatus,
    updated_by: performedBy,
  })

  if (updated) {
    logDocumentAction({
      document_id: documentId,
      action: 'submitted_for_review',
      field_changed: 'approval_status',
      old_value: currentStatus,
      new_value: newStatus,
      performed_by: performedBy,
      notes: comments || 'Document submitted for review',
    })

    return {
      success: true,
      document: updated,
      previousStatus: currentStatus,
      newStatus,
    }
  }

  return { success: false, error: 'Failed to update document' }
}

/**
 * Approve document
 */
export function approveDocument(
  documentId: string,
  approvedBy: string,
  comments?: string
): ApprovalResult {
  const document = getDocument(documentId)
  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
  const newStatus: ApprovalStatus = 'approved'

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot approve from status: ${currentStatus}. Document must be in 'pending_review' status.`,
      previousStatus: currentStatus,
    }
  }

  const now = new Date().toISOString()

  const updated = updateDocument(documentId, {
    approval_status: newStatus,
    approved_by: approvedBy,
    approved_at: now,
    updated_by: approvedBy,
  })

  if (updated) {
    logDocumentAction({
      document_id: documentId,
      action: 'approved',
      field_changed: 'approval_status',
      old_value: currentStatus,
      new_value: newStatus,
      performed_by: approvedBy,
      notes: comments || 'Document approved',
    })

    return {
      success: true,
      document: updated,
      previousStatus: currentStatus,
      newStatus,
    }
  }

  return { success: false, error: 'Failed to update document' }
}

/**
 * Reject document
 */
export function rejectDocument(
  documentId: string,
  rejectedBy: string,
  reason: string
): ApprovalResult {
  const document = getDocument(documentId)
  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
  const newStatus: ApprovalStatus = 'rejected'

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot reject from status: ${currentStatus}. Document must be in 'pending_review' status.`,
      previousStatus: currentStatus,
    }
  }

  if (!reason || reason.trim().length === 0) {
    return {
      success: false,
      error: 'Rejection reason is required',
    }
  }

  const updated = updateDocument(documentId, {
    approval_status: newStatus,
    updated_by: rejectedBy,
  })

  if (updated) {
    logDocumentAction({
      document_id: documentId,
      action: 'rejected',
      field_changed: 'approval_status',
      old_value: currentStatus,
      new_value: newStatus,
      performed_by: rejectedBy,
      notes: `Rejected: ${reason}`,
    })

    return {
      success: true,
      document: updated,
      previousStatus: currentStatus,
      newStatus,
    }
  }

  return { success: false, error: 'Failed to update document' }
}

/**
 * Mark document as obsolete
 */
export function markAsObsolete(
  documentId: string,
  performedBy: string,
  reason?: string
): ApprovalResult {
  const document = getDocument(documentId)
  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
  const newStatus: ApprovalStatus = 'obsolete'

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot mark as obsolete from status: ${currentStatus}. Only approved documents can be obsoleted.`,
      previousStatus: currentStatus,
    }
  }

  const now = new Date().toISOString()

  const updated = updateDocument(documentId, {
    approval_status: newStatus,
    expiry_date: now.split('T')[0],
    updated_by: performedBy,
  })

  if (updated) {
    logDocumentAction({
      document_id: documentId,
      action: 'obsoleted',
      field_changed: 'approval_status',
      old_value: currentStatus,
      new_value: newStatus,
      performed_by: performedBy,
      notes: reason || 'Document marked as obsolete',
    })

    return {
      success: true,
      document: updated,
      previousStatus: currentStatus,
      newStatus,
    }
  }

  return { success: false, error: 'Failed to update document' }
}

/**
 * Revert document to draft (for re-editing after rejection)
 */
export function revertToDraft(
  documentId: string,
  performedBy?: string,
  comments?: string
): ApprovalResult {
  const document = getDocument(documentId)
  if (!document) {
    return { success: false, error: 'Document not found' }
  }

  const currentStatus = (document.approval_status as ApprovalStatus) || 'draft'
  const newStatus: ApprovalStatus = 'draft'

  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot revert to draft from status: ${currentStatus}`,
      previousStatus: currentStatus,
    }
  }

  const updated = updateDocument(documentId, {
    approval_status: newStatus,
    updated_by: performedBy,
  })

  if (updated) {
    logDocumentAction({
      document_id: documentId,
      action: 'reverted_to_draft',
      field_changed: 'approval_status',
      old_value: currentStatus,
      new_value: newStatus,
      performed_by: performedBy,
      notes: comments || 'Document reverted to draft',
    })

    return {
      success: true,
      document: updated,
      previousStatus: currentStatus,
      newStatus,
    }
  }

  return { success: false, error: 'Failed to update document' }
}

/**
 * Execute an approval action
 */
export function executeApprovalAction(action: ApprovalAction): ApprovalResult {
  switch (action.action) {
    case 'submit_for_review':
      return submitForReview(action.documentId, action.performedBy, action.comments)
    case 'approve':
      if (!action.performedBy) {
        return { success: false, error: 'Approver is required' }
      }
      return approveDocument(action.documentId, action.performedBy, action.comments)
    case 'reject':
      if (!action.performedBy) {
        return { success: false, error: 'Rejector is required' }
      }
      if (!action.comments) {
        return { success: false, error: 'Rejection reason is required' }
      }
      return rejectDocument(action.documentId, action.performedBy, action.comments)
    case 'obsolete':
      if (!action.performedBy) {
        return { success: false, error: 'Performer is required' }
      }
      return markAsObsolete(action.documentId, action.performedBy, action.comments)
    case 'revert_to_draft':
      return revertToDraft(action.documentId, action.performedBy, action.comments)
    default:
      return { success: false, error: `Unknown action: ${action.action}` }
  }
}

// ============================================================================
// Status Display Helpers
// ============================================================================

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    obsolete: 'Obsolete',
  }
  return labels[status] || status
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ApprovalStatus): string {
  const colors: Record<ApprovalStatus, string> = {
    draft: 'gray',
    pending_review: 'yellow',
    approved: 'green',
    rejected: 'red',
    obsolete: 'gray',
  }
  return colors[status] || 'gray'
}

/**
 * Get action labels for available transitions
 */
export function getActionLabels(currentStatus: ApprovalStatus): Array<{
  action: ApprovalAction['action']
  label: string
  variant: 'default' | 'destructive' | 'outline'
}> {
  const actionMap: Record<ApprovalStatus, Array<{
    action: ApprovalAction['action']
    label: string
    variant: 'default' | 'destructive' | 'outline'
  }>> = {
    draft: [
      { action: 'submit_for_review', label: 'Submit for Review', variant: 'default' },
    ],
    pending_review: [
      { action: 'approve', label: 'Approve', variant: 'default' },
      { action: 'reject', label: 'Reject', variant: 'destructive' },
      { action: 'revert_to_draft', label: 'Return to Draft', variant: 'outline' },
    ],
    approved: [
      { action: 'submit_for_review', label: 'Submit for Re-Review', variant: 'outline' },
      { action: 'obsolete', label: 'Mark as Obsolete', variant: 'destructive' },
    ],
    rejected: [
      { action: 'revert_to_draft', label: 'Edit as Draft', variant: 'outline' },
      { action: 'submit_for_review', label: 'Resubmit', variant: 'default' },
    ],
    obsolete: [],
  }

  return actionMap[currentStatus] || []
}
