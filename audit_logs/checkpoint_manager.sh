#!/bin/bash

# Checkpoint Management System
# Handles checkpoint creation, validation, recovery, and maintenance

set -euo pipefail

# Configuration
AUDIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$AUDIT_DIR/audit_utils.sh" 2>/dev/null || true

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${2:-}$(date -Iseconds) - $1${NC}" | tee -a "$AUDIT_DIR/master_audit.log"
}

# Create MACRO checkpoint (after page completion)
create_checkpoint() {
    local page_name=$1
    local status=$2
    local checkpoint_counter=$(get_next_checkpoint_counter)
    local checkpoint_id="CP_${checkpoint_counter}_${page_name^^}_COMPLETE"
    local timestamp=$(date -Iseconds)
    
    log "Creating MACRO checkpoint: $checkpoint_id" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local checkpoint_file="$AUDIT_DIR/checkpoints/checkpoint_${checkpoint_id}.json"
    
    # Update session with new checkpoint
    jq --arg id "$checkpoint_id" \
       --arg timestamp "$timestamp" \
       --arg page "$page_name" \
       --arg status "$status" \
       '.last_checkpoint = {
         "checkpoint_id": $id,
         "timestamp": $timestamp,
         "type": "MACRO",
         "page": $page,
         "phase": "complete",
         "status": $status
       } |
       .checkpoint_history += [{
         "id": $id,
         "timestamp": $timestamp,
         "type": "MACRO",
         "page": $page,
         "phase": "complete",
         "status": $status
       }]' "$session_file" > temp.json && mv temp.json "$session_file"
    
    # Update progress
    if [ "$status" = "SUCCESS" ]; then
        jq --arg page "$page_name" \
           '.progress.pages_completed += [$page] |
            .progress.pages_remaining = (.progress.pages_remaining - [$page]) |
            .progress.completion_percentage = ((.progress.pages_completed | length) * 100 / .progress.total_pages)' \
           "$session_file" > temp.json && mv temp.json "$session_file"
    fi
    
    # Create checkpoint backup
    cp "$session_file" "$checkpoint_file"
    
    # Backup audit log
    cp "$AUDIT_DIR/master_audit.log" "$AUDIT_DIR/checkpoints/audit_log_${checkpoint_id}.log"
    
    log "✓ MACRO Checkpoint $checkpoint_id created successfully" "$GREEN"
    
    # Return checkpoint ID for reference
    echo "$checkpoint_id"
}

# Create MICRO checkpoint (during phase execution)
create_micro_checkpoint() {
    local page_name=$1
    local phase=$2
    local status=$3
    local checkpoint_counter=$(get_next_checkpoint_counter)
    local checkpoint_id="CP_${checkpoint_counter}_${page_name^^}_${phase^^}"
    local timestamp=$(date -Iseconds)
    
    log "Creating MICRO checkpoint: $checkpoint_id" "$YELLOW"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    # Add to checkpoint history
    jq --arg id "$checkpoint_id" \
       --arg timestamp "$timestamp" \
       --arg page "$page_name" \
       --arg phase "$phase" \
       --arg status "$status" \
       '.checkpoint_history += [{
         "id": $id,
         "timestamp": $timestamp,
         "type": "MICRO",
         "page": $page,
         "phase": $phase,
         "status": $status
       }]' "$session_file" > temp.json && mv temp.json "$session_file"
    
    log "✓ MICRO Checkpoint $checkpoint_id recorded" "$GREEN"
    
    echo "$checkpoint_id"
}

# Create RECOVERY checkpoint (before risky operations)
create_recovery_checkpoint() {
    local operation=$1
    local recovery_counter=$(get_next_recovery_counter)
    local checkpoint_id="RCP_${recovery_counter}_${operation^^}"
    local timestamp=$(date -Iseconds)
    
    log "Creating RECOVERY checkpoint: $checkpoint_id" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local recovery_dir="$AUDIT_DIR/checkpoints/recovery_${checkpoint_id}"
    
    # Create recovery directory
    mkdir -p "$recovery_dir"
    
    # Backup current session state
    cp "$session_file" "$recovery_dir/session_state.json"
    
    # Backup audit log
    cp "$AUDIT_DIR/master_audit.log" "$recovery_dir/audit_log.log"
    
    # Create recovery metadata
    cat > "$recovery_dir/recovery_metadata.json" <<EOF
{
  "recovery_id": "$checkpoint_id",
  "timestamp": "$timestamp",
  "operation": "$operation",
  "browser_state": "saved",
  "session_storage": "backed_up",
  "network_state": "recorded"
}
EOF
    
    # Update session with recovery point
    jq --arg id "$checkpoint_id" \
       --arg timestamp "$timestamp" \
       --arg operation "$operation" \
       '.recovery_metadata.last_recovery_checkpoint = {
         "id": $id,
         "timestamp": $timestamp,
         "operation": $operation
       }' "$session_file" > temp.json && mv temp.json "$session_file"
    
    log "✓ RECOVERY Checkpoint $checkpoint_id secured" "$GREEN"
    
    echo "$checkpoint_id"
}

# Validate checkpoint integrity
validate_checkpoint() {
    local checkpoint_file=$1
    
    log "Validating checkpoint: $(basename "$checkpoint_file")" "$BLUE"
    
    # Check if file exists
    if [ ! -f "$checkpoint_file" ]; then
        log "❌ Checkpoint file not found: $checkpoint_file" "$RED"
        return 1
    fi
    
    # Check JSON validity
    if ! jq empty "$checkpoint_file" 2>/dev/null; then
        log "❌ Invalid JSON in checkpoint file" "$RED"
        return 1
    fi
    
    # Check required fields
    local required_fields=("session_id" "progress" "checkpoint_history")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$checkpoint_file" >/dev/null 2>&1; then
            log "❌ Missing required field: $field" "$RED"
            return 1
        fi
    done
    
    # Validate session ID consistency
    local session_id=$(jq -r '.session_id' "$checkpoint_file")
    local current_session_id=$(jq -r '.session_id' "$AUDIT_DIR/session_state/current_session.json" 2>/dev/null || echo "")
    
    if [ -n "$current_session_id" ] && [ "$session_id" != "$current_session_id" ]; then
        log "⚠️ Session ID mismatch in checkpoint" "$YELLOW"
    fi
    
    log "✅ Checkpoint validation passed" "$GREEN"
    return 0
}

# Validate all checkpoints
validate_all_checkpoints() {
    log "🔍 VALIDATING ALL CHECKPOINTS" "$BLUE"
    local validation_errors=0
    
    if [ ! -d "$AUDIT_DIR/checkpoints" ]; then
        log "No checkpoints directory found" "$YELLOW"
        return 0
    fi
    
    for checkpoint_file in "$AUDIT_DIR/checkpoints"/checkpoint_*.json; do
        if [ -f "$checkpoint_file" ]; then
            if ! validate_checkpoint "$checkpoint_file"; then
                log "❌ Invalid checkpoint: $(basename "$checkpoint_file")" "$RED"
                ((validation_errors++))
                
                # Quarantine corrupt checkpoint
                quarantine_corrupt_checkpoint "$checkpoint_file"
            else
                log "✅ Valid checkpoint: $(basename "$checkpoint_file")" "$GREEN"
            fi
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        log "🎉 ALL CHECKPOINTS VALID" "$GREEN"
    else
        log "⚠️ Found $validation_errors corrupted checkpoints" "$YELLOW"
        log "   Corrupted checkpoints moved to quarantine/" "$YELLOW"
    fi
    
    return $validation_errors
}

# Quarantine corrupted checkpoint
quarantine_corrupt_checkpoint() {
    local corrupt_file=$1
    local quarantine_dir="$AUDIT_DIR/quarantine/$(date +%Y%m%d)"
    
    mkdir -p "$quarantine_dir"
    mv "$corrupt_file" "$quarantine_dir/"
    
    log "🔒 Quarantined corrupted checkpoint: $(basename "$corrupt_file")" "$YELLOW"
    
    # Log corruption event
    echo "$(date -Iseconds) - Checkpoint corrupted and quarantined: $(basename "$corrupt_file")" >> "$AUDIT_DIR/corruption_log.txt"
}

# List all checkpoints
list_checkpoints() {
    log "📋 CHECKPOINT HISTORY" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    if [ ! -f "$session_file" ]; then
        log "No active session found" "$YELLOW"
        return 1
    fi
    
    # Display checkpoint history
    jq -r '.checkpoint_history[] | "\(.timestamp) - \(.id) (\(.type)) - \(.status)"' "$session_file" | while read line; do
        if [[ "$line" == *"SUCCESS"* ]]; then
            log "✅ $line" "$GREEN"
        elif [[ "$line" == *"FAILED"* ]]; then
            log "❌ $line" "$RED"
        else
            log "🔄 $line" "$YELLOW"
        fi
    done
}

# Show current session status
show_session_status() {
    log "📊 CURRENT SESSION STATUS" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    if [ ! -f "$session_file" ]; then
        log "No active session found" "$YELLOW"
        return 1
    fi
    
    local session_id=$(jq -r '.session_id' "$session_file")
    local start_time=$(jq -r '.audit_start_time' "$session_file")
    local completion=$(jq -r '.progress.completion_percentage' "$session_file")
    local pages_completed=$(jq -r '.progress.pages_completed | length' "$session_file")
    local total_pages=$(jq -r '.progress.total_pages' "$session_file")
    local current_page=$(jq -r '.current_operation.page // "none"' "$session_file")
    local current_phase=$(jq -r '.current_operation.phase // "none"' "$session_file")
    
    log "Session ID: $session_id" "$GREEN"
    log "Started: $start_time" "$GREEN"
    log "Progress: $pages_completed/$total_pages pages ($completion%)" "$GREEN"
    log "Current Page: $current_page" "$GREEN"
    log "Current Phase: $current_phase" "$GREEN"
    
    # Error summary
    local critical=$(jq -r '.error_summary.critical' "$session_file")
    local high=$(jq -r '.error_summary.high' "$session_file")
    local medium=$(jq -r '.error_summary.medium' "$session_file")
    local low=$(jq -r '.error_summary.low' "$session_file")
    
    log "Errors: Critical=$critical, High=$high, Medium=$medium, Low=$low" "$YELLOW"
}

# Cleanup old checkpoints
cleanup_old_checkpoints() {
    local keep_count=${1:-10}
    
    log "🧹 Cleaning up old checkpoints (keeping last $keep_count)" "$BLUE"
    
    # Remove old checkpoint files
    find "$AUDIT_DIR/checkpoints/" -name "checkpoint_CP_*.json" -type f 2>/dev/null | \
    sort -V | head -n -$keep_count | \
    while read file; do
        if [ -f "$file" ]; then
            log "Removing old checkpoint: $(basename "$file")" "$YELLOW"
            rm "$file"
            
            # Remove corresponding audit log
            local checkpoint_id=$(basename "$file" .json | sed 's/checkpoint_//')
            local audit_log="$AUDIT_DIR/checkpoints/audit_log_${checkpoint_id}.log"
            [ -f "$audit_log" ] && rm "$audit_log"
        fi
    done
    
    log "✅ Checkpoint cleanup completed" "$GREEN"
}

# Calculate checkpoint frequency based on risk
calculate_checkpoint_frequency() {
    local page_name=$1
    local current_phase=$2
    
    # Base frequency (in test steps)
    local base_frequency=5
    local risk_multiplier=1
    
    # High-risk pages
    case $page_name in
        "ai-assistant"|"ai-assistant-custom-agents"|"image-cataloging"|"scan")
            risk_multiplier=$((risk_multiplier + 2))
            ;;
        "products"|"orders"|"customers")
            risk_multiplier=$((risk_multiplier + 1))
            ;;
    esac
    
    # High-risk phases
    case $current_phase in
        "functionality_tests"|"error_handling_tests")
            risk_multiplier=$((risk_multiplier + 2))
            ;;
        "navigation_tests")
            risk_multiplier=$((risk_multiplier + 1))
            ;;
    esac
    
    # Calculate dynamic frequency
    local checkpoint_frequency=$((base_frequency / risk_multiplier))
    
    # Minimum frequency of 1
    if [ $checkpoint_frequency -lt 1 ]; then
        checkpoint_frequency=1
    fi
    
    echo $checkpoint_frequency
}

# Validate system requirements
validate_system() {
    log "🔍 VALIDATING AUDIT SYSTEM REQUIREMENTS" "$BLUE"
    
    local validation_errors=0
    
    # Check required commands
    local required_commands=("jq" "curl" "bc" "uuidgen")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "❌ Required command not found: $cmd" "$RED"
            ((validation_errors++))
        else
            log "✅ Command available: $cmd" "$GREEN"
        fi
    done
    
    # Check directory structure
    local required_dirs=("session_state" "checkpoints" "reports" "screenshots" "quarantine")
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$AUDIT_DIR/$dir" ]; then
            log "❌ Required directory missing: $dir" "$RED"
            ((validation_errors++))
        else
            log "✅ Directory exists: $dir" "$GREEN"
        fi
    done
    
    # Check server availability
    if check_server_status; then
        log "✅ Development server is running" "$GREEN"
    else
        log "❌ Development server is not accessible at http://localhost:3000" "$RED"
        ((validation_errors++))
    fi
    
    if [ $validation_errors -eq 0 ]; then
        log "🎉 SYSTEM VALIDATION PASSED" "$GREEN"
        return 0
    else
        log "❌ SYSTEM VALIDATION FAILED ($validation_errors errors)" "$RED"
        return 1
    fi
}

# Main function
main() {
    local command=${1:-"--help"}
    
    case $command in
        "--create-checkpoint")
            create_checkpoint "$2" "$3"
            ;;
        "--create-micro-checkpoint")
            create_micro_checkpoint "$2" "$3" "$4"
            ;;
        "--create-recovery-checkpoint")
            create_recovery_checkpoint "$2"
            ;;
        "--validate-checkpoint")
            validate_checkpoint "$2"
            ;;
        "--validate-all")
            validate_all_checkpoints
            ;;
        "--list-checkpoints")
            list_checkpoints
            ;;
        "--status")
            show_session_status
            ;;
        "--cleanup")
            cleanup_old_checkpoints "${2:-10}"
            ;;
        "--validate-system")
            validate_system
            ;;
        "--help")
            echo "Checkpoint Manager Commands:"
            echo "  --create-checkpoint <page> <status>           Create macro checkpoint"
            echo "  --create-micro-checkpoint <page> <phase> <status>  Create micro checkpoint"
            echo "  --create-recovery-checkpoint <operation>      Create recovery checkpoint"
            echo "  --validate-checkpoint <file>                 Validate specific checkpoint"
            echo "  --validate-all                               Validate all checkpoints"
            echo "  --list-checkpoints                           List checkpoint history"
            echo "  --status                                      Show session status"
            echo "  --cleanup [count]                            Cleanup old checkpoints"
            echo "  --validate-system                            Validate system requirements"
            ;;
        *)
            log "Unknown command: $command" "$RED"
            log "Use --help for available commands" "$YELLOW"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"