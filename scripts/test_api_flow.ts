import fs from "fs";
import path from "path";

// Manually load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["'](.*)["']$/, '$1');
        }
    });
}

const API_URL = "http://localhost:3000/api/payment/initialize";

async function testApiFlow(scenario: string, payload: any) {
    console.log(`\n--- Testing API Scenario: ${scenario} ---`);

    const idempotencyKey = crypto.randomUUID();
    const bookingRequestId = crypto.randomUUID();

    const fullPayload = {
        booking_request_id: bookingRequestId,
        booking_date: "2026-12-25", // Use a consistent future date for testing
        start_time: "14:00",
        duration_hours: 1,
        player_count: 2,
        session_type: "quick",
        total_price: 250,
        guest_name: "API Test User",
        guest_email: "test@example.com",
        guest_phone: "0821234567",
        ...payload // Override defaults with scenario-specific data
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': idempotencyKey,
            },
            body: JSON.stringify(fullPayload),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`❌ FAILED (${scenario}): Status ${response.status}`, result);
        } else if (result.redirectUrl || result.free_booking) {
            console.log(`✅ SUCCESS (${scenario}):`, result);
        } else {
            console.warn(`❓ UNKNOWN OUTCOME (${scenario}):`, result);
        }
    } catch (error) {
        console.error(`❌ CRITICAL FAILURE (${scenario}):`, error);
    }
}

async function run() {
    // Scenario 1: Standard booking, should succeed and return a Yoco URL
    await testApiFlow("Standard Quick Play", {});

    // Scenario 2: Admin bypass coupon, should succeed and return a free_booking confirmation
    await testApiFlow("Admin Bypass Coupon", {
        coupon_code: "MULLIGAN_ADMIN_100"
    });

    // Scenario 3: Booking that extends past closing time, should fail with a 400 error
    await testApiFlow("Past Closing Time", {
        start_time: "19:30", // Venue closes at 20:00
        duration_hours: 2
    });
}

run();