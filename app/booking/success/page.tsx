"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  
  // ---------------------------------------------------------
  // FIX 1: Look for 'bookingId' OR 'reference' (for Coupon Bypass)
  // ---------------------------------------------------------
  const bookingId = searchParams.get("bookingId") || searchParams.get("reference");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!bookingId) {
      console.error("No ID found in URL");
      setStatus("error");
      return;
    }

    const confirmBooking = async () => {
      try {
        const supabase = createClient();

        // 1. Get Booking Details
        const { data: booking, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

        if (error || !booking) throw new Error("Booking not found");

        // Prevent infinite loops if user refreshes, BUT allow Coupon/Admin codes to trigger emails
        // if they haven't been processed by n8n yet (we assume 'confirmed' via Coupon needs an email)
        // If you want strictly NO duplicate emails, keep the return. 
        // For now, we allow the script to run to ensure you get your receipt.
        if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
             setStatus("success");
             return; 
        }

        // 2. Calculate Financials for Email
        const total = Number(booking.total_price || 0);
        
        // Check if it was a Deposit Flow or Full Payment (or Coupon)
        let depositPaid = "0.00";
        let outstandingBalance = "0.00";

        // FIX 2: Better Financial Logic
        if (booking.payment_status === 'paid_instore' || booking.payment_status === 'completed') {
            // 100% Coupon or Admin Bypass
            depositPaid = "0.00";
            outstandingBalance = "0.00";
        } else if (booking.payment_status === 'deposit_paid' || (booking.status === 'pending' && total > 0)) {
            // Standard Deposit Flow (40%)
            const depCalc = total * 0.4;
            depositPaid = depCalc.toFixed(2);
            outstandingBalance = (total - depCalc).toFixed(2);
        } else {
            // Full Payment
            depositPaid = total.toFixed(2);
            outstandingBalance = "0.00";
        }
        
        const payload = {
          bookingId: booking.id,
          yocoId: booking.yoco_payment_id || "manual_web_flow",
          paymentStatus: booking.payment_status === "deposit_paid" ? "deposit_paid" : "paid",
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          guest_phone: booking.guest_phone,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          simulator_id: booking.simulator_id,
          totalPrice: total.toFixed(2),
          depositPaid: depositPaid,
          outstandingBalance: outstandingBalance
        };

        // 3. Call our Proxy API (Triggers n8n)
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("API Failed");

        setStatus("success");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    };

    confirmBooking();
  }, [bookingId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Finalizing your booking...</h2>
        <p className="text-muted-foreground">Please do not close this window.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
        <p className="mb-6">We couldn't verify the payment automatically.</p>
        <p>Please contact us if money was deducted from your account.</p>
        <Button asChild className="mt-4"><Link href="/">Return Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Thank you for booking with The Mulligan. We have sent a confirmation email with all the details.
      </p>
      <div className="flex gap-4">
        <Button asChild><Link href="/">Book Another</Link></Button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
