"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, PlusCircle, RefreshCw, Calendar as CalendarIcon } from "lucide-react"

export default function AdminDashboard() {
  // --- AUTH STATE (Local PIN System) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  
  // --- DASHBOARD STATE ---
  const [date, setDate] = useState(new Date())
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // --- WALK-IN FORM STATE ---
  const [formData, setFormData] = useState({
    name: "",
    time: "14:00",
    duration: 1,
    type: "walk-in"
  })

  const supabase = createClient()

  // 1. Fetch Bookings
  const fetchBookings = async () => {
    setLoading(true)
    const dateStr = format(date, "yyyy-MM-dd")
    
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", dateStr)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true })

    setBookings(data || [])
    setLoading(false)
  }

  // Fetch only when authenticated and date changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings()
    }
  }, [date, isAuthenticated])

  // 2. Handle Login (The Fix for your error)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // SIMPLE PIN CHECK - Bypasses Supabase Auth completely
    if (pinInput === "2025") {
      setIsAuthenticated(true)
    } else {
      alert("Incorrect PIN")
    }
  }

  // 3. Handle Walk-in Booking
  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          booking_date: format(date, "yyyy-MM-dd"),
          start_time: formData.time,
          duration_hours: formData.duration,
          player_count: 1,
          session_type: "quick",
          // Dummy data for walk-ins
          guest_name: formData.name || "Walk-in Guest",
          guest_email: "walkin@themulligan.org",
          guest_phone: "0000000000",
          base_price: 0, 
          total_price: 0,
          // THIS KEY BYPASSES PAYMENT:
          coupon_code: "MULLIGAN_ADMIN_100" 
        })
      })

      if (res.ok) {
        alert("Walk-in successfully booked!")
        fetchBookings() // Refresh the list
        setFormData({...formData, name: ""}) // Reset name
      } else {
        const err = await res.json()
        alert("Error: " + (err.error || "Failed to book"))
      }
    } catch (error) {
      alert("Network error")
    }
  }

  // --- VIEW 1: LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Staff Access</CardTitle>
            <p className="text-sm text-gray-500">Enter PIN to access the dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input 
                type="password" 
                placeholder="Enter PIN (2025)" 
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <Button type="submit" className="w-full h-12 text-lg">
                Unlock Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- VIEW 2: DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">⛳ Operations Dashboard</h1>
            <p className="text-gray-500">Manage bookings and walk-ins</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
             <CalendarIcon className="w-5 h-5 text-gray-500" />
             <input 
               type="date" 
               value={format(date, "yyyy-MM-dd")}
               onChange={(e) => setDate(new Date(e.target.value))}
               className="outline-none font-medium bg-transparent"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Booking List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Schedule</h2>
              <Button variant="outline" size="sm" onClick={fetchBookings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">Loading schedule...</div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
                No bookings found for this date.
              </div>
            ) : (
              <div className="grid gap-3">
                {bookings.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl p-4 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary font-bold text-xl px-4 py-3 rounded-lg min-w-[5rem] text-center">
                        {b.start_time.slice(0,5)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{b.guest_name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{b.session_type} • {b.duration_hours} Hour(s)</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {/* Payment Badge */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        b.payment_status === 'completed' || b.payment_status === 'paid_instore'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {b.payment_status === 'paid_instore' ? 'PAID IN STORE' : b.payment_status.toUpperCase()}
                      </span>
                      
                      {b.payment_status === 'pending' && (
                        <p className="text-xs text-red-600 font-bold mt-1">
                          COLLECT: R{b.total_price}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Walk-in Form */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Walk-in</h2>
            <Card className="border-0 shadow-lg ring-1 ring-gray-200">
              <CardHeader className="bg-gray-50/50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-primary" />
                  New Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleWalkIn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Guest Name (Optional)</label>
                    <Input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Junior Student"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                      >
                        {["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Input 
                        type="number" 
                        value={formData.duration}
                        onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                        min={1}
                        max={4}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-semibold h-11">
                    Confirm & Book Slot
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    Bypasses Yoco Payment. Marks as Paid In-Store.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
