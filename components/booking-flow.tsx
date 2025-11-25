"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Clock, CalendarIcon, Trophy, AlertTriangle, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Checkbox } from "@/components/ui/checkbox"

type SessionType = "famous-course" | "quickplay"
type FamousCourseOption = "4-ball" | "3-ball" | null

export function BookingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [playerCount, setPlayerCount] = useState<number>(1)
  const [sessionType, setSessionType] = useState<SessionType>("quickplay")
  const [famousCourseOption, setFamousCourseOption] = useState<FamousCourseOption>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeSlot, setTimeSlot] = useState<string>("")
  const [duration, setDuration] = useState<number>(1)
  const [golfClubRental, setGolfClubRental] = useState<boolean>(false)
  const [coachingSession, setCoachingSession] = useState<boolean>(false)
  const [validationError, setValidationError] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const calculatePrice = () => {
    let basePrice = 0

    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        basePrice = 150 * 4 * duration // R150/person/hour x 4 people
      }
      if (famousCourseOption === "3-ball") {
        basePrice = 150 * 3 * duration // R150/person/hour x 3 people
      }
    } else {
      // Quick Play - Per person per hour pricing
      if (playerCount === 1) {
        basePrice = 250 * duration // R250/person/hour
      } else if (playerCount === 2) {
        basePrice = 180 * 2 * duration // R180/person/hour x 2
      } else if (playerCount === 3) {
        basePrice = 160 * 3 * duration // R160/person/hour x 3
      } else {
        basePrice = 150 * 4 * duration // R150/person/hour x 4+
      }
    }

    if (golfClubRental) {
      basePrice += 100
    }
    if (coachingSession) {
      basePrice += 450
    }

    return basePrice
  }

  const getMinimumHours = () => {
    if (sessionType === "famous-course") {
      return 3 // Both 4-ball and 3-ball require 3 hours minimum
    }
    return 1
  }

  const validateBooking = () => {
    setValidationError("")
    const minHours = getMinimumHours()

    if (duration < minHours) {
      setValidationError(`Famous Course requires minimum ${minHours} hours booking.`)
      return false
    }

    if (timeSlot && date) {
      const [startHour] = timeSlot.split(":").map(Number)
      const endHour = startHour + duration
      if (endHour > 20) {
        setValidationError(`Booking extends past closing time (8 PM). Please select an earlier time.`)
        return false
      }
    }

    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball" && playerCount !== 4) {
        setValidationError("4-ball requires exactly 4 players.")
        return false
      }
      if (famousCourseOption === "3-ball" && playerCount !== 3) {
        setValidationError("3-ball requires exactly 3 players.")
        return false
      }
    }

    return true
  }

  const getLatestStartTimes = () => {
    const minHours = getMinimumHours()
    const closingHour = 20 // 8 PM
    const latestStart = closingHour - minHours

    const times = []
    for (let hour = latestStart; hour >= latestStart - 2 && hour >= 9; hour--) {
      times.push(`${hour.toString().padStart(2, "0")}:00`)
    }
    return times
  }

  const generateTimeSlots = () => {
    if (!date) return []

    const slots: string[] = []
    const dayOfWeek = date.getDay()

    // Monday-Friday: 9AM-8PM, Saturday: 8AM-8PM, Sunday: 10AM-4PM
    let startHour = 9
    let endHour = 20

    if (dayOfWeek === 6) {
      // Saturday
      startHour = 8
    } else if (dayOfWeek === 0) {
      // Sunday
      startHour = 10
      endHour = 16
    }

    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, "0")}:00`
      slots.push(timeString)
    }

    return slots
  }

  useEffect(() => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        setPlayerCount(4)
        setDuration(Math.max(duration, 3))
      } else if (famousCourseOption === "3-ball") {
        setPlayerCount(3)
        setDuration(Math.max(duration, 3)) // Changed from 2 to 3 to match 4-ball logic
      }
    }
  }, [famousCourseOption, sessionType])

  useEffect(() => {
    if (date && timeSlot) {
      checkAvailability()
    }
  }, [date, timeSlot, duration])

  const checkAvailability = async () => {
    // This would call an API to check for overlapping bookings
    // For now, we'll simulate it
    console.log("[v0] Checking availability for:", { date, timeSlot, duration })
  }

  const handleContinue = () => {
    if (step === 1 && playerCount > 0 && sessionType) {
      // Validate famous course selection
      if (sessionType === "famous-course" && !famousCourseOption) {
        setValidationError("Please select 4-ball or 3-ball for Famous Course experience")
        return
      }
      setValidationError("")
      setStep(2)
    } else if (step === 2) {
      if (!date || !timeSlot || !duration) {
        setValidationError("Please complete all booking details")
        return
      }

      if (!validateBooking()) {
        return
      }

      // Navigate to confirmation
      const params = new URLSearchParams({
        players: playerCount.toString(),
        type: sessionType,
        famousOption: famousCourseOption || "",
        date: date.toISOString(),
        time: timeSlot,
        duration: duration.toString(),
        price: calculatePrice().toString(),
        golfClubs: golfClubRental.toString(),
        coaching: coachingSession.toString(),
      })

      router.push(`/booking/confirm?${params.toString()}`)
    }
  }

  const canContinue = () => {
    if (step === 1) {
      if (sessionType === "famous-course") {
        return playerCount > 0 && famousCourseOption !== null
      }
      return playerCount > 0 && sessionType !== ""
    }
    if (step === 2) return date && timeSlot && duration > 0
    return false
  }

  // Sample time slots (would be fetched from API)
  const timeSlots = generateTimeSlots()

  return (
    <div className="min-h-screen py-6 sm:py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">Book Your Session</h1>
          <p className="text-sm text-muted-foreground">Complete your booking in 2 simple steps</p>
        </div>

        <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 1 ? "bg-primary text-white" : "bg-primary text-white"
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className="text-xs sm:text-sm font-medium">Details</span>
          </div>
          <div className="flex-1 h-0.5 mx-4 bg-muted"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className="text-xs sm:text-sm font-medium">Date & Time</span>
          </div>
        </div>

        {validationError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm">{validationError}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Choose Your Session</CardTitle>
                <CardDescription className="text-sm">Select from our available options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  onClick={() => {
                    setSessionType("famous-course")
                    setFamousCourseOption("4-ball")
                    setPlayerCount(4)
                    setDuration(3)
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    sessionType === "famous-course" && famousCourseOption === "4-ball"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                        <h3 className="font-bold text-base">4-Ball Special</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">18-hole famous courses with 4 players</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-bold text-primary">R150</span>
                        <span className="text-xs text-muted-foreground">/person/hour</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1800 total</p>
                    </div>
                    <Badge className="bg-secondary flex-shrink-0">Popular</Badge>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSessionType("famous-course")
                    setFamousCourseOption("3-ball")
                    setPlayerCount(3)
                    setDuration(3)
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    sessionType === "famous-course" && famousCourseOption === "3-ball"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
                        <h3 className="font-bold text-base">3-Ball</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">18-hole famous courses with 3 players</p>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-lg font-bold text-primary">R150</span>
                        <span className="text-xs text-muted-foreground">/person/hour</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1350 total</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSessionType("quickplay")
                    setFamousCourseOption(null)
                  }}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    sessionType === "quickplay"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <h3 className="font-bold text-base">Quick Play</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Flexible hourly sessions, any player count</p>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-primary">From R150</span>
                      <span className="text-xs text-muted-foreground">/hour</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">No minimum • Flexible pricing</p>
                  </div>
                </button>
              </CardContent>
            </Card>

            {sessionType === "quickplay" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    How many players?
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Pricing: 1p=R250 • 2p=R180 each • 3p=R160 each • 4p=R150 each
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((count) => {
                      const pricePerPerson = count === 1 ? 250 : count === 2 ? 180 : count === 3 ? 160 : 150
                      return (
                        <button
                          key={count}
                          onClick={() => setPlayerCount(count)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            playerCount === count
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="text-2xl font-bold mb-1">{count}</div>
                          <div className="text-xs text-muted-foreground">R{pricePerPerson}/p/h</div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleContinue} disabled={!canContinue()} className="w-full h-12 text-base font-semibold">
              Continue to Date & Time
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Time</CardTitle>
                <CardDescription className="text-sm">Mon-Fri: 9AM-8PM • Sat: 8AM-8PM • Sun: 10AM-4PM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Time Slot</Label>
                  <Select value={timeSlot} onValueChange={setTimeSlot}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose a time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots().map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Duration (hours)</Label>
                  <Select value={duration.toString()} onValueChange={(v) => setDuration(Number.parseFloat(v))}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((d) => (
                        <SelectItem key={d} value={d.toString()}>
                          {d} {d === 1 ? "hour" : "hours"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add-ons (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="clubs"
                      checked={golfClubRental}
                      onCheckedChange={(checked) => setGolfClubRental(checked as boolean)}
                    />
                    <Label htmlFor="clubs" className="text-sm cursor-pointer">
                      Golf Club Rental
                    </Label>
                  </div>
                  <span className="text-sm font-bold">R100</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="coaching"
                      checked={coachingSession}
                      onCheckedChange={(checked) => setCoachingSession(checked as boolean)}
                    />
                    <Label htmlFor="coaching" className="text-sm cursor-pointer">
                      Coaching Session
                    </Label>
                  </div>
                  <span className="text-sm font-bold">R450</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-medium">Total Price</span>
                  <span className="text-2xl font-bold text-primary">R{calculatePrice()}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>
                      Session ({playerCount} players × {duration}h)
                    </span>
                    <span>R{calculatePrice() - (golfClubRental ? 100 : 0) - (coachingSession ? 450 : 0)}</span>
                  </div>
                  {golfClubRental && (
                    <div className="flex justify-between">
                      <span>Golf clubs</span>
                      <span>R100</span>
                    </div>
                  )}
                  {coachingSession && (
                    <div className="flex justify-between">
                      <span>Coaching</span>
                      <span>R450</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 h-12">
                Back
              </Button>
              <Button onClick={handleContinue} disabled={!canContinue()} className="flex-1 h-12 font-semibold">
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
