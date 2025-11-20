"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Clock, CalendarIcon, Trophy, AlertTriangle, Sparkles } from 'lucide-react'
import Link from "next/link"
import { useRouter } from 'next/navigation'

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
  const [validationError, setValidationError] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const getMinimumHours = () => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") return 3
      if (famousCourseOption === "3-ball") return 2
    }
    return 1
  }

  const calculatePrice = () => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        return 100 * 4 * duration // R100 per person per hour, 4 people
      }
      if (famousCourseOption === "3-ball") {
        return 120 * 3 * duration // R120 per person per hour, 3 people
      }
    } else {
      // Quick Play pricing
      const hourlyRates: Record<number, number> = {
        1: 250,
        2: 360,
        3: 480,
        4: 600,
      }
      return (hourlyRates[playerCount] || 250) * duration
    }
    return 0
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

  useEffect(() => {
    if (sessionType === "famous-course") {
      if (famousCourseOption === "4-ball") {
        setPlayerCount(4)
        setDuration(Math.max(duration, 3))
      } else if (famousCourseOption === "3-ball") {
        setPlayerCount(3)
        setDuration(Math.max(duration, 2))
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
  const timeSlots = [
    { time: "09:00", available: true },
    { time: "10:00", available: true },
    { time: "11:00", available: true },
    { time: "12:00", available: true },
    { time: "13:00", available: true },
    { time: "14:00", available: false }, // Example: booked
    { time: "15:00", available: true },
    { time: "16:00", available: true },
    { time: "17:00", available: true },
    { time: "18:00", available: true },
    { time: "19:00", available: true },
  ]

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="container mx-auto px-4 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-secondary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Book Your Session</h1>
        </div>
        <p className="text-muted-foreground">Complete your booking in 2 simple steps</p>
      </div>

      {/* Progress Indicator */}
      <div className="container mx-auto px-4 mb-8">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  s === step
                    ? "bg-secondary text-secondary-foreground"
                    : s < step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 2 && <div className={`flex-1 h-1 mx-2 ${s < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between max-w-2xl mx-auto mt-2">
          <span className="text-xs text-muted-foreground">Session Type</span>
          <span className="text-xs text-muted-foreground">Date & Time</span>
        </div>
      </div>

      {/* Error Display */}
      {validationError && (
        <div className="container mx-auto px-4 mb-6">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {step === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Experience</CardTitle>
                  <CardDescription>Choose between Famous Course 18-hole or Quick Play sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={sessionType}
                    onValueChange={(value) => {
                      setSessionType(value as SessionType)
                      setFamousCourseOption(null)
                      setValidationError("")
                    }}
                  >
                    <div className="space-y-3">
                      <Label
                        htmlFor="famous-course"
                        className="flex items-start justify-between p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <RadioGroupItem value="famous-course" id="famous-course" className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground text-lg">18-Hole Famous Course</p>
                              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Special Rates
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              Augusta National & legendary courses with Pro Tee
                            </p>

                            {sessionType === "famous-course" && (
                              <div className="space-y-2 mt-3 pl-2 border-l-2 border-secondary">
                                <Label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="famous-option"
                                    checked={famousCourseOption === "4-ball"}
                                    onChange={() => setFamousCourseOption("4-ball")}
                                    className="w-4 h-4 text-secondary"
                                  />
                                  <div>
                                    <p className="font-medium text-foreground">4-Ball Special: R100/person/hour</p>
                                    <p className="text-xs text-muted-foreground">
                                      4 players • 3-hour minimum • R400 deposit, remainder in-store
                                    </p>
                                  </div>
                                </Label>
                                <Label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="famous-option"
                                    checked={famousCourseOption === "3-ball"}
                                    onChange={() => setFamousCourseOption("3-ball")}
                                    className="w-4 h-4 text-secondary"
                                  />
                                  <div>
                                    <p className="font-medium text-foreground">3-Ball: R120/person/hour</p>
                                    <p className="text-xs text-muted-foreground">
                                      3 players • 2-hour minimum • R300 deposit, remainder in-store
                                    </p>
                                  </div>
                                </Label>
                              </div>
                            )}
                          </div>
                        </div>
                      </Label>

                      <Label
                        htmlFor="quickplay"
                        className="flex items-start justify-between p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <RadioGroupItem value="quickplay" id="quickplay" className="mt-1" />
                          <div>
                            <p className="font-semibold text-foreground text-lg">Quick Play Sessions</p>
                            <p className="text-sm text-muted-foreground mb-2">
                              Practice range, skills challenges, all courses
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">1-4 players</Badge>
                              <Badge variant="outline">No minimum</Badge>
                              <Badge variant="outline">R250-R600/hr</Badge>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    How many players?
                  </CardTitle>
                  <CardDescription>
                    {sessionType === "famous-course" && famousCourseOption
                      ? `${famousCourseOption === "4-ball" ? "4 players" : "3 players"} required for this option`
                      : "Select 1-4 players for your session"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((count) => {
                      const disabled =
                        (sessionType === "famous-course" && famousCourseOption === "4-ball" && count !== 4) ||
                        (sessionType === "famous-course" && famousCourseOption === "3-ball" && count !== 3)

                      return (
                        <Button
                          key={count}
                          variant={playerCount === count ? "default" : "outline"}
                          className={
                            playerCount === count ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""
                          }
                          onClick={() => !disabled && setPlayerCount(count)}
                          disabled={disabled}
                        >
                          {count}
                        </Button>
                      )
                    })}
                  </div>

                  {/* Price preview */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Estimated Price:</p>
                    <p className="font-serif text-2xl font-bold text-foreground">
                      R{calculatePrice().toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground ml-2">
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Select date
                  </CardTitle>
                  <CardDescription>Choose your preferred date (up to 30 days ahead)</CardDescription>
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
                      return date < today || date > maxDate || date.getDay() === 0
                    }}
                    className="rounded-md border"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Open Monday - Saturday, 9AM - 8PM</p>
                </CardContent>
              </Card>

              {date && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Select time slot
                      </CardTitle>
                      <CardDescription>
                        Available time slots for {date.toLocaleDateString()}
                        {getMinimumHours() > 1 && (
                          <span className="block mt-1 text-secondary font-medium">
                            Minimum {getMinimumHours()} hours required • Must end by 8 PM
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {timeSlots.map((slot) => {
                          const [hour] = slot.time.split(":").map(Number)
                          const wouldEndAfterClosing = hour + getMinimumHours() > 20
                          const isDisabled = !slot.available || wouldEndAfterClosing

                          return (
                            <Button
                              key={slot.time}
                              variant={timeSlot === slot.time ? "default" : "outline"}
                              className={`flex flex-col h-auto py-3 ${
                                timeSlot === slot.time
                                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                  : ""
                              }`}
                              disabled={isDisabled}
                              onClick={() => setTimeSlot(slot.time)}
                            >
                              <span className="font-semibold">{slot.time}</span>
                              {wouldEndAfterClosing && (
                                <span className="text-[10px] text-destructive mt-1">Too late</span>
                              )}
                            </Button>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Session duration</CardTitle>
                      <CardDescription>
                        {getMinimumHours() > 1
                          ? `Minimum ${getMinimumHours()} hours required for this booking`
                          : "How long would you like to play?"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={duration.toString()}
                        onValueChange={(value) => {
                          setDuration(Number(value))
                          setValidationError("")
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((hours) => {
                            const disabled = hours < getMinimumHours()
                            return (
                              <SelectItem key={hours} value={hours.toString()} disabled={disabled}>
                                {hours} hour{hours > 1 ? "s" : ""}
                                {disabled && " (below minimum)"}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>

                      {/* Price calculation */}
                      <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Session price:</span>
                          <span className="font-serif text-xl font-bold text-foreground">
                            R{calculatePrice().toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {playerCount} player{playerCount > 1 ? "s" : ""} × {duration} hour{duration > 1 ? "s" : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  setStep(step - 1)
                  setValidationError("")
                }}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={!canContinue()}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {step === 2 ? "Continue to Checkout" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
