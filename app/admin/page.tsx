"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { 
  Trash2, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar, 
  Search, 
  RefreshCw,
  LogOut,
  CreditCard,
  Target,
  Trophy,
  Loader2,
  AlertCircle,
  Filter,
  List
} from "lucide-react"
import { format } from "date-fns"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminDashboard() {
  // --- STATE ---
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "walkin">("dashboard")
  
  // Data
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  
  // Filters - Default to Today in SAST
  const [currentDate, setCurrentDate] = useState(() => {
    // Force SAST (UTC+2) Date String YYYY-MM-DD
    const now = new Date();
    const sast = new Date(now.getTime() + (2 * 60 * 60 * 1000)); 
    return sast.toISOString().split('T')[0];
  })
  const [viewMode, setViewMode] = useState<"day" | "all">("day") // New Toggle
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Walk-in
  const [walkInName, setWalkInName] = useState("")
  const [walkInTime, setWalkInTime] = useState("12:00")
  const [walkInDuration, setWalkInDuration] = useState(1)
  const [walkInPlayers, setWalkInPlayers] = useState(1)

  // --- AUTH ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === "8821") {
      setIsAuthenticated(true)
      fetchBookings()
    } else {
      alert("Access Denied")
    }
  }

  // --- FETCH ---
  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("bookings")
        .select("*")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })

      // Only filter by date if in "Day View"
      if (viewMode === "day") {
        query = query.eq("booking_date", currentDate)
      } else {
        // In "All View", show everything from today onwards
        query = query.gte("booking_date", new Date().toISOString().split('T')[0])
      }

      const { data, error } = await query
      if (error) throw error
      setBookings(data || [])

    } catch (err: any) {
      console.error("Fetch Error:", err)
      alert("Error fetching data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchBookings()
  }, [currentDate, viewMode]) // Refetch on date or mode change

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ PERMANENT DELETE\n\nAre you sure?")) return
    setIsActionLoading(true)
    
    // Call Secure API
    try {
        const res = await fetch("/api/bookings/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, pin })
        })
        if (!res.ok) throw new Error("Delete failed")
        setBookings(prev => prev.filter(b => b.id !== id))
    } catch(e) {
        alert("Failed to delete")
    } finally {
        setIsActionLoading(false)
    }
  }

  const handleMarkPaid = async (id: string) => {
    setIsActionLoading(true)
    await supabase.from("bookings").update({ status: "confirmed", payment_status: "paid_instore" }).eq("id", id)
    await fetchBookings()
    setIsActionLoading(false)
  }

  // --- RENDER ---
  const filteredBookings = bookings.filter(b => {
    const searchMatch = (b.guest_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    const statusMatch = statusFilter === 'all' ? true : b.status === statusFilter
    return searchMatch && statusMatch
  })

  // Login Screen
  if (!isAuthenticated) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">Venue OS</h1>
            <input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-black border border-zinc-700 p-3 rounded-lg text-center text-white text-xl tracking-widest" autoFocus />
            <button className="w-full bg-emerald-600 text-white p-3 rounded-lg font-bold">Login</button>
        </form>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER CONTROLS */}
        <div className="flex flex-col xl:flex-row justify-between gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-emerald-500" /> Admin Dashboard
            </h1>
            
            <div className="flex flex-wrap gap-3">
                {/* VIEW TOGGLE */}
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button 
                        onClick={() => setViewMode("day")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'day' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                    >
                        Daily View
                    </button>
                    <button 
                        onClick={() => setViewMode("all")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium ${viewMode === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                    >
                        All Upcoming
                    </button>
                </div>

                {/* DATE PICKER (Only shows if Day View) */}
                {viewMode === "day" && (
                    <input 
                        type="date" 
                        value={currentDate} 
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg"
                    />
                )}

                <button onClick={() => fetchBookings()} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-emerald-400">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>

        {/* BOOKINGS TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Bay</th>
                            <th className="px-6 py-4">Guest</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredBookings.map(b => (
                            <tr key={b.id} className="hover:bg-zinc-800/50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">{b.booking_date}</div>
                                    <div className="text-zinc-500 text-sm font-mono">{b.start_time?.slice(0,5)} ({b.duration_hours}h)</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs border border-zinc-700">Sim {b.simulator_id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-white font-medium">{b.guest_name}</div>
                                    <div className="text-zinc-500 text-xs">{b.guest_email}</div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-emerald-400">
                                    R{b.total_price}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                        b.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 
                                        b.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {b.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {b.payment_status !== 'paid_instore' && (
                                        <button onClick={() => handleMarkPaid(b.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500 hover:text-white transition-colors" title="Mark Paid">
                                            <DollarSign className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(b.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredBookings.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-12 text-zinc-500">No bookings found. Try switching to "All Upcoming".</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  )
}
