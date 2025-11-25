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
    <div className="min-h-screen py-4 sm:py-8 md:py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 sm:px-4 mb-4 sm:mb-6 md:mb-8">
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-all duration-300 mb-4 group"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Booking</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-md">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Confirm Booking
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 leading-snug">Review details and pay</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="border-2 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-b-2 border-secondary/20 pb-3 sm:pb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/20 border border-secondary/30">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg md:text-xl font-bold leading-tight">
                      Booking Summary
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{getSessionDescription()}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 border border-primary/30">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Players</p>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-foreground">
                      {players} {Number.parseInt(players) === 1 ? "Player" : "Players"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-secondary/20 border border-secondary/30">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Duration</p>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-foreground">
                      {duration} {Number.parseFloat(duration) === 1 ? "Hour" : "Hours"}
                    </p>
                  </div>

                  <div className="col-span-2 flex flex-col gap-2 p-3 sm:p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 border border-primary/30">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Date & Time</p>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-foreground break-words leading-snug">
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

                {/* Add-ons */}
                {(golfClubs || coaching) && (
                  <>
                    <Separator className="my-4 sm:my-6" />
                    <div className="space-y-2 sm:space-y-3">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground">Add-ons</h3>
                      <div className="space-y-2">
                        {golfClubs && (
                          <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                            <span className="text-xs sm:text-sm font-medium text-foreground">Golf Club Rental</span>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              R100
                            </Badge>
                          </div>
                        )}
                        {coaching && (
                          <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <span className="text-xs sm:text-sm font-medium text-foreground">Coaching Session</span>
                            <Badge variant="default" className="text-[10px] sm:text-xs">
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
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-secondary/5 pb-3 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-lg md:text-xl">Your Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Confirmation via WhatsApp & email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm font-semibold">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="h-10 sm:h-12 text-sm sm:text-base border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    className="h-10 sm:h-12 text-sm sm:text-base border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold">
                    Phone (WhatsApp) *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+27 12 345 6789"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                    className="h-10 sm:h-12 text-sm sm:text-base border-2 focus:border-primary"
                  />
                </div>

                <Separator className="my-4 sm:my-6" />

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all bg-background">
                    <Checkbox
                      id="whatsapp"
                      checked={acceptWhatsApp}
                      onCheckedChange={(checked) => setAcceptWhatsApp(checked as boolean)}
                      className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    />
                    <Label
                      htmlFor="whatsapp"
                      className="text-xs sm:text-sm cursor-pointer leading-relaxed flex-1 min-w-0"
                    >
                      <span className="font-bold text-sm sm:text-base text-foreground block mb-0.5 sm:mb-1">
                        WhatsApp confirmations *
                      </span>
                      <span className="block text-muted-foreground leading-snug">
                        Required for booking updates (POPIA compliant)
                      </span>
                    </Label>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-all bg-background">
                    <Checkbox
                      id="competition"
                      checked={enterCompetition}
                      onCheckedChange={(checked) => setEnterCompetition(checked as boolean)}
                      className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    />
                    <Label
                      htmlFor="competition"
                      className="text-xs sm:text-sm cursor-pointer leading-relaxed flex-1 min-w-0"
                    >
                      <span className="font-bold text-sm sm:text-base text-foreground block mb-0.5 sm:mb-1">
                        Monthly competitions
                      </span>
                      <span className="block text-muted-foreground leading-snug">Compete for prizes & rewards</span>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-2 shadow-2xl lg:sticky lg:top-8">
              <CardHeader className="border-b bg-gradient-to-br from-secondary/10 to-primary/10 pb-3 sm:pb-4">
                <CardTitle className="font-serif text-base sm:text-lg md:text-xl">Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">{getSessionDescription()}</span>
                    <span className="font-bold text-foreground">R{basePrice.toFixed(2)}</span>
                  </div>

                  {sessionType === "famous-course" && (
                    <div className="p-3 sm:p-4 bg-secondary/10 border-2 border-secondary/30 rounded-xl">
                      <p className="text-[10px] sm:text-xs font-bold text-secondary mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        Deposit Payment
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                        Paying <span className="font-bold text-secondary">R{depositAmount.toFixed(2)}</span> deposit
                        now. Balance <span className="font-bold text-secondary">R{remainderAmount.toFixed(2)}</span>{" "}
                        in-store.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground font-medium">
                      {players} Player{Number.parseInt(players) > 1 ? "s" : ""} × {duration}h
                    </span>
                    <span className="font-bold text-foreground">Included</span>
                  </div>

                  {golfClubs && (
                    <div className="flex justify-between text-xs sm:text-sm p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground font-medium">Golf Clubs</span>
                      <span className="font-bold text-foreground">R100</span>
                    </div>
                  )}

                  {coaching && (
                    <div className="flex justify-between text-xs sm:text-sm p-2 sm:p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground font-medium">Coaching</span>
                      <span className="font-bold text-foreground">R450</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 sm:space-y-3">
                  <Label htmlFor="coupon" className="text-xs sm:text-sm font-semibold">
                    Coupon Code
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponApplied}
                      className="h-9 sm:h-10 text-xs sm:text-sm border-2"
                    />
                    <Button
                      onClick={applyCoupon}
                      variant="outline"
                      disabled={couponApplied || !couponCode.trim()}
                      size="lg"
                      className="font-semibold text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 bg-transparent"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponApplied && (
                    <p className="text-xs sm:text-sm text-secondary flex items-center gap-1.5 sm:gap-2 font-semibold">
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      Coupon applied
                    </p>
                  )}
                </div>

                {couponApplied && couponDiscount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-xs sm:text-sm text-secondary font-bold">
                      <span>Discount</span>
                      <span>-R{couponDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <Separator />

                <div className="p-4 sm:p-5 bg-gradient-to-br from-secondary/15 to-primary/15 rounded-xl border-2 border-secondary/30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                      {sessionType === "famous-course" ? "Deposit Due" : "Total"}
                    </span>
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                      R{sessionType === "famous-course" ? depositAmount.toFixed(2) : totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {sessionType === "famous-course" && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
                      Balance R{remainderAmount.toFixed(2)} in-store
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || !guestName || !guestEmail || !guestPhone || !acceptWhatsApp}
                  size="lg"
                  className="w-full font-bold h-12 sm:h-14 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all"
                >
                  {isProcessing ? "Processing..." : "Complete Booking"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
