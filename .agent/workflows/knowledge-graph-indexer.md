---
description: Index the system's architecture, logic, and constraints into Memory MCP
---

# Knowledge Graph Indexer Workflow

This workflow automates the synchronization between the project's source code and the Memory MCP knowledge graph. Use it to maintain a deterministic map of system constraints and dependencies.

## Steps

1. **Prerequisite Check**
   Ensure the `knowledge-graph-indexer` skill is available at `C:\Users\samue\.gemini\antigravity\skills\knowledge-graph-indexer\SKILL.md`.

2. **Component Discovery**
   Scan `app/api`, `lib`, and `supabase/migrations` to identify new or modified core entities.

3. **Update Knowledge Graph**
   Follow the Execution Steps in the SKILL.md:
   - **Extract**: Create/Update entities for files and services.
   - **Map**: Establish `depends_on` or `handles` relations.
   - **Observe**: Document specific constraints (Timezones, Error codes, Idempotency).

4. **Logical Validation**
   Query the graph using `search_nodes` to verify that complex logic (like 23P01 conflict resolution) is accurately reflected in the new state.

## When to Run
- After merging significant API changes.
- After adding new third-party integrations.
- When the AI assistant needs to reset its understanding of the system's "Genetic Code".
