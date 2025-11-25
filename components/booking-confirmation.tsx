"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, Users, Sparkles, Trophy, CheckCircle2 } from "lucide-react"
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

  // Get booking details from URL params
  const players = searchParams.get("players") || "1"
  const sessionType = searchParams.get("type") || "quickplay"
  const famousOption = searchParams.get("famousOption") || ""
  const date = searchParams.get("date") || ""
  const time = searchParams.get("time") || ""
  const duration = searchParams.get("duration") || "1"
  const basePrice = Number.parseFloat(searchParams.get("price") || "0")

  const getDepositAmount = () => {
    if (sessionType === "famous-course") {
      if (famousOption === "4-ball") return 600 // Updated deposit for R150/person pricing
      if (famousOption === "3-ball") return 450 // Updated deposit for R150/person pricing
    }
    return basePrice // For quick play, full amount is due
  }

  const depositAmount = getDepositAmount()
  const remainderAmount = sessionType === "famous-course" ? basePrice - depositAmount : 0

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

  const getSessionDescription = () => {
    if (sessionType === "famous-course") {
      if (famousOption === "4-ball") {
        return "18-Hole Famous Course • 4-Ball Special"
      }
      if (famousOption === "3-ball") {
        return "18-Hole Famous Course • 3-Ball"
      }
      return "18-Hole Famous Course"
    }
    return "Quick Play Session"
  }

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="container mx-auto px-4">
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Booking
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
                <CardDescription>Review your session details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    {sessionType === "famous-course" ? (
                      <Sparkles className="w-5 h-5 text-secondary" />
                    ) : (
                      <Trophy className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Session Type</p>
                    <p className="font-semibold text-foreground">{getSessionDescription()}</p>
                    {sessionType === "famous-course" && (
                      <>
                        <Badge className="mt-2 bg-secondary/20 text-secondary border-0">
                          Augusta National, St. Andrews & 5000+ Pro Tee Famous Courses
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Golf club rental available: R100 (payable in-store)
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Players</p>
                    <p className="font-semibold text-foreground">
                      {players} player{Number.parseInt(players) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground">{new Date(date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time & Duration</p>
                    <p className="font-semibold text-foreground">
                      {time} - {duration} hour{Number.parseFloat(duration) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {sessionType === "famous-course" && (
                  <div className="mt-4 p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                      Minimum booking requirement satisfied
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
                <CardDescription>We'll send your confirmation via WhatsApp and email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (WhatsApp) *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+27 12 345 6789"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                </div>
                <Separator className="my-4" />
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="whatsapp"
                      checked={acceptWhatsApp}
                      onCheckedChange={(checked) => setAcceptWhatsApp(checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="whatsapp" className="text-sm cursor-pointer leading-relaxed">
                      <span className="font-semibold text-foreground">I accept WhatsApp booking confirmations *</span>
                      <span className="block text-muted-foreground">
                        Required for booking confirmation and session reminders (POPIA compliant)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="competition"
                      checked={enterCompetition}
                      onCheckedChange={(checked) => setEnterCompetition(checked as boolean)}
                      className="mt-1"
                    />
                    <Label htmlFor="competition" className="text-sm cursor-pointer leading-relaxed">
                      <span className="font-semibold text-foreground">Enter me in monthly competitions</span>
                      <span className="block text-muted-foreground">
                        Compete for prizes, free sessions, and instant rewards
                      </span>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{getSessionDescription()}</span>
                    <span className="font-medium text-foreground">R{basePrice.toFixed(2)}</span>
                  </div>
                  {sessionType === "famous-course" && (
                    <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
                      <p className="text-xs font-semibold text-secondary mb-1">Deposit Payment</p>
                      <p className="text-xs text-muted-foreground">
                        You're paying R{depositAmount.toFixed(2)} deposit now. Pay remaining R
                        {remainderAmount.toFixed(2)} in-store.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {players} Player{Number.parseInt(players) > 1 ? "s" : ""} × {duration}h
                    </span>
                    <span className="font-medium text-foreground">Included</span>
                  </div>
                  {sessionType === "famous-course" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">GS Pro Technology</span>
                      <span className="font-medium text-foreground">Included</span>
                    </div>
                  )}
                </div>

                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="coupon" className="text-sm">
                    Coupon Code (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied}
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
                  {couponApplied && (
                    <p className="text-sm text-secondary flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Coupon applied successfully
                    </p>
                  )}
                </div>

                {couponApplied && couponDiscount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm text-secondary">
                      <span>Coupon Discount</span>
                      <span>-R{couponDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">
                    {sessionType === "famous-course" ? "Deposit Due Today" : "Total"}
                  </span>
                  <span className="text-foreground">
                    {sessionType === "famous-course" ? `R${depositAmount.toFixed(2)}` : `R${totalPrice.toFixed(2)}`}
                  </span>
                </div>
                {sessionType === "famous-course" && (
                  <p className="text-xs text-muted-foreground text-center -mt-2">
                    Balance of R{remainderAmount.toFixed(2)} payable in-store
                  </p>
                )}
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !acceptWhatsApp}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  size="lg"
                >
                  {isProcessing ? "Processing..." : "Confirm Booking"}
                </Button>
                {!couponApplied && (
                  <p className="text-xs text-muted-foreground text-center">
                    Secure payment powered by Yoco. We accept all major cards, Apple Pay, and Google Pay.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
