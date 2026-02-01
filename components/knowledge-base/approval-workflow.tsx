"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileEdit,
  Archive,
  Send,
  RotateCcw,
  Loader2,
  AlertTriangle,
  User,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ============================================================================
// Type Definitions (duplicated from server module to avoid importing server code)
// ============================================================================

export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'obsolete'

interface ApprovalAction {
  action: 'submit_for_review' | 'approve' | 'reject' | 'obsolete' | 'revert_to_draft'
  label: string
  variant: 'default' | 'destructive' | 'outline'
}

// ============================================================================
// Helper Functions (client-side versions)
// ============================================================================

function getStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    obsolete: 'Obsolete',
  }
  return labels[status] || status
}

function getActionLabels(currentStatus: ApprovalStatus): ApprovalAction[] {
  const actionMap: Record<ApprovalStatus, ApprovalAction[]> = {
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

// ============================================================================
// Type Definitions
// ============================================================================

interface ApprovalWorkflowProps {
  documentId: string
  documentTitle: string
  currentStatus: ApprovalStatus
  approvedBy?: string | null
  approvedAt?: string | null
  onStatusChange?: (newStatus: ApprovalStatus) => void
}

interface ActionDialogState {
  open: boolean
  action: string
  label: string
  requiresComment: boolean
  requiresApprover: boolean
  isDestructive: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusIcon(status: ApprovalStatus) {
  switch (status) {
    case 'draft':
      return <FileEdit className="h-4 w-4" />
    case 'pending_review':
      return <Clock className="h-4 w-4" />
    case 'approved':
      return <CheckCircle2 className="h-4 w-4" />
    case 'rejected':
      return <XCircle className="h-4 w-4" />
    case 'obsolete':
      return <Archive className="h-4 w-4" />
    default:
      return null
  }
}

function getStatusBadgeVariant(status: ApprovalStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'approved':
      return 'default'
    case 'rejected':
      return 'destructive'
    case 'pending_review':
      return 'secondary'
    default:
      return 'outline'
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'submit_for_review':
      return <Send className="h-4 w-4 mr-2" />
    case 'approve':
      return <CheckCircle2 className="h-4 w-4 mr-2" />
    case 'reject':
      return <XCircle className="h-4 w-4 mr-2" />
    case 'obsolete':
      return <Archive className="h-4 w-4 mr-2" />
    case 'revert_to_draft':
      return <RotateCcw className="h-4 w-4 mr-2" />
    default:
      return null
  }
}

// ============================================================================
// Component
// ============================================================================

export function ApprovalWorkflow({
  documentId,
  documentTitle,
  currentStatus,
  approvedBy,
  approvedAt,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [dialogState, setDialogState] = useState<ActionDialogState>({
    open: false,
    action: '',
    label: '',
    requiresComment: false,
    requiresApprover: false,
    isDestructive: false,
  })
  const [comment, setComment] = useState('')
  const [approverName, setApproverName] = useState('')

  const availableActions = getActionLabels(currentStatus)

  const openActionDialog = (action: string, label: string, variant: string) => {
    setDialogState({
      open: true,
      action,
      label,
      requiresComment: action === 'reject',
      requiresApprover: action === 'approve' || action === 'reject' || action === 'obsolete',
      isDestructive: variant === 'destructive',
    })
    setComment('')
    setApproverName('')
  }

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }))
    setComment('')
    setApproverName('')
  }

  const executeAction = async () => {
    if (dialogState.requiresApprover && !approverName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your name to perform this action.",
      })
      return
    }

    if (dialogState.requiresComment && !comment.trim()) {
      toast({
        variant: "destructive",
        title: "Comment required",
        description: "Please provide a reason for this action.",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/knowledge-base/documents/${documentId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogState.action,
          performedBy: approverName || undefined,
          comments: comment || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      toast({
        title: "Success",
        description: `Document ${dialogState.label.toLowerCase()} successfully.`,
      })

      closeDialog()
      onStatusChange?.(data.newStatus)

    } catch (error) {
      console.error('Approval action error:', error)
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Approval Status
          <Badge variant={getStatusBadgeVariant(currentStatus)} className="ml-2">
            {getStatusIcon(currentStatus)}
            <span className="ml-1">{getStatusLabel(currentStatus)}</span>
          </Badge>
        </CardTitle>
        <CardDescription>
          MDSAP-compliant document approval workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval Info */}
        {currentStatus === 'approved' && approvedBy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
            <User className="h-4 w-4" />
            <span>
              Approved by <strong>{approvedBy}</strong>
              {approvedAt && ` on ${new Date(approvedAt).toLocaleDateString()}`}
            </span>
          </div>
        )}

        {/* Status Warning */}
        {currentStatus === 'rejected' && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            <span>This document was rejected and needs revision before resubmission.</span>
          </div>
        )}

        {currentStatus === 'obsolete' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-100 p-3 rounded-lg">
            <Archive className="h-4 w-4" />
            <span>This document is obsolete and cannot be modified.</span>
          </div>
        )}

        {/* Available Actions */}
        {availableActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableActions.map(({ action, label, variant }) => (
              <Button
                key={action}
                variant={variant === 'destructive' ? 'destructive' : variant === 'outline' ? 'outline' : 'default'}
                size="sm"
                onClick={() => openActionDialog(action, label, variant)}
                disabled={isLoading}
              >
                {getActionIcon(action)}
                {label}
              </Button>
            ))}
          </div>
        )}

        {availableActions.length === 0 && currentStatus !== 'obsolete' && (
          <p className="text-sm text-muted-foreground">
            No actions available for current status.
          </p>
        )}
      </CardContent>

      {/* Action Confirmation Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogState.isDestructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {dialogState.label}
            </DialogTitle>
            <DialogDescription>
              {dialogState.action === 'approve' && `Approve "${documentTitle}" for use in the organization.`}
              {dialogState.action === 'reject' && `Reject "${documentTitle}" and provide feedback for revision.`}
              {dialogState.action === 'submit_for_review' && `Submit "${documentTitle}" for approval review.`}
              {dialogState.action === 'obsolete' && `Mark "${documentTitle}" as obsolete. This action cannot be undone.`}
              {dialogState.action === 'revert_to_draft' && `Revert "${documentTitle}" to draft status for editing.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {dialogState.requiresApprover && (
              <div className="space-y-2">
                <Label htmlFor="approver">Your Name *</Label>
                <Input
                  id="approver"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comment">
                {dialogState.requiresComment ? 'Reason *' : 'Comments (optional)'}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  dialogState.action === 'reject'
                    ? 'Explain why this document is being rejected...'
                    : 'Add any notes or comments...'
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant={dialogState.isDestructive ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {dialogState.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ============================================================================
// Status Badge Component (for use elsewhere)
// ============================================================================

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="inline-flex items-center gap-1">
      {getStatusIcon(status)}
      {getStatusLabel(status)}
    </Badge>
  )
}
