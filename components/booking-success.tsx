"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Calendar, Clock, Users, Mail, Home, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"

export function BookingSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const reference = searchParams.get("reference")

  useEffect(() => {
    const fetchBooking = async () => {
      if (!reference) {
        router.push("/booking")
        return
      }

      const supabase = createBrowserClient()
      const { data, error } = await supabase.from("bookings").select("*").eq("id", reference).single()

      if (error || !data) {
        console.error("[v0] Failed to fetch booking:", error)
        router.push("/booking")
        return
      }

      console.log("[v0] Booking data loaded:", data)
      setBooking(data)
      setLoading(false)
    }

    fetchBooking()
  }, [reference, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your booking details...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return null
  }

  const getSessionDescription = () => {
    if (booking.session_type === "famous-course") {
      if (booking.famous_course_option === "4-ball") {
        return "18-Hole Famous Course • 4-Ball Special"
      }
      if (booking.famous_course_option === "3-ball") {
        return "18-Hole Famous Course • 3-Ball"
      }
      return "18-Hole Famous Course"
    }
    return "Quick Play Session"
  }

  const getDepositAmount = () => {
    if (booking.session_type === "famous-course") {
      if (booking.famous_course_option === "4-ball") return 600 // Updated from 400 to 600
      if (booking.famous_course_option === "3-ball") return 450 // Updated from 300 to 450
    }
    return booking.total_price
  }

  const depositAmount = getDepositAmount()
  const remainderAmount = booking.session_type === "famous-course" ? booking.total_price - depositAmount : 0

  return (
    <div className="min-h-screen py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3 text-foreground">Booking Confirmed!</h1>
            <p className="text-lg text-muted-foreground">
              {booking.accept_whatsapp
                ? "Check your WhatsApp and email for confirmation details"
                : "We've sent a confirmation email with all the details"}
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Details</CardTitle>
                <Badge className="bg-primary text-primary-foreground border-0">Confirmed</Badge>
              </div>
              <CardDescription>Reference: {reference}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground text-sm">
                      {new Date(booking.booking_date).toLocaleDateString("en-ZA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-semibold text-foreground text-sm">
                      {booking.start_time} ({booking.duration_hours}h)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Players</p>
                    <p className="font-semibold text-foreground text-sm">
                      {booking.player_count} player{booking.player_count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-1">Session Type</p>
                <p className="font-semibold text-foreground">{getSessionDescription()}</p>
              </div>

              {booking.session_type === "famous-course" && remainderAmount > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold text-foreground mb-2">Payment Summary</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit Paid Today</span>
                      <span className="font-medium text-foreground">R{depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance Due In-Store</span>
                      <span className="font-medium text-primary">R{remainderAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
                      <span className="text-foreground">Total Session Cost</span>
                      <span className="text-foreground">R{booking.total_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                The Mulligan Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                38A Chopin St, Vanderbijlpark S. W. 5, Vanderbijlpark, 1911, South Africa
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=38A+Chopin+St+Vanderbijlpark+S.+W.+5+Vanderbijlpark+1911+South+Africa"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1 bg-transparent">
                  <a href="tel:+27123456789">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Us
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-foreground">Check Your Messages</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent confirmation via {booking.accept_whatsapp ? "WhatsApp and email" : "email"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-foreground">Arrive 10 Minutes Early</p>
                  <p className="text-sm text-muted-foreground">
                    Give yourself time to check in and get set up at the simulator
                  </p>
                </div>
              </div>
              {booking.session_type === "famous-course" && remainderAmount > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Settle Your Balance</p>
                    <p className="text-sm text-muted-foreground">
                      Pay the remaining R{remainderAmount.toFixed(2)} at reception before your session
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {remainderAmount > 0 ? "4" : "3"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Enjoy Your Session</p>
                  <p className="text-sm text-muted-foreground">
                    Experience Pro Tee simulator with GS Pro software and 400+ championship courses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Info */}
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Need to Reschedule?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Contact us at least 2 hours before your session to reschedule or cancel. We're here to help make it
                    easy!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/booking">
                <Calendar className="w-4 h-4 mr-2" />
                Book Another Session
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
