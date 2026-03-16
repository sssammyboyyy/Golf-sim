"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, CreditCard, User, Info, CheckCircle2, ShieldCheck, Ticket } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function BookingConfirmation() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // -- STATE --
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [payFullAmount, setPayFullAmount] = useState(false)

  // -- IDEMPOTENCY --
  // Generate a unique ID when the component mounts to track this specific booking attempt
  const [bookingRequestId] = useState(() => crypto.randomUUID())

  // -- INPUTS --
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [acceptWhatsApp, setAcceptWhatsApp] = useState(true)
  const [enterCompetition, setEnterCompetition] = useState(true)
  const [couponCode, setCouponCode] = useState("")

  // -- URL PARAMS --
  const sessionType = searchParams.get("sessionType") || "quick"
  const players = parseInt(searchParams.get("players") || "1")
  const date = searchParams.get("date") || ""
  const timeSlot = searchParams.get("timeSlot") || ""
  const duration = parseFloat(searchParams.get("duration") || "1")
  const passedTotalPrice = parseFloat(searchParams.get("totalPrice") || "0")
  const addonCoaching = searchParams.get("coachingSession") === "true"
  const addonClubRental = searchParams.get("golfClubRental") === "true"

  // -- CALCULATIONS --
  const totalPrice = passedTotalPrice > 0 ? passedTotalPrice : 0
  const isDepositEligible = sessionType.includes("ball") || sessionType.includes("famous")
  const depositAmount = isDepositEligible ? Math.ceil(totalPrice * 0.4) : totalPrice
  const amountToPay = payFullAmount || !isDepositEligible ? totalPrice : depositAmount
  const amountDueLater = totalPrice - amountToPay

  const handlePayment = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      setErrorMessage("Please fill in your contact details.")
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": bookingRequestId
        },
        body: JSON.stringify({
          booking_request_id: bookingRequestId, // Pass explicit ID
          booking_date: date,
          start_time: timeSlot,
          duration_hours: duration,
          player_count: players,
          session_type: sessionType,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          accept_whatsapp: acceptWhatsApp,
          enter_competition: enterCompetition,
          total_price: totalPrice,
          pay_full_amount: payFullAmount,
          coupon_code: couponCode || null,
          addon_coaching: addonCoaching,
          addon_club_rental: addonClubRental,
        }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Payment initialization failed")

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else if (data.free_booking) {
        router.push(`/booking/success?reference=${data.booking_id}`)
      }

    } catch (error) {
      console.error("Booking Error:", error)
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.")
      setIsProcessing(false)
    }
  }

  const formattedDate = date ? new Date(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" }) : ""

  return (
    <div className="min-h-screen bg-muted/10 pb-20 pt-8">
      <div className="max-w-6xl mx-auto px-4">

        <div className="mb-8">
          <Link href="/booking" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Step 2
          </Link>
          <h1 className="text-3xl font-serif font-bold text-foreground">Secure Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" /> Guest Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="guest_name" className="text-xs font-bold uppercase text-muted-foreground">Full Name</label>
                    <Input id="guest_name" name="guest_name" autoComplete="name" placeholder="e.g. Tiger Woods" value={guestName} onChange={e => setGuestName(e.target.value)} className="bg-muted/10 border-muted" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="guest_phone" className="text-xs font-bold uppercase text-muted-foreground">Phone</label>
                    <Input id="guest_phone" name="guest_phone" autoComplete="tel" placeholder="e.g. 082 123 4567" type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="bg-muted/10 border-muted" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="guest_email" className="text-xs font-bold uppercase text-muted-foreground">Email Address</label>
                  <Input id="guest_email" name="guest_email" autoComplete="email" placeholder="name@example.com" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="bg-muted/10 border-muted" />
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
                    <input id="acceptWhatsApp" name="acceptWhatsApp" type="checkbox" checked={acceptWhatsApp} onChange={e => setAcceptWhatsApp(e.target.checked)} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                    <span className="text-sm">Receive booking confirmation via Email</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
                    <input id="enterCompetition" name="enterCompetition" type="checkbox" checked={enterCompetition} onChange={e => setEnterCompetition(e.target.checked)} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                    <span className="text-sm">Enter me into the monthly &ldquo;Free Round&rdquo; competition</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {isDepositEligible && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5 text-primary" /> Payment Option
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setPayFullAmount(false)}
                      className={cn(
                        "relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                        !payFullAmount ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-white"
                      )}
                    >
                      {!payFullAmount && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-primary" />}
                      <div className="font-bold text-lg mb-1">Pay Deposit Only</div>
                      <div className="text-2xl font-bold text-primary mb-2">R{depositAmount.toFixed(0)}</div>
                      <p className="text-xs text-muted-foreground">
                        Pay remainder (R{amountDueLater}) when you arrive at the venue.
                      </p>
                    </div>

                    <div
                      onClick={() => setPayFullAmount(true)}
                      className={cn(
                        "relative p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                        payFullAmount ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-white"
                      )}
                    >
                      {payFullAmount && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-primary" />}
                      <div className="font-bold text-lg mb-1">Pay Full Amount</div>
                      <div className="text-2xl font-bold text-primary mb-2">R{totalPrice.toFixed(0)}</div>
                      <p className="text-xs text-muted-foreground">
                        Settle everything now. Express check-in at reception.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-10 left-10 w-24 h-24 bg-secondary/20 rounded-full blur-xl" />

                <CardHeader className="pb-4 border-b border-white/10 relative z-10">
                  <CardTitle>Session Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4 relative z-10">
                  <div>
                    <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider mb-1">Date & Time</p>
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="w-4 h-4" /> {formattedDate}
                    </div>
                    <div className="flex items-center gap-2 font-medium mt-1">
                      <Clock className="w-4 h-4" /> {timeSlot} ({duration} hrs)
                    </div>
                  </div>

                  <div>
                    <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider mb-1">Experience</p>
                    <div className="font-medium">{sessionType === "4ball" ? "4-Ball Special" : sessionType === "3ball" ? "3-Ball Special" : "Quick Play"}</div>
                    <div className="text-sm opacity-90">{players} Players</div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>R{totalPrice}</span>
                    </div>
                    {amountDueLater > 0 && (
                      <div className="flex justify-between text-sm text-secondary font-medium">
                        <span>Pay Later</span>
                        <span>-R{amountDueLater}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-bold pt-2">
                      <span>Total Due</span>
                      <span>R{amountToPay}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Have a promo code?</span>
                  </div>
                  <Input
                    id="couponCode"
                    name="couponCode"
                    placeholder="Enter code"
                    className="uppercase placeholder:normal-case"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  />
                </CardContent>
              </Card>

              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" /> {errorMessage}
                </div>
              )}

              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 rounded-xl"
              >
                {isProcessing ? "Processing..." : `Pay R${amountToPay}`}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3 h-3" /> Secure Payment by Yoco
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
