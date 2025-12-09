"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Clock } from "lucide-react"

export function AvailabilityManager() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Sample time slots (would be fetched from API)
  // State for fetched slots
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch availability when date changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDate) return
      setLoading(true)
      try {
        // Format date as YYYY-MM-DD for API
        const dateStr = selectedDate.toLocaleDateString('en-CA') // YYYY-MM-DD
        const res = await fetch(`/api/availability?date=${dateStr}`)
        if (res.ok) {
          const data = await res.json()
          setTimeSlots(data)
        }
      } catch (error) {
        console.error("Failed to load availability", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [selectedDate])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose a date to manage availability</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
          <div className="mt-4 space-y-2">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
            <Button variant="outline" className="w-full bg-transparent">
              Bulk Edit Availability
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Time Slots for {selectedDate?.toLocaleDateString()}</CardTitle>
          <CardDescription>Toggle availability and view bookings for each time slot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {timeSlots.map((slot) => (
              <div
                key={slot.time}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{slot.time}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          slot.bookings >= slot.capacity
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }
                      >
                        {slot.bookings}/{slot.capacity} booked
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={slot.available} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
