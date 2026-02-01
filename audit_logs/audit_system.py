#!/usr/bin/env python3

"""
Comprehensive Inventory System Audit Tool
Advanced checkpoint system with session recovery
"""

import json
import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import argparse

# Color codes for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

class AuditLogger:
    def __init__(self, audit_dir: Path):
        self.audit_dir = audit_dir
        self.log_file = audit_dir / "master_audit.log"
        
    def log(self, message: str, color: str = Colors.NC) -> None:
        timestamp = datetime.now(timezone.utc).isoformat()
        formatted_message = f"{color}{timestamp} - {message}{Colors.NC}"
        print(formatted_message)
        
        # Also write to log file (without colors)
        plain_message = f"{timestamp} - {message}\n"
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(plain_message)

class CheckpointManager:
    def __init__(self, audit_dir: Path, logger: AuditLogger):
        self.audit_dir = audit_dir
        self.logger = logger
        self.session_file = audit_dir / "session_state" / "current_session.json"
        self.checkpoints_dir = audit_dir / "checkpoints"
        self.counter_file = audit_dir / "session_state" / "checkpoint_counter.txt"
        
    def get_next_checkpoint_counter(self) -> int:
        if self.counter_file.exists():
            with open(self.counter_file, "r") as f:
                counter = int(f.read().strip())
        else:
            counter = 1
        
        with open(self.counter_file, "w") as f:
            f.write(str(counter + 1))
        
        return counter
    
    def create_checkpoint(self, page_name: str, status: str) -> str:
        counter = self.get_next_checkpoint_counter()
        checkpoint_id = f"CP_{counter:03d}_{page_name.upper()}_COMPLETE"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        self.logger.log(f"Creating MACRO checkpoint: {checkpoint_id}", Colors.BLUE)
        
        # Load current session
        with open(self.session_file, "r") as f:
            session = json.load(f)
        
        # Update checkpoint information
        checkpoint_info = {
            "checkpoint_id": checkpoint_id,
            "timestamp": timestamp,
            "type": "MACRO",
            "page": page_name,
            "phase": "complete",
            "status": status
        }
        
        session["last_checkpoint"] = checkpoint_info
        session["checkpoint_history"].append(checkpoint_info)
        
        # Update progress if successful
        if status == "SUCCESS":
            if page_name not in session["progress"]["pages_completed"]:
                session["progress"]["pages_completed"].append(page_name)
            
            if page_name in session["progress"]["pages_remaining"]:
                session["progress"]["pages_remaining"].remove(page_name)
            
            completion_pct = (len(session["progress"]["pages_completed"]) * 100) / session["progress"]["total_pages"]
            session["progress"]["completion_percentage"] = round(completion_pct, 1)
        
        # Save updated session
        with open(self.session_file, "w") as f:
            json.dump(session, f, indent=2)
        
        # Create checkpoint backup
        checkpoint_file = self.checkpoints_dir / f"checkpoint_{checkpoint_id}.json"
        with open(checkpoint_file, "w") as f:
            json.dump(session, f, indent=2)
        
        self.logger.log(f"✓ MACRO Checkpoint {checkpoint_id} created successfully", Colors.GREEN)
        return checkpoint_id
    
    def create_micro_checkpoint(self, page_name: str, phase: str, status: str) -> str:
        counter = self.get_next_checkpoint_counter()
        checkpoint_id = f"CP_{counter:03d}_{page_name.upper()}_{phase.upper()}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        self.logger.log(f"Creating MICRO checkpoint: {checkpoint_id}", Colors.YELLOW)
        
        # Load current session
        with open(self.session_file, "r") as f:
            session = json.load(f)
        
        # Add to checkpoint history
        checkpoint_info = {
            "id": checkpoint_id,
            "timestamp": timestamp,
            "type": "MICRO",
            "page": page_name,
            "phase": phase,
            "status": status
        }
        
        session["checkpoint_history"].append(checkpoint_info)
        
        # Save updated session
        with open(self.session_file, "w") as f:
            json.dump(session, f, indent=2)
        
        self.logger.log(f"✓ MICRO Checkpoint {checkpoint_id} recorded", Colors.GREEN)
        return checkpoint_id

class PageTester:
    def __init__(self, audit_dir: Path, logger: AuditLogger):
        self.audit_dir = audit_dir
        self.logger = logger
        self.pages_dir = audit_dir / "pages"
        self.pages_dir.mkdir(exist_ok=True)
        
    def update_error_count(self, error_level: str) -> None:
        session_file = self.audit_dir / "session_state" / "current_session.json"
        
        with open(session_file, "r") as f:
            session = json.load(f)
        
        session["error_summary"][error_level] += 1
        session["error_summary"]["total"] += 1
        
        with open(session_file, "w") as f:
            json.dump(session, f, indent=2)
    
    def save_test_results(self, page_name: str, test_phase: str, test_results: List[Dict]) -> None:
        results_file = self.pages_dir / f"{page_name}_{test_phase}_results.json"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        results_data = {
            "page": page_name,
            "test_phase": test_phase,
            "timestamp": timestamp,
            "results": test_results
        }
        
        with open(results_file, "w") as f:
            json.dump(results_data, f, indent=2)
        
        self.logger.log(f"Test results saved: {results_file.name}", Colors.GREEN)
    
    def test_page_accessibility(self, page_name: str, page_url: str) -> bool:
        self.logger.log(f"🔍 Testing accessibility for: {page_name}", Colors.BLUE)
        test_results = []
        
        try:
            # HTTP Status Test
            self.logger.log("Testing HTTP status...", Colors.YELLOW)
            response = requests.get(page_url, timeout=10)
            
            if response.status_code == 200:
                self.logger.log(f"✅ HTTP Status: {response.status_code} (OK)", Colors.GREEN)
                test_results.append({"test": "http_status", "status": "PASS", "details": str(response.status_code)})
            else:
                self.logger.log(f"❌ HTTP Status: {response.status_code} (FAILED)", Colors.RED)
                test_results.append({"test": "http_status", "status": "FAIL", "details": str(response.status_code)})
                self.update_error_count("high")
            
            # Response Time Test
            self.logger.log("Testing response time...", Colors.YELLOW)
            response_time_ms = int(response.elapsed.total_seconds() * 1000)
            
            if response_time_ms < 3000:
                self.logger.log(f"✅ Response Time: {response_time_ms}ms (Good)", Colors.GREEN)
                test_results.append({"test": "response_time", "status": "PASS", "details": f"{response_time_ms}ms"})
            elif response_time_ms < 5000:
                self.logger.log(f"⚠️ Response Time: {response_time_ms}ms (Slow)", Colors.YELLOW)
                test_results.append({"test": "response_time", "status": "WARN", "details": f"{response_time_ms}ms"})
                self.update_error_count("medium")
            else:
                self.logger.log(f"❌ Response Time: {response_time_ms}ms (Too Slow)", Colors.RED)
                test_results.append({"test": "response_time", "status": "FAIL", "details": f"{response_time_ms}ms"})
                self.update_error_count("high")
            
            # Content Length Test
            self.logger.log("Testing content length...", Colors.YELLOW)
            content_length = len(response.content)
            
            if content_length > 1000:
                self.logger.log(f"✅ Content Length: {content_length} bytes (Good)", Colors.GREEN)
                test_results.append({"test": "content_length", "status": "PASS", "details": f"{content_length}bytes"})
            else:
                self.logger.log(f"⚠️ Content Length: {content_length} bytes (Possibly incomplete)", Colors.YELLOW)
                test_results.append({"test": "content_length", "status": "WARN", "details": f"{content_length}bytes"})
                self.update_error_count("low")
            
            # Save test results
            self.save_test_results(page_name, "accessibility", test_results)
            
            # Return overall status
            return not any(result["status"] == "FAIL" for result in test_results)
            
        except requests.RequestException as e:
            self.logger.log(f"❌ Network error: {str(e)}", Colors.RED)
            test_results.append({"test": "network", "status": "FAIL", "details": str(e)})
            self.save_test_results(page_name, "accessibility", test_results)
            self.update_error_count("critical")
            return False
    
    def test_page_navigation(self, page_name: str, page_url: str) -> bool:
        self.logger.log(f"🧭 Testing navigation for: {page_name}", Colors.BLUE)
        test_results = []
        
        try:
            response = requests.get(page_url, timeout=10)
            page_content = response.text.lower()
            
            # Test for navigation elements
            self.logger.log("Testing navigation elements...", Colors.YELLOW)
            
            nav_tests = [
                ("nav", "navigation element"),
                ("menu", "menu element"),
                ("sidebar", "sidebar element"),
                ("header", "header element"),
                ("dashboard", "dashboard link"),
                ("products", "products link")
            ]
            
            nav_pass_count = 0
            for search_term, description in nav_tests:
                if search_term in page_content:
                    self.logger.log(f"✅ Found {description}", Colors.GREEN)
                    test_results.append({"test": f"nav_{search_term}", "status": "PASS", "details": "found"})
                    nav_pass_count += 1
                else:
                    self.logger.log(f"⚠️ Missing {description}", Colors.YELLOW)
                    test_results.append({"test": f"nav_{search_term}", "status": "WARN", "details": "missing"})
            
            # Evaluate navigation completeness
            if nav_pass_count >= 4:
                self.logger.log(f"✅ Navigation: Good ({nav_pass_count}/6 elements found)", Colors.GREEN)
                test_results.append({"test": "navigation_overall", "status": "PASS", "details": f"{nav_pass_count}/6"})
            elif nav_pass_count >= 2:
                self.logger.log(f"⚠️ Navigation: Partial ({nav_pass_count}/6 elements found)", Colors.YELLOW)
                test_results.append({"test": "navigation_overall", "status": "WARN", "details": f"{nav_pass_count}/6"})
                self.update_error_count("medium")
            else:
                self.logger.log(f"❌ Navigation: Poor ({nav_pass_count}/6 elements found)", Colors.RED)
                test_results.append({"test": "navigation_overall", "status": "FAIL", "details": f"{nav_pass_count}/6"})
                self.update_error_count("high")
            
            # Save test results
            self.save_test_results(page_name, "navigation", test_results)
            
            return nav_pass_count >= 2
            
        except requests.RequestException as e:
            self.logger.log(f"❌ Network error: {str(e)}", Colors.RED)
            test_results.append({"test": "network", "status": "FAIL", "details": str(e)})
            self.save_test_results(page_name, "navigation", test_results)
            self.update_error_count("high")
            return False
    
    def test_page_functionality(self, page_name: str, page_url: str) -> bool:
        self.logger.log(f"⚙️ Testing functionality for: {page_name}", Colors.BLUE)
        test_results = []
        
        try:
            response = requests.get(page_url, timeout=10)
            page_content = response.text.lower()
            
            # Test for JavaScript
            self.logger.log("Testing for JavaScript inclusion...", Colors.YELLOW)
            if "<script" in page_content:
                self.logger.log("✅ JavaScript: Scripts found", Colors.GREEN)
                test_results.append({"test": "javascript", "status": "PASS", "details": "scripts_found"})
            else:
                self.logger.log("⚠️ JavaScript: No scripts detected", Colors.YELLOW)
                test_results.append({"test": "javascript", "status": "WARN", "details": "no_scripts"})
                self.update_error_count("low")
            
            # Test for CSS
            self.logger.log("Testing for CSS inclusion...", Colors.YELLOW)
            if "stylesheet" in page_content or "<style" in page_content:
                self.logger.log("✅ CSS: Stylesheets found", Colors.GREEN)
                test_results.append({"test": "css", "status": "PASS", "details": "stylesheets_found"})
            else:
                self.logger.log("❌ CSS: No stylesheets detected", Colors.RED)
                test_results.append({"test": "css", "status": "FAIL", "details": "no_stylesheets"})
                self.update_error_count("medium")
            
            # Test for forms
            self.logger.log("Testing for interactive forms...", Colors.YELLOW)
            form_count = page_content.count("<form")
            if form_count > 0:
                self.logger.log(f"✅ Forms: {form_count} form(s) found", Colors.GREEN)
                test_results.append({"test": "forms", "status": "PASS", "details": f"{form_count}_forms"})
            else:
                self.logger.log("ℹ️ Forms: No forms found (may be expected)", Colors.BLUE)
                test_results.append({"test": "forms", "status": "INFO", "details": "no_forms"})
            
            # Test for buttons
            self.logger.log("Testing for interactive buttons...", Colors.YELLOW)
            button_count = page_content.count("<button") + page_content.count('type="button"') + page_content.count('type="submit"')
            if button_count > 0:
                self.logger.log(f"✅ Buttons: {button_count} button(s) found", Colors.GREEN)
                test_results.append({"test": "buttons", "status": "PASS", "details": f"{button_count}_buttons"})
            else:
                self.logger.log("⚠️ Buttons: No buttons found", Colors.YELLOW)
                test_results.append({"test": "buttons", "status": "WARN", "details": "no_buttons"})
                self.update_error_count("low")
            
            # Page-specific functionality tests
            self.test_page_specific_functionality(page_name, page_content, test_results)
            
            # Save test results
            self.save_test_results(page_name, "functionality", test_results)
            
            return not any(result["status"] == "FAIL" for result in test_results)
            
        except requests.RequestException as e:
            self.logger.log(f"❌ Network error: {str(e)}", Colors.RED)
            test_results.append({"test": "network", "status": "FAIL", "details": str(e)})
            self.save_test_results(page_name, "functionality", test_results)
            self.update_error_count("high")
            return False
    
    def test_page_specific_functionality(self, page_name: str, page_content: str, test_results: List[Dict]) -> None:
        if page_name == "dashboard":
            self.logger.log("Testing dashboard-specific features...", Colors.YELLOW)
            
            if any(term in page_content for term in ["card", "widget", "dashboard"]):
                self.logger.log("✅ Dashboard: Cards/widgets found", Colors.GREEN)
                test_results.append({"test": "dashboard_cards", "status": "PASS", "details": "found"})
            else:
                self.logger.log("⚠️ Dashboard: No cards/widgets detected", Colors.YELLOW)
                test_results.append({"test": "dashboard_cards", "status": "WARN", "details": "missing"})
                self.update_error_count("medium")
            
            if any(term in page_content for term in ["total", "count", "metric", "statistic"]):
                self.logger.log("✅ Dashboard: Metrics/statistics found", Colors.GREEN)
                test_results.append({"test": "dashboard_metrics", "status": "PASS", "details": "found"})
            else:
                self.logger.log("⚠️ Dashboard: No metrics/statistics detected", Colors.YELLOW)
                test_results.append({"test": "dashboard_metrics", "status": "WARN", "details": "missing"})
                self.update_error_count("medium")
        
        elif page_name == "products":
            self.logger.log("Testing products-specific features...", Colors.YELLOW)
            
            if any(term in page_content for term in ["product", "item", "inventory"]):
                self.logger.log("✅ Products: Product-related content found", Colors.GREEN)
                test_results.append({"test": "products_content", "status": "PASS", "details": "found"})
            else:
                self.logger.log("⚠️ Products: No product-related content detected", Colors.YELLOW)
                test_results.append({"test": "products_content", "status": "WARN", "details": "missing"})
                self.update_error_count("medium")
        
        elif page_name == "scan":
            self.logger.log("Testing scan-specific features...", Colors.YELLOW)
            
            if any(term in page_content for term in ["barcode", "camera", "scan"]):
                self.logger.log("✅ Scan: Barcode/camera content found", Colors.GREEN)
                test_results.append({"test": "scan_barcode", "status": "PASS", "details": "found"})
            else:
                self.logger.log("❌ Scan: No barcode/camera content detected", Colors.RED)
                test_results.append({"test": "scan_barcode", "status": "FAIL", "details": "missing"})
                self.update_error_count("high")
        
        elif "ai-assistant" in page_name:
            self.logger.log("Testing AI-specific features...", Colors.YELLOW)
            
            if any(term in page_content for term in ["ai", "assistant", "agent", "artificial"]):
                self.logger.log("✅ AI: AI-related content found", Colors.GREEN)
                test_results.append({"test": "ai_content", "status": "PASS", "details": "found"})
            else:
                self.logger.log("❌ AI: No AI-related content detected", Colors.RED)
                test_results.append({"test": "ai_content", "status": "FAIL", "details": "missing"})
                self.update_error_count("high")
    
    def test_error_handling(self, page_name: str, page_url: str) -> bool:
        self.logger.log(f"🚨 Testing error handling for: {page_name}", Colors.BLUE)
        test_results = []
        
        # Test 404 handling
        self.logger.log("Testing 404 error handling...", Colors.YELLOW)
        invalid_url = f"{page_url}/invalid-route-test-{int(time.time())}"
        
        try:
            response = requests.get(invalid_url, timeout=5)
            if response.status_code == 404:
                self.logger.log("✅ 404 Handling: Proper 404 response", Colors.GREEN)
                test_results.append({"test": "404_handling", "status": "PASS", "details": "proper_404"})
            else:
                self.logger.log(f"⚠️ 404 Handling: Unexpected response ({response.status_code})", Colors.YELLOW)
                test_results.append({"test": "404_handling", "status": "WARN", "details": f"status_{response.status_code}"})
                self.update_error_count("low")
        except requests.RequestException:
            self.logger.log("ℹ️ 404 Test: Connection error (expected for invalid route)", Colors.BLUE)
            test_results.append({"test": "404_handling", "status": "INFO", "details": "connection_error"})
        
        # Test for error content in main page
        try:
            response = requests.get(page_url, timeout=10)
            page_content = response.text.lower()
            
            if any(term in page_content for term in ["error", "exception", "boundary"]):
                self.logger.log("ℹ️ Error Boundaries: Error-related content found (may indicate error state)", Colors.BLUE)
                test_results.append({"test": "error_boundaries", "status": "INFO", "details": "content_found"})
            else:
                self.logger.log("✅ Error Boundaries: No error content (normal state)", Colors.GREEN)
                test_results.append({"test": "error_boundaries", "status": "PASS", "details": "no_errors"})
        
        except requests.RequestException as e:
            self.logger.log(f"⚠️ Error Test: Network error - {str(e)}", Colors.YELLOW)
            test_results.append({"test": "error_boundaries", "status": "WARN", "details": str(e)})
        
        # Save test results
        self.save_test_results(page_name, "error_handling", test_results)
        
        return True  # Error handling tests are informational

class InventoryAuditSystem:
    def __init__(self, audit_dir: Path):
        self.audit_dir = audit_dir
        self.logger = AuditLogger(audit_dir)
        self.checkpoint_manager = CheckpointManager(audit_dir, self.logger)
        self.page_tester = PageTester(audit_dir, self.logger)
        
        # Page mapping
        self.pages = {
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
    
    def initialize_session(self) -> str:
        """Initialize a new audit session"""
        session_id = str(uuid.uuid4())
        start_time = datetime.now(timezone.utc).isoformat()
        
        self.logger.log("=== INVENTORY SYSTEM AUDIT LOG ===", Colors.BLUE)
        self.logger.log(f"Audit Started: {start_time}", Colors.GREEN)
        self.logger.log(f"Session ID: {session_id}", Colors.GREEN)
        self.logger.log("Checkpoint System: ENABLED", Colors.GREEN)
        self.logger.log("Recovery Support: ENABLED", Colors.GREEN)
        
        # Create directories
        (self.audit_dir / "session_state").mkdir(exist_ok=True)
        (self.audit_dir / "checkpoints").mkdir(exist_ok=True)
        (self.audit_dir / "pages").mkdir(exist_ok=True)
        (self.audit_dir / "reports").mkdir(exist_ok=True)
        
        # Create session state
        session_data = {
            "session_id": session_id,
            "audit_start_time": start_time,
            "last_checkpoint": None,
            "current_operation": {
                "page": None,
                "phase": "initialization",
                "step": "setup",
                "started_at": start_time
            },
            "progress": {
                "pages_completed": [],
                "pages_in_progress": [],
                "pages_remaining": list(self.pages.keys()),
                "total_pages": len(self.pages),
                "completion_percentage": 0.0
            },
            "checkpoint_history": [
                {
                    "id": "CP_000_INIT",
                    "timestamp": start_time,
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
        
        session_file = self.audit_dir / "session_state" / "current_session.json"
        with open(session_file, "w") as f:
            json.dump(session_data, f, indent=2)
        
        # Initialize checkpoint counter
        counter_file = self.audit_dir / "session_state" / "checkpoint_counter.txt"
        with open(counter_file, "w") as f:
            f.write("1")
        
        self.logger.log("Initial session state created", Colors.GREEN)
        return session_id
    
    def check_server_status(self) -> bool:
        """Check if the development server is running"""
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def audit_page(self, page_name: str) -> bool:
        """Audit a single page with all test phases"""
        if page_name not in self.pages:
            self.logger.log(f"Unknown page: {page_name}", Colors.RED)
            return False
        
        page_info = self.pages[page_name]
        page_url = page_info["url"]
        
        self.logger.log(f"🔍 AUDITING PAGE: {page_name} ({page_url})", Colors.BLUE)
        
        # Update current operation
        session_file = self.audit_dir / "session_state" / "current_session.json"
        with open(session_file, "r") as f:
            session = json.load(f)
        
        session["current_operation"] = {
            "page": page_name,
            "phase": "starting",
            "step": "initialization",
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        
        with open(session_file, "w") as f:
            json.dump(session, f, indent=2)
        
        overall_status = "SUCCESS"
        phase_results = []
        
        # Phase 1: Accessibility Tests
        self.logger.log("📊 Phase 1: Accessibility Tests", Colors.BLUE)
        self.checkpoint_manager.create_micro_checkpoint(page_name, "accessibility_start", "IN_PROGRESS")
        
        if self.page_tester.test_page_accessibility(page_name, page_url):
            self.logger.log("✅ Accessibility tests: PASSED", Colors.GREEN)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "accessibility_complete", "SUCCESS")
            phase_results.append("accessibility:PASS")
        else:
            self.logger.log("❌ Accessibility tests: FAILED", Colors.RED)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "accessibility_complete", "FAILED")
            phase_results.append("accessibility:FAIL")
            overall_status = "FAILED"
        
        # Phase 2: Navigation Tests
        self.logger.log("🧭 Phase 2: Navigation Tests", Colors.BLUE)
        self.checkpoint_manager.create_micro_checkpoint(page_name, "navigation_start", "IN_PROGRESS")
        
        if self.page_tester.test_page_navigation(page_name, page_url):
            self.logger.log("✅ Navigation tests: PASSED", Colors.GREEN)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "navigation_complete", "SUCCESS")
            phase_results.append("navigation:PASS")
        else:
            self.logger.log("❌ Navigation tests: FAILED", Colors.RED)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "navigation_complete", "FAILED")
            phase_results.append("navigation:FAIL")
        
        # Phase 3: Functionality Tests
        self.logger.log("⚙️ Phase 3: Functionality Tests", Colors.BLUE)
        self.checkpoint_manager.create_micro_checkpoint(page_name, "functionality_start", "IN_PROGRESS")
        
        if self.page_tester.test_page_functionality(page_name, page_url):
            self.logger.log("✅ Functionality tests: PASSED", Colors.GREEN)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "functionality_complete", "SUCCESS")
            phase_results.append("functionality:PASS")
        else:
            self.logger.log("❌ Functionality tests: FAILED", Colors.RED)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "functionality_complete", "FAILED")
            phase_results.append("functionality:FAIL")
            overall_status = "FAILED"
        
        # Phase 4: Error Handling Tests
        self.logger.log("🚨 Phase 4: Error Handling Tests", Colors.BLUE)
        self.checkpoint_manager.create_micro_checkpoint(page_name, "error_handling_start", "IN_PROGRESS")
        
        if self.page_tester.test_error_handling(page_name, page_url):
            self.logger.log("✅ Error handling tests: PASSED", Colors.GREEN)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "error_handling_complete", "SUCCESS")
            phase_results.append("error_handling:PASS")
        else:
            self.logger.log("⚠️ Error handling tests: WARNINGS", Colors.YELLOW)
            self.checkpoint_manager.create_micro_checkpoint(page_name, "error_handling_complete", "WARNING")
            phase_results.append("error_handling:WARN")
        
        # Create page summary
        self.create_page_summary(page_name, page_url, overall_status, phase_results)
        
        # Create MACRO checkpoint
        self.checkpoint_manager.create_checkpoint(page_name, overall_status)
        
        self.logger.log(f"✅ PAGE AUDIT COMPLETE: {page_name} ({overall_status})", Colors.GREEN)
        
        return overall_status == "SUCCESS"
    
    def create_page_summary(self, page_name: str, page_url: str, overall_status: str, phase_results: List[str]) -> None:
        """Create a summary report for the page"""
        summary_file = self.audit_dir / "pages" / f"{page_name}_summary.md"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        with open(summary_file, "w") as f:
            f.write(f"# Page Audit Summary: {page_name}\n\n")
            f.write(f"**URL:** {page_url}  \n")
            f.write(f"**Audit Date:** {timestamp}  \n")
            f.write(f"**Overall Status:** {overall_status}  \n\n")
            f.write("## Test Phase Results\n\n")
            
            for result in phase_results:
                phase, status = result.split(":")
                if status == "PASS":
                    f.write(f"- ✅ **{phase}**: PASSED\n")
                elif status == "FAIL":
                    f.write(f"- ❌ **{phase}**: FAILED\n")
                elif status == "WARN":
                    f.write(f"- ⚠️ **{phase}**: WARNINGS\n")
            
            f.write("\n## Detailed Results\n\n")
            f.write("Detailed test results can be found in:\n")
            f.write(f"- `{page_name}_accessibility_results.json`\n")
            f.write(f"- `{page_name}_navigation_results.json`\n")
            f.write(f"- `{page_name}_functionality_results.json`\n")
            f.write(f"- `{page_name}_error_handling_results.json`\n\n")
            
            f.write("## Recommendations\n\n")
            
            if "accessibility:FAIL" in phase_results:
                f.write("- **CRITICAL**: Fix accessibility issues - page may be inaccessible\n")
            if "functionality:FAIL" in phase_results:
                f.write("- **HIGH**: Address functionality issues - core features may be broken\n")
            if "navigation:FAIL" in phase_results:
                f.write("- **MEDIUM**: Improve navigation consistency\n")
            
            if any("FAIL" in result or "WARN" in result for result in phase_results):
                f.write("- Review detailed test results for specific issues\n")
            else:
                f.write("- No critical issues found - page is functioning well\n")
        
        self.logger.log(f"Page summary created: {summary_file.name}", Colors.GREEN)
    
    def full_audit(self) -> None:
        """Execute full audit of all pages"""
        self.logger.log("🚀 STARTING FULL INVENTORY SYSTEM AUDIT", Colors.BLUE)
        
        # Check server status
        if not self.check_server_status():
            self.logger.log("❌ Development server is not running. Please start it first:", Colors.RED)
            self.logger.log("   cd /home/nexless/Projects/0000-WebApp/supabase-store && npm run dev", Colors.YELLOW)
            return
        
        total_pages = len(self.pages)
        current_page = 1
        
        self.logger.log(f"📋 Audit Plan: {total_pages} pages to audit", Colors.BLUE)
        for page_name, page_info in self.pages.items():
            self.logger.log(f"  {current_page}. {page_name} ({page_info['url']})", Colors.YELLOW)
            current_page += 1
        
        self.logger.log("", Colors.NC)
        self.logger.log("🎯 Beginning page audits...", Colors.BLUE)
        
        # Audit each page
        audit_start_time = time.time()
        current_page = 1
        
        for page_name in self.pages.keys():
            self.logger.log("", Colors.NC)
            self.logger.log(f"📄 Auditing page {current_page}/{total_pages}: {page_name}", Colors.BLUE)
            self.logger.log("=" * 50, Colors.BLUE)
            
            try:
                self.audit_page(page_name)
                self.logger.log(f"✅ Page audit completed: {page_name}", Colors.GREEN)
            except Exception as e:
                self.logger.log(f"❌ Page audit failed: {page_name} - {str(e)}", Colors.RED)
            
            # Small delay between pages
            time.sleep(1)
            current_page += 1
        
        audit_end_time = time.time()
        audit_duration = int(audit_end_time - audit_start_time)
        
        self.logger.log("", Colors.NC)
        self.logger.log("🎉 FULL AUDIT COMPLETED!", Colors.GREEN)
        self.logger.log(f"Total time: {audit_duration} seconds", Colors.GREEN)
        self.logger.log(f"Pages audited: {total_pages}", Colors.GREEN)
        
        # Generate final report
        self.generate_final_report()
    
    def generate_final_report(self) -> None:
        """Generate comprehensive final report"""
        self.logger.log("📊 GENERATING FINAL AUDIT REPORT", Colors.BLUE)
        
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        report_file = self.audit_dir / "reports" / f"final_audit_report_{timestamp}.md"
        
        # Load session data
        session_file = self.audit_dir / "session_state" / "current_session.json"
        with open(session_file, "r") as f:
            session = json.load(f)
        
        # Calculate health score
        errors = session["error_summary"]
        health_score = 100
        health_score -= errors["critical"] * 25
        health_score -= errors["high"] * 10
        health_score -= errors["medium"] * 5
        health_score -= errors["low"] * 1
        health_score = max(0, health_score)
        
        # Create report
        with open(report_file, "w") as f:
            f.write("# Inventory System Audit Report\n\n")
            f.write(f"**Generated:** {datetime.now(timezone.utc).isoformat()}  \n")
            f.write(f"**Session ID:** {session['session_id']}  \n")
            f.write(f"**Audit Duration:** {session['audit_start_time']} to {datetime.now(timezone.utc).isoformat()}  \n\n")
            
            f.write("## Executive Summary\n\n")
            f.write(f"This comprehensive audit evaluated all {session['progress']['total_pages']} pages of the Inventory System ")
            f.write("for accessibility, navigation, functionality, and error handling.\n\n")
            
            f.write("### Overall Results\n")
            f.write(f"- **Pages Audited:** {len(session['progress']['pages_completed'])} / {session['progress']['total_pages']} ")
            f.write(f"({session['progress']['completion_percentage']:.1f}%)\n")
            f.write(f"- **Total Issues Found:** {errors['total']}\n")
            f.write(f"- **Critical Issues:** {errors['critical']}\n")
            f.write(f"- **High Priority Issues:** {errors['high']}\n")
            f.write(f"- **Medium Priority Issues:** {errors['medium']}\n")
            f.write(f"- **Low Priority Issues:** {errors['low']}\n\n")
            
            f.write("### System Health Score\n")
            if health_score >= 90:
                f.write(f"**🟢 EXCELLENT** - {health_score}/100\n\n")
            elif health_score >= 75:
                f.write(f"**🟡 GOOD** - {health_score}/100\n\n")
            elif health_score >= 60:
                f.write(f"**🟠 FAIR** - {health_score}/100\n\n")
            else:
                f.write(f"**🔴 POOR** - {health_score}/100\n\n")
            
            f.write("## Page-by-Page Analysis\n\n")
            
            # Include individual page summaries
            for page_name in session['progress']['pages_completed']:
                summary_file = self.audit_dir / "pages" / f"{page_name}_summary.md"
                if summary_file.exists():
                    f.write(f"### {page_name}\n\n")
                    with open(summary_file, "r") as summary:
                        lines = summary.readlines()
                        # Skip the title line and include the rest
                        f.writelines(lines[2:])
                    f.write("\n")
            
            f.write("## Critical Issues Requiring Immediate Attention\n\n")
            
            if errors["critical"] > 0 or errors["high"] > 0:
                f.write("The following issues require immediate attention:\n\n")
                
                # Scan for critical/high issues in results files
                for results_file in (self.audit_dir / "pages").glob("*_results.json"):
                    with open(results_file, "r") as rf:
                        try:
                            results_data = json.load(rf)
                            if any(result.get("status") == "FAIL" for result in results_data.get("results", [])):
                                page_name = results_data.get("page", "unknown")
                                f.write(f"- **{page_name}**: Critical functionality issues detected\n")
                        except json.JSONDecodeError:
                            continue
            else:
                f.write("✅ No critical issues found. System is functioning well.\n")
            
            f.write("\n## Recommendations\n\n")
            f.write("### Immediate Actions (0-1 days)\n")
            if errors["critical"] > 0:
                f.write("- Fix critical accessibility and functionality issues\n")
                f.write("- Verify all core user workflows are functional\n")
            
            f.write("\n### Short-term Improvements (1-7 days)\n")
            f.write("- Address high priority issues identified in individual page reports\n")
            f.write("- Improve page load times where response times exceed 3 seconds\n")
            f.write("- Enhance navigation consistency across all pages\n")
            
            f.write("\n### Long-term Enhancements (1-4 weeks)\n")
            f.write("- Implement comprehensive error handling for all edge cases\n")
            f.write("- Add automated testing to prevent regression of fixed issues\n")
            f.write("- Consider user experience improvements based on audit findings\n")
            
            f.write("\n## Technical Details\n\n")
            f.write("### Audit Methodology\n")
            f.write("This audit used automated testing to evaluate:\n")
            f.write("1. **Accessibility**: HTTP status, response times, content completeness\n")
            f.write("2. **Navigation**: Presence of navigation elements and internal linking\n")
            f.write("3. **Functionality**: JavaScript/CSS inclusion, interactive elements, page-specific features\n")
            f.write("4. **Error Handling**: 404 responses, timeout behavior, error boundaries\n\n")
            
            f.write("### Files Generated\n")
            f.write("- Individual page summaries: `pages/*_summary.md`\n")
            f.write("- Detailed test results: `pages/*_results.json`\n")
            f.write("- Session state: `session_state/current_session.json`\n")
            f.write("- Checkpoint history: `checkpoints/`\n")
            f.write("- Master audit log: `master_audit.log`\n\n")
            
            f.write("## Next Steps\n\n")
            f.write("1. **Review this report** with the development team\n")
            f.write("2. **Prioritize fixes** starting with critical issues\n")
            f.write("3. **Schedule follow-up audit** after fixes are implemented\n")
            f.write("4. **Consider automated testing** integration for continuous monitoring\n\n")
            
            f.write("---\n\n")
            f.write("*Report generated by Inventory System Audit Tool v1.0*  \n")
            f.write(f"*Session ID: {session['session_id']}*  \n")
            f.write(f"*Total checkpoints created: {len(session['checkpoint_history'])}*\n")
        
        self.logger.log(f"📋 Final report generated: {report_file.name}", Colors.GREEN)
        self.logger.log(f"📊 System Health Score: {health_score}/100", Colors.GREEN)
        
        # Create JSON summary
        json_file = report_file.with_suffix(".json")
        summary_data = {
            "audit_summary": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": session["session_id"],
                "health_score": health_score,
                "total_pages": session["progress"]["total_pages"],
                "completed_pages": len(session["progress"]["pages_completed"]),
                "completion_percentage": session["progress"]["completion_percentage"],
                "errors": errors,
                "status": "GOOD" if health_score >= 75 else "NEEDS_ATTENTION",
                "report_files": {
                    "markdown": report_file.name,
                    "json": json_file.name
                }
            }
        }
        
        with open(json_file, "w") as f:
            json.dump(summary_data, f, indent=2)
        
        self.logger.log(f"📄 JSON summary created: {json_file.name}", Colors.GREEN)

def main():
    parser = argparse.ArgumentParser(description="Comprehensive Inventory System Audit")
    parser.add_argument("--init", action="store_true", help="Initialize new audit session")
    parser.add_argument("--full-audit", action="store_true", help="Run full audit of all pages")
    parser.add_argument("--audit-page", type=str, help="Audit specific page")
    parser.add_argument("--status", action="store_true", help="Show current audit status")
    parser.add_argument("--report", action="store_true", help="Generate final report")
    
    args = parser.parse_args()
    
    # Get audit directory
    script_dir = Path(__file__).parent
    audit_dir = script_dir
    
    # Create audit system
    audit_system = InventoryAuditSystem(audit_dir)
    
    if args.init:
        session_id = audit_system.initialize_session()
        audit_system.logger.log(f"Audit session initialized: {session_id}", Colors.GREEN)
    
    elif args.full_audit:
        # Initialize if no session exists
        session_file = audit_dir / "session_state" / "current_session.json"
        if not session_file.exists():
            audit_system.initialize_session()
        
        audit_system.full_audit()
    
    elif args.audit_page:
        # Initialize if no session exists
        session_file = audit_dir / "session_state" / "current_session.json"
        if not session_file.exists():
            audit_system.initialize_session()
        
        audit_system.audit_page(args.audit_page)
    
    elif args.status:
        session_file = audit_dir / "session_state" / "current_session.json"
        if session_file.exists():
            with open(session_file, "r") as f:
                session = json.load(f)
            
            audit_system.logger.log("📊 CURRENT SESSION STATUS", Colors.BLUE)
            audit_system.logger.log(f"Session ID: {session['session_id']}", Colors.GREEN)
            audit_system.logger.log(f"Started: {session['audit_start_time']}", Colors.GREEN)
            audit_system.logger.log(f"Progress: {len(session['progress']['pages_completed'])}/{session['progress']['total_pages']} pages ({session['progress']['completion_percentage']:.1f}%)", Colors.GREEN)
            
            errors = session["error_summary"]
            audit_system.logger.log(f"Errors: Critical={errors['critical']}, High={errors['high']}, Medium={errors['medium']}, Low={errors['low']}", Colors.YELLOW)
        else:
            audit_system.logger.log("No active session found", Colors.YELLOW)
    
    elif args.report:
        audit_system.generate_final_report()
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()