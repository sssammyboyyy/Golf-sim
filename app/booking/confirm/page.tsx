"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Calendar, Users, CreditCard, ArrowRight, Loader2, AlertCircle, Trophy } from "lucide-react"

// Helper to wrap search params for Next.js 15
function BookingDetails() {
  const searchParams = useSearchParams()
  
  // State
  const [isProcessing, setIsProcessing] = useState(false)
  const [payFullAmount, setPayFullAmount] = useState(false)
  const [couponCode, setCouponCode] = useState("") // <--- COUPON RESTORED
  const [error, setError] = useState<string | null>(null)

  // Hardcoded Guest Info (In real app, pass this from Step 1 or generic inputs)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")

  // Extract Params
  const sessionType = searchParams.get("sessionType") || ""
  const players = Number(searchParams.get("players")) || 1
  const dateStr = searchParams.get("date") || ""
  const timeSlot = searchParams.get("timeSlot") || ""
  const duration = Number(searchParams.get("duration")) || 1
  const golfClubRental = searchParams.get("golfClubRental") === "true"
  const coachingSession = searchParams.get("coachingSession") === "true"

  // --- CALCULATION LOGIC ---
  const calculateTotal = () => {
    let basePrice = 0
    if (sessionType === "4ball") basePrice = 150 * 4 * duration
    else if (sessionType === "3ball") basePrice = 160 * 3 * duration
    else {
      // Quick Play Fallback
      const pricing = { 1: 250, 2: 180, 3: 160, 4: 150 }
      const rate = pricing[Math.min(players, 4) as keyof typeof pricing] || 250
      basePrice = rate * players * duration
    }
    
    if (golfClubRental) basePrice += 100
    if (coachingSession) basePrice += 250
    return basePrice
  }

  const total = calculateTotal()
  
  // Deposit Logic
  const isDepositEligible = sessionType.includes("ball") || sessionType.includes("famous")
  const depositAmount = Math.ceil(total * 0.40)
  
  // Checkbox Toggle
  const amountDueNow = (isDepositEligible && !payFullAmount) ? depositAmount : total
  const amountDueLater = total - amountDueNow

  const handlePayment = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Please fill in your details.")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Booking Details
          booking_date: dateStr,
          start_time: timeSlot,
          duration_hours: duration,
          player_count: players,
          session_type: sessionType,
          
          // Customer Details
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          
          // Financials
          total_price: total,
          pay_full_amount: payFullAmount, // <--- CHECKBOX STATE
          coupon_code: couponCode,        // <--- COUPON STATE
          
          // Extras
          enter_competition: false, 
          accept_whatsapp: true
        }),
      })

      // 1. Check if response is OK first
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "Server Error"
        try {
           const errorJson = JSON.parse(errorText)
           errorMessage = errorJson.error || errorMessage
        } catch {
           errorMessage = `Error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // 2. Parse JSON safely
      const data = await response.json()

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else if (data.free_booking) {
         // Handle 100% Coupon Success (Bypass Yoco)
         window.location.href = `/booking/success?bookingId=${data.booking_id}`
      } else {
        throw new Error("No payment redirect found")
      }

    } catch (err: any) {
      console.error("Payment Error:", err)
      setError(err.message || "Payment initialization failed")
    } finally {
      // THIS IS THE FIX FOR THE INFINITE SPINNER
      setIsProcessing(false) 
    }
  }

  const sessionLabel = sessionType === "4ball" ? "4-Ball Special" : 
                       sessionType === "3ball" ? "3-Ball Special" : "Quick Play"

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Confirm Booking</h1>
        <p className="text-slate-600">Review your session details</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT COL: Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Date</span>
                <span className="font-medium">{dateStr}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Time</span>
                <span className="font-medium">{timeSlot} ({duration} hrs)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Type</span>
                <span className="font-medium">{sessionLabel}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Name</label>
                <input 
                  type="text" 
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                <input 
                  type="email" 
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                <input 
                  type="tel" 
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="082 123 4567"
                />
              </div>
            </CardContent>
          </Card>

           {/* COUPON INPUT */}
           <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Promo Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 p-2 border rounded-md uppercase placeholder:normal-case"
                  placeholder="Enter code (e.g. SAVE10)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                * Discount applied at payment step.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COL: Payment */}
        <div className="space-y-4">
          <Card className="bg-slate-50 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R{total.toFixed(2)}</span>
              </div>
              
              {/* CHECKBOX LOGIC */}
              {isDepositEligible && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 mt-4">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="payFull" 
                      checked={payFullAmount}
                      onChange={(e) => setPayFullAmount(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <label htmlFor="payFull" className="text-sm cursor-pointer select-none">
                      <span className="font-semibold block text-slate-900">Pay full amount now?</span>
                      <span className="text-slate-500 text-xs">
                        Pay R{total} now and settle nothing in store.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-300 my-4 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg text-slate-900">Due Now</span>
                  <span className="font-bold text-2xl text-primary">R{amountDueNow.toFixed(2)}</span>
                </div>
                {amountDueLater > 0 && (
                   <div className="flex justify-between text-sm text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                    <span>Due in Store</span>
                    <span>R{amountDueLater.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handlePayment} 
                disabled={isProcessing}
                className="w-full h-12 text-lg font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay R{amountDueNow}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookingConfirmPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-10">Loading...</div>}>
      <BookingDetails />
    </Suspense>
  )
}
