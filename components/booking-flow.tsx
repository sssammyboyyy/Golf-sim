"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
// FIXED: Added Loader2 to the imports below
import { ArrowLeft, ArrowRight, Users, CalendarIcon, Clock, Check, Trophy, Zap, Sparkles, Loader2 } from "lucide-react"
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
  // --- REFS FOR AUTO-SCROLL ---
  const topRef = useRef<HTMLDivElement>(null)
  const timeSlotsRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  // Form state
  const [step, setStep] = useState(1)
  const [sessionType, setSessionType] = useState<"4ball" | "3ball" | "quick" | "">("")
  const [players, setPlayers] = useState(1)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeSlot, setTimeSlot] = useState("")
  const [duration, setDuration] = useState(1)
  const [golfClubRental, setGolfClubRental] = useState(false)
  const [coachingSession, setCoachingSession] = useState(false)

  // Availability state
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  // --- AUTO SCROLL LOGIC ---
  
  // 1. Scroll to top when Step changes
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [step])

  // 2. Scroll to Time Slots when Date is selected
  useEffect(() => {
    if (date && timeSlotsRef.current) {
      // Small delay to allow UI to render
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [date])

  const calculatePrice = useCallback(() => {
    let basePrice = 0

    if (sessionType === "4ball") {
      basePrice = 150 * 4 * duration
    } else if (sessionType === "3ball") {
      basePrice = 160 * 3 * duration
    } else {
      const pricePerPerson = PRICING[Math.min(players, 4) as keyof typeof PRICING]
      basePrice = pricePerPerson * players * duration
    }

    if (golfClubRental) basePrice += 100
    if (coachingSession) basePrice += 250

    return basePrice
  }, [sessionType, players, duration, golfClubRental, coachingSession])

  const getPricePerPersonPerHour = useCallback(() => {
    if (sessionType === "4ball") return 150
    if (sessionType === "3ball") return 160
    return PRICING[Math.min(players, 4) as keyof typeof PRICING]
  }, [sessionType, players])

  const getMinDuration = useCallback(() => {
    if (sessionType === "4ball" || sessionType === "3ball") return 3
    return 1
  }, [sessionType])

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

      if (data.error) setAvailabilityError(data.error)
    } catch (error) {
      console.error("Error fetching availability:", error)
      setBookedSlots([])
      setAvailabilityError("Could not check availability")
    } finally {
      setIsCheckingAvailability(false)
    }
  }, [])

  useEffect(() => {
    if (date) fetchBookedSlots(date)
  }, [date, fetchBookedSlots])

  useEffect(() => {
    const minDur = getMinDuration()
    if (duration < minDur) setDuration(minDur)
  }, [sessionType, getMinDuration, duration])

  const isSlotBooked = useCallback((slot: string) => {
    if (bookedSlots.includes(slot)) return true
    if (date && isToday(date)) {
      const now = new Date()
      const [hours, minutes] = slot.split(':').map(Number)
      const slotDate = new Date(date)
      slotDate.setHours(hours, minutes, 0, 0)
      if (slotDate <= now) return true
    }
    return false
  }, [bookedSlots, date])

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

  const getNextWeekend = () => {
    const today = startOfToday()
    const dayOfWeek = today.getDay()
    const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek
    return addDays(today, daysUntilSaturday)
  }

  const canProceed = () => {
    switch (step) {
      case 1: return sessionType !== ""
      case 2: return date !== undefined && timeSlot !== ""
      default: return false
    }
  }

  const handleNext = () => {
    if (canProceed() && step < 2) {
      setStep(step + 1)
    } else if (step === 2 && canProceed()) {
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

  const durationOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4]
  const minDuration = getMinDuration()

  return (
    <div className="w-full max-w-lg mx-auto pb-32" ref={topRef}>
      <div className="text-center mb-6 pt-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Premium Experience
        </div>
        <h1 className="text-2xl font-bold text-foreground">Book Your Session</h1>
        <p className="text-muted-foreground mt-1">
          {step === 1 ? "Choose your experience" : "Select date & time"}
        </p>
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
                    ? "bg-primary text-primary-foreground shadow-lg scale-110" // Visual Pop for active step
                    : "bg-muted text-muted-foreground",
              )}
            >
              {s < step ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 2 && <div className={cn("w-16 h-0.5 mx-2", s < step ? "bg-primary" : "bg-muted")} />}
          </div>
        ))}
      </div>

      {/* Step 1: Session Selection */}
      {step === 1 && (
        <div className="space-y-6 px-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-foreground">Famous Courses</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleSessionSelect("4ball")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                  "flex items-start gap-4",
                  sessionType === "4ball" ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" : "border-border hover:border-primary/50",
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
                </div>
              </button>

              <button
                onClick={() => handleSessionSelect("3ball")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                  "flex items-start gap-4",
                  sessionType === "3ball" ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground">3-Ball Special</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold text-foreground">R160</span>
                    <span className="text-muted-foreground text-sm"> /person/hour</span>
                  </div>
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
                "w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]",
                "flex items-start gap-4",
                sessionType === "quick" ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" : "border-border hover:border-primary/50",
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground">Quick Play Session</span>
                <div className="mt-2">
                  <span className="text-lg font-bold text-foreground">From R150</span>
                  <span className="text-muted-foreground text-sm"> /person/hour</span>
                </div>
              </div>
            </button>
          </div>

          {sessionType === "quick" && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
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
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-muted/50 hover:bg-muted text-foreground",
                      )}
                    >
                      <span className="text-xl">{num}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sessionType && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
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
                            ? "bg-primary text-primary-foreground shadow-md scale-105"
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
                <CalendarIcon className="w-5 h-5" />
                Select Your Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 border-b border-border/50 bg-muted/30">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border hover:border-primary/50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Time Slots - Hidden until date selected */}
          {date && (
            <div ref={timeSlotsRef} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="border-0 shadow-lg ring-1 ring-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    Available Times
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d")}</p>
                </CardHeader>
                <CardContent>
                  {isCheckingAvailability ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <span className="ml-3 text-muted-foreground">Checking...</span>
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
                              "py-3 px-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                              booked
                                ? "bg-muted/50 text-muted-foreground cursor-not-allowed line-through opacity-50"
                                : timeSlot === slot
                                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2"
                                  : "bg-card border border-border hover:border-primary/50 hover:shadow-sm",
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
            </div>
          )}

          {/* Add-ons - Always visible in step 2 */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Optional Add-ons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => setGolfClubRental(!golfClubRental)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                  golfClubRental ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50",
                )}
              >
                <span className="font-medium">Golf Club Rental</span>
                <span className="text-primary font-bold">+R100</span>
              </button>
              {/* Add other add-ons here... */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div ref={footerRef} className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary via-primary to-primary/95 text-primary-foreground p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto">
          {sessionType && (
            <div className="flex items-center justify-between mb-3 animate-in slide-in-from-bottom-2">
              <div>
                <p className="text-xs opacity-80 font-medium tracking-wide uppercase">Estimated Total</p>
                <p className="text-2xl font-bold tracking-tight">R{calculatePrice().toLocaleString()}</p>
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
                className="flex-1 h-12 bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "flex-1 h-12 bg-white text-primary hover:bg-white/90 font-bold text-base transition-all",
                canProceed() && "shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse" // Subtle pulse when ready
              )}
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
