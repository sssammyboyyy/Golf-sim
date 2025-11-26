"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

export default function AdminDashboard() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  
  // --- DASHBOARD STATE ---
  const [date, setDate] = useState(new Date())
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    time: "14:00",
    duration: 1,
    type: "walk-in"
  })

  const supabase = createClient()

  // 1. Fetch Bookings (Only runs if authenticated)
  const fetchBookings = async () => {
    if (!isAuthenticated) return
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings()
    }
  }, [date, isAuthenticated])

  // 2. Handle Walk-in
  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify({
        booking_date: format(date, "yyyy-MM-dd"),
        start_time: formData.time,
        duration_hours: formData.duration,
        player_count: 1,
        session_type: "quick",
        guest_name: formData.name || "Walk-in Guest",
        guest_email: "walkin@themulligan.org",
        guest_phone: "0000000000",
        base_price: 0, 
        total_price: 0,
        coupon_code: "MULLIGAN_ADMIN_100" 
      })
    })

    if (res.ok) {
      alert("Walk-in Booked!")
      fetchBookings()
    } else {
      alert("Error booking slot")
    }
  }

  // 3. Simple PIN Check
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // HARDCODED PIN FOR NOW - CHANGE THIS TO WHATEVER YOU WANT
    if (pinInput === "2025") { 
      setIsAuthenticated(true)
    } else {
      alert("Wrong PIN")
    }
  }

  // --- RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Staff Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input 
                type="password" 
                placeholder="Enter Admin PIN" 
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
              <Button type="submit" className="w-full">Unlock Dashboard</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- RENDER DASHBOARD (Only visible if PIN matches) ---
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">⛳ Clerk Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT: Booking List */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-semibold">Bookings for {format(date, "yyyy-MM-dd")}</h2>
             <input 
               type="date" 
               onChange={(e) => setDate(new Date(e.target.value))}
               className="border p-2 rounded"
               value={format(date, "yyyy-MM-dd")}
             />
          </div>

          {loading ? <p>Loading...</p> : bookings.length === 0 ? <p className="text-gray-500">No bookings today.</p> : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <Card key={b.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-lg mr-4">{b.start_time.slice(0,5)}</span>
                      <span className="font-medium">{b.guest_name}</span>
                      <span className="text-sm text-gray-500 ml-2">({b.session_type})</span>
                    </div>
                    <div className="text-right">
                       <div className={`text-xs px-2 py-1 rounded ${b.payment_status === 'completed' || b.payment_status === 'paid_instore' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {b.payment_status === 'paid_instore' ? 'PAID IN STORE' : b.payment_status}
                      </div>
                      {b.payment_status === 'pending' && <p className="text-xs text-red-600 font-bold mt-1">COLLECT PAYMENT</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Quick Walk-in Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Fast Walk-in</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWalkIn} className="space-y-4">
                <div>
                  <label className="text-sm">Guest Name (Optional)</label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Junior Student"
                  />
                </div>
                <div>
                  <label className="text-sm">Time</label>
                  <select 
                    className="w-full border p-2 rounded"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  >
                    {["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm">Duration (Hours)</label>
                  <Input 
                    type="number" 
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Book Slot (Bypass Yoco)
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
