# Live Payment Verification Runbook

When a customer reports making a payment but the store manager did not receive an email and the dashboard shows it as "Pending" or "Outstanding," follow this precise protocol to debug securely using live production data.

## Step 1. Identify the Booking
Log into the secure Admin interface and click on the **Health** tab. Look for the customer's name.

- Is the row highlighted **red**? (`amount_paid` is 0, but a Yoco ID exists). If yes, proceed to Step 2.
- Are there no rows? The customer hasn't submitted a payment attempt.

## Step 2. Query Yoco Directly
Before touching the database, ask Yoco what happened. Open your browser or REST client:

```bash
curl -X POST "https://yoursite.com/api/admin/check-payment" \
     -H "Content-Type: application/json" \
     -d '{"pin": "YOUR_ADMIN_PIN", "yocoId": "yo_chk_xxx"}'
```

- If Yoco returns `"status": "successful"`, the payment is real. The webhook was dropped or a race condition occurred. Proceed to Step 3.
- If Yoco returns `"status": "pending"` or `"failed"`, the customer abandoned or failed checkout. Do nothing.

## Step 3. Force Reconciliation (Self-Healing)
Manually trigger the background worker for *only* this specific booking. This forces the backend to pull the data from Yoco, patch Supabase, and fire the `POST` request to n8n automatically.

```bash
curl -X POST "https://yoursite.com/api/reconcile-payments" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_RECONCILE_SECRET" \
     -d '{"bookingId": "UUID_HERE"}'
```

## Step 4. Verify the Logs
Open your Cloudflare Pages Dashboard -> "Logs" -> "Real-time Logs" (or tail them locally). Search for `[VERIFY]`. 
You should see output similar to this:
1. `[VERIFY] Triggering manual reconciliation for booking: ...`
2. `[VERIFY] Checking Yoco API...`
3. `[VERIFY] Healing database. Updating booking...`
4. `[VERIFY] Dispatching n8n automation for reconciled booking...`

## Step 5. Confirm Automation Success
Refresh the Admin **Health** dashboard. 

1. The `DB Amount Paid` should reflect the correct price instead of R0.
2. The `Current Status` should advance to `confirmed`.
3. The `Automation Sent` column should show a green checkmark (`✅`) now that n8n was successfully dispatched.

*(Note: Verify your Resend logs inside n8n if the email still did not arrive).*
