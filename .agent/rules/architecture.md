# Architecture & Development Rules
## 1. Core Philosophy: Modular & Scalable
- **Modularity**: Every feature should be self-contained. Avoid tight coupling between unrelated modules.
- **Speed-to-Value**: Prioritize working MVP features over premature optimization, but never compromise on security or type safety.
- **Single Source of Truth**: The Database (Supabase) is the source of truth. State management in frontend should reflect DB state.
## 2. Tech Stack Definitions
- **Frontend**: Next.js (App Router), React, Tailwind CSS.
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime).
- **Automation**: n8n (Business logic, Background jobs, Integrations).
## 3. Database & Supabase Interaction
- **Types**: ALWAYS generate and use TypeScript types from the Supabase schema (`database.types.ts`).
- **RLS**: Row-Level Security must be enabled on ALL tables. Policies must be explicitly defined.
- **Direct Access**: Use the Supabase JS Client for basic CRUD. Use RPC calls for complex transactions or logic best kept close to data.
- **Migrations**: All schema changes must be documented or automated via migration scripts/SQL snippets.
## 4. Error Handling Standards
- **Frontend**: Use Error Boundaries for UI components.
- **API/Server Actions**: Return standardized error objects `{ error: string, code: number, details?: any }`.
- **Fail Gracefully**: UI should never crash white-screen. Always show a toast or fallback UI.
## 5. Directory Structure (Guideline)
```
/app
  /(routes)         # Feature-based routing
/components
  /ui               # Generic UI components (shadcn/ui etc)
  /features         # Feature-specific components
/lib
  /supabase         # Clients (Server/Client)
  /utils            # Helper functions
/types              # Global types
```
