"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, addDays, isToday, isTomorrow, isWeekend, startOfToday } from "date-fns"
import { cn } from "@/lib/utils"
import { Users, Clock, Trophy, Zap, CalendarIcon, ChevronRight, ChevronLeft, Check, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"

type SessionType = "quickplay" | "famous-course"
type FamousCourseOption = "4-ball" | "3-ball" | null

interface BookingData {
  sessionType: SessionType
  famousCourseOption: FamousCourseOption
  playerCount: number
  duration: number
  date: Date | undefined
  timeSlot: string
  golfClubRental: boolean
  coachingSession: boolean
}

export default function BookingFlow() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [sessionType, setSessionType] = useState<SessionType>("quickplay")
  const [famousCourseOption, setFamousCourseOption] = useState<FamousCourseOption>(null)
  const [playerCount, setPlayerCount] = useState(1)
  const [duration, setDuration] = useState(1)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeSlot, setTimeSlot] = useState("")
  const [golfClubRental, setGolfClubRental] = useState(false)
  const [coachingSession, setCoachingSession] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<{ start: string; end: string }[]>([])

  const calculatePrice = () => {
    let basePrice = 0

    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        basePrice = 150 * 4 * duration // R150/person/hour x 4 people
      }
      if (famousCourseOption === "3-ball") {
        basePrice = 160 * 3 * duration // R160/person/hour x 3 people (FIXED)
      }
    } else {
      // Quick Play pricing
      if (playerCount === 1) {
        basePrice = 250 * duration
      } else if (playerCount === 2) {
        basePrice = 180 * 2 * duration
      } else if (playerCount === 3) {
        basePrice = 160 * 3 * duration
      } else {
        basePrice = 150 * 4 * duration
      }
    }

    if (golfClubRental) basePrice += 100
    if (coachingSession) basePrice += 450

    return basePrice
  }

  const getMinimumHours = () => {
    if (sessionType === "famous-course") return 3
    return 1
  }

  const generateTimeSlots = () => {
    const slots: string[] = []
    const dayOfWeek = date?.getDay()

    let startHour = 9
    let endHour = 20

    if (dayOfWeek === 6) {
      startHour = 8
      endHour = 20
    } else if (dayOfWeek === 0) {
      startHour = 10
      endHour = 16
    }

    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`)
      slots.push(`${hour.toString().padStart(2, "0")}:30`)
    }

    return slots
  }

  const isSlotBooked = (slot: string) => {
    const slotTime = Number.parseInt(slot.split(":")[0]) * 60 + Number.parseInt(slot.split(":")[1])
    const slotEndTime = slotTime + duration * 60

    return bookedSlots.some((booking) => {
      const bookingStart =
        Number.parseInt(booking.start.split(":")[0]) * 60 + Number.parseInt(booking.start.split(":")[1])
      const bookingEnd = Number.parseInt(booking.end.split(":")[0]) * 60 + Number.parseInt(booking.end.split(":")[1])
      return slotTime < bookingEnd && slotEndTime > bookingStart
    })
  }

  const getNextWeekend = () => {
    const today = startOfToday()
    return isWeekend(today) ? today : addDays(today, 7 - today.getDay())
  }

  useEffect(() => {
    if (date) {
      setAvailableSlots(generateTimeSlots())
      fetchBookedSlots()
    }
  }, [date, duration])

  const fetchBookedSlots = async () => {
    if (!date) return
    setIsCheckingAvailability(true)
    try {
      const response = await fetch(`/api/bookings/availability?date=${date.toISOString()}&duration=${duration}`)
      if (response.ok) {
        const data = await response.json()
        setBookedSlots(data.bookedSlots || [])
      }
    } catch (error) {
      console.error("Error fetching availability:", error)
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  const handleContinue = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2 && date && timeSlot) {
      const params = new URLSearchParams({
        sessionType,
        famousCourseOption: famousCourseOption || "",
        players: playerCount.toString(),
        duration: duration.toString(),
        date: date.toISOString(),
        timeSlot,
        golfClubRental: golfClubRental.toString(),
        coachingSession: coachingSession.toString(),
      })
      router.push(`/booking/confirm?${params.toString()}`)
    }
  }

  const canContinue = () => {
    if (step === 1) {
      return sessionType === "famous-course" ? famousCourseOption !== null : playerCount > 0
    }
    return date && timeSlot
  }

  const getPerPersonPrice = () => {
    if (sessionType === "famous-course") {
      return famousCourseOption === "4-ball" ? 150 : 160
    }
    if (playerCount === 1) return 250
    if (playerCount === 2) return 180
    if (playerCount === 3) return 160
    return 150
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
        {/* Premium Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary">Premium Experience</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Book Your Session</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {step === 1 ? "Choose your experience" : "Select date & time"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step >= s
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`w-12 sm:w-16 h-1 rounded-full transition-colors ${step > s ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Session Selection */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Famous Course Options */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-secondary" />
                Famous Courses
              </h2>

              {/* 4-Ball Special */}
              <button
                onClick={() => {
                  setSessionType("famous-course")
                  setFamousCourseOption("4-ball")
                  setPlayerCount(4)
                  setDuration(3)
                }}
                className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 ${
                  sessionType === "famous-course" && famousCourseOption === "4-ball"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base sm:text-lg text-foreground">4-Ball Special</h3>
                      <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs font-semibold rounded-full">
                        Best Value
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Play world-famous courses with 4 players</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-primary">R150</span>
                      <span className="text-sm text-muted-foreground">/person/hour</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1,800 total</p>
                  </div>
                </div>
              </button>

              {/* 3-Ball Special - FIXED PRICE */}
              <button
                onClick={() => {
                  setSessionType("famous-course")
                  setFamousCourseOption("3-ball")
                  setPlayerCount(3)
                  setDuration(3)
                }}
                className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 ${
                  sessionType === "famous-course" && famousCourseOption === "3-ball"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">3-Ball Special</h3>
                    <p className="text-sm text-muted-foreground mb-2">Perfect for trios on famous courses</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-bold text-primary">R160</span>
                      <span className="text-sm text-muted-foreground">/person/hour</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">3-hour minimum • R1,440 total</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Quick Play */}
            <div className="space-y-3 pt-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                Quick Play
              </h2>

              <button
                onClick={() => {
                  setSessionType("quickplay")
                  setFamousCourseOption(null)
                  setDuration(1)
                }}
                className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 ${
                  sessionType === "quickplay"
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">Quick Play Session</h3>
                    <p className="text-sm text-muted-foreground mb-2">Flexible practice on driving range or courses</p>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-xl sm:text-2xl font-bold text-primary">From R150</span>
                      <span className="text-sm text-muted-foreground">/person/hour</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Player Selection for Quick Play */}
            {sessionType === "quickplay" && (
              <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Number of Players
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => setPlayerCount(count)}
                        className={`py-3 px-2 rounded-lg border-2 transition-all duration-200 ${
                          playerCount === count
                            ? "border-primary bg-primary text-primary-foreground shadow-md"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs mt-1 opacity-80">
                          {count === 1 ? "R250" : count === 2 ? "R180" : count === 3 ? "R160" : "R150"}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Price per person per hour • Groups of 4+ get the best rate
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Duration Selection */}
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Session Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((hours) => {
                    const minHours = getMinimumHours()
                    const disabled = hours < minHours
                    return (
                      <button
                        key={hours}
                        onClick={() => !disabled && setDuration(hours)}
                        disabled={disabled}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          disabled
                            ? "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                            : duration === hours
                              ? "border-primary bg-primary text-primary-foreground shadow-md"
                              : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {hours}h
                      </button>
                    )
                  })}
                </div>
                {sessionType === "famous-course" && (
                  <p className="text-xs text-secondary mt-2">* Famous courses require 3-hour minimum</p>
                )}
              </CardContent>
            </Card>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-primary to-primary/90 rounded-xl p-4 sm:p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Estimated Total</p>
                  <p className="text-2xl sm:text-3xl font-bold">R{calculatePrice().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Per Person</p>
                  <p className="text-lg font-semibold">R{getPerPersonPrice()}/hr</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && (
          <div className="space-y-4">
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Quick Select
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
                          "flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                          "border-2 active:scale-95",
                          date && option.check(date)
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-card border-border hover:border-primary/50 hover:bg-primary/5",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar Grid */}
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
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-secondary" />
                    </div>
                    Available Times
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{format(date, "EEEE, MMMM d")}</p>
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
                              "py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200",
                              "active:scale-95",
                              booked
                                ? "bg-muted/50 text-muted-foreground cursor-not-allowed line-through"
                                : timeSlot === slot
                                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                  : "bg-card border-2 border-border hover:border-primary/50 hover:bg-primary/5",
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Optional Add-ons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setGolfClubRental(!golfClubRental)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    golfClubRental ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="font-medium">Golf Club Rental</span>
                  <span className="text-primary font-bold">+R100</span>
                </button>
                <button
                  onClick={() => setCoachingSession(!coachingSession)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    coachingSession ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="font-medium">Coaching Session</span>
                  <span className="text-primary font-bold">+R450</span>
                </button>
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="bg-gradient-to-r from-primary to-primary/90 rounded-xl p-4 text-white">
              <p className="text-sm opacity-80 mb-1">Session Total</p>
              <p className="text-3xl font-bold">R{calculatePrice().toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={!canContinue()}
            className="flex-1 h-12 bg-secondary hover:bg-secondary/90 text-white"
          >
            {step === 2 ? "Continue to Payment" : "Next"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Operating Hours Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">Mon-Fri: 9AM-8PM • Sat: 8AM-8PM • Sun: 10AM-4PM</p>
        </div>
      </div>
    </div>
  )
}

export { BookingFlow }
