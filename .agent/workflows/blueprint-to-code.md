---
description: Transform a business blueprint into a technical implementation (n8n + Supabase + Code)
---
# Blueprint to Code Workflow
This workflow guides the transition from a rough business requirement to a deployed solution.
## Step 1: Analyze & Plan
**Input**: Business Requirement (e.g., "Send a welcome email when a user signs up")
1.  **Identify Trigger**: What starts this process? (Webhook, Schedule, DB Event?)
2.  **Map Data Flow**: Source -> Transformation -> Destination.
3.  **Define Schema**: What data do we need to store?
    - *Action*: Create/Update Supabase Table Schema if needed.
    - *Action*: specific RLS policies required?
## Step 2: Supabase Implementation
1.  **Migration**: Create the SQL migration for any new tables or fields.
2.  **Types**: Update local `database.types.ts`.
3.  **Security**: Apply RLS policies immediately.
## Step 3: n8n Workflow Design
1.  **Draft**: specific nodes needed.
2.  **Error Handling**: Attach the standard Error Workflow.
3.  **Credentials**: Ensure credentials exist for all integrations.
4.  **Implementation**: Build the flow.
    - Use Code nodes for parsing logic.
    - Use HTTP Request / Supabase nodes for IO.
## Step 4: Frontend Integration (if applicable)
1.  **Component**: Create/Update the UI to trigger the workflow (e.g., Form Submit).
2.  **Service**: Call the n8n webhook or Supabase function.
3.  **Feedback**: Handle success/error states in the UI.
## Step 5: Verification
1.  **Test Run**: Execute the n8n workflow manually with mock data.
2.  **E2E Test**: Trigger from Frontend -> Check Supabase -> Check Email/Destination.
3.  **Clean up**: Remove test data.
// turbo
## Execution Helper
If you are generating this workflow, ensure you output the specific SQL and JSON for the n8n workflow to make it copy-pasteable.
