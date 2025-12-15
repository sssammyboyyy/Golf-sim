# n8n Automation Best Practices
## 1. Workflow Structure
- **Linear Flow**: Keep workflows as linear as possible. Use sub-workflows for reusable complex logic.
- **Trigger Isolation**: The trigger node should immediately lead to a formatting/validation node before any business logic limits are hit.
- **Response**: Always ensure a Webhook Response node exists for synchronous webhook triggers, even in case of error.
## 2. Security & Webhooks
- **Authentication**: Usage of `Header Auth` or `Query Param` validation for all webhooks to prevent unauthorized execution.
- **Secret Management**: Never hardcode API keys or secrets in nodes. Use n8n Credentials store.
- **Data sanitization**: Validate incoming JSON payloads against a schema (using specific Code nodes or If nodes) before processing.
## 3. Error Handling
- **Error Trigger**: Every critical workflow must have an Error Trigger workflow set in "Settings -> Error Workflow".
- **Graceful Failures**: Workflows should not fail silently. Log errors to a `System_Logs` table in Supabase or send a notification (Slack/Email).
- **Idempotency**: Workflows should be designed to be retriable. Checking "Does this record exist?" before "Create record" is mandatory to prevent duplicates.
## 4. Data Transformation
- **Code Nodes**: Use Code Nodes for complex transformation (Javascript/Typescript) instead of chaining 10+ Set nodes.
- **Strict Typing**: When transforming data for Supabase, ensure field names match database columns exactly.
- **Batching**: Respect batch sizes when processing large datasets to avoid memory overflows.
## 5. Naming Conventions
- **Nodes**: Name nodes descriptively (e.g., "Fetch User from DB", "Filter Active Users") not just "Postgres1", "Filter1".
- **Workflows**: `[Domain] - [Action]` (e.g., `[Auth] - On User Signup`, `[Stripe] - Handle Failed Payment`).
