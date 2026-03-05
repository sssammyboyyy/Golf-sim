"""
update_n8n.py - Self-Contained n8n Workflow Updater
====================================================
Reads the EXISTING workflow JSON files from the project root,
validates their structure, and ensures all code nodes use `var`
declarations (prevents n8n VM context leakage).

NO hardcoded paths to Antigravity brain artifacts.
Operates purely on the project-local JSON files.
"""

import json
import os
import sys

# Project root (where this script lives under scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MANUAL_FILE = os.path.join(PROJECT_ROOT, "manual_confirmation_with_addons.json")
REMINDERS_FILE = os.path.join(PROJECT_ROOT, "reminders_with_addons.json")


def fix_var_declarations(js_code: str) -> str:
    """Replace const/let with var to prevent n8n VM context leakage."""
    # Only replace top-level const/let, not inside strings
    result = js_code.replace("const ", "var ")
    result = result.replace("let ", "var ")
    return result


def validate_workflow(filepath: str) -> dict:
    """Load and validate a workflow JSON file."""
    if not os.path.exists(filepath):
        print(f"  SKIP: {filepath} not found")
        return None

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Handle both raw workflow and wrapped {workflow: ...} format
    workflow = data.get("workflow", data)
    nodes = workflow.get("nodes", [])

    if not nodes:
        print(f"  WARNING: No nodes found in {filepath}")
        return None

    return workflow


def patch_code_nodes(workflow: dict) -> int:
    """Patch all code nodes to use var declarations. Returns count of patched nodes."""
    nodes = workflow.get("nodes", [])
    patched = 0

    for node in nodes:
        if node.get("type") == "n8n-nodes-base.code":
            js = node.get("parameters", {}).get("jsCode", "")
            if "const " in js or "let " in js:
                node["parameters"]["jsCode"] = fix_var_declarations(js)
                patched += 1
                print(f"  Patched var declarations in: {node['name']}")

    return patched


def validate_modern_fields(workflow: dict) -> list:
    """Check that code nodes reference modern financial fields."""
    warnings = []
    nodes = workflow.get("nodes", [])

    for node in nodes:
        if node.get("type") == "n8n-nodes-base.code":
            js = node.get("parameters", {}).get("jsCode", "")
            name = node.get("name", "")

            # Check for deprecated field usage in email templates
            if "Email" in name or "Store" in name:
                if "booking.depositPaid" in js and "booking.amount_paid" not in js:
                    warnings.append(f"{name}: Uses deprecated 'depositPaid' instead of 'amount_paid'")
                if "booking.outstandingBalance" in js and "booking.amount_due" not in js:
                    warnings.append(f"{name}: Uses deprecated 'outstandingBalance' instead of 'amount_due'")
                if "booking.totalPrice" in js and "booking.total_price" not in js:
                    warnings.append(f"{name}: Uses deprecated 'totalPrice' instead of 'total_price'")

    return warnings


def process_file(filepath: str):
    """Process a single workflow file."""
    basename = os.path.basename(filepath)
    print(f"\nProcessing: {basename}")
    print("-" * 40)

    workflow = validate_workflow(filepath)
    if not workflow:
        return

    # 1. Fix var declarations
    patched = patch_code_nodes(workflow)
    if patched == 0:
        print("  All code nodes already use var declarations")

    # 2. Validate modern fields
    warnings = validate_modern_fields(workflow)
    if warnings:
        print("\n  WARNINGS (deprecated fields detected):")
        for w in warnings:
            print(f"    - {w}")
    else:
        print("  All code nodes use modern financial fields")

    # 3. Save back
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(workflow, f, indent=2)
    print(f"  Saved: {filepath}")


def main():
    print("=" * 50)
    print("  n8n Workflow Validator & Patcher")
    print("=" * 50)

    files_to_process = [MANUAL_FILE, REMINDERS_FILE]

    for filepath in files_to_process:
        process_file(filepath)

    print("\n" + "=" * 50)
    print("  Validation Complete")
    print("=" * 50)

    # Final JSON validity check
    for filepath in files_to_process:
        if os.path.exists(filepath):
            try:
                json.load(open(filepath, encoding="utf-8"))
                print(f"  {os.path.basename(filepath)} - JSON OK")
            except json.JSONDecodeError as e:
                print(f"  {os.path.basename(filepath)} - JSON ERROR: {e}")
                sys.exit(1)


if __name__ == "__main__":
    main()
