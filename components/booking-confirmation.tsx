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
import { ArrowLeft, Calendar, Clock, Users, Sparkles, CheckCircle2 } from "lucide-react"
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
  const golfClubs = searchParams.get("golfClubs") === "true"
  const coaching = searchParams.get("coaching") === "true"

  const getDepositAmount = () => {
    if (sessionType === "famous-course") {
      if (famousOption === "4-ball") return 600 // R150/person x 4 = R600/hour deposit
      if (famousOption === "3-ball") return 450 // R150/person x 3 = R450/hour deposit
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

  const getMinimumHours = () => {
    if (sessionType === "famous-course") {
      if (famousOption === "4-ball") return 4
      if (famousOption === "3-ball") return 3
    }
    return 1
  }

  return (
    <div className="min-h-screen py-8 md:py-12 lg:py-16 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 mb-8 md:mb-10">
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all duration-300 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Booking</span>
        </Link>

        <div className="flex items-start sm:items-center gap-3 md:gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-md">
            <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Confirm Booking
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1 leading-relaxed">
              Review your details and complete payment
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-4xl mx-auto grid gap-6 md:gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-b-2 border-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/20 border border-secondary/30">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl sm:text-2xl font-bold">Booking Summary</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">{getSessionDescription()}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20 border border-primary/30">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Players</p>
                      <p className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                        {players} {Number.parseInt(players) === 1 ? "Player" : "Players"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/20 border border-secondary/30">
                      <Clock className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Duration</p>
                      <p className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                        {duration} {Number.parseFloat(duration) === 1 ? "Hour" : "Hours"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-muted-foreground/10 sm:col-span-2">
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20 border border-primary/30">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Date & Time</p>
                      <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 break-words">
                        {new Date(date).toLocaleDateString("en-ZA", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {time}
                      </p>
                    </div>
                  </div>
                </div>

                {(golfClubs || coaching) && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-3">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground">Add-ons</h3>
                      <div className="space-y-2">
                        {golfClubs && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                            <span className="text-sm font-medium text-foreground">Golf Club Rental</span>
                            <Badge variant="secondary" className="text-xs">
                              R100
                            </Badge>
                          </div>
                        )}
                        {coaching && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <span className="text-sm font-medium text-foreground">Coaching Session</span>
                            <Badge variant="default" className="text-xs">
                              R450
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 shadow-xl">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardTitle className="font-serif text-2xl md:text-3xl">Your Details</CardTitle>
                <CardDescription className="text-base mt-2">
                  We'll send your confirmation via WhatsApp and email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-semibold">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="h-12 text-base border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    className="h-12 text-base border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-semibold">
                    Phone Number (WhatsApp) *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+27 12 345 6789"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                    className="h-12 text-base border-2 focus:border-primary"
                  />
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all bg-background">
                    <Checkbox
                      id="whatsapp"
                      checked={acceptWhatsApp}
                      onCheckedChange={(checked) => setAcceptWhatsApp(checked as boolean)}
                      className="mt-1 w-5 h-5"
                    />
                    <Label htmlFor="whatsapp" className="text-sm cursor-pointer leading-relaxed flex-1">
                      <span className="font-bold text-base text-foreground block mb-1">
                        I accept WhatsApp booking confirmations *
                      </span>
                      <span className="block text-muted-foreground">
                        Required for booking confirmation and session reminders (POPIA compliant)
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-all bg-background">
                    <Checkbox
                      id="competition"
                      checked={enterCompetition}
                      onCheckedChange={(checked) => setEnterCompetition(checked as boolean)}
                      className="mt-1 w-5 h-5"
                    />
                    <Label htmlFor="competition" className="text-sm cursor-pointer leading-relaxed flex-1">
                      <span className="font-bold text-base text-foreground block mb-1">
                        Enter me in monthly competitions
                      </span>
                      <span className="block text-muted-foreground">
                        Compete for prizes, free sessions, and instant rewards
                      </span>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-2 shadow-2xl">
              <CardHeader className="border-b bg-gradient-to-br from-secondary/10 to-primary/10">
                <CardTitle className="font-serif text-2xl">Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">{getSessionDescription()}</span>
                    <span className="font-bold text-foreground">R{basePrice.toFixed(2)}</span>
                  </div>

                  {sessionType === "famous-course" && (
                    <div className="p-4 bg-secondary/10 border-2 border-secondary/30 rounded-xl">
                      <p className="text-xs font-bold text-secondary mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Deposit Payment
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        You're paying <span className="font-bold text-secondary">R{depositAmount.toFixed(2)}</span>{" "}
                        deposit now. Pay remaining{" "}
                        <span className="font-bold text-secondary">R{remainderAmount.toFixed(2)}</span> in-store.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      {players} Player{Number.parseInt(players) > 1 ? "s" : ""} × {duration}h
                    </span>
                    <span className="font-bold text-foreground">Included</span>
                  </div>

                  {golfClubs && (
                    <div className="flex justify-between text-sm p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground font-medium">Golf Club Rental</span>
                      <span className="font-bold text-foreground">R100</span>
                    </div>
                  )}

                  {coaching && (
                    <div className="flex justify-between text-sm p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground font-medium">Coaching Session</span>
                      <span className="font-bold text-foreground">R450</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="coupon" className="text-sm font-semibold">
                    Coupon Code (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied}
                      className="h-10 border-2"
                    />
                    <Button
                      onClick={applyCoupon}
                      variant="outline"
                      disabled={couponApplied || !couponCode.trim()}
                      className="font-semibold bg-transparent"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponApplied && (
                    <p className="text-sm text-secondary flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Coupon applied successfully
                    </p>
                  )}
                </div>

                {couponApplied && couponDiscount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm text-secondary font-bold">
                      <span>Coupon Discount</span>
                      <span>-R{couponDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <Separator />

                <div className="p-5 bg-gradient-to-br from-secondary/15 to-primary/15 rounded-xl border-2 border-secondary/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {sessionType === "famous-course" ? "Deposit Due Today" : "Total"}
                    </span>
                    <span className="font-serif text-3xl font-bold text-foreground">
                      R{sessionType === "famous-course" ? depositAmount.toFixed(2) : totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {sessionType === "famous-course" && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Balance of R{remainderAmount.toFixed(2)} payable in-store
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !acceptWhatsApp}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] h-14 text-lg font-bold"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Processing...
                    </span>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>

                {!couponApplied && (
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
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
