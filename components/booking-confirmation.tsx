"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, Trophy, Mail, Phone, User, Info } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"

// NOTE: We use standard HTML inputs for checkboxes to avoid build errors 
// if Shadcn Checkbox/Label components are missing.

export default function BookingConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // -- STATE --
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // -- INPUTS --
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [acceptWhatsApp, setAcceptWhatsApp] = useState(false)
  const [enterCompetition, setEnterCompetition] = useState(false)
  const [couponCode, setCouponCode] = useState("")

  // -- URL PARAMS --
  const sessionType = searchParams.get("sessionType") || "quick"
  const players = parseInt(searchParams.get("players") || "1")
  const date = searchParams.get("date") || ""
  const timeSlot = searchParams.get("timeSlot") || ""
  const duration = parseFloat(searchParams.get("duration") || "1")
  const golfClubRental = searchParams.get("golfClubRental") === "true"
  const coachingSession = searchParams.get("coachingSession") === "true"
  const famousCourseOption = searchParams.get("famousCourseOption") || ""

  // -- CALCULATE PRICE --
  const calculateTotal = () => {
    let base = 0
    if (sessionType === "4ball") base = 150 * 4 * duration
    else if (sessionType === "3ball") base = 160 * 3 * duration
    else {
      const pricing: Record<number, number> = { 1: 250, 2: 180, 3: 160, 4: 150 }
      const pricePerPerson = pricing[Math.min(players, 4)] || 150
      base = pricePerPerson * players * duration
    }
    
    // Add-ons
    if (golfClubRental) base += 100
    if (coachingSession) base += 250
    
    return base
  }

  const basePrice = calculateTotal()
  const totalPrice = basePrice 
  
  // Deposit Logic (40% for Famous/Ball options)
  const isDeposit = sessionType.includes("ball") || sessionType.includes("famous")
  const depositAmount = isDeposit ? Math.ceil(totalPrice * 0.4) : totalPrice
  const payNowAmount = depositAmount

  // --- PAYMENT HANDLER ---
  const handlePayment = async () => {
    // 1. Validation
    if (!guestName || !guestEmail || !guestPhone || !acceptWhatsApp) {
      setErrorMessage("Please fill in all required fields marked with *")
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_date: date,
          start_time: timeSlot,
          duration_hours: duration,
          player_count: players,
          session_type: sessionType,
          famous_course_option: famousCourseOption,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          accept_whatsapp: acceptWhatsApp,
          enter_competition: enterCompetition,
          base_price: basePrice,
          total_price: totalPrice,
          coupon_code: couponCode || null,
          golf_club_rental: golfClubRental,
          coaching_session: coachingSession
        }),
      })

      const data = await response.json()

      // 409 Conflict (Double Booking)
      if (response.status === 409) {
        setErrorMessage("⚠️ That slot was just grabbed by another player. Please choose another time.")
        setIsProcessing(false)
        return
      }

      // Generic Error
      if (!response.ok) {
        throw new Error(data.error || "Payment initialization failed")
      }

      // Success (Free)
      if (data.free_booking && data.booking_id) {
        router.push(`/booking/success?reference=${data.booking_id}`)
        return
      }
      
      // Success (Redirect to Yoco)
      const paymentUrl = data.redirectUrl || data.authorization_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

    } catch (error) {
      console.error("Booking Error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.")
      setIsProcessing(false)
    }
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-ZA", {
        weekday: "short", day: "numeric", month: "short",
      })
    : ""

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        
        {/* Header */}
        <Link href="/booking" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to options
        </Link>
        
        <h1 className="text-2xl font-bold mb-6">Confirm Details</h1>

        {/* Summary Card */}
        <Card className="mb-6 border-0 shadow-md overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">{sessionType === "4ball" ? "4-Ball Special" : sessionType === "3ball" ? "3-Ball Special" : "Quick Play Session"}</p>
                <p className="text-sm text-muted-foreground">{duration} Hours • {players} Players</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            </div>
            
            <hr className="border-t border-border" />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{timeSlot}</span>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Total Value</span>
                <span>R{totalPrice}</span>
              </div>
              
              {isDeposit && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Pay Later (In Store)</span>
                  <span>- R{totalPrice - depositAmount}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
                <span>Pay Now</span>
                <span className="text-primary">R{payNowAmount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Form */}
        <Card className="border-0 shadow-md">
           <CardHeader>
             <CardTitle className="text-lg">Your Details</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             
             {/* Name */}
             <div className="space-y-2">
               <label htmlFor="name" className="text-sm font-medium leading-none">Full Name *</label>
               <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   id="name" 
                   placeholder="John Doe" 
                   className="pl-9"
                   value={guestName}
                   onChange={(e) => setGuestName(e.target.value)}
                 />
               </div>
             </div>

             {/* Email */}
             <div className="space-y-2">
               <label htmlFor="email" className="text-sm font-medium leading-none">Email Address *</label>
               <div className="relative">
                 <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   id="email" 
                   type="email" 
                   placeholder="john@example.com" 
                   className="pl-9"
                   value={guestEmail}
                   onChange={(e) => setGuestEmail(e.target.value)}
                 />
               </div>
             </div>

             {/* Phone */}
             <div className="space-y-2">
               <label htmlFor="phone" className="text-sm font-medium leading-none">Phone Number *</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   id="phone" 
                   type="tel" 
                   placeholder="082 123 4567" 
                   className="pl-9"
                   value={guestPhone}
                   onChange={(e) => setGuestPhone(e.target.value)}
                 />
               </div>
             </div>
            
             {/* Coupon Code */}
             <div className="space-y-2 pt-2">
               <label htmlFor="coupon" className="text-sm font-medium leading-none">Coupon Code (Optional)</label>
               <Input 
                 id="coupon" 
                 placeholder="Enter code" 
                 value={couponCode}
                 onChange={(e) => setCouponCode(e.target.value)}
               />
             </div>

             {/* Checkboxes (Standard HTML) */}
             <div className="space-y-4 pt-4">
               <div className="flex items-start space-x-2">
                 <input 
                    type="checkbox"
                    id="whatsapp"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={acceptWhatsApp}
                    onChange={(e) => setAcceptWhatsApp(e.target.checked)}
                 />
                 <label htmlFor="whatsapp" className="text-sm leading-snug cursor-pointer">
                   I accept receiving booking confirmation via WhatsApp/SMS *
                 </label>
               </div>
               
               <div className="flex items-start space-x-2">
                 <input 
                    type="checkbox"
                    id="competition"
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={enterCompetition}
                    onChange={(e) => setEnterCompetition(e.target.checked)}
                 />
                 <label htmlFor="competition" className="text-sm leading-snug cursor-pointer text-muted-foreground">
                   Enter me into the monthly "Free Round" competition
                 </label>
               </div>
             </div>

             {/* Error Message */}
             {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="font-medium">{errorMessage}</p>
                </div>
              )}

             {/* Action Button */}
             <Button 
               className="w-full h-12 text-lg font-bold mt-2" 
               onClick={handlePayment}
               disabled={isProcessing}
             >
               {isProcessing ? "Processing..." : `Pay R${payNowAmount}`}
             </Button>
             
             <p className="text-xs text-center text-muted-foreground pt-2">
               Secure payment via Yoco. 
             </p>

           </CardContent>
        </Card>
      </div>
    </div>
  )
}
