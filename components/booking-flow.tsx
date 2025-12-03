"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { 
  ArrowLeft, ArrowRight, Users, Calendar as CalendarIcon, 
  Clock, Trophy, Sparkles, Loader2, Target, CheckCircle2 
} from "lucide-react"
import { format, startOfToday, isToday, getDay } from "date-fns"

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

export default function BookingFlow() {
  const topRef = useRef<HTMLDivElement>(null)
  const timeSlotsRef = useRef<HTMLDivElement>(null)

  // --- STATE ---
  const [step, setStep] = useState(1)
  const [sessionType, setSessionType] = useState<"4ball" | "3ball" | "quick" | "">("")
  const [players, setPlayers] = useState(1)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [timeSlot, setTimeSlot] = useState("")
  const [duration, setDuration] = useState(1)
  
  // Add-ons
  const [golfClubRental, setGolfClubRental] = useState(false)
  const [coachingSession, setCoachingSession] = useState(false)

  // Async Data
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [serverPrice, setServerPrice] = useState<number>(0)
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)

  // --- SCROLL BEHAVIOR ---
  useEffect(() => {
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step])

  useEffect(() => {
    if (date && timeSlotsRef.current) {
      setTimeout(() => timeSlotsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }, [date])

  // --- HANDLERS ---
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

  // --- PRICING ENGINE ---
  useEffect(() => {
    const fetchPrice = async () => {
      if (!sessionType) return
      setIsCalculatingPrice(true)
      
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players, duration, sessionType })
        })
        const data = await res.json()
        
        let total = Number(data.price) || 0
        if (golfClubRental) total += 100
        if (coachingSession) total += 250
        
        setServerPrice(total)
      } catch (err) {
        console.error("Pricing Error", err)
      } finally {
        setIsCalculatingPrice(false)
      }
    }
    const timeout = setTimeout(fetchPrice, 300)
    return () => clearTimeout(timeout)
  }, [sessionType, players, duration, golfClubRental, coachingSession])


  // --- AVAILABILITY ---
  const generateTimeSlots = useCallback((selectedDate: Date): string[] => {
    const dayOfWeek = getDay(selectedDate)
    const hours = OPERATING_HOURS[dayOfWeek]
    const slots: string[] = []
    for (let hour = hours.open; hour < hours.close; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`)
      if (hour + 0.5 < hours.close) slots.push(`${hour.toString().padStart(2, "0")}:30`)
    }
    return slots
  }, [])

  const availableSlots = date ? generateTimeSlots(date) : []

  useEffect(() => {
    if (!date) return
    const fetchAvailability = async () => {
      setIsCheckingAvailability(true)
      try {
        const dateStr = format(date, "yyyy-MM-dd")
        const response = await fetch(`/api/bookings/availability?date=${dateStr}`)
        const data = await response.json()
        setBookedSlots(data.bookedSlots || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsCheckingAvailability(false)
      }
    }
    fetchAvailability()
  }, [date])

  const isSlotBooked = (slot: string) => {
    if (bookedSlots.includes(slot)) return true
    if (date && isToday(date)) {
      const now = new Date()
      const [hours, minutes] = slot.split(':').map(Number)
      const slotDate = new Date(date)
      slotDate.setHours(hours, minutes, 0, 0)
      if (slotDate <= now) return true
    }
    return false
  }

  // --- NAVIGATION ---
  const canProceed = () => {
    switch (step) {
      case 1: return sessionType !== ""
      case 2: return date !== undefined && timeSlot !== ""
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 2 && canProceed()) {
      const params = new URLSearchParams({
        sessionType,
        players: players.toString(),
        date: date ? format(date, "yyyy-MM-dd") : "",
        timeSlot,
        duration: duration.toString(),
        golfClubRental: golfClubRental.toString(),
        coachingSession: coachingSession.toString(),
        totalPrice: serverPrice.toString()
      })
      window.location.href = `/booking/confirm?${params.toString()}`
    } else if (step < 2) {
      setStep(step + 1)
    }
  }

  const durationOptions = [1, 1.5, 2, 2.5, 3, 3.5, 4]

  return (
    <div className="min-h-screen bg-muted/10 pb-32" ref={topRef}>
      {/* Progress Bar */}
      <div className="w-full h-2 bg-muted sticky top-0 z-50">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out" 
          style={{ width: `${(step / 2) * 100}%` }} 
        />
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-4 border border-secondary/20">
            <Sparkles className="w-4 h-4" />
            Premium Experience
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            {step === 1 ? "Choose Your Game" : "Select Date & Time"}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {step === 1 ? "Experience world-class courses or practice your swing" : "Real-time availability"}
          </p>
        </div>

        {/* STEP 1: SESSION TYPE */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 4-BALL SPECIAL (HERO CARD) */}
            <div 
              onClick={() => handleSessionSelect("4ball")}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl",
                sessionType === "4ball" 
                  ? "border-secondary bg-secondary/5 ring-1 ring-secondary" 
                  : "border-border bg-card hover:border-secondary/50"
              )}
            >
              {sessionType === "4ball" && (
                <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  SELECTED
                </div>
              )}
              <div className="p-6 md:p-8 flex items-start gap-6">
                <div className={cn(
                  "p-4 rounded-2xl flex items-center justify-center transition-colors",
                  sessionType === "4ball" ? "bg-secondary text-white" : "bg-secondary/10 text-secondary"
                )}>
                  <Trophy className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold">4-Ball Special</h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                      Best Value
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Play famous 18-hole courses like Augusta National. Perfect for groups.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm font-medium">
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md">
                      <Users className="w-4 h-4 text-muted-foreground" /> 4 Players
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md">
                      <Clock className="w-4 h-4 text-muted-foreground" /> 3 Hours
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md">
                      <div className="font-bold text-primary">R150</div> <span className="text-xs text-muted-foreground">pp/hr</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID FOR OTHER OPTIONS */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* 3-BALL */}
              <div 
                onClick={() => handleSessionSelect("3ball")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg",
                  sessionType === "3ball" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                   <div className={cn(
                    "p-3 rounded-xl",
                    sessionType === "3ball" ? "bg-primary text-white" : "bg-primary/10 text-primary"
                   )}>
                     <Users className="w-6 h-6" />
                   </div>
                   {sessionType === "3ball" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
                <h3 className="text-lg font-bold mb-2">3-Ball Special</h3>
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                   <p>• 18 Holes / Famous Courses</p>
                   <p>• R160 per person / hour</p>
                </div>
              </div>

              {/* QUICK PLAY */}
              <div 
                onClick={() => handleSessionSelect("quick")}
                className={cn(
                  "cursor-pointer rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-lg",
                  sessionType === "quick" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                   <div className={cn(
                    "p-3 rounded-xl",
                    sessionType === "quick" ? "bg-primary text-white" : "bg-primary/10 text-primary"
                   )}>
                     <Target className="w-6 h-6" />
                   </div>
                   {sessionType === "quick" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </div>
                <h3 className="text-lg font-bold mb-2">Quick Play</h3>
                 <div className="space-y-1 text-sm text-muted-foreground mb-4">
                   <p>• Driving Range or Course</p>
                   <p>• Flexible time & players</p>
                </div>
              </div>
            </div>

            {/* EXPANDABLE QUICK PLAY CONFIG */}
            {sessionType === "quick" && (
              <Card className="animate-in slide-in-from-top-2 border-dashed border-2 bg-muted/30">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">Number of Players</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setPlayers(n)}
                            className={cn(
                              "py-2.5 rounded-lg text-sm font-bold transition-all",
                              players === n 
                                ? "bg-primary text-white shadow-lg shadow-primary/30" 
                                : "bg-white border hover:border-primary/50"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-3 block">Duration (Hours)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {durationOptions.slice(0, 4).map(d => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={cn(
                              "py-2.5 rounded-lg text-sm font-bold transition-all",
                              duration === d
                                ? "bg-primary text-white shadow-lg shadow-primary/30" 
                                : "bg-white border hover:border-primary/50"
                            )}
                          >
                            {d}h
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2: DATE & TIME */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="grid md:grid-cols-2 gap-6">
               <Card className="border-0 shadow-lg overflow-hidden h-fit">
                 <div className="bg-primary px-6 py-4 flex items-center justify-between">
                   <h3 className="text-white font-bold flex items-center gap-2">
                     <CalendarIcon className="w-5 h-5" /> Select Date
                   </h3>
                 </div>
                 <div className="p-4 flex justify-center bg-white">
                   <Calendar
                     mode="single"
                     selected={date}
                     onSelect={setDate}
                     disabled={(d) => d < startOfToday()}
                     className="rounded-md"
                   />
                 </div>
               </Card>

               <div className="space-y-4">
                 <Card className="border-0 shadow-lg h-full">
                    <div className="bg-muted px-6 py-4 border-b">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> 
                        {date ? format(date, "EEEE, MMM do") : "Choose a Date"}
                      </h3>
                    </div>
                    <div className="p-4">
                      {!date ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm italic">
                          Please select a date from the calendar
                        </div>
                      ) : (
                        <div ref={timeSlotsRef} className="animate-in fade-in">
                           {isCheckingAvailability ? (
                             <div className="h-40 flex items-center justify-center">
                               <Loader2 className="w-8 h-8 text-primary animate-spin" />
                             </div>
                           ) : (
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                               {availableSlots.map(slot => {
                                 const booked = isSlotBooked(slot)
                                 return (
                                   <button
                                     key={slot}
                                     disabled={booked}
                                     onClick={() => setTimeSlot(slot)}
                                     className={cn(
                                       "py-2.5 rounded-lg text-sm font-medium transition-all border",
                                       booked 
                                          ? "bg-muted/50 text-muted-foreground line-through decoration-destructive/50 opacity-60 cursor-not-allowed border-transparent" 
                                          : timeSlot === slot 
                                            ? "bg-primary text-white border-primary shadow-md ring-2 ring-primary/20" 
                                            : "bg-white hover:border-primary hover:text-primary"
                                     )}
                                   >
                                     {slot}
                                   </button>
                                 )
                               })}
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                 </Card>
               </div>
             </div>

             {/* Extras */}
             <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Enhance Your Session</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setGolfClubRental(!golfClubRental)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/30",
                      golfClubRental ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                       <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", golfClubRental ? "bg-primary border-primary" : "border-muted-foreground")}>
                          {golfClubRental && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                       </div>
                       <span className="font-medium">Rent Full Club Set</span>
                    </div>
                    <span className="font-bold text-primary">+R100</span>
                  </div>

                  <div 
                    onClick={() => setCoachingSession(!coachingSession)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/30",
                      coachingSession ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                       <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", coachingSession ? "bg-primary border-primary" : "border-muted-foreground")}>
                          {coachingSession && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                       </div>
                       <span className="font-medium">Pro Coaching (30m)</span>
                    </div>
                    <span className="font-bold text-primary">+R250</span>
                  </div>
                </div>
             </div>
          </div>
        )}

      </div>

      {/* STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
             <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Estimate</span>
             <div className="flex items-end gap-1">
               {isCalculatingPrice ? (
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
               ) : (
                 <span className="text-3xl font-serif font-bold text-primary">R{serverPrice}</span>
               )}
             </div>
          </div>
          
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" size="lg" onClick={() => setStep(step - 1)} className="px-6 rounded-xl border-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Button 
              size="lg"
              onClick={handleNext} 
              disabled={!canProceed() || isCalculatingPrice}
              className="px-10 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              {step === 2 ? "Checkout" : "Next"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
