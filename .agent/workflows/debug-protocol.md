---
description: Systematic debugging loop for n8n, Supabase, and Frontend integrations
---
# Debug Protocol
Trigger this workflow when an error is pasted or reported.
## Phase 1: Isolate the Failure
Determine where the chain broke.
1.  **Frontend**: any console network errors? (400/500/CORS)
2.  **Supabase**: Check Supabase Logs/Postgres Logs. RLS errors?
3.  **n8n**: Check Execution logs. Success or Fail?
## Phase 2: Deep Dive
### If n8n Error:
- **Schema Validation**: Does the incoming JSON match what the node expects?
- **Auth**: Are the headers/API keys correct?
- **Node Output**: Check the output of the node *before* the error.
### If Supabase Error:
- **RLS Audit**:
    - Review `policies` on the table.
    - Check if the user has the correct `role`.
- **Types**: Verify `database.types.ts` matches the actual DB schema.
### If Frontend Error:
- **Payload**: Log the exact payload being sent.
- **Response**: Log the raw response body.
## Phase 3: Resolution
PROPOSE the fix in a full file replacement or specific SQL command.
- **SQL**: `create policy ...` or `alter table ...`
- **n8n**: JSON for the fixed node/workflow.
- **Code**: Modified Component/Service file.
// turbo-all
## Auto-Run
If the error is a straightforward lint or type error, auto-fix it.
