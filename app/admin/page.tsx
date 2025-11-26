"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

// Initialize Supabase Client for the Browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminDashboard() {
  // --- STATE ---
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Dashboard Data
  const [bookings, setBookings] = useState<any[]>([])
  
  // Walk-in Form State
  const [walkInName, setWalkInName] = useState("")
  const [walkInTime, setWalkInTime] = useState("09:00")
  const [walkInDate, setWalkInDate] = useState(new Date().toISOString().split('T')[0])
  const [walkInDuration, setWalkInDuration] = useState(1)

  // --- ACTIONS ---

  // 1. PIN LOGIN
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Hardcoded PIN for MVP (You can move this to env var later)
    if (pin === "1234") {
      setIsAuthenticated(true)
      fetchBookings()
    } else {
      setError("Incorrect PIN")
    }
  }

  // 2. FETCH BOOKINGS
  const fetchBookings = async () => {
    setLoading(true)
    // Fetch bookings for the selected date
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", walkInDate)
      .order("start_time", { ascending: true })
    
    if (data) setBookings(data)
    setLoading(false)
  }

  // 3. CREATE WALK-IN (Bypasses Yoco)
  const handleWalkIn = async () => {
    if (!walkInName || !walkInTime) return alert("Please fill in details")
    
    setLoading(true)
    try {
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_date: walkInDate,
          start_time: walkInTime,
          duration: walkInDuration,
          players: 4, // Default to 4 for simplicity
          session_type: "Walk-in",
          guest_name: walkInName,
          guest_email: "walkin@store.com", // Placeholder
          base_price: 350 * walkInDuration, // Example Price
          total_price: 350 * walkInDuration,
          coupon_code: "MULLIGAN_ADMIN_100" // <--- CRITICAL: Triggers "paid_instore" logic
        }),
      })

      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error || "Failed")

      alert("Walk-in Confirmed! Bay Assigned: " + result.booking_id)
      setWalkInName("")
      fetchBookings() // Refresh list

    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh when date changes
  useEffect(() => {
    if (isAuthenticated) fetchBookings()
  }, [walkInDate, isAuthenticated])

  // --- RENDER ---

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded bg-white p-8 shadow">
          <h2 className="mb-6 text-center text-2xl font-bold text-green-900">Admin Access</h2>
          {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
          <input
            type="password"
            placeholder="Enter PIN"
            className="mb-4 w-full rounded border p-2"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          <button type="submit" className="w-full rounded bg-green-900 py-2 text-white hover:bg-green-800">
            Unlock Dashboard
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Store Dashboard</h1>
          <button onClick={() => setIsAuthenticated(false)} className="text-sm text-red-600 underline">Logout</button>
        </div>

        {/* --- CONTROLS --- */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          
          {/* 1. Add Walk-in */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">⛳ Add Walk-in</h3>
            <div className="space-y-3">
              <input 
                className="w-full rounded border p-2" 
                placeholder="Customer Name" 
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="date" 
                  className="w-1/2 rounded border p-2" 
                  value={walkInDate}
                  onChange={e => setWalkInDate(e.target.value)}
                />
                <input 
                  type="time" 
                  className="w-1/2 rounded border p-2" 
                  value={walkInTime}
                  onChange={e => setWalkInTime(e.target.value)}
                />
              </div>
               <select 
                  className="w-full rounded border p-2"
                  value={walkInDuration}
                  onChange={(e) => setWalkInDuration(Number(e.target.value))}
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                </select>
              <button 
                onClick={handleWalkIn}
                disabled={loading}
                className="w-full rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Confirm & Pay In-Store"}
              </button>
            </div>
          </div>

          {/* 2. Stats / Filter */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">📅 Daily View</h3>
             <input 
                  type="date" 
                  className="mb-4 w-full rounded border p-2 text-lg" 
                  value={walkInDate}
                  onChange={e => setWalkInDate(e.target.value)}
              />
            <div className="text-center">
              <p className="text-gray-500">Total Bookings Today</p>
              <p className="text-4xl font-bold text-green-700">{bookings.length}</p>
            </div>
          </div>
        </div>

        {/* --- BOOKINGS TABLE --- */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bay</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {bookings.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-500">No bookings for this date.</td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {b.start_time} - {b.end_time}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      Bay {b.simulator_id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {b.guest_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                     <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {b.payment_status === 'paid_instore' ? 'Store Cash/Card' : b.payment_status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
