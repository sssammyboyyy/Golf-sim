"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, Users } from "lucide-react"
import Link from "next/link"

export function BookingConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [acceptWhatsApp, setAcceptWhatsApp] = useState(false)
  const [enterCompetition, setEnterCompetition] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)

  const players = searchParams.get("players") || "1"
  const sessionType = searchParams.get("type") || "quickplay"
  const famousOption = searchParams.get("famousOption") || ""
  const date = searchParams.get("date") || ""
  const time = searchParams.get("time") || ""
  const duration = searchParams.get("duration") || "1"
  const basePrice = Number.parseFloat(searchParams.get("price") || "0")
  const golfClubs = searchParams.get("golfClubs") === "true"
  const coaching = searchParams.get("coaching") === "true"

  const getDepositAmount = () => {
    if (sessionType === "famous-course") {
      if (famousOption === "4-ball") return 600
      if (famousOption === "3-ball") return 450
    }
    return basePrice
  }

  const depositAmount = getDepositAmount()
  const totalPrice = couponApplied ? basePrice - couponDiscount : basePrice

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
        alert(data.message || "Coupon applied successfully!")
      } else {
        alert(data.message || "Invalid coupon code")
      }
    } catch (error) {
      console.error("Coupon validation error:", error)
      alert("Failed to validate coupon. Please try again.")
    }
  }

  const handlePayment = async () => {
    if (!guestName || !guestEmail || !guestPhone || !acceptWhatsApp) {
      alert("Please fill in all required fields and accept WhatsApp booking confirmations")
      return
    }

    setIsProcessing(true)

    const bookingData = {
      booking_date: new Date(date).toISOString().split("T")[0],
      start_time: time,
      duration_hours: Number.parseFloat(duration),
      player_count: Number.parseInt(players),
      session_type: sessionType,
      famous_course_option: famousOption || null,
      base_price: basePrice,
      total_price: totalPrice,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      accept_whatsapp: acceptWhatsApp,
      enter_competition: enterCompetition,
      coupon_code: couponApplied ? couponCode : null,
      golf_club_rental: golfClubs,
      coaching_session: coaching,
    }

    try {
      // Call API - Backend will determine if it's free (Admin Code) or Paid (Yoco)
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      })

      const data = await response.json()

      // CASE 1: Server says it's free (Admin Code used)
      if (data.free_booking && data.booking_id) {
        router.push(`/booking/success?reference=${data.booking_id}`)
        return
      }

      // CASE 2: Server provided a payment URL
      if (data.authorization_url) {
        window.location.href = data.authorization_url
        return
      }

      // CASE 3: Something went wrong
      throw new Error(data.error || "Failed to initialize booking")
    } catch (error) {
      console.error("Payment error:", error)
      alert(error instanceof Error ? error.message : "Failed to process booking")
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Booking</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">Confirm Booking</h1>
          <p className="text-sm text-muted-foreground">Review details and complete payment</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
              <CardDescription className="text-sm">
                {sessionType === "famous-course"
                  ? `18-Hole Famous Course • ${famousOption === "4-ball" ? "4-Ball" : "3-Ball"}`
                  : "Quick Play Session"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Players</span>
                </div>
                <span className="font-bold">{players}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <span className="font-bold">{duration} hours</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Date & Time</span>
                </div>
                <span className="font-bold text-sm text-right">
                  {new Date(date).toLocaleDateString("en-ZA", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {time}
                </span>
              </div>

              {(golfClubs || coaching) && (
                <div className="pt-3 border-t space-y-2">
                  {golfClubs && (
                    <div className="flex justify-between text-sm">
                      <span>Golf Club Rental</span>
                      <Badge variant="secondary">R100</Badge>
                    </div>
                  )}
                  {coaching && (
                    <div className="flex justify-between text-sm">
                      <span>Coaching Session</span>
                      <Badge variant="default">R450</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Details</CardTitle>
              <CardDescription className="text-sm">We'll send confirmation via WhatsApp</CardDescription>
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
                  Email Address *
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
                  Phone Number (WhatsApp) *
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

              <div className="pt-4 space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id="whatsapp"
                    checked={acceptWhatsApp}
                    onCheckedChange={(checked) => setAcceptWhatsApp(checked as boolean)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="whatsapp" className="text-sm cursor-pointer leading-relaxed flex-1">
                    <span className="font-bold block mb-1">Accept WhatsApp confirmations *</span>
                    <span className="text-xs text-muted-foreground">Required for booking updates</span>
                  </Label>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id="competition"
                    checked={enterCompetition}
                    onCheckedChange={(checked) => setEnterCompetition(checked as boolean)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="competition" className="text-sm cursor-pointer leading-relaxed flex-1">
                    <span className="font-bold block mb-1">Enter monthly competitions</span>
                    <span className="text-xs text-muted-foreground">Compete for prizes and free sessions</span>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-lg">Total Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-base font-medium">Amount Due</span>
                <span className="text-3xl font-bold text-primary">R{totalPrice}</span>
              </div>

              {sessionType === "famous-course" && (
                <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/30 mb-4">
                  <p className="text-xs font-bold text-secondary mb-1">Deposit Payment</p>
                  <p className="text-xs text-muted-foreground">
                    Pay R{depositAmount} now, remaining R{basePrice - depositAmount} in-store
                  </p>
                </div>
              )}

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>
                    Session ({players} players × {duration}h)
                  </span>
                  <span>R{basePrice}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon discount</span>
                    <span>-R{couponDiscount}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Label htmlFor="coupon" className="text-xs mb-2 block">
                  Coupon Code (Optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponApplied}
                    className="h-10 text-sm"
                  />
                  <Button
                    onClick={applyCoupon}
                    variant="outline"
                    disabled={couponApplied || !couponCode.trim()}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePayment}
            disabled={isProcessing || !guestName || !guestEmail || !guestPhone || !acceptWhatsApp}
            className="w-full h-12 text-base font-semibold"
          >
            {isProcessing ? "Processing..." : `Pay R${sessionType === "famous-course" ? depositAmount : totalPrice}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
