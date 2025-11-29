"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || searchParams.get("reference");
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "partial">("loading");

  useEffect(() => {
    if (!bookingId) {
      setStatus("error");
      return;
    }

    const confirmBooking = async () => {
      let bookingData = null;
      try {
        const supabase = createClient();

        // 1. Get Booking Details
        const { data: booking, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", bookingId)
          .single();

        if (error || !booking) throw new Error("Booking not found");
        bookingData = booking;

        // 2. Prepare Financials for Email (Automation)
        const total = Number(booking.total_price || 0);
        let depositPaid = "0.00";
        let outstandingBalance = "0.00";

        // Logic to handle Admin Coupons vs Normal Payments
        if (booking.payment_status === 'paid_instore' || booking.payment_status === 'completed' || booking.payment_status === 'paid') {
            depositPaid = total.toFixed(2); // Treated as fully settled or free
            outstandingBalance = "0.00";
        } else if (booking.payment_status === 'deposit_paid' || (booking.status === 'pending' && total > 0)) {
            const depCalc = total * 0.4;
            depositPaid = depCalc.toFixed(2);
            outstandingBalance = (total - depCalc).toFixed(2);
        } else {
            depositPaid = total.toFixed(2);
        }
        
        const payload = {
          bookingId: booking.id,
          yocoId: booking.yoco_payment_id || "manual_web_flow",
          paymentStatus: booking.payment_status, // Pass the existing status
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

        // 3. Trigger Email Automation
        // We use a separate try/catch here so email failures don't block the Success Screen
        try {
            const res = await fetch("/api/payment/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Email automation failed");
        } catch (emailError) {
            console.warn("Email warning:", emailError);
            // If the booking is confirmed in DB, but email failed, we show 'success' anyway
            // We rely on the DB check below.
        }

        // 4. Final Verdict
        if (booking.status === 'confirmed') {
            setStatus("success");
        } else {
            // If it's still pending after everything, that's a real error
            throw new Error("Booking validation failed");
        }

      } catch (err) {
        console.error(err);
        // SAFETY NET: If the DB says confirmed, never show error screen
        if (bookingData && bookingData.status === 'confirmed') {
             setStatus("success");
        } else {
             setStatus("error");
        }
      }
    };

    confirmBooking();
  }, [bookingId]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Finalizing your booking...</h2>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Something went wrong</h2>
        <p className="mb-6">We couldn't verify the payment automatically.</p>
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
        Your slot is secured. We look forward to seeing you!
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
