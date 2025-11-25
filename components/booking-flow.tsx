"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Clock, CalendarIcon, Trophy, AlertTriangle, Sparkles } from "lucide-react"
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

  const getMinimumHours = () => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") return 3
      if (famousCourseOption === "3-ball") return 3 // Changed from 2 to 3 hours to match 4-ball logic
    }
    return 1
  }

  const calculatePrice = () => {
    let basePrice = 0

    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        basePrice = 150 * 4 * duration // R150/person x 4 people
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

    // Add golf club rental
    if (golfClubRental) {
      basePrice += 100
    }

    // Add coaching session
    if (coachingSession) {
      basePrice += 450
    }

    return basePrice
  }

  const validateBooking = () => {
    setValidationError("")

    const minHours = getMinimumHours()

    // Check minimum hours requirement
    if (duration < minHours) {
      if (famousCourseOption === "4-ball") {
        setValidationError(
          `Famous Course 4-ball requires a minimum booking of ${minHours} hours. Please increase your booking duration.`,
        )
        return false
      }
      if (famousCourseOption === "3-ball") {
        setValidationError(
          `Famous Course 3-ball requires a minimum booking of ${minHours} hours. Please increase your booking duration.`,
        )
        return false
      }
    }

    // Check if booking extends past closing time (8 PM = 20:00)
    if (timeSlot && date) {
      const [startHour] = timeSlot.split(":").map(Number)
      const endHour = startHour + duration

      if (endHour > 20) {
        setValidationError(
          `This booking would extend past closing time (8 PM). Please select an earlier time or reduce duration. Latest available start times: ${getLatestStartTimes().join(", ")}`,
        )
        return false
      }
    }

    // Check party size matches famous course options
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball" && playerCount !== 4) {
        setValidationError("4-ball famous course requires exactly 4 players. Please adjust player count.")
        return false
      }
      if (famousCourseOption === "3-ball" && playerCount !== 3) {
        setValidationError("3-ball famous course requires exactly 3 players. Please adjust player count.")
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
    <div className="min-h-screen py-12 md:py-16 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all duration-300 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <div className="flex items-center gap-4 mb-3">
          <div className="icon-container-primary">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Book Your Session
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">Complete your booking in 2 simple steps</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mb-10">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all duration-500 ${
                  s === step
                    ? "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30 scale-110"
                    : s < step
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 2 && (
                <div
                  className={`flex-1 h-1.5 mx-3 rounded-full transition-all duration-500 ${
                    s < step ? "bg-primary shadow-sm" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-3xl mx-auto mt-3">
          <span className="text-xs md:text-sm font-medium text-muted-foreground">Session Type</span>
          <span className="text-xs md:text-sm font-medium text-muted-foreground">Date & Time</span>
        </div>
      </div>

      {/* Error Display */}
      {validationError && (
        <div className="container mx-auto px-4 mb-8">
          <div className="max-w-3xl mx-auto">
            <Alert
              variant="destructive"
              className="border-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500"
            >
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="ml-2 font-medium">{validationError}</AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {step === 1 && (
            <div className="space-y-8">
              <Card className="border-2 shadow-xl transition-all duration-300 hover:shadow-2xl">
                <CardHeader className="pb-6">
                  <CardTitle className="font-serif text-2xl md:text-3xl">Select Your Experience</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Choose between Famous Course 18-hole or Quick Play sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-2 border-secondary/40 bg-gradient-to-br from-secondary/10 via-secondary/5 to-background hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-secondary group cursor-pointer">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <CardTitle className="text-xl md:text-2xl font-bold">4-Ball Special</CardTitle>
                          <Badge className="bg-secondary text-white shadow-lg group-hover:scale-110 transition-transform">
                            Popular
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">18-hole famous courses with 4 players</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="icon-badge-secondary">
                            <Sparkles className="w-5 h-5 text-secondary" />
                          </div>
                          <p className="font-bold text-lg text-foreground">R150/person/hour</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
                          4 players • 3-hour minimum • R1800 total for 3 hours (R450/person)
                        </p>
                        <Button
                          variant={
                            sessionType === "famous-course" && famousCourseOption === "4-ball" ? "default" : "outline"
                          }
                          className="w-full font-semibold"
                          onClick={() => {
                            setSessionType("famous-course")
                            setFamousCourseOption("4-ball")
                            setPlayerCount(4)
                            setDuration(3)
                          }}
                        >
                          Select 4-Ball
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-border bg-gradient-to-br from-background to-muted/20 hover:border-primary/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl md:text-2xl font-bold">3-Ball</CardTitle>
                        <CardDescription className="text-sm">18-hole famous courses with 3 players</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="icon-badge-secondary">
                            <Sparkles className="w-5 h-5 text-secondary" />
                          </div>
                          <p className="font-bold text-lg text-foreground">R150/person/hour</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
                          3 players • 3-hour minimum • R1350 total for 3 hours (R450/person)
                        </p>
                        <Button
                          variant={
                            sessionType === "famous-course" && famousCourseOption === "3-ball" ? "default" : "outline"
                          }
                          className="w-full font-semibold"
                          onClick={() => {
                            setSessionType("famous-course")
                            setFamousCourseOption("3-ball")
                            setPlayerCount(3)
                            setDuration(3)
                          }}
                        >
                          Select 3-Ball
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-border bg-gradient-to-br from-background to-primary/5 hover:border-primary/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-xl md:text-2xl font-bold">Quick Play</CardTitle>
                        <CardDescription className="text-sm">Practice sessions from 1-4 players</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="icon-badge-primary">
                            <Trophy className="w-5 h-5 text-primary" />
                          </div>
                          <Badge variant="outline" className="text-xs font-semibold">
                            R150-R250/person/hour
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
                          Flexible duration • 1-4 players • Per-person-per-hour pricing
                        </p>
                        <Button
                          variant={sessionType === "quickplay" ? "default" : "outline"}
                          className="w-full font-semibold"
                          onClick={() => {
                            setSessionType("quickplay")
                            setFamousCourseOption(null)
                            setPlayerCount(1)
                            setDuration(1)
                          }}
                        >
                          Select Quick Play
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="icon-container-primary">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    How many players?
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {sessionType === "famous-course" && famousCourseOption
                      ? `${famousCourseOption === "4-ball" ? "4 players" : "3 players"} required for this option`
                      : "Select 1-4 players for your session"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((count) => {
                      const disabled =
                        (sessionType === "famous-course" && famousCourseOption === "4-ball" && count !== 4) ||
                        (sessionType === "famous-course" && famousCourseOption === "3-ball" && count !== 3)

                      return (
                        <Button
                          key={count}
                          variant={playerCount === count ? "default" : "outline"}
                          className={`h-16 text-2xl font-bold transition-all duration-300 ${
                            playerCount === count
                              ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg scale-105"
                              : "hover:scale-105"
                          }`}
                          onClick={() => !disabled && setPlayerCount(count)}
                          disabled={disabled}
                        >
                          {count}
                        </Button>
                      )
                    })}
                  </div>

                  <div className="mt-6 p-5 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-xl border-2 border-secondary/20 shadow-inner">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Estimated Price:
                    </p>
                    <p className="font-serif text-3xl md:text-4xl font-bold text-foreground">
                      R{calculatePrice().toLocaleString()}
                      <span className="text-lg font-normal text-muted-foreground ml-3">
                        for {duration} hour{duration > 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-8">
              <Card className="border-2 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="icon-container-primary">
                      <CalendarIcon className="w-6 h-6 text-primary" />
                    </div>
                    Select date
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Choose your preferred date (up to 30 days ahead)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const maxDate = new Date()
                      maxDate.setDate(maxDate.getDate() + 30)
                      return date < today || date > maxDate
                    }}
                    className="rounded-xl border-2 shadow-inner mx-auto"
                  />
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Operating Hours:
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mon-Fri: 9AM-8PM • Sat: 8AM-8PM • Sun: 10AM-4PM
                    </p>
                  </div>
                </CardContent>
              </Card>

              {date && (
                <>
                  <Card className="border-2 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="icon-container-primary">
                          <Clock className="w-6 h-6 text-primary" />
                        </div>
                        Select time slot
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Available time slots for {date.toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={timeSlot === slot ? "default" : "outline"}
                            className={`h-12 font-semibold transition-all duration-300 ${
                              timeSlot === slot
                                ? "bg-secondary text-secondary-foreground shadow-lg scale-105"
                                : "hover:scale-105"
                            }`}
                            onClick={() => setTimeSlot(slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="icon-container-secondary">
                          <Clock className="w-6 h-6 text-secondary" />
                        </div>
                        Duration
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        {getMinimumHours() > 1
                          ? `Minimum ${getMinimumHours()} hours required for this session`
                          : "Select your session duration"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={duration.toString()}
                        onValueChange={(value) => setDuration(Number.parseFloat(value))}
                      >
                        <SelectTrigger className="h-14 text-lg font-semibold border-2">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((hours) => (
                            <SelectItem
                              key={hours}
                              value={hours.toString()}
                              disabled={hours < getMinimumHours()}
                              className="text-base"
                            >
                              {hours} hour{hours > 1 ? "s" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="border-2 shadow-xl bg-gradient-to-br from-background to-muted/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <div className="icon-container-secondary">
                          <Sparkles className="w-6 h-6 text-secondary" />
                        </div>
                        Optional Add-Ons
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        Enhance your experience with these extras
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-all duration-300 cursor-pointer bg-background">
                        <Checkbox
                          id="golf-clubs"
                          checked={golfClubRental}
                          onCheckedChange={(checked) => setGolfClubRental(checked as boolean)}
                          className="mt-1 w-5 h-5"
                        />
                        <Label htmlFor="golf-clubs" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-lg text-foreground">Golf Club Rental</span>
                            <Badge variant="outline" className="font-bold">
                              R100
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Complete set of premium golf clubs included with your session
                          </p>
                        </Label>
                      </div>

                      <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-all duration-300 cursor-pointer bg-background">
                        <Checkbox
                          id="coaching"
                          checked={coachingSession}
                          onCheckedChange={(checked) => setCoachingSession(checked as boolean)}
                          className="mt-1 w-5 h-5"
                        />
                        <Label htmlFor="coaching" className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-lg text-foreground">Coaching Session</span>
                            <Badge variant="outline" className="font-bold">
                              R450
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            1-hour professional coaching to improve your swing and technique
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Continue Button */}
          <div className="mt-10 flex justify-between items-center">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="font-semibold" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={!canContinue()}
              className={`font-semibold ${step === 1 ? "ml-auto" : ""} bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              size="lg"
            >
              {step === 1 ? "Continue to Date & Time" : "Continue to Confirmation"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
