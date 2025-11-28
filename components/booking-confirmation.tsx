"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Calendar, Clock, Users, CreditCard, Gift, Trophy, Zap, Sparkles, Check } from "lucide-react"
import Link from "next/link"

export function BookingConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // State for processing and errors
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null) // <--- ADDED THIS

  // Form State
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [acceptWhatsApp, setAcceptWhatsApp] = useState(false)
  const [enterCompetition, setEnterCompetition] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)

  // Parse URL params
  const sessionType = searchParams.get("sessionType") || "quickplay"
  const famousCourseOption = searchParams.get("famousCourseOption") || ""
  const players = Number.parseInt(searchParams.get("players") || "1")
  const duration = Number.parseFloat(searchParams.get("duration") || "1")
  const date = searchParams.get("date") || ""
  const timeSlot = searchParams.get("timeSlot") || ""
  const golfClubRental = searchParams.get("golfClubRental") === "true"
  const coachingSession = searchParams.get("coachingSession") === "true"

  const calculatePrice = () => {
    let basePrice = 0

    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        basePrice = 150 * 4 * duration
      }
      if (famousCourseOption === "3-ball") {
        basePrice = 160 * 3 * duration
      }
    } else {
      if (players === 1) basePrice = 250 * duration
      else if (players === 2) basePrice = 180 * 2 * duration
      else if (players === 3) basePrice = 160 * 3 * duration
      else basePrice = 150 * 4 * duration
    }

    if (golfClubRental) basePrice += 100
    if (coachingSession) basePrice += 450

    return basePrice
  }

  const getPerPersonPrice = () => {
    if (sessionType === "famous-course") {
      return famousCourseOption === "4-ball" ? 150 : 160
    }
    if (players === 1) return 250
    if (players === 2) return 180
    if (players === 3) return 160
    return 150
  }

  const basePrice = calculatePrice()
  const totalPrice = couponApplied ? basePrice - couponDiscount : basePrice

  const getDepositAmount = () => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") return 600
      if (famousCourseOption === "3-ball") return 480
    }
    return totalPrice
  }

  const depositAmount = getDepositAmount()
  const remainingAmount = sessionType === "famous-course" ? totalPrice - depositAmount : 0

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon_code: couponCode,
          booking_amount: basePrice,
          session_type: sessionType,
        }),
      })
      const data = await response.json()
      if (data.valid) {
        setCouponApplied(true)
        setCouponDiscount(data.discount_amount)
      } else {
        alert(data.message || "Invalid coupon code")
      }
    } catch (error) {
      alert("Failed to validate coupon")
    }
  }

  // --- UPDATED PAYMENT HANDLER ---
  const handlePayment = async () => {
    // 1. Validation
    if (!guestName || !guestEmail || !guestPhone || !acceptWhatsApp) {
      setErrorMessage("Please fill in all required fields marked with *")
      return
    }

    setIsProcessing(true)
    setErrorMessage(null) // Clear previous errors

// --- UPDATED PAYMENT HANDLER (CORRECTED) ---
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
          // Booking Details
          booking_date: date,
          start_time: timeSlot,
          duration_hours: duration,
          player_count: players,
          session_type: sessionType,
          famous_course_option: famousCourseOption,
          
          // Customer Details
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          accept_whatsapp: acceptWhatsApp,
          enter_competition: enterCompetition,
          
          // Financials
          base_price: basePrice,
          total_price: totalPrice, // Sends the price AFTER coupon
          coupon_code: couponApplied ? couponCode : null,
          
          // Add-ons
          golf_club_rental: golfClubRental,
          coaching_session: coachingSession
        }),
      })

      const data = await response.json()

      // 🛑 2. TRAP THE RACE CONDITION (409 Conflict)
      if (response.status === 409) {
        setErrorMessage("⚠️ High demand! That slot was just grabbed by another player. Please go back and choose another time.")
        setIsProcessing(false)
        return
      }

      // 3. Handle Generic Errors
      if (!response.ok) {
        throw new Error(data.error || "Payment initialization failed")
      }

      // 4. Handle Success (Free Coupon or Paid)
      if (data.free_booking && data.booking_id) {
        router.push(`/booking/success?reference=${data.booking_id}`)
        return
      }
      
      // 5. Redirect to Yoco
      const paymentUrl = data.redirectUrl || data.authorization_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

    } catch (error) {
      console.error("Booking Error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.")
      setIsProcessing(false)
    }
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-ZA", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
        {/* Back Link */}
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Booking
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary">Almost There</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Confirm Booking</h1>
          <p className="text-muted-foreground text-sm">Review details and complete payment</p>
        </div>

        <div className="space-y-4">
          {/* Booking Summary Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {sessionType === "famous-course" ? (
                  <Trophy className="w-5 h-5 text-secondary" />
                ) : (
                  <Zap className="w-5 h-5 text-primary" />
                )}
                {sessionType === "famous-course"
                  ? `${famousCourseOption === "4-ball" ? "4-Ball" : "3-Ball"} Special`
                  : "Quick Play Session"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{players}</p>
                  <p className="text-xs text-muted-foreground">Players</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{duration}h</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-sm font-bold">{timeSlot}</p>
                  <p className="text-xs text-muted-foreground">{formattedDate}</p>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="pt-3 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    R{getPerPersonPrice()}/person × {players} × {duration}h
                  </span>
                  <span className="font-medium">
                    R{calculatePrice() - (golfClubRental ? 100 : 0) - (coachingSession ? 450 : 0)}
                  </span>
                </div>
                {golfClubRental && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Golf Club Rental</span>
                    <span className="font-medium">R100</span>
                  </div>
                )}
                {coachingSession && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coaching Session</span>
                    <span className="font-medium">R450</span>
                  </div>
                )}
                {couponApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-R{couponDiscount}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm mb-2 block">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm mb-2 block">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm mb-2 block">
                  WhatsApp Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 12 345 6789"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={acceptWhatsApp}
                    onCheckedChange={(c) => setAcceptWhatsApp(c as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Accept WhatsApp confirmations *</p>
                    <p className="text-xs text-muted-foreground">Required for booking updates</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={enterCompetition}
                    onCheckedChange={(c) => setEnterCompetition(c as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enter monthly competitions</p>
                    <p className="text-xs text-muted-foreground">Win prizes & free sessions</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gift className="w-4 h-4 text-secondary" />
                Coupon Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={couponApplied}
                  className="h-10"
                />
                <Button
                  onClick={applyCoupon}
                  variant="outline"
                  disabled={couponApplied || !couponCode.trim()}
                  className="h-10 px-4 bg-transparent"
                >
                  {couponApplied ? <Check className="w-4 h-4" /> : "Apply"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-primary to-primary/90 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm opacity-80">{sessionType === "famous-course" ? "Deposit Amount" : "Total Due"}</p>
                <p className="text-3xl font-bold">R{sessionType === "famous-course" ? depositAmount : totalPrice}</p>
              </div>
              <CreditCard className="w-10 h-10 opacity-50" />
            </div>

            {sessionType === "famous-course" && remainingAmount > 0 && (
              <div className="bg-white/10 rounded-lg p-3 mt-3">
                <p className="text-xs opacity-80">Remaining balance due in-store</p>
                <p className="text-lg font-semibold">R{remainingAmount}</p>
              </div>
            )}
          </div>

          {/* ERROR MESSAGE DISPLAY (Added Here) */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
              <span className="mt-0.5">🚫</span>
              <p className="font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing || !guestName || !guestEmail || !guestPhone || !acceptWhatsApp}
            className="w-full h-12 text-base font-semibold bg-secondary hover:bg-secondary/90 text-white"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay R${sessionType === "famous-course" ? depositAmount : totalPrice}`
            )}
          </Button>

          {/* Security Note */}
          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Yoco. Your details are protected.
          </p>
        </div>
      </div>
    </div>
  )
}
}
