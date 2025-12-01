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
  MoreVertical,
  XCircle
} from "lucide-react"
import { format } from "date-fns"

// Initialize Supabase Client (For Reading Data)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminDashboard() {
  // --- STATE ---
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "walkin">("dashboard")
  
  // Data State
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Filters
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Walk-in Form State
  const [walkInName, setWalkInName] = useState("")
  const [walkInTime, setWalkInTime] = useState("12:00")
  const [walkInDuration, setWalkInDuration] = useState(1)
  const [walkInPlayers, setWalkInPlayers] = useState(1)

  // --- AUTHENTICATION ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === "8821") {
      setIsAuthenticated(true)
      fetchBookings()
    } else {
      alert("Access Denied: Invalid Security PIN")
    }
  }

  // --- DATA FETCHING ---
  const fetchBookings = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", currentDate)
        .order("start_time", { ascending: true })
      
      if (error) throw error
      
      setBookings(data || [])

    } catch (err: any) {
      console.error("Supabase Error:", err)
      setErrorMsg(err.message || "Failed to connect to Database")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchBookings()
  }, [currentDate])

  // --- ADMIN ACTIONS ---

  // 1. DELETE BOOKING (Via Secure API)
  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ PERMANENT DELETE\n\nAre you sure? This will permanently remove this slot.")) return

    setIsActionLoading(true)
    try {
      // We send the PIN to the server to verify permission
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pin }) 
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Delete failed")
      }
      
      // Optimistic UI Update
      setBookings(prev => prev.filter(b => b.id !== id))
      
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // 2. TOGGLE STATUS (Mark Paid In-Store)
  const handleMarkPaid = async (id: string) => {
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ 
            status: "confirmed", 
            payment_status: "paid_instore",
            payment_type: "bypass"
        })
        .eq("id", id)

      if (error) throw error
      await fetchBookings()
    } catch (err: any) {
      alert("Update failed: " + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // 3. CREATE WALK-IN (Via API)
  const handleWalkInSubmit = async () => {
    if(!walkInName) return alert("Please enter guest name")

    setIsActionLoading(true)
    try {
        const pricing = { 1: 250, 2: 180, 3: 160, 4: 150 }
        // @ts-ignore
        const rate = pricing[Math.min(walkInPlayers, 4)] || 150
        const total = rate * walkInPlayers * walkInDuration

        const res = await fetch("/api/bookings/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                booking_date: currentDate,
                start_time: walkInTime,
                duration_hours: walkInDuration,
                players: walkInPlayers,
                session_type: "quick",
                guest_name: walkInName,
                guest_email: "walkin@venue-os.com", 
                guest_phone: "0000000000",
                total_price: total,
                payment_status: "completed"
            })
        })

        const data = await res.json()
        
        if(!res.ok) throw new Error(data.error || "Failed to create")

        alert(`✅ Walk-in Confirmed!\nSimulator ${data.assigned_bay} Assigned.`)
        setWalkInName("")
        setActiveTab("dashboard")
        fetchBookings()

    } catch (err: any) {
        console.error(err)
        alert("Error: " + err.message)
    } finally {
        setIsActionLoading(false)
    }
  }

  // --- STATS ENGINE ---
  const stats = useMemo(() => {
    const totalRevenue = bookings
      .filter(b => b.payment_status === "paid_instore" || b.payment_status === "completed" || b.payment_status === "paid")
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    
    const pendingRevenue = bookings
      .filter(b => b.payment_status === "pending")
      .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)

    const activeBookings = bookings.filter(b => b.status !== 'cancelled').length
    
    // Occupancy: 3 Bays * 12 Hours = 36 Slots
    const totalHoursBooked = bookings.reduce((acc, curr) => acc + (Number(curr.duration_hours) || 0), 0)
    const occupancy = Math.min(Math.round((totalHoursBooked / 36) * 100), 100)

    return { totalRevenue, pendingRevenue, activeBookings, occupancy }
  }, [bookings])

  // --- RENDER HELPERS ---
  const filteredBookings = bookings.filter(b => {
    const searchMatch = (b.guest_name || b.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    const statusMatch = statusFilter === 'all' ? true : b.status === statusFilter
    return searchMatch && statusMatch
  })


  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-100 p-4 font-sans">
        <div className="w-full max-w-sm relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <div className="flex justify-center mb-6">
               <div className="w-20 h-20 bg-gradient-to-br from-zinc-900 to-black rounded-3xl flex items-center justify-center border border-zinc-800 shadow-2xl shadow-emerald-900/20">
                  <Trophy className="w-10 h-10 text-emerald-500" />
               </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">The Mulligan</h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Production System</span>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="relative z-10 space-y-4 bg-zinc-900/80 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-xl shadow-2xl">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Access PIN</label>
              <input
                type="password"
                placeholder="••••"
                className="w-full mt-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center text-3xl tracking-[1em] focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-800 text-emerald-400 font-mono"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/40 text-lg">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* --- NAV BAR --- */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-xl flex items-center justify-center font-bold text-white shadow-lg border border-emerald-500/20">
               <Trophy className="w-5 h-5" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight text-white leading-none">Venue OS</h1>
                <span className="text-xs text-zinc-500 font-medium">Administrator</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1.5">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                  <Target className="w-4 h-4" />
                  Live View
                </button>
                <button 
                  onClick={() => setActiveTab("walkin")}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'walkin' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                  <CreditCard className="w-4 h-4" />
                  New Walk-in
                </button>
             </div>
             <div className="h-8 w-px bg-zinc-800 mx-2" />
             <button onClick={() => setIsAuthenticated(false)} className="p-3 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors text-zinc-500 group" title="Logout">
               <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
        
        {/* --- CONTROLS BAR --- */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
           {/* Date & Refresh */}
           <div className="flex items-center gap-4">
               <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 pl-4 shadow-sm">
                  <Calendar className="w-5 h-5 text-zinc-400 mr-3" />
                  <input 
                    type="date" 
                    value={currentDate} 
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="bg-transparent border-none text-white focus:ring-0 text-sm font-semibold cursor-pointer w-32"
                  />
                  <div className="h-8 w-px bg-zinc-800 mx-2" />
                  <button onClick={() => fetchBookings()} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white" title="Refresh Data">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
               </div>
               
               {/* Status Filter */}
               <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 shadow-sm">
                  {['all', 'confirmed', 'pending', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === status ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                        {status}
                      </button>
                  ))}
               </div>
           </div>

           {/* Search */}
           <div className="relative group">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
             </div>
             <input 
                type="text" 
                placeholder="Search guest name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm w-full md:w-80 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white placeholder:text-zinc-600 transition-all shadow-sm"
             />
           </div>
        </div>

        {/* --- ERROR MESSAGE --- */}
        {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        {/* --- KPI STATS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPICard 
             icon={<DollarSign className="w-6 h-6 text-emerald-400" />} 
             label="Banked Revenue" 
             value={`R${stats.totalRevenue.toLocaleString()}`} 
             subValue="Paid In-Store & Online"
             trend="up"
             color="emerald"
           />
           <KPICard 
             icon={<Target className="w-6 h-6 text-amber-400" />} 
             label="Projected (Pending)" 
             value={`R${stats.pendingRevenue.toLocaleString()}`} 
             subValue="Awaiting Payment"
             trend="neutral"
             color="amber"
           />
           <KPICard 
             icon={<Calendar className="w-6 h-6 text-blue-400" />} 
             label="Active Bookings" 
             value={stats.activeBookings.toString()} 
             subValue="Total Slots Filled"
             trend="up"
             color="blue"
           />
           <KPICard 
             icon={<Users className="w-6 h-6 text-purple-400" />} 
             label="Bay Occupancy" 
             value={`${stats.occupancy}%`} 
             subValue="Daily Capacity Used"
             trend="up"
             color="purple"
           />
        </div>

        {activeTab === "walkin" ? (
          // --- WALK IN TERMINAL ---
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 pb-20">
             <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-800 relative">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                    <CreditCard className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Walk-in Terminal</h2>
                    <p className="text-zinc-500 font-medium">Create instant booking & process payment</p>
                  </div>
                </div>

                <div className="space-y-8 relative">
                   <div>
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Guest Name</label>
                     <input 
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-lg text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-700"
                        placeholder="e.g. Michael Jordan"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Start Time</label>
                        <input 
                          type="time" 
                          value={walkInTime}
                          onChange={(e) => setWalkInTime(e.target.value)}
                          className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-lg text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Player Count</label>
                        <select 
                          value={walkInPlayers}
                          onChange={(e) => setWalkInPlayers(Number(e.target.value))}
                          className="w-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-lg text-white focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                        >
                          {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Players</option>)}
                        </select>
                      </div>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Duration</label>
                      <div className="grid grid-cols-4 gap-3 mt-2">
                        {[1, 2, 3, 4].map(h => (
                           <button
                             key={h}
                             onClick={() => setWalkInDuration(h)}
                             className={`py-4 rounded-xl border text-sm font-bold transition-all ${
                               walkInDuration === h 
                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400/50' 
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white hover:bg-zinc-900'
                             }`}
                           >
                             {h} Hour{h > 1 ? 's' : ''}
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="pt-8 border-t border-zinc-800">
                     <div className="flex justify-between items-end mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
                        <span className="text-zinc-400 font-medium">Total Due Now</span>
                        <div className="text-right">
                            <span className="block text-3xl font-bold text-white tracking-tight">
                                R{((walkInPlayers <= 4 ? (walkInPlayers === 1 ? 250 : walkInPlayers === 2 ? 180 : walkInPlayers === 3 ? 160 : 150) : 150) * walkInPlayers * walkInDuration).toFixed(2)}
                            </span>
                            <span className="text-xs text-emerald-500 font-bold uppercase tracking-wide">Ready to Charge</span>
                        </div>
                     </div>
                     <button 
                       onClick={handleWalkInSubmit}
                       disabled={isActionLoading}
                       className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                     >
                       {isActionLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                       Confirm & Print Receipt
                     </button>
                   </div>
                </div>
             </div>
          </div>
        ) : (
          // --- LIVE TABLE ---
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/5">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-zinc-950 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                     <th className="px-8 py-5 font-bold">Time</th>
                     <th className="px-6 py-5 font-bold">Bay</th>
                     <th className="px-6 py-5 font-bold">Guest</th>
                     <th className="px-6 py-5 font-bold">Type</th>
                     <th className="px-6 py-5 font-bold text-right">Value</th>
                     <th className="px-6 py-5 font-bold text-center">Status</th>
                     <th className="px-8 py-5 font-bold text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800/50">
                   {filteredBookings.map((b) => (
                     <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors group">
                       <td className="px-8 py-5 font-mono text-zinc-300 text-sm">
                         <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-600" />
                            <span className="font-semibold text-white">
                                {b.start_time?.slice(0,5)}
                            </span>
                            <span className="text-zinc-600 text-xs">({b.duration_hours}h)</span>
                         </div>
                       </td>
                       <td className="px-6 py-5">
                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                            b.simulator_id === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                            b.simulator_id === 2 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                         }`}>
                           Simulator {b.simulator_id}
                         </span>
                       </td>
                       <td className="px-6 py-5">
                         <div className="font-bold text-zinc-200">
                            {b.guest_name || b.name || "Unknown Guest"}
                         </div>
                         <div className="text-xs text-zinc-500 font-medium mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {b.player_count} Players
                         </div>
                       </td>
                       <td className="px-6 py-5 text-sm text-zinc-400 capitalize font-medium">
                         {b.session_type === 'quick' ? 'Quick Play' : b.session_type}
                       </td>
                       <td className="px-6 py-5 text-right font-mono text-zinc-300 font-medium">
                         R{b.total_price}
                       </td>
                       <td className="px-6 py-5 text-center">
                          <StatusBadge status={b.status} payment={b.payment_status} />
                       </td>
                       <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {(b.payment_status === 'pending' && b.status !== 'cancelled') && (
                              <button 
                                onClick={() => handleMarkPaid(b.id)}
                                title="Confirm Payment (In-Store)"
                                className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-900/20"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(b.id)}
                              title="Permanently Delete Booking"
                              className="p-2.5 bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-zinc-700 hover:border-red-500 hover:shadow-lg hover:shadow-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {filteredBookings.length === 0 && (
                     <tr>
                       <td colSpan={7} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center opacity-50">
                             {isLoading ? (
                                <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                             ) : (
                                <div className="bg-zinc-900 p-4 rounded-full border border-zinc-800 mb-4">
                                    <Calendar className="w-8 h-8 text-zinc-600" />
                                </div>
                             )}
                             <p className="text-zinc-400 font-medium text-lg">
                                {isLoading ? "Syncing live data..." : `No active bookings for ${format(new Date(currentDate), "MMMM do, yyyy")}`}
                             </p>
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

function KPICard({ icon, label, value, subValue, trend, color }: any) {
  const colorStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 p-6 rounded-3xl hover:border-zinc-700 transition-all hover:translate-y-[-2px] hover:shadow-xl group">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl border ${colorStyles[color as keyof typeof colorStyles]}`}>
          {icon}
        </div>
        {trend === 'up' && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                Live
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </span>
        )}
      </div>
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        <p className="text-zinc-500 text-sm mt-2 font-medium group-hover:text-zinc-400 transition-colors">{subValue}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status, payment }: any) {
  if (status === 'cancelled') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">Cancelled</span>
  }
  if (status === 'confirmed' || payment === 'paid' || payment === 'paid_instore' || payment === 'completed') {
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider gap-1.5">
        <CheckCircle className="w-3 h-3" />
        Paid
    </span>
  }
  return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider gap-1.5">
      <Clock className="w-3 h-3" />
      Pending
  </span>
}
