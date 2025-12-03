"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2, AlertCircle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

function SuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("bookingId") || searchParams.get("reference")
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (!bookingId || hasTriggered.current) return

    hasTriggered.current = true 

    const finalizeBooking = async () => {
      try {
        const res = await fetch("/api/trigger-n8n", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        })
        setStatus("success")
      } catch (e) {
        console.error("Trigger error", e)
        setStatus("success")
      }
    }

    finalizeBooking()
  }, [bookingId])

  if (!bookingId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the booking reference.</p>
        <Link href="/">
           <Button>Return Home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4 bg-muted/10">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full">
        {status === "loading" ? (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Finalizing your booking...</h1>
            <p className="text-muted-foreground">Please wait a moment while we confirm your slot.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Booking Confirmed!</h1>
            <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-muted-foreground/30">
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Booking Reference</p>
               <p className="font-mono text-xl font-bold">{bookingId.slice(0, 8).toUpperCase()}</p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We've sent a confirmation email with all the details. We look forward to seeing you on the tee!
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <Button asChild size="lg" className="w-full text-lg h-12">
                <Link href="/booking">Book Another Session</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" /> Back to Home
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
