#!/bin/bash

# Main Inventory System Audit Script
# Comprehensive audit of all pages with checkpoint support

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

# Test page accessibility
test_page_accessibility() {
    local page_name=$1
    local page_url=$2
    local test_results=()
    
    log "🔍 Testing accessibility for: $page_name" "$BLUE"
    
    # HTTP Status Test
    log "Testing HTTP status..." "$YELLOW"
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$page_url" 2>/dev/null || echo "000")
    
    if [ "$http_status" = "200" ]; then
        log "✅ HTTP Status: $http_status (OK)" "$GREEN"
        test_results+=("http_status:PASS:$http_status")
    else
        log "❌ HTTP Status: $http_status (FAILED)" "$RED"
        test_results+=("http_status:FAIL:$http_status")
        update_error_count "high"
    fi
    
    # Response Time Test
    log "Testing response time..." "$YELLOW"
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 10 "$page_url" 2>/dev/null || echo "999")
    local response_time_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
    
    if [ "$response_time_ms" -lt 3000 ]; then
        log "✅ Response Time: ${response_time_ms}ms (Good)" "$GREEN"
        test_results+=("response_time:PASS:${response_time_ms}ms")
    elif [ "$response_time_ms" -lt 5000 ]; then
        log "⚠️ Response Time: ${response_time_ms}ms (Slow)" "$YELLOW"
        test_results+=("response_time:WARN:${response_time_ms}ms")
        update_error_count "medium"
    else
        log "❌ Response Time: ${response_time_ms}ms (Too Slow)" "$RED"
        test_results+=("response_time:FAIL:${response_time_ms}ms")
        update_error_count "high"
    fi
    
    # Content Length Test
    log "Testing content length..." "$YELLOW"
    local content_length=$(curl -s -I "$page_url" 2>/dev/null | grep -i "content-length" | cut -d: -f2 | tr -d ' \r' || echo "0")
    
    if [ "$content_length" -gt 1000 ]; then
        log "✅ Content Length: ${content_length} bytes (Good)" "$GREEN"
        test_results+=("content_length:PASS:${content_length}bytes")
    else
        log "⚠️ Content Length: ${content_length} bytes (Possibly incomplete)" "$YELLOW"
        test_results+=("content_length:WARN:${content_length}bytes")
        update_error_count "low"
    fi
    
    # Save test results
    save_test_results "$page_name" "accessibility" "${test_results[@]}"
    
    # Return overall status
    if [[ "${test_results[*]}" == *"FAIL"* ]]; then
        return 1
    else
        return 0
    fi
}

# Test page navigation
test_page_navigation() {
    local page_name=$1
    local page_url=$2
    local test_results=()
    
    log "🧭 Testing navigation for: $page_name" "$BLUE"
    
    # Check for navigation elements (basic content check)
    log "Testing navigation elements..." "$YELLOW"
    local page_content=$(curl -s "$page_url" 2>/dev/null || echo "")
    
    # Test for common navigation patterns
    local nav_tests=(
        "nav:navigation element"
        "menu:menu element"
        "sidebar:sidebar element"
        "header:header element"
        "Dashboard:dashboard link"
        "Products:products link"
    )
    
    local nav_pass_count=0
    for test in "${nav_tests[@]}"; do
        local search_term=$(echo "$test" | cut -d: -f1)
        local description=$(echo "$test" | cut -d: -f2)
        
        if echo "$page_content" | grep -qi "$search_term"; then
            log "✅ Found $description" "$GREEN"
            test_results+=("nav_${search_term}:PASS:found")
            ((nav_pass_count++))
        else
            log "⚠️ Missing $description" "$YELLOW"
            test_results+=("nav_${search_term}:WARN:missing")
        fi
    done
    
    # Evaluate navigation completeness
    if [ $nav_pass_count -ge 4 ]; then
        log "✅ Navigation: Good ($nav_pass_count/6 elements found)" "$GREEN"
        test_results+=("navigation_overall:PASS:${nav_pass_count}/6")
    elif [ $nav_pass_count -ge 2 ]; then
        log "⚠️ Navigation: Partial ($nav_pass_count/6 elements found)" "$YELLOW"
        test_results+=("navigation_overall:WARN:${nav_pass_count}/6")
        update_error_count "medium"
    else
        log "❌ Navigation: Poor ($nav_pass_count/6 elements found)" "$RED"
        test_results+=("navigation_overall:FAIL:${nav_pass_count}/6")
        update_error_count "high"
    fi
    
    # Save test results
    save_test_results "$page_name" "navigation" "${test_results[@]}"
    
    # Return overall status
    if [ $nav_pass_count -ge 2 ]; then
        return 0
    else
        return 1
    fi
}

# Test page functionality (basic checks)
test_page_functionality() {
    local page_name=$1
    local page_url=$2
    local test_results=()
    
    log "⚙️ Testing functionality for: $page_name" "$BLUE"
    
    local page_content=$(curl -s "$page_url" 2>/dev/null || echo "")
    
    # Test for JavaScript errors (check for basic script tags)
    log "Testing for JavaScript inclusion..." "$YELLOW"
    if echo "$page_content" | grep -q "<script"; then
        log "✅ JavaScript: Scripts found" "$GREEN"
        test_results+=("javascript:PASS:scripts_found")
    else
        log "⚠️ JavaScript: No scripts detected" "$YELLOW"
        test_results+=("javascript:WARN:no_scripts")
        update_error_count "low"
    fi
    
    # Test for CSS inclusion
    log "Testing for CSS inclusion..." "$YELLOW"
    if echo "$page_content" | grep -q -E "(stylesheet|<style)"; then
        log "✅ CSS: Stylesheets found" "$GREEN"
        test_results+=("css:PASS:stylesheets_found")
    else
        log "❌ CSS: No stylesheets detected" "$RED"
        test_results+=("css:FAIL:no_stylesheets")
        update_error_count "medium"
    fi
    
    # Test for forms (if applicable)
    log "Testing for interactive forms..." "$YELLOW"
    local form_count=$(echo "$page_content" | grep -c "<form" || echo "0")
    if [ "$form_count" -gt 0 ]; then
        log "✅ Forms: $form_count form(s) found" "$GREEN"
        test_results+=("forms:PASS:${form_count}_forms")
    else
        log "ℹ️ Forms: No forms found (may be expected)" "$BLUE"
        test_results+=("forms:INFO:no_forms")
    fi
    
    # Test for buttons
    log "Testing for interactive buttons..." "$YELLOW"
    local button_count=$(echo "$page_content" | grep -c -E "(<button|type=['\"]button|type=['\"]submit)" || echo "0")
    if [ "$button_count" -gt 0 ]; then
        log "✅ Buttons: $button_count button(s) found" "$GREEN"
        test_results+=("buttons:PASS:${button_count}_buttons")
    else
        log "⚠️ Buttons: No buttons found" "$YELLOW"
        test_results+=("buttons:WARN:no_buttons")
        update_error_count "low"
    fi
    
    # Page-specific functionality tests
    case $page_name in
        "dashboard")
            test_dashboard_specific_functionality "$page_content" test_results
            ;;
        "products")
            test_products_specific_functionality "$page_content" test_results
            ;;
        "scan")
            test_scan_specific_functionality "$page_content" test_results
            ;;
        "ai-assistant"*)
            test_ai_specific_functionality "$page_content" test_results
            ;;
    esac
    
    # Save test results
    save_test_results "$page_name" "functionality" "${test_results[@]}"
    
    # Return overall status
    if [[ "${test_results[*]}" == *"FAIL"* ]]; then
        return 1
    else
        return 0
    fi
}

# Dashboard-specific functionality tests
test_dashboard_specific_functionality() {
    local content=$1
    local -n results=$2
    
    log "Testing dashboard-specific features..." "$YELLOW"
    
    # Test for cards/widgets
    if echo "$content" | grep -qi "card\|widget\|dashboard"; then
        log "✅ Dashboard: Cards/widgets found" "$GREEN"
        results+=("dashboard_cards:PASS:found")
    else
        log "⚠️ Dashboard: No cards/widgets detected" "$YELLOW"
        results+=("dashboard_cards:WARN:missing")
        update_error_count "medium"
    fi
    
    # Test for metrics/statistics
    if echo "$content" | grep -qi "total\|count\|metric\|statistic"; then
        log "✅ Dashboard: Metrics/statistics found" "$GREEN"
        results+=("dashboard_metrics:PASS:found")
    else
        log "⚠️ Dashboard: No metrics/statistics detected" "$YELLOW"
        results+=("dashboard_metrics:WARN:missing")
        update_error_count "medium"
    fi
}

# Products-specific functionality tests
test_products_specific_functionality() {
    local content=$1
    local -n results=$2
    
    log "Testing products-specific features..." "$YELLOW"
    
    # Test for product listings
    if echo "$content" | grep -qi "product\|item\|inventory"; then
        log "✅ Products: Product-related content found" "$GREEN"
        results+=("products_content:PASS:found")
    else
        log "⚠️ Products: No product-related content detected" "$YELLOW"
        results+=("products_content:WARN:missing")
        update_error_count "medium"
    fi
    
    # Test for search functionality
    if echo "$content" | grep -qi "search\|filter"; then
        log "✅ Products: Search/filter functionality found" "$GREEN"
        results+=("products_search:PASS:found")
    else
        log "⚠️ Products: No search/filter functionality detected" "$YELLOW"
        results+=("products_search:WARN:missing")
        update_error_count "low"
    fi
}

# Scan-specific functionality tests
test_scan_specific_functionality() {
    local content=$1
    local -n results=$2
    
    log "Testing scan-specific features..." "$YELLOW"
    
    # Test for barcode/camera functionality
    if echo "$content" | grep -qi "barcode\|camera\|scan"; then
        log "✅ Scan: Barcode/camera content found" "$GREEN"
        results+=("scan_barcode:PASS:found")
    else
        log "❌ Scan: No barcode/camera content detected" "$RED"
        results+=("scan_barcode:FAIL:missing")
        update_error_count "high"
    fi
    
    # Test for file upload
    if echo "$content" | grep -qi "upload\|file"; then
        log "✅ Scan: Upload functionality found" "$GREEN"
        results+=("scan_upload:PASS:found")
    else
        log "⚠️ Scan: No upload functionality detected" "$YELLOW"
        results+=("scan_upload:WARN:missing")
        update_error_count "medium"
    fi
}

# AI-specific functionality tests
test_ai_specific_functionality() {
    local content=$1
    local -n results=$2
    
    log "Testing AI-specific features..." "$YELLOW"
    
    # Test for AI-related content
    if echo "$content" | grep -qi "ai\|assistant\|agent\|artificial"; then
        log "✅ AI: AI-related content found" "$GREEN"
        results+=("ai_content:PASS:found")
    else
        log "❌ AI: No AI-related content detected" "$RED"
        results+=("ai_content:FAIL:missing")
        update_error_count "high"
    fi
    
    # Test for chat/interaction elements
    if echo "$content" | grep -qi "chat\|message\|conversation"; then
        log "✅ AI: Chat/interaction elements found" "$GREEN"
        results+=("ai_chat:PASS:found")
    else
        log "⚠️ AI: No chat/interaction elements detected" "$YELLOW"
        results+=("ai_chat:WARN:missing")
        update_error_count "medium"
    fi
}

# Test error handling
test_error_handling() {
    local page_name=$1
    local page_url=$2
    local test_results=()
    
    log "🚨 Testing error handling for: $page_name" "$BLUE"
    
    # Test 404 handling (try invalid route)
    log "Testing 404 error handling..." "$YELLOW"
    local invalid_url="${page_url}/invalid-route-test-$(date +%s)"
    local error_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$invalid_url" 2>/dev/null || echo "000")
    
    if [ "$error_status" = "404" ]; then
        log "✅ 404 Handling: Proper 404 response" "$GREEN"
        test_results+=("404_handling:PASS:proper_404")
    else
        log "⚠️ 404 Handling: Unexpected response ($error_status)" "$YELLOW"
        test_results+=("404_handling:WARN:status_$error_status")
        update_error_count "low"
    fi
    
    # Test for error boundaries (check for error-related content)
    log "Testing for error boundary content..." "$YELLOW"
    local page_content=$(curl -s "$page_url" 2>/dev/null || echo "")
    
    if echo "$page_content" | grep -qi "error\|exception\|boundary"; then
        log "ℹ️ Error Boundaries: Error-related content found (may indicate error state)" "$BLUE"
        test_results+=("error_boundaries:INFO:content_found")
    else
        log "✅ Error Boundaries: No error content (normal state)" "$GREEN"
        test_results+=("error_boundaries:PASS:no_errors")
    fi
    
    # Test network timeout handling
    log "Testing network timeout handling..." "$YELLOW"
    local timeout_response=$(timeout 2 curl -s --connect-timeout 1 --max-time 1 "$page_url" 2>/dev/null || echo "TIMEOUT")
    
    if [ "$timeout_response" = "TIMEOUT" ]; then
        log "ℹ️ Timeout Test: Request timed out (simulated network issue)" "$BLUE"
        test_results+=("timeout_handling:INFO:timeout_simulated")
    else
        log "✅ Timeout Test: Request completed within timeout" "$GREEN"
        test_results+=("timeout_handling:PASS:completed")
    fi
    
    # Save test results
    save_test_results "$page_name" "error_handling" "${test_results[@]}"
    
    return 0  # Error handling tests are informational
}

# Save test results to file
save_test_results() {
    local page_name=$1
    local test_phase=$2
    shift 2
    local test_results=("$@")
    
    local results_file="$AUDIT_DIR/pages/${page_name}_${test_phase}_results.json"
    local timestamp=$(date -Iseconds)
    
    # Create JSON structure for results
    {
        echo "{"
        echo "  \"page\": \"$page_name\","
        echo "  \"test_phase\": \"$test_phase\","
        echo "  \"timestamp\": \"$timestamp\","
        echo "  \"results\": ["
        
        local first=true
        for result in "${test_results[@]}"; do
            if [ "$first" = true ]; then
                first=false
            else
                echo ","
            fi
            
            local test_name=$(echo "$result" | cut -d: -f1)
            local test_status=$(echo "$result" | cut -d: -f2)
            local test_details=$(echo "$result" | cut -d: -f3-)
            
            echo "    {"
            echo "      \"test\": \"$test_name\","
            echo "      \"status\": \"$test_status\","
            echo "      \"details\": \"$test_details\""
            echo -n "    }"
        done
        
        echo ""
        echo "  ]"
        echo "}"
    } > "$results_file"
    
    log "Test results saved: $results_file" "$GREEN"
}

# Update error count in session
update_error_count() {
    local error_level=$1
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    jq --arg level "$error_level" \
       '.error_summary[$level] = (.error_summary[$level] + 1) |
        .error_summary.total = (.error_summary.total + 1)' \
       "$session_file" > temp.json && mv temp.json "$session_file"
}

# Audit single page with checkpoint integration
audit_page() {
    local page_name=$1
    local page_url=$2
    
    log "🔍 AUDITING PAGE: $page_name ($page_url)" "$BLUE"
    
    # Update current operation
    update_current_operation "$page_name" "starting" "initialization"
    
    local overall_status="SUCCESS"
    local phase_results=()
    
    # Phase 1: Accessibility Tests
    log "📊 Phase 1: Accessibility Tests" "$BLUE"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "accessibility_start" "IN_PROGRESS"
    
    if test_page_accessibility "$page_name" "$page_url"; then
        log "✅ Accessibility tests: PASSED" "$GREEN"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "accessibility_complete" "SUCCESS"
        phase_results+=("accessibility:PASS")
    else
        log "❌ Accessibility tests: FAILED" "$RED"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "accessibility_complete" "FAILED"
        phase_results+=("accessibility:FAIL")
        overall_status="FAILED"
    fi
    
    # Phase 2: Navigation Tests
    log "🧭 Phase 2: Navigation Tests" "$BLUE"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "navigation_start" "IN_PROGRESS"
    
    if test_page_navigation "$page_name" "$page_url"; then
        log "✅ Navigation tests: PASSED" "$GREEN"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "navigation_complete" "SUCCESS"
        phase_results+=("navigation:PASS")
    else
        log "❌ Navigation tests: FAILED" "$RED"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "navigation_complete" "FAILED"
        phase_results+=("navigation:FAIL")
        # Navigation failure is warning, not critical
    fi
    
    # Phase 3: Functionality Tests
    log "⚙️ Phase 3: Functionality Tests" "$BLUE"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-recovery-checkpoint "FUNCTIONALITY_TESTS"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "functionality_start" "IN_PROGRESS"
    
    if test_page_functionality "$page_name" "$page_url"; then
        log "✅ Functionality tests: PASSED" "$GREEN"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "functionality_complete" "SUCCESS"
        phase_results+=("functionality:PASS")
    else
        log "❌ Functionality tests: FAILED" "$RED"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "functionality_complete" "FAILED"
        phase_results+=("functionality:FAIL")
        overall_status="FAILED"
    fi
    
    # Phase 4: Error Handling Tests
    log "🚨 Phase 4: Error Handling Tests" "$BLUE"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-recovery-checkpoint "ERROR_HANDLING_TESTS"
    "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "error_handling_start" "IN_PROGRESS"
    
    if test_error_handling "$page_name" "$page_url"; then
        log "✅ Error handling tests: PASSED" "$GREEN"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "error_handling_complete" "SUCCESS"
        phase_results+=("error_handling:PASS")
    else
        log "⚠️ Error handling tests: WARNINGS" "$YELLOW"
        "$AUDIT_DIR/checkpoint_manager.sh" --create-micro-checkpoint "$page_name" "error_handling_complete" "WARNING"
        phase_results+=("error_handling:WARN")
        # Error handling issues are not critical for overall status
    fi
    
    # Create final page summary
    create_page_summary "$page_name" "$page_url" "$overall_status" "${phase_results[@]}"
    
    # Create MACRO checkpoint for completed page
    "$AUDIT_DIR/checkpoint_manager.sh" --create-checkpoint "$page_name" "$overall_status"
    
    log "✅ PAGE AUDIT COMPLETE: $page_name ($overall_status)" "$GREEN"
    
    return 0
}

# Create page summary report
create_page_summary() {
    local page_name=$1
    local page_url=$2
    local overall_status=$3
    shift 3
    local phase_results=("$@")
    
    local summary_file="$AUDIT_DIR/pages/${page_name}_summary.md"
    local timestamp=$(date -Iseconds)
    
    cat > "$summary_file" <<EOF
# Page Audit Summary: $page_name

**URL:** $page_url  
**Audit Date:** $timestamp  
**Overall Status:** $overall_status  

## Test Phase Results

EOF
    
    for result in "${phase_results[@]}"; do
        local phase=$(echo "$result" | cut -d: -f1)
        local status=$(echo "$result" | cut -d: -f2)
        
        case $status in
            "PASS")
                echo "- ✅ **$phase**: PASSED" >> "$summary_file"
                ;;
            "FAIL")
                echo "- ❌ **$phase**: FAILED" >> "$summary_file"
                ;;
            "WARN")
                echo "- ⚠️ **$phase**: WARNINGS" >> "$summary_file"
                ;;
        esac
    done
    
    cat >> "$summary_file" <<EOF

## Detailed Results

Detailed test results can be found in:
- \`${page_name}_accessibility_results.json\`
- \`${page_name}_navigation_results.json\`
- \`${page_name}_functionality_results.json\`
- \`${page_name}_error_handling_results.json\`

## Recommendations

EOF
    
    # Add recommendations based on results
    if [[ "${phase_results[*]}" == *"accessibility:FAIL"* ]]; then
        echo "- **CRITICAL**: Fix accessibility issues - page may be inaccessible" >> "$summary_file"
    fi
    
    if [[ "${phase_results[*]}" == *"functionality:FAIL"* ]]; then
        echo "- **HIGH**: Address functionality issues - core features may be broken" >> "$summary_file"
    fi
    
    if [[ "${phase_results[*]}" == *"navigation:FAIL"* ]]; then
        echo "- **MEDIUM**: Improve navigation consistency" >> "$summary_file"
    fi
    
    if [[ "${phase_results[*]}" == *"FAIL"* ]] || [[ "${phase_results[*]}" == *"WARN"* ]]; then
        echo "- Review detailed test results for specific issues" >> "$summary_file"
    else
        echo "- No critical issues found - page is functioning well" >> "$summary_file"
    fi
    
    log "Page summary created: $summary_file" "$GREEN"
}

# Full audit of all pages
full_audit() {
    log "🚀 STARTING FULL INVENTORY SYSTEM AUDIT" "$BLUE"
    
    # Load page mapping
    local mapping_file="$AUDIT_DIR/session_state/page_mapping.json"
    if [ ! -f "$mapping_file" ]; then
        log "❌ Page mapping file not found. Run initialize_audit.sh first." "$RED"
        exit 1
    fi
    
    # Check if server is running
    if ! check_server_status; then
        log "❌ Development server is not running. Please start it first:" "$RED"
        log "   cd /home/nexless/Projects/0000-WebApp/supabase-store && npm run dev" "$YELLOW"
        exit 1
    fi
    
    # Get list of pages to audit
    local pages=($(jq -r '.pages | keys[]' "$mapping_file"))
    local total_pages=${#pages[@]}
    local current_page=1
    
    log "📋 Audit Plan: $total_pages pages to audit" "$BLUE"
    for page in "${pages[@]}"; do
        local page_url=$(jq -r ".pages.\"$page\".url" "$mapping_file")
        log "  $current_page. $page ($page_url)" "$YELLOW"
        ((current_page++))
    done
    
    log "" ""
    log "🎯 Beginning page audits..." "$BLUE"
    
    # Audit each page
    local audit_start_time=$(date +%s)
    current_page=1
    
    for page in "${pages[@]}"; do
        local page_url=$(jq -r ".pages.\"$page\".url" "$mapping_file")
        
        log "" ""
        log "📄 Auditing page $current_page/$total_pages: $page" "$BLUE"
        log "================================================" "$BLUE"
        
        # Update progress
        update_current_operation "$page" "auditing" "full_audit"
        
        # Audit the page
        if audit_page "$page" "$page_url"; then
            log "✅ Page audit completed: $page" "$GREEN"
        else
            log "⚠️ Page audit completed with issues: $page" "$YELLOW"
        fi
        
        # Small delay between pages
        sleep 1
        
        ((current_page++))
    done
    
    local audit_end_time=$(date +%s)
    local audit_duration=$((audit_end_time - audit_start_time))
    
    log "" ""
    log "🎉 FULL AUDIT COMPLETED!" "$GREEN"
    log "Total time: ${audit_duration} seconds" "$GREEN"
    log "Pages audited: $total_pages" "$GREEN"
    
    # Generate final report
    generate_final_report
}

# Generate final comprehensive report
generate_final_report() {
    log "📊 GENERATING FINAL AUDIT REPORT" "$BLUE"
    
    local report_file="$AUDIT_DIR/reports/final_audit_report_$(date +%Y%m%d_%H%M%S).md"
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    local timestamp=$(date -Iseconds)
    
    # Get session statistics
    local session_id=$(jq -r '.session_id' "$session_file")
    local start_time=$(jq -r '.audit_start_time' "$session_file")
    local total_pages=$(jq -r '.progress.total_pages' "$session_file")
    local completed_pages=$(jq -r '.progress.pages_completed | length' "$session_file")
    local completion_pct=$(jq -r '.progress.completion_percentage' "$session_file")
    
    # Error statistics
    local critical_errors=$(jq -r '.error_summary.critical' "$session_file")
    local high_errors=$(jq -r '.error_summary.high' "$session_file")
    local medium_errors=$(jq -r '.error_summary.medium' "$session_file")
    local low_errors=$(jq -r '.error_summary.low' "$session_file")
    local total_errors=$(jq -r '.error_summary.total' "$session_file")
    
    # Create comprehensive report
    cat > "$report_file" <<EOF
# Inventory System Audit Report

**Generated:** $timestamp  
**Session ID:** $session_id  
**Audit Duration:** $(date -d "$start_time" '+%Y-%m-%d %H:%M:%S') to $(date '+%Y-%m-%d %H:%M:%S')  

## Executive Summary

This comprehensive audit evaluated all $total_pages pages of the Inventory System for accessibility, navigation, functionality, and error handling.

### Overall Results
- **Pages Audited:** $completed_pages / $total_pages ($completion_pct%)
- **Total Issues Found:** $total_errors
- **Critical Issues:** $critical_errors
- **High Priority Issues:** $high_errors
- **Medium Priority Issues:** $medium_errors
- **Low Priority Issues:** $low_errors

### System Health Score
EOF
    
    # Calculate health score
    local health_score=100
    health_score=$((health_score - critical_errors * 25))
    health_score=$((health_score - high_errors * 10))
    health_score=$((health_score - medium_errors * 5))
    health_score=$((health_score - low_errors * 1))
    
    if [ $health_score -lt 0 ]; then
        health_score=0
    fi
    
    if [ $health_score -ge 90 ]; then
        echo "**🟢 EXCELLENT** - $health_score/100" >> "$report_file"
    elif [ $health_score -ge 75 ]; then
        echo "**🟡 GOOD** - $health_score/100" >> "$report_file"
    elif [ $health_score -ge 60 ]; then
        echo "**🟠 FAIR** - $health_score/100" >> "$report_file"
    else
        echo "**🔴 POOR** - $health_score/100" >> "$report_file"
    fi
    
    cat >> "$report_file" <<EOF

## Page-by-Page Analysis

EOF
    
    # Add individual page results
    for summary_file in "$AUDIT_DIR/pages"/*_summary.md; do
        if [ -f "$summary_file" ]; then
            local page_name=$(basename "$summary_file" _summary.md)
            echo "### $page_name" >> "$report_file"
            echo "" >> "$report_file"
            tail -n +3 "$summary_file" >> "$report_file"
            echo "" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" <<EOF

## Critical Issues Requiring Immediate Attention

EOF
    
    if [ $critical_errors -gt 0 ] || [ $high_errors -gt 0 ]; then
        echo "The following issues require immediate attention:" >> "$report_file"
        echo "" >> "$report_file"
        
        # Find and list critical/high issues
        find "$AUDIT_DIR/pages" -name "*_results.json" -exec grep -l "FAIL" {} \; | while read results_file; do
            local page_name=$(basename "$results_file" | cut -d_ -f1)
            echo "- **$page_name**: Critical functionality issues detected" >> "$report_file"
        done
    else
        echo "✅ No critical issues found. System is functioning well." >> "$report_file"
    fi
    
    cat >> "$report_file" <<EOF

## Recommendations

### Immediate Actions (0-1 days)
EOF
    
    if [ $critical_errors -gt 0 ]; then
        echo "- Fix critical accessibility and functionality issues" >> "$report_file"
        echo "- Verify all core user workflows are functional" >> "$report_file"
    fi
    
    cat >> "$report_file" <<EOF

### Short-term Improvements (1-7 days)
- Address high priority issues identified in individual page reports
- Improve page load times where response times exceed 3 seconds
- Enhance navigation consistency across all pages

### Long-term Enhancements (1-4 weeks)
- Implement comprehensive error handling for all edge cases
- Add automated testing to prevent regression of fixed issues
- Consider user experience improvements based on audit findings

## Technical Details

### Audit Methodology
This audit used automated testing to evaluate:
1. **Accessibility**: HTTP status, response times, content completeness
2. **Navigation**: Presence of navigation elements and internal linking
3. **Functionality**: JavaScript/CSS inclusion, interactive elements, page-specific features
4. **Error Handling**: 404 responses, timeout behavior, error boundaries

### Checkpoint System
The audit used an advanced checkpoint system with:
- **MACRO Checkpoints**: After each page completion
- **MICRO Checkpoints**: After each test phase
- **RECOVERY Checkpoints**: Before high-risk operations
- Session state preservation for crash recovery

### Files Generated
- Individual page summaries: \`pages/*_summary.md\`
- Detailed test results: \`pages/*_results.json\`
- Session state: \`session_state/current_session.json\`
- Checkpoint history: \`checkpoints/\`
- Master audit log: \`master_audit.log\`

## Next Steps

1. **Review this report** with the development team
2. **Prioritize fixes** starting with critical issues
3. **Schedule follow-up audit** after fixes are implemented
4. **Consider automated testing** integration for continuous monitoring

---

*Report generated by Inventory System Audit Tool v1.0*  
*Session ID: $session_id*  
*Total audit time: $(grep -c "CP_.*_COMPLETE" "$session_file" 2>/dev/null || echo "N/A") checkpoints created*
EOF
    
    log "📋 Final report generated: $report_file" "$GREEN"
    log "📊 System Health Score: $health_score/100" "$GREEN"
    
    # Also create a JSON summary for programmatic access
    create_json_summary "$report_file" "$health_score"
}

# Create JSON summary
create_json_summary() {
    local report_file=$1
    local health_score=$2
    local json_file="${report_file%.md}.json"
    local session_file="$AUDIT_DIR/session_state/current_session.json"
    
    cat > "$json_file" <<EOF
{
  "audit_summary": {
    "timestamp": "$(date -Iseconds)",
    "session_id": "$(jq -r '.session_id' "$session_file")",
    "health_score": $health_score,
    "total_pages": $(jq -r '.progress.total_pages' "$session_file"),
    "completed_pages": $(jq -r '.progress.pages_completed | length' "$session_file"),
    "completion_percentage": $(jq -r '.progress.completion_percentage' "$session_file"),
    "errors": {
      "critical": $(jq -r '.error_summary.critical' "$session_file"),
      "high": $(jq -r '.error_summary.high' "$session_file"),
      "medium": $(jq -r '.error_summary.medium' "$session_file"),
      "low": $(jq -r '.error_summary.low' "$session_file"),
      "total": $(jq -r '.error_summary.total' "$session_file")
    },
    "status": "$([ $health_score -ge 75 ] && echo "GOOD" || echo "NEEDS_ATTENTION")",
    "report_files": {
      "markdown": "$(basename "$report_file")",
      "json": "$(basename "$json_file")"
    }
  }
}
EOF
    
    log "📄 JSON summary created: $json_file" "$GREEN"
}

# Main function
main() {
    local command=${1:-"--help"}
    
    case $command in
        "--full-audit")
            full_audit
            ;;
        "--audit-page")
            if [ -z "${2:-}" ]; then
                log "Error: Page name required for --audit-page" "$RED"
                exit 1
            fi
            local mapping_file="$AUDIT_DIR/session_state/page_mapping.json"
            local page_url=$(jq -r ".pages.\"$2\".url" "$mapping_file" 2>/dev/null)
            if [ "$page_url" = "null" ]; then
                log "Error: Unknown page '$2'" "$RED"
                exit 1
            fi
            audit_page "$2" "$page_url"
            ;;
        "--continue-from-checkpoint")
            log "Continuing audit from checkpoint..." "$BLUE"
            full_audit
            ;;
        "--generate-final-report")
            generate_final_report
            ;;
        "--help")
            echo "Inventory System Audit Commands:"
            echo "  --full-audit                    Run complete audit of all pages"
            echo "  --audit-page <page_name>        Audit specific page"
            echo "  --continue-from-checkpoint      Continue audit from last checkpoint"
            echo "  --generate-final-report         Generate final audit report"
            echo ""
            echo "Available pages:"
            if [ -f "$AUDIT_DIR/session_state/page_mapping.json" ]; then
                jq -r '.pages | keys[]' "$AUDIT_DIR/session_state/page_mapping.json" | while read page; do
                    echo "    $page"
                done
            fi
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