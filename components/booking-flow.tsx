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
    <div className="min-h-screen py-4 sm:py-8 md:py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-3 sm:px-4 mb-4 sm:mb-6 md:mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-all duration-300 mb-4 group"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 border border-secondary/20 shadow-md">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Book Your Session
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 leading-snug">
              Complete booking in 2 steps
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-1 sm:gap-2 max-w-3xl mx-auto">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full text-xs sm:text-sm font-bold transition-all duration-500 shadow-md ${
                  s === step
                    ? "bg-secondary text-white shadow-lg shadow-secondary/30 scale-105 sm:scale-110"
                    : s < step
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 2 && (
                <div
                  className={`flex-1 h-1 sm:h-1.5 mx-1 sm:mx-2 rounded-full transition-all duration-500 ${
                    s < step ? "bg-primary shadow-sm" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-3xl mx-auto mt-2 px-1">
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Session Type</span>
          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Date & Time</span>
        </div>
      </div>

      {/* Error Display */}
      {validationError && (
        <div className="container mx-auto px-3 sm:px-4 mb-4 sm:mb-6">
          <div className="max-w-3xl mx-auto">
            <Alert
              variant="destructive"
              className="border-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-500"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <AlertDescription className="ml-2 font-medium text-xs sm:text-sm leading-relaxed">
                {validationError}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-3xl mx-auto">
          {step === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-2 shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="font-serif text-lg sm:text-xl md:text-2xl">Select Your Experience</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2 leading-relaxed">
                    Choose between Famous Course or Quick Play
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6">
                    {/* 4-Ball Card */}
                    <Card className="border-2 border-secondary/40 bg-gradient-to-br from-secondary/10 to-background hover:shadow-xl hover:scale-[1.01] transition-all duration-300 hover:border-secondary group cursor-pointer">
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-base sm:text-lg md:text-xl font-bold leading-tight">
                            4-Ball Special
                          </CardTitle>
                          <Badge className="bg-secondary text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5">
                            Popular
                          </Badge>
                        </div>
                        <CardDescription className="text-xs leading-snug">
                          18-hole famous courses • 4 players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary/20 border border-secondary/30">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                          </div>
                          <p className="font-bold text-sm sm:text-base text-foreground">R150/person/hour</p>
                        </div>
                        <div className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded-lg border border-muted-foreground/10">
                          <p className="font-medium">4 players • 3hr minimum</p>
                          <p className="mt-1">R1800 total for 3 hours</p>
                        </div>
                        <Button
                          variant={
                            sessionType === "famous-course" && famousCourseOption === "4-ball" ? "default" : "outline"
                          }
                          className="w-full font-semibold h-9 sm:h-10 text-xs sm:text-sm"
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

                    {/* 3-Ball Card */}
                    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-background hover:shadow-xl hover:scale-[1.01] transition-all duration-300 hover:border-primary group cursor-pointer">
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-base sm:text-lg md:text-xl font-bold leading-tight">
                            3-Ball
                          </CardTitle>
                          <Badge className="bg-primary text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5">
                            Great Deal
                          </Badge>
                        </div>
                        <CardDescription className="text-xs leading-snug">
                          18-hole famous courses • 3 players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/20 border border-primary/30">
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <p className="font-bold text-sm sm:text-base text-foreground">R150/person/hour</p>
                        </div>
                        <div className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded-lg border border-muted-foreground/10">
                          <p className="font-medium">3 players • 3hr minimum</p>
                          <p className="mt-1">R1350 total for 3 hours</p>
                        </div>
                        <Button
                          variant={
                            sessionType === "famous-course" && famousCourseOption === "3-ball" ? "default" : "outline"
                          }
                          className="w-full font-semibold h-9 sm:h-10 text-xs sm:text-sm"
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

                    {/* Quick Play Card */}
                    <Card className="border-2 border-foreground/20 bg-gradient-to-br from-foreground/5 to-background hover:shadow-xl hover:scale-[1.01] transition-all duration-300 hover:border-foreground/40 group cursor-pointer">
                      <CardHeader className="pb-3 sm:pb-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-base sm:text-lg md:text-xl font-bold leading-tight">
                            Quick Play
                          </CardTitle>
                        </div>
                        <CardDescription className="text-xs leading-snug">
                          Flexible hourly sessions • Any count
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-foreground/10 border border-foreground/20">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                          </div>
                          <p className="font-bold text-sm sm:text-base text-foreground">From R150/hr</p>
                        </div>
                        <div className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded-lg border border-muted-foreground/10">
                          <p className="font-medium">1-4 players • No minimum</p>
                          <p className="mt-1">Per person per hour pricing</p>
                        </div>
                        <Button
                          variant={sessionType === "quickplay" ? "default" : "outline"}
                          className="w-full font-semibold h-9 sm:h-10 text-xs sm:text-sm"
                          onClick={() => {
                            setSessionType("quickplay")
                            setFamousCourseOption(null)
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
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/20 border border-primary/30">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span>How many players?</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
                    {sessionType === "famous-course"
                      ? `${famousCourseOption === "4-ball" ? "4" : "3"} players required for ${famousCourseOption}`
                      : "Select 1-4 players for your session"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[1, 2, 3, 4].map((count) => {
                      const disabled =
                        (sessionType === "famous-course" && famousCourseOption === "4-ball" && count !== 4) ||
                        (sessionType === "famous-course" && famousCourseOption === "3-ball" && count !== 3)

                      let pricePerPerson = 150
                      if (sessionType === "quickplay") {
                        if (count === 1) pricePerPerson = 250
                        else if (count === 2) pricePerPerson = 180
                        else if (count === 3) pricePerPerson = 160
                        else pricePerPerson = 150
                      }

                      return (
                        <div key={count} className="flex flex-col gap-1 sm:gap-2">
                          <Button
                            variant={playerCount === count ? "default" : "outline"}
                            className={`h-16 sm:h-20 text-2xl sm:text-3xl font-bold transition-all duration-300 ${
                              playerCount === count
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg scale-105"
                                : "hover:scale-105"
                            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => !disabled && setPlayerCount(count)}
                            disabled={disabled}
                          >
                            {count}
                          </Button>
                          {sessionType === "quickplay" && (
                            <p className="text-[10px] sm:text-xs text-center text-muted-foreground font-medium">
                              R{pricePerPerson}/p/hr
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 sm:mt-6 p-3 sm:p-5 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-xl border-2 border-secondary/20 shadow-inner">
                    <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1 sm:mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      Estimated Price:
                    </p>
                    <p className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                      R{calculatePrice().toLocaleString()}
                      <span className="text-sm sm:text-base md:text-lg font-normal text-muted-foreground ml-2">
                        for {duration}hr{duration > 1 ? "s" : ""}
                      </span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                      {sessionType === "famous-course"
                        ? `${playerCount} players × R150/person/hr × ${duration} hours`
                        : `${playerCount} player${playerCount > 1 ? "s" : ""} × R${playerCount === 1 ? "250" : playerCount === 2 ? "180" : playerCount === 3 ? "160" : "150"}/person/hr × ${duration} hours`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl">Optional Add-ons</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">Enhance your golf experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {/* Golf Club Rental */}
                  <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 border-border hover:border-secondary/50 transition-all bg-background">
                    <Checkbox
                      id="golf-clubs"
                      checked={golfClubRental}
                      onCheckedChange={(checked) => setGolfClubRental(checked as boolean)}
                      className="mt-1 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    />
                    <Label
                      htmlFor="golf-clubs"
                      className="text-xs sm:text-sm cursor-pointer leading-relaxed flex-1 min-w-0"
                    >
                      <span className="font-bold text-sm sm:text-base text-foreground block mb-0.5 sm:mb-1">
                        Golf Club Rental
                      </span>
                      <span className="block text-muted-foreground">Premium clubs available • R100</span>
                    </Label>
                  </div>

                  {/* Coaching Session */}
                  <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all bg-background">
                    <Checkbox
                      id="coaching"
                      checked={coachingSession}
                      onCheckedChange={(checked) => setCoachingSession(checked as boolean)}
                      className="mt-1 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                    />
                    <Label
                      htmlFor="coaching"
                      className="text-xs sm:text-sm cursor-pointer leading-relaxed flex-1 min-w-0"
                    >
                      <span className="font-bold text-sm sm:text-base text-foreground block mb-0.5 sm:mb-1">
                        Coaching Session
                      </span>
                      <span className="block text-muted-foreground">Professional coaching • R450</span>
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  size="lg"
                  className="w-full sm:w-auto font-bold h-12 sm:h-14 text-sm sm:text-base px-6 sm:px-8 shadow-lg hover:shadow-xl transition-all"
                >
                  Continue to Date & Time
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-2 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/20 border border-primary/30">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span>Select Date</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {date && (
                <>
                  <Card className="border-2 shadow-xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary/20 border border-secondary/30">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                        </div>
                        <span>Time Slot</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={timeSlot} onValueChange={setTimeSlot}>
                        <SelectTrigger className="h-12 text-sm sm:text-base border-2">
                          <SelectValue placeholder="Choose a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot} className="text-sm sm:text-base">
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="border-2 shadow-xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/20 border border-primary/30">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <span>Duration</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {getMinimumHours() > 1
                          ? `Minimum ${getMinimumHours()} hours required`
                          : "Select hours in 30-minute increments"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={duration.toString()} onValueChange={(val) => setDuration(Number.parseFloat(val))}>
                        <SelectTrigger className="h-12 text-sm sm:text-base border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((hrs) => (
                            <SelectItem
                              key={hrs}
                              value={hrs.toString()}
                              disabled={hrs < getMinimumHours()}
                              className="text-sm sm:text-base"
                            >
                              {hrs} {hrs === 1 ? "hour" : "hours"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto order-2 sm:order-1 h-12 text-sm sm:text-base"
                >
                  Back
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  size="lg"
                  className="w-full sm:flex-1 order-1 sm:order-2 font-bold h-12 sm:h-14 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all"
                >
                  Continue to Confirmation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
