---
trigger: always_on
---

Use Production Builds, Not Dev Mode:
The Issue: The agent plans to use npm run dev. Development servers are unoptimized, include hot-reloading code, and don't reflect real-world performance.
The Fix: Configure startServerCommand to use npm run build && npm start (or your framework's equivalent). This ensures Lighthouse audits the actual code users will see.