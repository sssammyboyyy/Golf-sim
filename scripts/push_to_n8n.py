"""
push_to_n8n.py - Push patched workflow JSON to live n8n instance
================================================================
Usage: python scripts/push_to_n8n.py <API_KEY>

Reads manual_confirmation_with_addons.json from the project root
and PUTs it to the n8n REST API to update the live workflow.
"""

import json
import sys
import os

try:
    import requests
except ImportError:
    # Fallback to urllib if requests not installed
    import urllib.request
    import urllib.error

    def put_request(url, data, headers):
        req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers, method='PUT')
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    HAS_REQUESTS = False
else:
    HAS_REQUESTS = True


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKFLOW_FILE = os.path.join(PROJECT_ROOT, "reminders_with_addons.json")
N8N_BASE_URL = "https://n8n.srv1127912.hstgr.cloud"
WORKFLOW_ID = "wEmvM1M6u3kceErS"


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/push_to_n8n.py <N8N_API_KEY>")
        print("  Get your API key from: n8n Settings > API > Create API Key")
        sys.exit(1)

    api_key = sys.argv[1]

    # Load workflow
    with open(WORKFLOW_FILE, "r", encoding="utf-8") as f:
        workflow = json.load(f)

    print(f"Loaded: {WORKFLOW_FILE}")
    print(f"Workflow: {workflow.get('name', 'Unknown')}")
    print(f"Nodes: {len(workflow.get('nodes', []))}")
    print(f"Target: {N8N_BASE_URL}/api/v1/workflows/{WORKFLOW_ID}")
    print()

    # Strip to only API-accepted fields (n8n rejects extra properties)
    # n8n API is strict: requires 'settings' but rejects unknown properties
    raw_settings = workflow.get("settings", {})
    allowed_settings = ["executionOrder", "timezone", "callerPolicy", "errorWorkflow", "saveDataSuccessExecution", "saveDataErrorExecution", "saveManualExecutions"]
    clean_settings = {k: v for k, v in raw_settings.items() if k in allowed_settings}

    payload = {
        "name": workflow.get("name"),
        "nodes": workflow.get("nodes"),
        "connections": workflow.get("connections"),
        "settings": clean_settings,
    }

    url = f"{N8N_BASE_URL}/api/v1/workflows/{WORKFLOW_ID}"
    headers = {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": api_key
    }

    if HAS_REQUESTS:
        resp = requests.put(url, json=payload, headers=headers, timeout=30)
        status = resp.status_code
        body = resp.text
    else:
        status, body = put_request(url, payload, headers)

    if status == 200:
        result = json.loads(body)
        print(f"SUCCESS! Workflow updated.")
        print(f"  Name: {result.get('name')}")
        print(f"  Active: {result.get('active')}")
        print(f"  Updated: {result.get('updatedAt')}")
    else:
        print(f"FAILED! Status: {status}")
        print(f"  Response: {body[:500]}")
        sys.exit(1)


if __name__ == "__main__":
    main()
