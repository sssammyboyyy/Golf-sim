import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), ".env.local")
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8')
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/)
            if (match) {
                const key = match[1].trim()
                const value = match[2].trim().replace(/^["'](.*)["']$/, '$1')
                process.env[key] = value
            }
        })
    }
} catch (e) {
    console.error("Could not load .env.local", e)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifySchema() {
    console.log("Checking 'bookings' table schema...")

    // Fetch a single row to inspect returned columns
    const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .limit(1)

    if (error) {
        console.error("Error fetching bookings:", error)
        return
    }

    if (!data || data.length === 0) {
        console.log("No bookings found. Attempting to insert a temporary dummy record to verify schema...")
        // Insert a dummy record with the new fields to see if DB accepts it
        const dummy = {
            booking_date: '2025-01-01',
            start_time: '00:00',
            duration_hours: 1,
            player_count: 1,
            session_type: 'quickplay',
            user_type: 'adult',
            base_price: 100,
            total_price: 100,
            status: 'cancelled', // cancelled so it doesn't show up
            payment_status: 'failed',
            accept_whatsapp: false,
            enter_competition: false,
            // The fields we want to test:
            reminder_1h_sent: false,
            reminder_24h_sent: false
        }

        // Fixed: 'session_type' enum must be valid ('quickplay' matches types.ts I read earlier)

        const { error: insertError } = await supabase.from("bookings").insert(dummy).select()

        if (insertError) {
            if (insertError.message.includes("column") && insertError.message.includes("does not exist")) {
                console.log("\n❌ TEST FAILED: Columns are MISSING.")
                console.log("Error details:", insertError.message)
            } else {
                // It might fail on other constraints but if it complains about columns, we know.
                console.error("\n❓ Insert failed with error:", insertError.message)
                if (insertError.message.includes("reminder_1h_sent")) {
                    console.log("Confirmed: reminder_1h_sent column missing.")
                }
            }
        } else {
            console.log("\n✅ TEST PASSED: Columns exist (Insert succeeded).")
        }
        return
    }

    const row = data[0]
    const has1h = "reminder_1h_sent" in row
    const has24h = "reminder_24h_sent" in row

    console.log("\n--- Schema Check Results ---")
    console.log(`Column 'reminder_1h_sent' exists: ${has1h ? "✅ YES" : "❌ NO"}`)
    console.log(`Column 'reminder_24h_sent' exists: ${has24h ? "✅ YES" : "❌ NO"}`)

    if (!has1h || !has24h) {
        console.log("\n⚠️ Columns are missing. Please run the migration SQL in your Supabase Dashboard.")
    } else {
        console.log("\n✅ Database is ready for n8n reminders.")
    }
}

verifySchema()
