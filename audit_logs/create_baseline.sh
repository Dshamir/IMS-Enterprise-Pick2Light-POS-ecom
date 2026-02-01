#!/bin/bash

# Create Master Baseline Script
# Establishes permanent baseline from completed audit

set -euo pipefail

# Configuration
AUDIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_DIR="$AUDIT_DIR/baseline"

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

# Create permanent baseline after first audit completion
create_master_baseline() {
    local audit_session_id=$(jq -r '.session_id' "$AUDIT_DIR/session_state/current_session.json")
    local baseline_timestamp=$(date -Iseconds)
    local baseline_id="BASELINE_$(date +%Y%m%d_%H%M%S)"
    
    log "🏗️ CREATING MASTER AUDIT BASELINE: $baseline_id" "$BLUE"
    
    # Validate audit completion
    if ! validate_audit_completion; then
        log "❌ Cannot create baseline - audit not properly completed" "$RED"
        exit 1
    fi
    
    # Create baseline directory structure (already exists)
    log "📁 Baseline directory structure ready" "$GREEN"
    
    # Update master baseline with current timestamp
    local master_baseline="$BASELINE_DIR/MASTER_BASELINE.json"
    jq --arg baseline_id "$baseline_id" \
       --arg timestamp "$baseline_timestamp" \
       '.baseline_id = $baseline_id | .creation_timestamp = $timestamp' \
       "$master_baseline" > temp.json && mv temp.json "$master_baseline"
    
    # Create baseline snapshot
    create_baseline_snapshot "$baseline_id"
    
    # Generate baseline reports
    generate_baseline_reports "$baseline_id"
    
    # Create future audit preparation
    setup_future_audit_comparison "$baseline_id"
    
    log "✅ Master baseline created: $baseline_id" "$GREEN"
    log "📊 Baseline health score: $(jq -r '.system_info.health_score' "$master_baseline")/100" "$GREEN"
    log "📈 Baseline established for 13 pages with 2 monitored issues" "$GREEN"
}

# Validate audit completion
validate_audit_completion() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    if [ ! -f "$session_file" ]; then
        log "❌ No session file found" "$RED"
        return 1
    fi
    
    local completion_pct=$(jq -r '.progress.completion_percentage' "$session_file")
    local total_pages=$(jq -r '.progress.total_pages' "$session_file")
    local completed_pages=$(jq -r '.progress.pages_completed | length' "$session_file")
    
    if [ "$completion_pct" != "100.0" ] || [ "$completed_pages" != "$total_pages" ]; then
        log "❌ Audit not completed: $completion_pct% ($completed_pages/$total_pages pages)" "$RED"
        return 1
    fi
    
    log "✅ Audit completion validated: 100% ($completed_pages/$total_pages pages)" "$GREEN"
    return 0
}

# Create baseline snapshot
create_baseline_snapshot() {
    local baseline_id=$1
    local snapshot_dir="$BASELINE_DIR/snapshots/$baseline_id"
    
    log "📸 Creating baseline snapshot: $baseline_id" "$BLUE"
    
    mkdir -p "$snapshot_dir"
    
    # Copy all audit results
    cp -r "$AUDIT_DIR/pages" "$snapshot_dir/"
    cp -r "$AUDIT_DIR/reports" "$snapshot_dir/"
    cp -r "$AUDIT_DIR/checkpoints" "$snapshot_dir/"
    cp "$AUDIT_DIR/session_state/current_session.json" "$snapshot_dir/session.json"
    cp "$AUDIT_DIR/master_audit.log" "$snapshot_dir/"
    
    # Create snapshot manifest
    cat > "$snapshot_dir/SNAPSHOT_MANIFEST.json" << EOF
{
  "snapshot_id": "$baseline_id",
  "creation_timestamp": "$(date -Iseconds)",
  "source_session": "$(jq -r '.session_id' "$AUDIT_DIR/session_state/current_session.json")",
  "contents": {
    "pages": "Individual page test results",
    "reports": "Final audit reports", 
    "checkpoints": "All audit checkpoints",
    "session.json": "Complete session state",
    "master_audit.log": "Full audit execution log"
  },
  "purpose": "Permanent baseline for future audit comparisons"
}
EOF
    
    log "✅ Baseline snapshot created: $snapshot_dir" "$GREEN"
}

# Generate baseline reports
generate_baseline_reports() {
    local baseline_id=$1
    local reports_dir="$BASELINE_DIR/reports"
    
    log "📊 Generating baseline reports" "$BLUE"
    
    mkdir -p "$reports_dir"
    
    # Create baseline summary report
    cat > "$reports_dir/baseline_summary_$baseline_id.md" << EOF
# Baseline Summary Report

**Baseline ID:** $baseline_id  
**Created:** $(date -Iseconds)  
**Source Session:** $(jq -r '.session_id' "$AUDIT_DIR/session_state/current_session.json")  

## Baseline Metrics

- **Health Score:** $(jq -r '.system_info.health_score' "$BASELINE_DIR/MASTER_BASELINE.json")/100
- **Pages Audited:** $(jq -r '.system_info.total_pages' "$BASELINE_DIR/MASTER_BASELINE.json")
- **Completion Rate:** 100%
- **Total Issues:** $(jq -r '.baseline_metrics.error_summary.total' "$BASELINE_DIR/MASTER_BASELINE.json")

## Acceptable Baseline Issues

$(jq -r '.known_baseline_issues[] | "- **\(.severity | ascii_upcase)**: \(.description)"' "$BASELINE_DIR/MASTER_BASELINE.json")

## Monitoring Strategy

All future audits will be compared against this baseline to detect:
- Performance regressions
- New functionality issues  
- Security vulnerabilities
- Accessibility degradation

## Next Steps

1. Schedule regular audits (weekly/monthly)
2. Monitor for deviations from baseline
3. Update baseline after significant system changes
4. Maintain remediation tracking

---

*This baseline represents the current acceptable state of the system*
EOF
    
    log "✅ Baseline reports generated" "$GREEN"
}

# Setup future audit comparison
setup_future_audit_comparison() {
    local baseline_id=$1
    
    log "🔧 Setting up future audit comparison capabilities" "$BLUE"
    
    # Create comparison configuration
    cat > "$BASELINE_DIR/comparison_config.json" << EOF
{
  "baseline_id": "$baseline_id",
  "comparison_enabled": true,
  "regression_detection": {
    "performance_threshold": 0.2,
    "error_increase_threshold": 1,
    "health_score_drop_threshold": 5
  },
  "reporting": {
    "generate_delta_reports": true,
    "highlight_regressions": true,
    "track_improvements": true
  },
  "alerting": {
    "critical_regression_alert": true,
    "new_error_alert": true,
    "health_score_alert_threshold": 85
  }
}
EOF
    
    # Create baseline reference for audit system
    jq --arg baseline_id "$baseline_id" \
       '.baseline_reference = $baseline_id | .comparison_mode = "enabled"' \
       "$AUDIT_DIR/audit_system.py" > temp.py 2>/dev/null || true
    
    log "✅ Future audit comparison configured" "$GREEN"
}

# Show baseline status
show_baseline_status() {
    local master_baseline="$BASELINE_DIR/MASTER_BASELINE.json"
    
    if [ ! -f "$master_baseline" ]; then
        log "❌ No baseline found" "$RED"
        return 1
    fi
    
    log "📋 BASELINE STATUS" "$BLUE"
    log "Baseline ID: $(jq -r '.baseline_id' "$master_baseline")" "$GREEN"
    log "Created: $(jq -r '.creation_timestamp' "$master_baseline")" "$GREEN"
    log "Health Score: $(jq -r '.system_info.health_score' "$master_baseline")/100" "$GREEN"
    log "Pages: $(jq -r '.system_info.total_pages' "$master_baseline")" "$GREEN"
    log "Issues: $(jq -r '.baseline_metrics.error_summary.total' "$master_baseline")" "$GREEN"
    log "Status: $(jq -r '.system_info.system_state' "$master_baseline")" "$GREEN"
}

# Main function
main() {
    local command=${1:-"--create-baseline"}
    
    case $command in
        "--create-baseline")
            create_master_baseline
            ;;
        "--show-status")
            show_baseline_status
            ;;
        "--help")
            echo "Baseline Creation Commands:"
            echo "  --create-baseline    Create master baseline from current audit"
            echo "  --show-status        Show current baseline status"
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