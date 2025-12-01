"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  DollarSign, 
  Users, 
  Calendar, 
  PlusCircle, 
  Search, 
  RefreshCw,
  LogOut,
  MoreHorizontal,
  CreditCard,
  Target,
  Trophy
} from "lucide-react"

// --- CONFIGURATION FOR THE MULLIGAN ---
// If Supabase fails (offline/demo mode), we load this data to make the Sales Video look good.
const MOCK_DATA = [
  { id: "m1", start_time: "09:00:00", duration_hours: 2, simulator_id: 1, guest_name: "Johann Rupert", session_type: "4ball", status: "confirmed", payment_status: "paid_instore", total_price: 1200, player_count: 4 },
  { id: "m2", start_time: "11:30:00", duration_hours: 1, simulator_id: 2, guest_name: "Gary Player", session_type: "quick", status: "confirmed", payment_status: "paid_instore", total_price: 250, player_count: 1 },
  { id: "m3", start_time: "14:00:00", duration_hours: 3, simulator_id: 1, guest_name: "Ernie Els", session_type: "4ball", status: "pending", payment_status: "pending", total_price: 1800, player_count: 4 },
  { id: "m4", start_time: "14:00:00", duration_hours: 3, simulator_id: 3, guest_name: "Retief Goosen", session_type: "3ball", status: "confirmed", payment_status: "paid", total_price: 1440, player_count: 3 },
  // A "Duplicate/Moved" booking to demonstrate the Delete feature for the boss
  { id: "m5", start_time: "14:00:00", duration_hours: 3, simulator_id: 1, guest_name: "Ernie Els (Old Slot)", session_type: "4ball", status: "cancelled", payment_status: "failed", total_price: 1800, player_count: 4 },
]

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function AdminDashboard() {
  // --- STATE ---
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "walkin">("dashboard")
  
  // Data State
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Walk-in Form State
  const [walkInName, setWalkInName] = useState("")
  const [walkInTime, setWalkInTime] = useState("12:00")
  const [walkInDuration, setWalkInDuration] = useState(1)
  const [walkInPlayers, setWalkInPlayers] = useState(1)

  // --- ACTIONS ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === "1234") {
      setIsAuthenticated(true)
      fetchBookings()
    } else {
      alert("Access Denied")
    }
  }

  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", currentDate)
        .order("start_time", { ascending: true })
      
      if (error) throw error
      
      // If DB is empty or fails, use Mock Data for the Sales Video
      if (!data || data.length === 0) {
        console.log("No live data found, loading The Mulligan Demo Mode...")
        setIsDemoMode(true)
        setBookings(MOCK_DATA)
      } else {
        setIsDemoMode(false)
        setBookings(data)
      }

    } catch (err) {
      console.error("Supabase Error, using Mock Data:", err)
      setIsDemoMode(true)
      setBookings(MOCK_DATA)
    } finally {
      setIsLoading(false)
    }
  }

  // --- ADMIN SUPERPOWERS ---

  // 1. DELETE BOOKING (For moved slots)
  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ Are you sure? This will permanently delete the booking record.")) return

    if (isDemoMode) {
      setBookings(prev => prev.filter(b => b.id !== id))
      return
    }

    const { error } = await supabase.from("bookings").delete().eq("id", id)
    if (error) alert("Failed to delete")
    else fetchBookings()
  }

  // 2. TOGGLE STATUS (Pending -> Paid)
  const handleStatusChange = async (id: string, newStatus: string, newPaymentStatus: string) => {
    if (isDemoMode) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus, payment_status: newPaymentStatus } : b))
      return
    }

    await supabase.from("bookings").update({ status: newStatus, payment_status: newPaymentStatus }).eq("id", id)
    fetchBookings()
  }

  // 3. CREATE WALK-IN
  const handleWalkInSubmit = async () => {
    setIsLoading(true)
    // In a real scenario, this hits the API. For the demo, we just add to local state.
    const newBooking = {
      id: `walkin-${Date.now()}`,
      start_time: `${walkInTime}:00`,
      duration_hours: walkInDuration,
      simulator_id: 1, // Auto-assign for demo
      guest_name: walkInName,
      session_type: "quick",
      status: "confirmed",
      payment_status: "paid_instore",
      total_price: 250 * walkInPlayers, // R250 base rate
      player_count: walkInPlayers
    }
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800))
    
    setBookings([...bookings, newBooking].sort((a,b) => a.start_time.localeCompare(b.start_time)))
    setWalkInName("")
    setActiveTab("dashboard")
    setIsLoading(false)
    alert("Walk-in Confirmed & Receipt Generated")
  }

  // --- STATS ENGINE ---
  const stats = useMemo(() => {
    const totalRevenue = bookings
      .filter(b => b.status === "confirmed" || b.status === "completed")
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    
    const pendingRevenue = bookings
      .filter(b => b.status === "pending")
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)

    const activeBookings = bookings.filter(b => b.status !== "cancelled").length
    const occupancy = Math.min(Math.round((activeBookings / 12) * 100), 100) // Assume 12 slots/day

    return { totalRevenue, pendingRevenue, activeBookings, occupancy }
  }, [bookings])


  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
               <div className="w-16 h-16 bg-gradient-to-br from-emerald-900 to-zinc-900 rounded-2xl flex items-center justify-center border border-emerald-800 shadow-2xl">
                  <Trophy className="w-8 h-8 text-emerald-500" />
               </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">The Mulligan</h1>
            <p className="text-zinc-500">Admin Control Center</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl">
            <div>
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider ml-1">Access PIN</label>
              <input
                type="password"
                placeholder="••••"
                className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center text-2xl tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-700 text-white"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- DASHBOARD UI ---
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-lg flex items-center justify-center font-bold text-white shadow-lg border border-emerald-500/20">
               <Trophy className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">The Mulligan <span className="text-zinc-600 font-normal">| Admin</span></span>
            {isDemoMode && <span className="ml-2 text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">Demo Mode</span>}
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow ring-1 ring-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Live View
                </button>
                <button 
                  onClick={() => setActiveTab("walkin")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'walkin' ? 'bg-zinc-800 text-white shadow ring-1 ring-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  New Walk-in
                </button>
             </div>
             <button onClick={() => setIsAuthenticated(false)} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-full transition-colors text-zinc-500">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* TOP CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 w-fit">
              <button onClick={() => fetchBookings()} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white">
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="h-6 w-px bg-zinc-800" />
              <input 
                type="date" 
                value={currentDate} 
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent border-none text-zinc-200 focus:ring-0 text-sm font-medium cursor-pointer"
              />
           </div>

           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
             <input 
                type="text" 
                placeholder="Search guests..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm w-full md:w-64 focus:ring-1 focus:ring-emerald-500 outline-none text-white placeholder:text-zinc-600"
             />
           </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <KPICard 
             icon={<DollarSign className="w-5 h-5 text-emerald-400" />} 
             label="Banked Revenue" 
             value={`R${stats.totalRevenue.toLocaleString()}`} 
             subValue={isDemoMode ? "+22% vs last week" : "Confirmed & Paid"}
             trend="up"
           />
           <KPICard 
             icon={<Target className="w-5 h-5 text-amber-400" />} 
             label="Projected (Pending)" 
             value={`R${stats.pendingRevenue.toLocaleString()}`} 
             subValue="Waiting for payment"
             trend="neutral"
           />
           <KPICard 
             icon={<Calendar className="w-5 h-5 text-blue-400" />} 
             label="Active Bookings" 
             value={stats.activeBookings.toString()} 
             subValue={`${bookings.length} Total Slots`}
             trend="up"
           />
           <KPICard 
             icon={<Users className="w-5 h-5 text-purple-400" />} 
             label="Bay Occupancy" 
             value={`${stats.occupancy}%`} 
             subValue="Peak efficiency"
             trend="up"
           />
        </div>

        {activeTab === "walkin" ? (
          // --- WALK IN TERMINAL ---
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-800" />
                
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-zinc-800">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <CreditCard className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Walk-in Terminal</h2>
                    <p className="text-zinc-500 text-sm">Create instant booking & process payment</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <div>
                     <label className="text-xs font-semibold text-zinc-500 uppercase ml-1">Guest Name</label>
                     <input 
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Michael Jordan"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase ml-1">Time</label>
                        <input 
                          type="time" 
                          value={walkInTime}
                          onChange={(e) => setWalkInTime(e.target.value)}
                          className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-zinc-500 uppercase ml-1">Players</label>
                        <select 
                          value={walkInPlayers}
                          onChange={(e) => setWalkInPlayers(Number(e.target.value))}
                          className="w-full mt-2 bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Players</option>)}
                        </select>
                      </div>
                   </div>

                   <div>
                      <label className="text-xs font-semibold text-zinc-500 uppercase ml-1">Duration</label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {[1, 2, 3, 4].map(h => (
                           <button
                             key={h}
                             onClick={() => setWalkInDuration(h)}
                             className={`py-3 rounded-lg border text-sm font-semibold transition-all ${
                               walkInDuration === h 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                             }`}
                           >
                             {h} Hour{h > 1 ? 's' : ''}
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="pt-6 border-t border-zinc-800">
                     <div className="flex justify-between items-end mb-6">
                        <span className="text-zinc-400">Total Due</span>
                        <span className="text-3xl font-bold text-white">R{(250 * walkInPlayers * walkInDuration).toFixed(2)}</span>
                     </div>
                     <button 
                       onClick={handleWalkInSubmit}
                       disabled={isLoading}
                       className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                     >
                       {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                       Confirm & Print Receipt
                     </button>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          // --- LIVE TABLE ---
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-zinc-950/50 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                     <th className="px-6 py-4 font-semibold">Time</th>
                     <th className="px-6 py-4 font-semibold">Bay</th>
                     <th className="px-6 py-4 font-semibold">Guest</th>
                     <th className="px-6 py-4 font-semibold">Type</th>
                     <th className="px-6 py-4 font-semibold text-right">Value</th>
                     <th className="px-6 py-4 font-semibold text-center">Status</th>
                     <th className="px-6 py-4 font-semibold text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                   {bookings
                     .filter(b => b.guest_name.toLowerCase().includes(searchTerm.toLowerCase()))
                     .map((b) => (
                     <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors group">
                       <td className="px-6 py-4 font-mono text-zinc-300">
                         {b.start_time.slice(0,5)}
                         <span className="text-zinc-600 text-xs ml-1">({b.duration_hours}h)</span>
                       </td>
                       <td className="px-6 py-4">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
                           Sim {b.simulator_id}
                         </span>
                       </td>
                       <td className="px-6 py-4 font-medium text-white">
                         {b.guest_name}
                         <div className="text-xs text-zinc-500 font-normal">{b.player_count} Players</div>
                       </td>
                       <td className="px-6 py-4 text-sm text-zinc-400 capitalize">
                         {b.session_type === 'quick' ? 'Quick Play' : b.session_type}
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-zinc-300">
                         R{b.total_price}
                       </td>
                       <td className="px-6 py-4 text-center">
                          <StatusBadge status={b.status} payment={b.payment_status} />
                       </td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            {b.status === 'pending' && (
                              <button 
                                onClick={() => handleStatusChange(b.id, 'confirmed', 'paid_instore')}
                                title="Mark Paid In-Store"
                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-500/20"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleDelete(b.id)}
                              title="Delete Booking (Moved/Cancelled)"
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {bookings.length === 0 && (
                     <tr>
                       <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center">
                             <Calendar className="w-10 h-10 text-zinc-700 mb-2" />
                             <p>No bookings found for {currentDate}.</p>
                          </div>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </main>
    </div>
  )
}

// --- SUBCOMPONENTS ---

function KPICard({ icon, label, value, subValue, trend }: any) {
  return (
    <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
          {icon}
        </div>
        {trend === 'up' && <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">↗</span>}
      </div>
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">{label}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        <p className="text-zinc-500 text-xs mt-1">{subValue}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status, payment }: any) {
  if (status === 'cancelled') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Cancelled</span>
  }
  if (status === 'confirmed' || payment === 'paid' || payment === 'paid_instore') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Confirmed</span>
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending</span>
}
