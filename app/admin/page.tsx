"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { 
  Trash2, 
  DollarSign, 
  Users, 
  Calendar, 
  Search, 
  RefreshCw,
  LogOut,
  CreditCard,
  Trophy,
  Loader2,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  Plus
} from "lucide-react"

// Initialize Supabase
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
  
  // Filters
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const sast = new Date(now.getTime() + (2 * 60 * 60 * 1000)); 
    return sast.toISOString().split('T')[0];
  })
  const [viewMode, setViewMode] = useState<"day" | "all">("day")
  const [searchTerm, setSearchTerm] = useState("")

  // Walk-in Form
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
      alert("Invalid Credentials")
    }
  }

  // --- FETCH ---
  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("bookings")
        .select("*")
        .neq("status", "cancelled")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (viewMode === "day") {
        query = query.eq("booking_date", currentDate)
      } else {
        query = query.gte("booking_date", new Date().toISOString().split('T')[0])
      }

      const { data, error } = await query
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchBookings()
  }, [currentDate, viewMode])

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ PERMANENT DELETE\n\nThis will remove the booking from the database entirely.\nAre you sure?")) return

    setIsActionLoading(true)
    try {
        const res = await fetch("/api/bookings/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, pin: "8821" })
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Delete failed")

        setBookings(prev => prev.filter(b => b.id !== id))
    } catch (err: any) {
        alert(`Action Failed: ${err.message}`)
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

  const handleWalkInSubmit = async () => {
    if(!walkInName) return alert("Enter Guest Name")
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
        if(!res.ok) throw new Error(data.error)

        alert(`✅ Walk-in Confirmed: Sim ${data.assigned_bay}`)
        setWalkInName("")
        setActiveTab("dashboard")
        fetchBookings()
    } catch (err: any) {
        alert(err.message)
    } finally {
        setIsActionLoading(false)
    }
  }

  // --- STATS ---
  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    const paidRevenue = bookings
        .filter(b => b.payment_status === 'paid' || b.payment_status === 'paid_instore')
        .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0)
    
    const totalHours = bookings.reduce((acc, curr) => acc + (Number(curr.duration_hours) || 0), 0)
    const occupancy = Math.min(Math.round((totalHours / 30) * 100), 100)

    return { totalRevenue, paidRevenue, occupancy, count: bookings.length }
  }, [bookings])

  const filteredBookings = bookings.filter(b => 
    (b.guest_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  // --- LOGIN ---
  if (!isAuthenticated) return (
    <div className="flex h-screen items-center justify-center bg-[#050505] text-white p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-900" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="w-full max-w-md relative z-10 bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl ring-1 ring-white/10">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <Trophy className="w-8 h-8 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">The Mulligan</h1>
                <p className="text-zinc-500 text-sm mt-1">Admin Access Terminal</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="group relative">
                    <input 
                        type="password" 
                        placeholder="ENTER PIN" 
                        value={pin} 
                        onChange={e=>setPin(e.target.value)} 
                        className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-center text-white text-xl tracking-[0.5em] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all font-mono placeholder:text-zinc-700 placeholder:tracking-normal" 
                        autoFocus 
                    />
                </div>
                <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 group">
                    <span>Unlock Dashboard</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </form>
        </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* --- TOP NAV --- */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/10">
               <Trophy className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight text-white leading-none">The Mulligan</h1>
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Venue OS &trade;</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-white/5 border border-white/5 rounded-xl p-1">
                <button onClick={() => setActiveTab("dashboard")} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <DollarSign className="w-3 h-3" /> Live View
                </button>
                <button onClick={() => setActiveTab("walkin")} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'walkin' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <CreditCard className="w-3 h-3" /> New Booking
                </button>
             </div>
             <div className="h-8 w-px bg-white/10" />
             <button onClick={() => setIsAuthenticated(false)} className="p-2.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors text-zinc-600">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto p-6 md:p-10 space-y-10">
        
        {/* --- KPI SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPI title="Total Revenue" value={`R${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} trend="+12%" />
            <KPI title="Banked (Paid)" value={`R${stats.paidRevenue.toLocaleString()}`} icon={<CreditCard className="w-5 h-5" />} color="text-emerald-400" />
            <KPI title="Total Bookings" value={stats.count.toString()} icon={<Users className="w-5 h-5" />} />
            <KPI title="Occupancy" value={`${stats.occupancy}%`} icon={<TrendingUp className="w-5 h-5" />} />
        </div>

        {/* --- MAIN CONTENT --- */}
        {activeTab === 'dashboard' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* TOOLBAR */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                            <button onClick={() => setViewMode("day")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'day' ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                Daily
                            </button>
                            <button onClick={() => setViewMode("all")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'all' ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                Upcoming
                            </button>
                        </div>

                        {viewMode === 'day' && (
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                                <input 
                                    type="date" 
                                    value={currentDate} 
                                    onChange={(e) => setCurrentDate(e.target.value)}
                                    className="bg-black/40 border border-white/10 text-white text-sm font-medium pl-10 pr-4 py-2.5 rounded-xl outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 cursor-pointer uppercase tracking-wider"
                                />
                            </div>
                        )}

                        <button onClick={() => fetchBookings()} className="p-2.5 bg-black/40 border border-white/10 rounded-xl hover:text-emerald-400 hover:border-emerald-500/30 transition-all">
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="relative group w-full md:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search guest..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/50">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40 border-b border-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                                    <th className="px-8 py-6">Time</th>
                                    <th className="px-6 py-6">Bay</th>
                                    <th className="px-6 py-6">Guest</th>
                                    <th className="px-6 py-6">Type</th>
                                    <th className="px-6 py-6 text-right">Amount</th>
                                    <th className="px-6 py-6 text-center">Status</th>
                                    <th className="px-8 py-6 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredBookings.map(b => (
                                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-zinc-800/50 rounded-lg border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                                                    <Clock className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white font-mono text-base">{b.start_time?.slice(0,5)}</div>
                                                    <div className="text-zinc-600 text-xs font-medium">{b.duration_hours} Hour{b.duration_hours > 1 ? 's' : ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                                                b.simulator_id === 1 ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                                                b.simulator_id === 2 ? 'bg-purple-500/5 text-purple-400 border-purple-500/20' :
                                                'bg-orange-500/5 text-orange-400 border-orange-500/20'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    b.simulator_id === 1 ? 'bg-blue-400' :
                                                    b.simulator_id === 2 ? 'bg-purple-400' : 'bg-orange-400'
                                                }`} />
                                                Sim {b.simulator_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-zinc-200">{b.guest_name}</div>
                                            <div className="text-zinc-600 text-xs mt-0.5">{b.guest_email}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-zinc-400 text-sm font-medium capitalize">{b.session_type === 'quick' ? 'Quick Play' : b.session_type}</span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono font-medium text-emerald-400 text-base">
                                            R{b.total_price}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {b.status === 'confirmed' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                    <CheckCircle className="w-3 h-3" /> Confirmed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-widest">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                {b.payment_status !== 'paid_instore' && (
                                                    <button onClick={() => handleMarkPaid(b.id)} className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-900/20">
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(b.id)} className="p-2.5 bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-700 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-lg hover:shadow-red-900/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBookings.length === 0 && (
                                    <tr><td colSpan={7} className="text-center py-24 text-zinc-600 font-medium">No bookings found for this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ) : (
            // WALK IN TAB
            <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="flex items-center gap-4 mb-10 pb-8 border-b border-white/5">
                        <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                            <CreditCard className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight">Walk-in Terminal</h2>
                            <p className="text-zinc-500 mt-1">Create instant booking & process payment</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider ml-1">Guest Name</label>
                            <input value={walkInName} onChange={e=>setWalkInName(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white mt-2 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-lg placeholder:text-zinc-700" placeholder="e.g. Gary Player" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider ml-1">Start Time</label>
                                <input type="time" value={walkInTime} onChange={e=>setWalkInTime(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white mt-2 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-lg" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider ml-1">Players</label>
                                <select value={walkInPlayers} onChange={e=>setWalkInPlayers(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl text-white mt-2 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-lg cursor-pointer">
                                    {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} Players</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider ml-1">Duration</label>
                            <div className="grid grid-cols-4 gap-3 mt-2">
                                {[1,2,3,4].map(h=>(
                                    <button key={h} onClick={()=>setWalkInDuration(h)} className={`p-4 rounded-xl border text-sm font-bold transition-all ${walkInDuration===h ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}>{h} Hour{h>1?'s':''}</button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="pt-8 border-t border-white/5">
                            <div className="flex justify-between items-end mb-6 bg-black/30 p-6 rounded-2xl border border-white/5">
                                <span className="text-zinc-400 font-medium">Total Due Now</span>
                                <div className="text-right">
                                    <span className="block text-4xl font-bold text-white tracking-tight">R{((walkInPlayers <= 4 ? (walkInPlayers === 1 ? 250 : walkInPlayers === 2 ? 180 : walkInPlayers === 3 ? 160 : 150) : 150) * walkInPlayers * walkInDuration).toFixed(2)}</span>
                                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1 block">Quick Play Rate Applied</span>
                                </div>
                            </div>
                            <button onClick={handleWalkInSubmit} disabled={isActionLoading} className="w-full bg-white hover:bg-zinc-200 text-black p-5 rounded-xl font-bold text-lg transition-all shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3">
                                {isActionLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                                Confirm & Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  )
}

// Helper Component for KPI Cards
function KPI({ title, value, icon, trend, color = "text-white" }: any) {
    return (
        <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-2xl hover:border-white/10 transition-all hover:-translate-y-1 shadow-lg group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-zinc-400 group-hover:text-white transition-colors border border-white/5 group-hover:border-white/10">
                    {icon}
                </div>
                {trend && <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">{trend}</span>}
            </div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <h3 className={`text-3xl font-bold ${color} tracking-tight`}>{value}</h3>
        </div>
    )
}
