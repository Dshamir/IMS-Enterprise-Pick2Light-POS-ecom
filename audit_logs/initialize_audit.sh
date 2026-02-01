#!/bin/bash

# Inventory System Audit Initialization Script
# Creates audit session with checkpoint support

set -euo pipefail

# Configuration
AUDIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_ID=$(uuidgen 2>/dev/null || openssl rand -hex 16)
AUDIT_START_TIME=$(date -Iseconds)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${2:-}$(date -Iseconds) - $1${NC}" | tee -a "$AUDIT_DIR/master_audit.log"
}

# Initialize master audit log
initialize_master_log() {
    log "=== INVENTORY SYSTEM AUDIT LOG ===" "$BLUE"
    log "Audit Started: $AUDIT_START_TIME" "$GREEN"
    log "Session ID: $SESSION_ID" "$GREEN"
    log "Audit Directory: $AUDIT_DIR" "$GREEN"
    log "Checkpoint System: ENABLED" "$GREEN"
    log "Recovery Support: ENABLED" "$GREEN"
    log "" ""
}

# Create initial session state
create_initial_session() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    cat > "$session_file" <<EOF
{
  "session_id": "$SESSION_ID",
  "audit_start_time": "$AUDIT_START_TIME",
  "last_checkpoint": null,
  "current_operation": {
    "page": null,
    "phase": "initialization",
    "step": "setup",
    "started_at": "$AUDIT_START_TIME"
  },
  "progress": {
    "pages_completed": [],
    "pages_in_progress": [],
    "pages_remaining": [
      "home",
      "dashboard", 
      "products",
      "image-cataloging",
      "scan",
      "orders",
      "customers",
      "reports",
      "inventory-alerts",
      "ai-assistant",
      "ai-assistant-custom-agents",
      "ai-assistant-settings",
      "settings"
    ],
    "total_pages": 13,
    "completion_percentage": 0.0
  },
  "checkpoint_history": [
    {
      "id": "CP_000_INIT",
      "timestamp": "$AUDIT_START_TIME",
      "type": "INITIALIZATION",
      "status": "SUCCESS"
    }
  ],
  "error_summary": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "total": 0
  },
  "recovery_metadata": {
    "browser_state": "initialized",
    "session_storage": "clean",
    "network_state": "unknown",
    "last_successful_action": "session_initialization"
  }
}
EOF

    log "Initial session state created: $session_file" "$GREEN"
}

# Create page URL mapping
create_page_mapping() {
    local mapping_file="$AUDIT_DIR/session_state/page_mapping.json"
    
    cat > "$mapping_file" <<EOF
{
  "pages": {
    "home": {
      "url": "http://localhost:3000/",
      "name": "Home",
      "category": "core",
      "risk_level": "low"
    },
    "dashboard": {
      "url": "http://localhost:3000/dashboard",
      "name": "Dashboard",
      "category": "core",
      "risk_level": "medium"
    },
    "products": {
      "url": "http://localhost:3000/products",
      "name": "Products",
      "category": "core",
      "risk_level": "high"
    },
    "image-cataloging": {
      "url": "http://localhost:3000/image-cataloging",
      "name": "AI Image Cataloging",
      "category": "core",
      "risk_level": "high"
    },
    "scan": {
      "url": "http://localhost:3000/scan",
      "name": "Scan Barcode",
      "category": "core",
      "risk_level": "high"
    },
    "orders": {
      "url": "http://localhost:3000/orders",
      "name": "Orders",
      "category": "core",
      "risk_level": "medium"
    },
    "customers": {
      "url": "http://localhost:3000/customers",
      "name": "Customers",
      "category": "core",
      "risk_level": "medium"
    },
    "reports": {
      "url": "http://localhost:3000/reports",
      "name": "Reports",
      "category": "core",
      "risk_level": "medium"
    },
    "inventory-alerts": {
      "url": "http://localhost:3000/inventory/alerts",
      "name": "Inventory Alerts",
      "category": "core",
      "risk_level": "medium"
    },
    "ai-assistant": {
      "url": "http://localhost:3000/ai-assistant",
      "name": "AI Assistant",
      "category": "ai",
      "risk_level": "high"
    },
    "ai-assistant-custom-agents": {
      "url": "http://localhost:3000/ai-assistant/custom-agents",
      "name": "Custom AI Agents",
      "category": "ai",
      "risk_level": "high"
    },
    "ai-assistant-settings": {
      "url": "http://localhost:3000/ai-assistant/settings",
      "name": "AI Settings",
      "category": "ai",
      "risk_level": "high"
    },
    "settings": {
      "url": "http://localhost:3000/settings",
      "name": "Settings",
      "category": "system",
      "risk_level": "medium"
    }
  }
}
EOF

    log "Page mapping created: $mapping_file" "$GREEN"
}

# Initialize checkpoint counter
initialize_checkpoint_counter() {
    echo "1" > "$AUDIT_DIR/session_state/checkpoint_counter.txt"
    echo "1" > "$AUDIT_DIR/session_state/recovery_counter.txt"
    log "Checkpoint counters initialized" "$GREEN"
}

# Create audit utilities
create_audit_utilities() {
    local utils_file="$AUDIT_DIR/audit_utils.sh"
    
    cat > "$utils_file" <<'EOF'
#!/bin/bash

# Audit Utility Functions

# Get next checkpoint counter
get_next_checkpoint_counter() {
    local counter_file="$AUDIT_DIR/session_state/checkpoint_counter.txt"
    local counter=$(cat "$counter_file" 2>/dev/null || echo "1")
    echo $((counter + 1)) > "$counter_file"
    printf "%03d" "$counter"
}

# Get next recovery counter  
get_next_recovery_counter() {
    local counter_file="$AUDIT_DIR/session_state/recovery_counter.txt"
    local counter=$(cat "$counter_file" 2>/dev/null || echo "1")
    echo $((counter + 1)) > "$counter_file"
    printf "%03d" "$counter"
}

# Update current operation in session
update_current_operation() {
    local page=$1
    local phase=$2
    local step=$3
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    jq --arg page "$page" \
       --arg phase "$phase" \
       --arg step "$step" \
       --arg timestamp "$(date -Iseconds)" \
       '.current_operation = {
         "page": $page,
         "phase": $phase, 
         "step": $step,
         "started_at": $timestamp
       }' "$session_file" > temp.json && mv temp.json "$session_file"
}

# Calculate completion percentage
calculate_completion_percentage() {
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local completed_count=$(jq '.progress.pages_completed | length' "$session_file")
    local total_count=$(jq '.progress.total_pages' "$session_file")
    
    if [ "$total_count" -gt 0 ]; then
        echo "scale=1; $completed_count * 100 / $total_count" | bc -l
    else
        echo "0.0"
    fi
}

# Check if server is running
check_server_status() {
    local base_url="http://localhost:3000"
    
    if curl -s --fail --connect-timeout 5 "$base_url" >/dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is not running
    fi
}

# Test page accessibility
test_page_accessibility() {
    local url=$1
    local timeout=${2:-10}
    
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$timeout" "$url")
    
    if [ "$http_status" = "200" ]; then
        return 0  # Page accessible
    else
        echo "$http_status"
        return 1  # Page not accessible
    fi
}
EOF

    chmod +x "$utils_file"
    log "Audit utilities created: $utils_file" "$GREEN"
}

# Main initialization
main() {
    log "Starting Inventory System Audit Initialization" "$BLUE"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log "ERROR: jq is required but not installed" "$RED"
        exit 1
    fi
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        log "ERROR: curl is required but not installed" "$RED"
        exit 1
    fi
    
    # Initialize components
    initialize_master_log
    create_initial_session
    create_page_mapping
    initialize_checkpoint_counter
    create_audit_utilities
    
    log "Audit initialization completed successfully" "$GREEN"
    log "Session ID: $SESSION_ID" "$GREEN"
    log "Ready to begin comprehensive audit" "$GREEN"
    log "" ""
    log "Next steps:" "$BLUE"
    log "  1. Run: ./checkpoint_manager.sh --validate-system" "$YELLOW"
    log "  2. Run: ./audit_inventory_system.sh --full-audit" "$YELLOW"
    log "" ""
}

# Source the audit utilities
AUDIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$AUDIT_DIR/audit_utils.sh" 2>/dev/null || true

# Execute main function
main "$@"