"use client"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, Users, CalendarIcon, Clock, Check, Trophy, Zap, Sparkles } from "lucide-react"
import { format, addDays, startOfToday, isToday, isTomorrow, isWeekend, getDay } from "date-fns"

const PRICING = {
  1: 250,
  2: 180,
  3: 160,
  4: 150,
} as const

// Operating hours by day of week
const OPERATING_HOURS: Record<number, { open: number; close: number }> = {
  0: { open: 10, close: 16 }, // Sunday
  1: { open: 9, close: 20 }, // Monday
  2: { open: 9, close: 20 }, // Tuesday
  3: { open: 9, close: 20 }, // Wednesday
  4: { open: 9, close: 20 }, // Thursday
  5: { open: 9, close: 20 }, // Friday
  6: { open: 8, close: 20 }, // Saturday
}

interface BookingFlowProps {
  onComplete?: (booking: BookingData) => void
}

interface BookingData {
  sessionType: string
  players: number
  date: Date
  timeSlot: string
  duration: number
  customerName: string
  customerEmail: string
  customerPhone: string
  golfClubRental: boolean
  coachingSession: boolean
  totalPrice: number
}

export function BookingFlow({ onComplete }: BookingFlowProps) {
  // Form state
  const [step, setStep] = useState(1)
  const [sessionType, setSessionType] = useState<"4ball" | "3ball" | "quick" | "">("")
  const [players, setPlayers] = useState(1)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeSlot, setTimeSlot] = useState("")
  const [duration, setDuration] = useState(1)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [golfClubRental, setGolfClubRental] = useState(false)
  const [coachingSession, setCoachingSession] = useState(false)

  // Availability state
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const calculatePrice = useCallback(() => {
    let basePrice = 0

    if (sessionType === "4ball") {
      // 4-Ball Special: R150/person × 4 players × duration
      basePrice = 150 * 4 * duration
    } else if (sessionType === "3ball") {
      // 3-Ball Special: R160/person × 3 players × duration
      basePrice = 160 * 3 * duration
    } else {
      // Quick Play: price based on player count
      const pricePerPerson = PRICING[Math.min(players, 4) as keyof typeof PRICING]
      basePrice = pricePerPerson * players * duration
    }

    // Add-ons
    if (golfClubRental) basePrice += 100
    if (coachingSession) basePrice += 450

    return basePrice
  }, [sessionType, players, duration, golfClubRental, coachingSession])

  // Get price per person per hour
  const getPricePerPersonPerHour = useCallback(() => {
    if (sessionType === "4ball") return 150
    if (sessionType === "3ball") return 160
    return PRICING[Math.min(players, 4) as keyof typeof PRICING]
  }, [sessionType, players])

  // Get minimum duration
  const getMinDuration = useCallback(() => {
    if (sessionType === "4ball" || sessionType === "3ball") return 3
    return 1
  }, [sessionType])

  // Generate available time slots based on operating hours
  const generateTimeSlots = useCallback((selectedDate: Date): string[] => {
    const dayOfWeek = getDay(selectedDate)
    const hours = OPERATING_HOURS[dayOfWeek]
    const slots: string[] = []

    for (let hour = hours.open; hour < hours.close; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`)
      if (hour + 0.5 < hours.close) {
        slots.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }

    return slots
  }, [])

  const availableSlots = date ? generateTimeSlots(date) : []

  // Fetch booked slots when date changes
  const fetchBookedSlots = useCallback(async (selectedDate: Date) => {
    setIsCheckingAvailability(true)
    setAvailabilityError(null)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const response = await fetch(`/api/bookings/availability?date=${dateStr}`)
      const data = await response.json()

      if (data.bookedSlots && Array.isArray(data.bookedSlots)) {
        setBookedSlots(data.bookedSlots)
      } else {
        setBookedSlots([])
      }

      if (data.error) {
        setAvailabilityError(data.error)
      }
    } catch (error) {
      console.error("[v0] Error fetching availability:", error)
      setBookedSlots([])
      setAvailabilityError("Could not check availability")
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [])

  useEffect(() => {
    if (date) {
      fetchBookedSlots(date)
    }
  }, [date, fetchBookedSlots])

  // Update duration when session type changes
  useEffect(() => {
    const minDur = getMinDuration()
    if (duration < minDur) {
      setDuration(minDur)
    }
  }, [sessionType, getMinDuration, duration])

  // Check if a slot is booked
  const isSlotBooked = (slot: string) => bookedSlots.includes(slot)

  // Handle session type selection
  const handleSessionSelect = (type: "4ball" | "3ball" | "quick") => {
    setSessionType(type)
    if (type === "4ball") {
      setPlayers(4)
      setDuration(3)
    } else if (type === "3ball") {
      setPlayers(3)
      setDuration(3)
    } else {
      setDuration(1)
    }
  }

  // Get next weekend date
  const getNextWeekend = () => {
    const today = startOfToday()
    const dayOfWeek = today.getDay()
    const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek
    return addDays(today, daysUntilSaturday)
  }

  // Navigate steps
  const canProceed = () => {
    switch (step) {
      case 1:
        return sessionType !== ""
      case 2:
        return date !== undefined && timeSlot !== ""
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed() && step < 2) {
      setStep(step + 1)
    } else if (step === 2 && canProceed()) {
      // Complete booking - redirect to confirmation page
      const params = new URLSearchParams({
        sessionType,
        players: players.toString(),
        date: date ? format(date, "yyyy-MM-dd") : "",
        timeSlot,
        duration: duration.toString(),
        golfClubRental: golfClubRental.toString(),
        coachingSession: coachingSession.toString(),
      })
      window.location.href = `/booking/confirm?${params.toString()}`
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  // Duration options
  const durationOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4]
  const minDuration = getMinDuration()

  return (
    <div className="w-full max-w-lg mx-auto pb-32">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Premium Experience
        </div>
        <h1 className="text-2xl font-bold text-foreground">Book Your Session</h1>
        <p className="text-muted-foreground mt-1">Choose your experience</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 2 && <div className={cn("w-16 h-0.5 mx-2", s < step ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      {/* Step 1: Session Selection - Restored UI */}
      {step === 1 && (
        <div className="space-y-6 px-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-foreground">Famous Courses</h2>
            </div>

            <div className="space-y-3">
              {/* 4-Ball Special */}
              <button
                onClick={() => handleSessionSelect("4ball")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  "flex items-start gap-4",
                  sessionType === "4ball" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">4-Ball Special</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Best Value</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Play world-famous courses with 4 players</p>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-foreground">R150</span>
                    <span className="text-muted-foreground text-sm"> /person/hour</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1,800 total</p>
                </div>
              </button>

              {/* 3-Ball Special */}
              <button
                onClick={() => handleSessionSelect("3ball")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  "flex items-start gap-4",
                  sessionType === "3ball" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground">3-Ball Special</span>
                  <p className="text-sm text-muted-foreground mt-1">Perfect for trios on famous courses</p>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-foreground">R160</span>
                    <span className="text-muted-foreground text-sm"> /person/hour</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1,440 total</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Quick Play</h2>
            </div>

            <button
              onClick={() => handleSessionSelect("quick")}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "flex items-start gap-4",
                sessionType === "quick" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">Quick Play Session</span>
                <p className="text-sm text-muted-foreground mt-1">Flexible practice on driving range or courses</p>
                <div className="mt-2">
                  <span className="text-lg font-bold text-foreground">From R150</span>
                  <span className="text-muted-foreground text-sm"> /person/hour</span>
                </div>
              </div>
            </button>
          </div>

          {sessionType === "quick" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Number of Players</h2>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPlayers(num)}
                      className={cn(
                        "py-4 rounded-xl font-semibold transition-all flex flex-col items-center",
                        players === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 hover:bg-muted text-foreground",
                      )}
                    >
                      <span className="text-xl">{num}</span>
                      <span className="text-xs opacity-80">R{PRICING[num as keyof typeof PRICING]}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Price per person per hour • Groups of 4+ get the best rate
                </p>
              </div>
            </div>
          )}

          {sessionType && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Session Duration</h2>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap gap-2">
                  {durationOptions
                    .filter((d) => d >= minDuration)
                    .map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-medium transition-all",
                          duration === d
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 hover:bg-muted text-foreground",
                        )}
                      >
                        {d}h
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {step === 2 && (
        <div className="space-y-4 px-4">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                Select Your Date
              </CardTitle>
              <p className="text-primary-foreground/70 text-sm mt-1">Choose a date that works best for you</p>
            </CardHeader>

            <CardContent className="p-0">
              {/* Quick Date Selection */}
              <div className="p-4 border-b border-border/50 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Select</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[
                    { label: "Today", date: startOfToday(), check: isToday },
                    { label: "Tomorrow", date: addDays(startOfToday(), 1), check: isTomorrow },
                    {
                      label: "This Weekend",
                      date: getNextWeekend(),
                      check: (d: Date) => isWeekend(d) && d <= addDays(startOfToday(), 7),
                    },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setDate(option.date)}
                      className={cn(
                        "flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                        "border-2 active:scale-95",
                        date && option.check(date)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border hover:border-primary/50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="p-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="w-full"
                />
              </div>

              {/* Selected Date Display */}
              {date && (
                <div className="px-4 pb-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex flex-col items-center justify-center">
                      <span className="text-xs font-medium uppercase">{format(date, "MMM")}</span>
                      <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{format(date, "EEEE")}</p>
                      <p className="text-sm text-muted-foreground">{format(date, "MMMM d, yyyy")}</p>
                    </div>
                    <div className="ml-auto">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots */}
          {date && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  Available Times
                </CardTitle>
                <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d")}</p>
                {availabilityError && <p className="text-xs text-amber-600 mt-1">Note: {availabilityError}</p>}
              </CardHeader>
              <CardContent>
                {isCheckingAvailability ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="ml-3 text-muted-foreground">Checking availability...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const booked = isSlotBooked(slot)
                      return (
                        <button
                          key={slot}
                          onClick={() => !booked && setTimeSlot(slot)}
                          disabled={booked}
                          className={cn(
                            "py-3 px-2 rounded-xl text-sm font-medium transition-all",
                            booked
                              ? "bg-muted/50 text-muted-foreground cursor-not-allowed line-through"
                              : timeSlot === slot
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "bg-card border border-border hover:border-primary/50",
                          )}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add-ons */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Optional Add-ons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => setGolfClubRental(!golfClubRental)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  golfClubRental ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
              >
                <span className="font-medium">Golf Club Rental</span>
                <span className="text-primary font-bold">+R100</span>
              </button>
              <button
                onClick={() => setCoachingSession(!coachingSession)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  coachingSession ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                )}
              >
                <span className="font-medium">Coaching Session</span>
                <span className="text-primary font-bold">+R450</span>
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          {sessionType && (
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs opacity-80">Estimated Total</p>
                <p className="text-2xl font-bold">R{calculatePrice().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Per Person</p>
                <p className="text-lg font-semibold">R{getPricePerPersonPerHour()}/hr</p>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 h-12 bg-white text-primary hover:bg-white/90 font-semibold"
            >
              {step === 2 ? "Continue to Details" : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingFlow
