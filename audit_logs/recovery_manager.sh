#!/bin/bash

# Recovery Manager - Handles session recovery and continuation
# Supports recovery from crashes, interruptions, and checkpoint restoration

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

# Initialize or recover session
initialize_or_recover() {
    log "=== AUDIT RECOVERY MANAGER ===" "$BLUE"
    
    # Check for existing sessions
    if [ -f "$AUDIT_DIR/session_state/current_session.json" ]; then
        log "🔄 EXISTING SESSION DETECTED" "$YELLOW"
        
        # Validate current session
        if validate_session_state; then
            log "✅ Session state is valid" "$GREEN"
            
            # Extract recovery information
            extract_session_info
            
            # Prompt for recovery action
            prompt_recovery_options
            
        else
            log "❌ Session state corrupted. Searching for backup checkpoints..." "$RED"
            recover_from_backup_checkpoint
        fi
        
    else
        log "🆕 NO EXISTING SESSION - STARTING FRESH" "$GREEN"
        start_fresh_audit
    fi
}

# Validate session state
validate_session_state() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    # Check JSON validity
    if ! jq empty "$session_file" 2>/dev/null; then
        return 1
    fi
    
    # Check required fields
    local required_fields=("session_id" "audit_start_time" "progress" "checkpoint_history")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$session_file" >/dev/null 2>&1; then
            return 1
        fi
    done
    
    return 0
}

# Extract session information
extract_session_info() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    SESSION_ID=$(jq -r '.session_id' "$session_file")
    START_TIME=$(jq -r '.audit_start_time' "$session_file")
    LAST_CHECKPOINT=$(jq -r '.last_checkpoint.checkpoint_id // "none"' "$session_file")
    CURRENT_PAGE=$(jq -r '.current_operation.page // "none"' "$session_file")
    CURRENT_PHASE=$(jq -r '.current_operation.phase // "none"' "$session_file")
    COMPLETION_PCT=$(jq -r '.progress.completion_percentage' "$session_file")
    PAGES_COMPLETED=$(jq -r '.progress.pages_completed | length' "$session_file")
    TOTAL_PAGES=$(jq -r '.progress.total_pages' "$session_file")
    
    log "📊 RECOVERY STATUS:" "$BLUE"
    log "   Session ID: $SESSION_ID" "$GREEN"
    log "   Started: $START_TIME" "$GREEN"
    log "   Last Checkpoint: $LAST_CHECKPOINT" "$GREEN"
    log "   Current Page: $CURRENT_PAGE" "$GREEN"
    log "   Current Phase: $CURRENT_PHASE" "$GREEN"
    log "   Completion: $COMPLETION_PCT% ($PAGES_COMPLETED/$TOTAL_PAGES pages)" "$GREEN"
}

# Prompt for recovery options
prompt_recovery_options() {
    log "" ""
    log "🎯 RECOVERY OPTIONS:" "$BLUE"
    log "1. Continue from last checkpoint" "$YELLOW"
    log "2. Resume current operation" "$YELLOW"
    log "3. Restart current page" "$YELLOW"
    log "4. Start fresh audit (abandon previous)" "$YELLOW"
    log "5. Show detailed session info" "$YELLOW"
    log "" ""
    
    read -p "Select recovery option (1-5): " recovery_option
    
    case $recovery_option in
        1) recover_from_last_checkpoint ;;
        2) resume_current_operation ;;
        3) restart_current_page ;;
        4) start_fresh_audit ;;
        5) show_detailed_session_info && prompt_recovery_options ;;
        *) 
            log "Invalid option. Defaulting to continue from checkpoint." "$YELLOW"
            recover_from_last_checkpoint 
            ;;
    esac
}

# Show detailed session information
show_detailed_session_info() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    log "📋 DETAILED SESSION INFORMATION" "$BLUE"
    
    # Pages completed
    log "Pages Completed:" "$GREEN"
    jq -r '.progress.pages_completed[]' "$session_file" | while read page; do
        log "  ✅ $page" "$GREEN"
    done
    
    # Pages remaining
    log "Pages Remaining:" "$YELLOW"
    jq -r '.progress.pages_remaining[]' "$session_file" | while read page; do
        log "  ⏳ $page" "$YELLOW"
    done
    
    # Recent checkpoints
    log "Recent Checkpoints:" "$BLUE"
    jq -r '.checkpoint_history | reverse | .[0:5][] | "\(.timestamp) - \(.id) (\(.status))"' "$session_file" | while read checkpoint; do
        if [[ "$checkpoint" == *"SUCCESS"* ]]; then
            log "  ✅ $checkpoint" "$GREEN"
        else
            log "  ❌ $checkpoint" "$RED"
        fi
    done
    
    # Error summary
    local critical=$(jq -r '.error_summary.critical' "$session_file")
    local high=$(jq -r '.error_summary.high' "$session_file")
    local medium=$(jq -r '.error_summary.medium' "$session_file")
    local low=$(jq -r '.error_summary.low' "$session_file")
    local total=$(jq -r '.error_summary.total' "$session_file")
    
    log "Error Summary: Total=$total (Critical=$critical, High=$high, Medium=$medium, Low=$low)" "$YELLOW"
}

# Recover from last checkpoint
recover_from_last_checkpoint() {
    log "🔄 RECOVERING FROM LAST CHECKPOINT" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local last_checkpoint_id=$(jq -r '.last_checkpoint.checkpoint_id' "$session_file")
    
    if [ "$last_checkpoint_id" = "null" ] || [ "$last_checkpoint_id" = "none" ]; then
        log "No previous checkpoint found. Starting fresh audit." "$YELLOW"
        start_fresh_audit
        return
    fi
    
    local checkpoint_file="$AUDIT_DIR/checkpoints/checkpoint_${last_checkpoint_id}.json"
    
    if [ -f "$checkpoint_file" ]; then
        log "✅ Checkpoint file found: $checkpoint_file" "$GREEN"
        
        # Validate checkpoint
        if "$AUDIT_DIR/checkpoint_manager.sh" --validate-checkpoint "$checkpoint_file"; then
            # Restore from checkpoint
            cp "$checkpoint_file" "$session_file"
            
            # Restore audit log if available
            local audit_backup="$AUDIT_DIR/checkpoints/audit_log_${last_checkpoint_id}.log"
            if [ -f "$audit_backup" ]; then
                cp "$audit_backup" "$AUDIT_DIR/master_audit.log"
                log "✅ Audit log restored from checkpoint" "$GREEN"
            fi
            
            log "🔄 Session restored from checkpoint: $last_checkpoint_id" "$GREEN"
            
            # Continue audit from next page
            continue_audit_from_checkpoint
            
        else
            log "❌ Checkpoint validation failed. Attempting backup recovery..." "$RED"
            recover_from_backup_checkpoint
        fi
        
    else
        log "❌ Checkpoint file not found. Attempting backup recovery..." "$RED"
        recover_from_backup_checkpoint
    fi
}

# Resume current operation
resume_current_operation() {
    log "▶️ RESUMING CURRENT OPERATION" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local current_page=$(jq -r '.current_operation.page' "$session_file")
    local current_phase=$(jq -r '.current_operation.phase' "$session_file")
    local current_step=$(jq -r '.current_operation.step' "$session_file")
    
    if [ "$current_page" = "null" ] || [ "$current_page" = "none" ]; then
        log "No current operation to resume. Starting fresh audit." "$YELLOW"
        start_fresh_audit
        return
    fi
    
    log "Resuming: Page=$current_page, Phase=$current_phase, Step=$current_step" "$GREEN"
    
    # Create recovery checkpoint before resuming
    "$AUDIT_DIR/checkpoint_manager.sh" --create-recovery-checkpoint "RESUME_OPERATION"
    
    # Resume from main audit script
    log "🔄 Delegating to main audit script for resume..." "$BLUE"
    "$AUDIT_DIR/audit_inventory_system.sh" --resume-page "$current_page" --phase "$current_phase"
}

# Restart current page
restart_current_page() {
    log "🔄 RESTARTING CURRENT PAGE" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local current_page=$(jq -r '.current_operation.page' "$session_file")
    
    if [ "$current_page" = "null" ] || [ "$current_page" = "none" ]; then
        log "No current page to restart. Starting fresh audit." "$YELLOW"
        start_fresh_audit
        return
    fi
    
    log "Restarting audit for page: $current_page" "$GREEN"
    
    # Create recovery checkpoint
    "$AUDIT_DIR/checkpoint_manager.sh" --create-recovery-checkpoint "RESTART_PAGE"
    
    # Remove page from completed list if it was there
    jq --arg page "$current_page" \
       '.progress.pages_completed = (.progress.pages_completed - [$page]) |
        .progress.pages_remaining = (.progress.pages_remaining + [$page] | unique) |
        .progress.completion_percentage = ((.progress.pages_completed | length) * 100 / .progress.total_pages)' \
       "$session_file" > temp.json && mv temp.json "$session_file"
    
    # Start page audit from beginning
    "$AUDIT_DIR/audit_inventory_system.sh" --audit-page "$current_page"
}

# Recover from backup checkpoint
recover_from_backup_checkpoint() {
    log "🔍 SEARCHING FOR BACKUP CHECKPOINTS" "$YELLOW"
    
    # Find most recent valid checkpoint
    local latest_checkpoint=$(find "$AUDIT_DIR/checkpoints/" -name "checkpoint_CP_*.json" -type f 2>/dev/null | sort -V | tail -1)
    
    if [ -n "$latest_checkpoint" ] && [ -f "$latest_checkpoint" ]; then
        log "Found potential backup checkpoint: $(basename "$latest_checkpoint")" "$YELLOW"
        
        if "$AUDIT_DIR/checkpoint_manager.sh" --validate-checkpoint "$latest_checkpoint"; then
            log "✅ Found valid backup checkpoint: $(basename "$latest_checkpoint")" "$GREEN"
            
            # Restore from backup
            cp "$latest_checkpoint" "$AUDIT_DIR/session_state/current_session.json"
            
            log "🔄 Recovering from backup checkpoint" "$BLUE"
            recover_from_last_checkpoint
            
        else
            log "❌ Backup checkpoint is also corrupted" "$RED"
            handle_complete_recovery_failure
        fi
        
    else
        log "❌ No backup checkpoints found" "$RED"
        handle_complete_recovery_failure
    fi
}

# Handle complete recovery failure
handle_complete_recovery_failure() {
    log "💥 COMPLETE RECOVERY FAILURE" "$RED"
    log "All recovery options exhausted. Available actions:" "$YELLOW"
    log "1. Start fresh audit (lose all progress)" "$YELLOW"
    log "2. Manual investigation (advanced users)" "$YELLOW"
    log "3. Exit and seek help" "$YELLOW"
    
    read -p "Select action (1-3): " failure_action
    
    case $failure_action in
        1) 
            log "Starting fresh audit..." "$GREEN"
            start_fresh_audit 
            ;;
        2)
            log "Starting manual investigation mode..." "$BLUE"
            manual_investigation_mode
            ;;
        3)
            log "Exiting. Check logs in $AUDIT_DIR for debugging." "$YELLOW"
            exit 1
            ;;
        *)
            log "Invalid choice. Exiting." "$RED"
            exit 1
            ;;
    esac
}

# Manual investigation mode
manual_investigation_mode() {
    log "🔍 MANUAL INVESTIGATION MODE" "$BLUE"
    log "Available commands:" "$YELLOW"
    log "  ls-checkpoints  - List all checkpoint files" "$YELLOW"
    log "  validate-all    - Validate all checkpoints" "$YELLOW"
    log "  show-logs       - Show recent audit logs" "$YELLOW"
    log "  clean-session   - Clean current session state" "$YELLOW"
    log "  fresh-start     - Start completely fresh" "$YELLOW"
    log "  exit           - Exit investigation mode" "$YELLOW"
    
    while true; do
        echo ""
        read -p "Investigation> " investigation_cmd
        
        case $investigation_cmd in
            "ls-checkpoints")
                find "$AUDIT_DIR/checkpoints/" -name "*.json" -type f | sort
                ;;
            "validate-all")
                "$AUDIT_DIR/checkpoint_manager.sh" --validate-all
                ;;
            "show-logs")
                tail -20 "$AUDIT_DIR/master_audit.log" 2>/dev/null || echo "No logs found"
                ;;
            "clean-session")
                rm -f "$AUDIT_DIR/session_state/current_session.json"
                log "Session state cleaned" "$GREEN"
                ;;
            "fresh-start")
                start_fresh_audit
                break
                ;;
            "exit")
                log "Exiting investigation mode" "$YELLOW"
                exit 0
                ;;
            *)
                log "Unknown command: $investigation_cmd" "$RED"
                ;;
        esac
    done
}

# Start fresh audit
start_fresh_audit() {
    log "🆕 STARTING FRESH AUDIT" "$GREEN"
    
    # Backup any existing session
    if [ -f "$AUDIT_DIR/session_state/current_session.json" ]; then
        local backup_name="session_backup_$(date +%Y%m%d_%H%M%S).json"
        cp "$AUDIT_DIR/session_state/current_session.json" "$AUDIT_DIR/session_state/$backup_name"
        log "Previous session backed up as: $backup_name" "$YELLOW"
    fi
    
    # Initialize fresh session
    log "Initializing fresh audit session..." "$BLUE"
    "$AUDIT_DIR/initialize_audit.sh"
    
    # Start main audit
    log "Starting main audit process..." "$BLUE"
    "$AUDIT_DIR/audit_inventory_system.sh" --full-audit
}

# Continue audit from checkpoint
continue_audit_from_checkpoint() {
    log "▶️ CONTINUING AUDIT FROM CHECKPOINT" "$BLUE"
    
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local pages_remaining=$(jq -r '.progress.pages_remaining[]' "$session_file" | head -1)
    
    if [ -n "$pages_remaining" ] && [ "$pages_remaining" != "null" ]; then
        log "Next page to audit: $pages_remaining" "$GREEN"
        "$AUDIT_DIR/audit_inventory_system.sh" --continue-from-checkpoint
    else
        log "🎉 All pages completed! Generating final report..." "$GREEN"
        "$AUDIT_DIR/audit_inventory_system.sh" --generate-final-report
    fi
}

# Find most recent stable checkpoint
find_most_recent_stable_checkpoint() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    # Look for checkpoints with SUCCESS status in reverse chronological order
    jq -r '.checkpoint_history | reverse | .[] | select(.status == "SUCCESS") | .id' "$session_file" 2>/dev/null | head -1
}

# Emergency recovery mode
emergency_recovery() {
    log "🚨 EMERGENCY RECOVERY MODE" "$RED"
    
    # Create emergency backup
    local emergency_backup_dir="$AUDIT_DIR/emergency_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$emergency_backup_dir"
    
    # Backup everything we can
    cp -r "$AUDIT_DIR/session_state" "$emergency_backup_dir/" 2>/dev/null || true
    cp -r "$AUDIT_DIR/checkpoints" "$emergency_backup_dir/" 2>/dev/null || true
    cp "$AUDIT_DIR/master_audit.log" "$emergency_backup_dir/" 2>/dev/null || true
    
    log "Emergency backup created: $emergency_backup_dir" "$YELLOW"
    
    # Try to salvage what we can
    if [ -d "$AUDIT_DIR/checkpoints" ]; then
        log "Attempting to find any valid checkpoint..." "$BLUE"
        
        for checkpoint in $(find "$AUDIT_DIR/checkpoints/" -name "checkpoint_*.json" -type f | sort -r); do
            if "$AUDIT_DIR/checkpoint_manager.sh" --validate-checkpoint "$checkpoint" 2>/dev/null; then
                log "Found valid checkpoint: $(basename "$checkpoint")" "$GREEN"
                
                # Try to restore from this checkpoint
                cp "$checkpoint" "$AUDIT_DIR/session_state/current_session.json"
                log "Emergency recovery successful" "$GREEN"
                return 0
            fi
        done
    fi
    
    log "❌ Emergency recovery failed. Manual intervention required." "$RED"
    return 1
}

# Main function
main() {
    local command=${1:-"--initialize-or-recover"}
    
    case $command in
        "--initialize-or-recover")
            initialize_or_recover
            ;;
        "--recover-from-checkpoint")
            recover_from_last_checkpoint
            ;;
        "--resume-current")
            resume_current_operation
            ;;
        "--restart-current")
            restart_current_page
            ;;
        "--fresh-start")
            start_fresh_audit
            ;;
        "--emergency-recovery")
            emergency_recovery
            ;;
        "--show-session-info")
            if validate_session_state; then
                extract_session_info
                show_detailed_session_info
            else
                log "No valid session found" "$RED"
            fi
            ;;
        "--help")
            echo "Recovery Manager Commands:"
            echo "  --initialize-or-recover       Interactive recovery/initialization"
            echo "  --recover-from-checkpoint      Recover from last checkpoint"
            echo "  --resume-current               Resume current operation"
            echo "  --restart-current              Restart current page"
            echo "  --fresh-start                  Start completely fresh"
            echo "  --emergency-recovery           Emergency recovery mode"
            echo "  --show-session-info            Show detailed session information"
            ;;
        *)
            log "Unknown command: $command" "$RED"
            log "Use --help for available commands" "$YELLOW"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"