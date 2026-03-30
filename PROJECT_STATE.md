# PROJECT_STATE.md

## 🏁 PROJECT_NAME
Venue OS POS HUD Hardening & Security Refactor.

## 📈 NORTH_STAR_METRIC
Zero "Schema Mismatch" errors and 100% financial state persistence (Zero R0 events).

## 🛠️ TECH_STACK_LOCK
- **Frontend**: Next.js 15 (App Router).
- **Styling**: Vanilla CSS (No Tailwind).
- **Database**: Supabase PostgreSQL.
- **MCP Integration**: ToolHive Optimizer (Fixed to Port 61514).

## 📊 CURRENT_STATUS
- [x] Fixed "balance_due" schema crash in `update/route.ts`.
- [x] Implemented "Iron Gate" sanitization whitelist.
- [x] Fixed "R0" math engine via record-level fallbacks.
- [x] Reordered Settlement UI for managers.
- [x] Implemented Auto-Bay Allocation fallback for conflicts.
- [x] Optimized +30m add-ons and duration extension triggers.

## 🚨 RISK_PROFILE
- Manual whitelist column sync is required for schema updates.
- 44px+ touch targets verified only for current POS HUD components.

## ✅ SESSION_DEFINITION_OF_DONE
- Standardized `amount_due` display across HUD.
- Full sanitization pass on update payloads.
- Architecture Decision Log populated as the RAG brain.
