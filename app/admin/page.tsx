'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  Trash2, CheckCircle, Clock, DollarSign, Users, Calendar as CalendarIcon,
  Search, RefreshCw, LogOut, CreditCard, Target, Trophy, Loader2,
  AlertCircle, XCircle, Edit, ChevronLeft, ChevronRight,
  Smartphone, Globe, Lock, MapPin, Package
} from "lucide-react"
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns"

// --- CONSTANTS ---
const BAY_NAMES: Record<number, string> = {
  1: "Lounge Bay",
  2: "Middle Bay",
  3: "Window Bay"
}

const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4]

// Default add-on prices (admin can customize, saved to localStorage)
const DEFAULT_ADDON_PRICES = { water: 15, gloves: 50, balls: 75 }

// --- PRICING LOGIC ---
const calculateTotal = (players: number, duration: number) => {
  const p = Math.max(1, players || 1)
  const d = Math.max(0.5, duration || 1)

  const pricing: Record<number, number> = { 1: 250, 2: 180, 3: 160, 4: 150 }
  // Use 4+ rate (150) if players > 4
  const rate = pricing[Math.min(p, 4)] || 150

  return rate * p * d
}

// Supabase client will be created inside component using useMemo

export default function AdminDashboard() {
  // Create Supabase client only on client-side (lazy init to avoid build-time errors)
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    return createClient(url, key)
  }, [])
  // --- STATE ---
  const [pin, setPin] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "walkin">("dashboard")

  // Data
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Filters & Search
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Walk-in Form
  const [walkInName, setWalkInName] = useState("")
  const [walkInPhone, setWalkInPhone] = useState("")
  const [walkInTime, setWalkInTime] = useState("12:00")
  const [walkInDuration, setWalkInDuration] = useState(1)
  const [walkInPlayers, setWalkInPlayers] = useState(1)
  const [walkInAmountPaid, setWalkInAmountPaid] = useState("")

  // Walk-in Add-ons
  const [walkInWaterQty, setWalkInWaterQty] = useState(0)
  const [walkInGlovesQty, setWalkInGlovesQty] = useState(0)
  const [walkInBallsQty, setWalkInBallsQty] = useState(0)

  // Edit Modal
  const [editingBooking, setEditingBooking] = useState<any | null>(null)

  // Add-on Prices (persisted to localStorage)
  const [addonPrices, setAddonPrices] = useState(DEFAULT_ADDON_PRICES)

  // Load saved add-on prices from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mulligan_addon_prices')
      if (saved) {
        try {
          setAddonPrices({ ...DEFAULT_ADDON_PRICES, ...JSON.parse(saved) })
        } catch (e) {
          console.error('Failed to parse saved addon prices')
        }
      }
    }
  }, [])

  // Helper to save addon prices
  const saveAddonPrice = (key: 'water' | 'gloves' | 'balls', value: number) => {
    const newPrices = { ...addonPrices, [key]: value }
    setAddonPrices(newPrices)
    localStorage.setItem('mulligan_addon_prices', JSON.stringify(newPrices))
  }

  // --- AUTH ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === "8821") {
      setIsAuthenticated(true)
      fetchBookings()
    } else {
      alert("Invalid PIN")
    }
  }

  // --- FETCHING ---
  const fetchBookings = async () => {
    if (!supabase) return // Guard for SSR
    setIsLoading(true)
    try {

      let query = supabase.from("bookings").select("*").order("start_time", { ascending: true })

      if (activeTab !== 'calendar') {
        query = query.eq("booking_date", currentDate)
      } else {
        const start = weekStart.toISOString().split('T')[0]
        const end = endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString().split('T')[0]
        query = query.gte("booking_date", start).lte("booking_date", end)
      }

      const { data, error } = await query
      if (error) throw error
      setBookings(data || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchBookings()
  }, [currentDate, activeTab, weekStart])

  // --- REACTIVE EDIT HANDLERS ---
  const handleEditChange = (field: string, value: any) => {
    if (!editingBooking) return

    const newBooking = { ...editingBooking, [field]: value }

    // Fields that affect total price calculation
    const priceFields = ['player_count', 'duration_hours', 'addon_water_qty', 'addon_water_price', 'addon_gloves_qty', 'addon_gloves_price', 'addon_balls_qty', 'addon_balls_price']

    if (priceFields.includes(field)) {
      // Get current values (use new value if this field is changing)
      const p = field === 'player_count' ? Number(value) : Number(newBooking.player_count || 1)
      const d = field === 'duration_hours' ? Number(value) : Number(newBooking.duration_hours || 1)

      // Calculate session base price
      const sessionPrice = calculateTotal(p, d)

      // Calculate add-ons total
      const waterTotal = (newBooking.addon_water_qty || 0) * (newBooking.addon_water_price || addonPrices.water)
      const glovesTotal = (newBooking.addon_gloves_qty || 0) * (newBooking.addon_gloves_price || addonPrices.gloves)
      const ballsTotal = (newBooking.addon_balls_qty || 0) * (newBooking.addon_balls_price || addonPrices.balls)

      // Sum everything
      newBooking.total_price = sessionPrice + waterTotal + glovesTotal + ballsTotal
    }

    setEditingBooking(newBooking)
  }

  // --- ACTIONS ---
  const handleWalkInSubmit = async () => {
    if (!walkInName) return alert("Enter guest name")
    setIsActionLoading(true)

    try {
      const total = calculateTotal(walkInPlayers, walkInDuration)

      const paidAmount = walkInAmountPaid ? parseFloat(walkInAmountPaid) : 0
      const isFullyPaid = paidAmount >= total

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
          guest_phone: walkInPhone || "0000000000",
          total_price: total,
          amount_paid: paidAmount,
          payment_status: isFullyPaid ? "paid_instore" : "pending",
          booking_source: "walk_in",
          // Add-ons
          // Add-ons included in total_price only
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      alert(`✅ Walk-in Created!\n${BAY_NAMES[data.assigned_bay]}\nBalance Due: R${total - paidAmount}`)

      setWalkInName("")
      setWalkInPhone("")
      setWalkInAmountPaid("")
      setWalkInWaterQty(0)
      setWalkInGlovesQty(0)
      setWalkInBallsQty(0)
      setActiveTab("dashboard")
      fetchBookings()

    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBooking) return
    setIsActionLoading(true)

    try {
      const total = parseFloat(editingBooking.total_price)
      const paid = parseFloat(editingBooking.amount_paid || 0)

      let newPaymentStatus = editingBooking.payment_status
      if (paid >= total) newPaymentStatus = "paid_instore"
      else if (paid > 0) newPaymentStatus = "pending"

      const res = await fetch("/api/bookings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBooking.id,
          pin: "8821",
          updates: {
            guest_name: editingBooking.guest_name,
            guest_phone: editingBooking.guest_phone,
            start_time: editingBooking.start_time,
            duration_hours: editingBooking.duration_hours,
            player_count: editingBooking.player_count,
            total_price: total,
            amount_paid: paid,
            payment_status: newPaymentStatus,
            simulator_id: editingBooking.simulator_id,
            status: "confirmed",
            // Add-ons
            // Add-ons included in total_price only
          }
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update failed")

      setEditingBooking(null)
      fetchBookings()
    } catch (err: any) {
      alert("Update failed: " + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleQuickSettle = async (booking: any) => {
    if (!confirm(`Mark remainder (R${booking.total_price - (booking.amount_paid || 0)}) as PAID?`)) return

    const res = await fetch("/api/bookings/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: booking.id,
        pin: "8821",
        updates: {
          amount_paid: booking.total_price,
          payment_status: "paid_instore",
          status: "confirmed"
        }
      })
    })

    if (!res.ok) alert("Error settling booking")
    else fetchBookings()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this booking?")) return
    await fetch("/api/bookings/delete", {
      method: "POST",
      body: JSON.stringify({ id, pin: "8821" })
    })
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const filteredBookings = bookings.filter(b => {
    const searchMatch = (b.guest_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    const statusMatch = statusFilter === 'all' ? true : b.status === statusFilter
    return searchMatch && statusMatch
  })

  const totalRev = bookings.reduce((acc, b) => acc + (b.amount_paid || 0), 0)
  const outstanding = bookings.reduce((acc, b) => acc + (b.total_price - (b.amount_paid || 0)), 0)

  // Helper to check if booking is a walk-in
  const isWalkIn = (b: any) => b.booking_source === 'walk_in' || b.user_type === 'walk_in'

  if (!isAuthenticated) return <LoginScreen pin={pin} setPin={setPin} handleLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30">

      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20 ring-1 ring-white/10">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">Venue OS</h1>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Administrator</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900/50 rounded-xl p-1 flex border border-zinc-800">
              <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<Target className="w-4 h-4" />} label="Live View" />
              <TabButton active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} icon={<CalendarIcon className="w-4 h-4" />} label="Schedule" />
              <TabButton active={activeTab === "walkin"} onClick={() => setActiveTab("walkin")} icon={<CreditCard className="w-4 h-4" />} label="Walk-in" />
            </div>
            <button onClick={() => setIsAuthenticated(false)} className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-6 space-y-8">

        {/* EDIT MODAL */}
        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 ring-1 ring-white/10">
              <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Booking</h3>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">ID: {editingBooking.id.slice(0, 8)}</p>
                </div>
                <button onClick={() => setEditingBooking(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><XCircle className="w-6 h-6 text-zinc-500" /></button>
              </div>
              <form onSubmit={handleUpdateBooking} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Guest Name</label>
                    <input className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={editingBooking.guest_name} onChange={e => handleEditChange('guest_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Contact</label>
                    <input type="tel" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 focus:ring-1 focus:ring-emerald-500 outline-none transition-all" value={editingBooking.guest_phone} onChange={e => handleEditChange('guest_phone', e.target.value)} />
                  </div>
                </div>

                {/* IMPROVED GRID LAYOUT */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Bay</label>
                    <select
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 outline-none"
                      value={editingBooking.simulator_id}
                      onChange={e => handleEditChange('simulator_id', parseInt(e.target.value))}
                    >
                      <option value={1}>Lounge</option>
                      <option value={2}>Middle</option>
                      <option value={3}>Window</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Time</label>
                    <input type="time" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 outline-none" value={editingBooking.start_time} onChange={e => handleEditChange('start_time', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Duration (h)</label>
                    <input type="number" step="0.5" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 outline-none" value={editingBooking.duration_hours} onChange={e => handleEditChange('duration_hours', parseFloat(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Player Count</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mt-1.5 outline-none"
                      value={editingBooking.player_count}
                      onChange={e => handleEditChange('player_count', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Financials</label>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${editingBooking.amount_paid >= editingBooking.total_price ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {editingBooking.amount_paid >= editingBooking.total_price ? "Fully Paid" : "Outstanding"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total (R)</label>
                      <input type="number" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono" value={editingBooking.total_price} onChange={e => handleEditChange('total_price', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Paid (R)</label>
                      <input type="number" className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono" value={editingBooking.amount_paid} onChange={e => handleEditChange('amount_paid', parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* ADD-ONS SECTION */}
                <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" /> Add-ons (Bookkeeping)
                  </label>

                  {/* Water */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Water Qty</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_water_qty || 0}
                        onChange={e => handleEditChange('addon_water_qty', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Price/Unit (R)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_water_price || addonPrices.water}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0
                          handleEditChange('addon_water_price', val)
                          if (val > 0) saveAddonPrice('water', val)
                        }}
                      />
                    </div>
                  </div>

                  {/* Gloves */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Gloves Qty</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_gloves_qty || 0}
                        onChange={e => handleEditChange('addon_gloves_qty', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Price/Unit (R)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_gloves_price || addonPrices.gloves}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0
                          handleEditChange('addon_gloves_price', val)
                          if (val > 0) saveAddonPrice('gloves', val)
                        }}
                      />
                    </div>
                  </div>

                  {/* Balls */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Balls Qty</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_balls_qty || 0}
                        onChange={e => handleEditChange('addon_balls_qty', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Price/Unit (R)</label>
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 mt-1 font-mono"
                        value={editingBooking.addon_balls_price || addonPrices.balls}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0
                          handleEditChange('addon_balls_price', val)
                          if (val > 0) saveAddonPrice('balls', val)
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isActionLoading} className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg">
                    {isActionLoading ? "Saving Changes..." : "Save Updates"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- VIEW: CALENDAR --- */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">Weekly Schedule</h2>
                <div className="flex items-center bg-zinc-900 rounded-xl border border-zinc-800 p-1">
                  <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-4 text-sm font-mono text-zinc-300 font-medium">{format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d")}</span>
                  <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <button onClick={fetchBookings} className="p-2.5 bg-zinc-900 rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-colors"><RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} /></button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(weekStart, i)
                const isToday = isSameDay(day, new Date())
                return (
                  <div key={i} className={`bg-[#09090b] p-4 text-center border-b border-zinc-800 ${isToday ? 'bg-zinc-900/40' : ''}`}>
                    <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{format(day, "EEE")}</div>
                    <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>{format(day, "d")}</div>
                  </div>
                )
              })}

              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(weekStart, i)
                const dayBookings = bookings.filter(b => b.booking_date === format(day, "yyyy-MM-dd"))

                return (
                  <div key={i} className="bg-[#09090b] min-h-[400px] p-2 space-y-2 border-r border-zinc-900 last:border-0">
                    {dayBookings.length === 0 && <div className="text-zinc-800 text-xs text-center py-20 font-medium italic">No bookings</div>}
                    {dayBookings.map(b => (
                      <div key={b.id} onClick={() => setEditingBooking(b)} className={`p-3 rounded-xl border text-xs cursor-pointer hover:scale-[1.02] transition-all shadow-sm ${isWalkIn(b)
                        ? 'bg-purple-500/5 border-purple-500/20 text-purple-200 hover:bg-purple-500/10'
                        : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/10'
                        }`}>
                        <div className="font-bold flex justify-between">
                          <span>{b.start_time.slice(0, 5)}</span>
                          <span className="opacity-50">{b.duration_hours}h</span>
                        </div>
                        <div className="font-medium mt-1 truncate">{b.guest_name}</div>
                        <div className="opacity-60 mt-1 truncate text-[10px] uppercase tracking-wide">{BAY_NAMES[b.simulator_id]}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* --- VIEW: WALK IN --- */}
        {activeTab === 'walkin' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-center gap-5 mb-8 pb-8 border-b border-zinc-800 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/30 border border-purple-500/20">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Walk-in Terminal</h2>
                  <p className="text-zinc-500 font-medium mt-1">Instant booking & payment processing</p>
                </div>
              </div>

              <div className="space-y-6 relative">
                {/* Guest Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Guest Name</label>
                    <input value={walkInName} onChange={e => setWalkInName(e.target.value)} className="w-full mt-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white text-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-700" placeholder="e.g. Gary Player" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Phone Number</label>
                    <input type="tel" value={walkInPhone} onChange={e => setWalkInPhone(e.target.value)} className="w-full mt-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white text-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-700" placeholder="082 123 4567" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Start Time</label>
                    <input type="time" value={walkInTime} onChange={e => setWalkInTime(e.target.value)} className="w-full mt-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Player Count</label>
                    <div className="relative">
                      <select value={walkInPlayers} onChange={e => setWalkInPlayers(Number(e.target.value))} className="w-full mt-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white outline-none appearance-none focus:border-purple-500 transition-colors cursor-pointer">
                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Players</option>)}
                      </select>
                      <div className="absolute right-4 top-[26px] pointer-events-none text-zinc-500">▼</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-3 block">Duration</label>
                  <div className="grid grid-cols-4 gap-3">
                    {DURATION_OPTIONS.map(h => (
                      <button key={h} onClick={() => setWalkInDuration(h)} className={`py-3.5 rounded-xl text-sm font-bold border transition-all ${walkInDuration === h ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* ADD-ONS SECTION */}
                <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-3 mt-6">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-blue-400" /> Add-ons (Optional)
                  </label>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Water */}
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium">Water</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min={0}
                          className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm font-mono text-center"
                          value={walkInWaterQty}
                          onChange={e => setWalkInWaterQty(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-zinc-500 text-xs">× R{addonPrices.water}</span>
                      </div>
                    </div>

                    {/* Gloves */}
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium">Gloves</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min={0}
                          className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm font-mono text-center"
                          value={walkInGlovesQty}
                          onChange={e => setWalkInGlovesQty(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-zinc-500 text-xs">× R{addonPrices.gloves}</span>
                      </div>
                    </div>

                    {/* Balls */}
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium">Balls</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          min={0}
                          className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm font-mono text-center"
                          value={walkInBallsQty}
                          onChange={e => setWalkInBallsQty(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-zinc-500 text-xs">× R{addonPrices.balls}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 mt-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-zinc-400 font-medium text-sm">Total Amount Due</span>
                      <div className="text-3xl font-bold text-white tracking-tight mt-1">R{calculateTotal(walkInPlayers, walkInDuration).toFixed(0)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full uppercase tracking-wider border border-purple-500/20">Ready to Charge</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Payment Received Now (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-4 text-zinc-500">R</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={walkInAmountPaid}
                        onChange={e => setWalkInAmountPaid(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 pl-8 text-white font-mono focus:border-purple-500 outline-none transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 pl-1">* Leave empty if payment is pending.</p>
                  </div>
                </div>

                <button onClick={handleWalkInSubmit} disabled={isActionLoading} className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99]">
                  {isActionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Banked Revenue" value={`R${totalRev.toLocaleString()}`} icon={<DollarSign className="text-emerald-400" />} sub="Paid In-Store & Online" color="emerald" />
              <StatCard label="Outstanding" value={`R${outstanding.toLocaleString()}`} icon={<AlertCircle className="text-amber-400" />} sub="Pending Collection" color="amber" />
              <StatCard label="Total Bookings" value={bookings.length} icon={<CalendarIcon className="text-blue-400" />} sub="Slots Filled Today" color="blue" />
              <StatCard label="Bay Occupancy" value={`${Math.round((bookings.reduce((acc, b) => acc + b.duration_hours, 0) / 36) * 100)}%`} icon={<Users className="text-purple-400" />} sub="Utilization" color="purple" />
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-zinc-900/30 p-1.5 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 pl-2">
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 shadow-sm">
                  <CalendarIcon className="w-4 h-4 text-zinc-400 mr-3" />
                  <input type="date" value={currentDate} onChange={e => setCurrentDate(e.target.value)} className="bg-transparent border-none text-white text-sm outline-none font-medium cursor-pointer" />
                </div>
                <div className="h-8 w-px bg-zinc-800 mx-2" />
                <div className="flex gap-1">
                  {['all', 'confirmed', 'pending'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-3 w-4 h-4 text-zinc-500" />
                <input placeholder="Search guest..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white w-72 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700 transition-all" />
              </div>
            </div>

            {/* Main Table */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-900/50 text-[10px] uppercase text-zinc-500 font-bold border-b border-zinc-800 tracking-wider">
                    <th className="px-8 py-5">Time</th>
                    <th className="px-6 py-5">Bay</th>
                    <th className="px-6 py-5">Source</th>
                    <th className="px-6 py-5">Guest</th>
                    <th className="px-6 py-5 text-right">Balance</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredBookings.map(b => {
                    const balance = b.total_price - (b.amount_paid || 0)
                    return (
                      <tr key={b.id} className="hover:bg-zinc-900/80 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3 font-mono text-zinc-300">
                            <div className="p-1.5 bg-zinc-900 rounded-md border border-zinc-800 text-zinc-500"><Clock className="w-3 h-3" /></div>
                            <span className="text-white font-bold">{b.start_time.slice(0, 5)}</span>
                            <span className="text-zinc-600 text-xs">({b.duration_hours}h)</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${b.simulator_id === 1 ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                            b.simulator_id === 2 ? 'bg-purple-500/5 text-purple-400 border-purple-500/20' :
                              'bg-orange-500/5 text-orange-400 border-orange-500/20'
                            }`}>
                            {BAY_NAMES[b.simulator_id]}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {isWalkIn(b) ? (
                            <div className="flex items-center gap-2 text-xs font-medium text-purple-400">
                              <Smartphone className="w-3.5 h-3.5" /> Walk-in
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                              <Globe className="w-3.5 h-3.5" /> Online
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="font-bold text-white">{b.guest_name}</div>
                          <div className="text-xs text-zinc-500 font-medium mt-0.5">{b.player_count} Players</div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className={`font-mono font-bold ${balance > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                            {balance > 0 ? `R${balance}` : '-'}
                          </div>
                          {balance > 0 && (
                            <button onClick={() => handleQuickSettle(b)} className="text-[10px] bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-md border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all mt-1.5 font-bold tracking-wide">
                              SETTLE
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {balance <= 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 uppercase tracking-wider">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wider">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => setEditingBooking(b)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700 transition-all" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(b.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredBookings.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-20 text-zinc-600 font-medium">No bookings found for this date.</td></tr>
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

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
      {icon} {label}
    </button>
  )
}

function StatCard({ label, value, icon, sub, color }: any) {
  const bgStyles = {
    emerald: "bg-emerald-500/5 border-emerald-500/10",
    amber: "bg-amber-500/5 border-amber-500/10",
    blue: "bg-blue-500/5 border-blue-500/10",
    purple: "bg-purple-500/5 border-purple-500/10"
  }

  return (
    <div className={`border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${bgStyles[color as keyof typeof bgStyles] || 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-[#09090b] border border-zinc-800 rounded-xl shadow-sm">{icon}</div>
        <span className="text-[10px] font-bold bg-[#09090b] text-zinc-500 px-2.5 py-1 rounded-full border border-zinc-800 tracking-wider">LIVE</span>
      </div>
      <div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{label}</div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-xs text-zinc-500 font-medium mt-2">{sub}</div>
      </div>
    </div>
  )
}

function LoginScreen({ pin, setPin, handleLogin }: any) {
  return (
    <div className="h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />

      <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 p-10 rounded-3xl shadow-2xl text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/40 mb-8 border border-white/10">
          <Trophy className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Venue OS</h1>
        <p className="text-zinc-500 text-sm mb-8 font-medium">Administrator Access Portal</p>

        <div className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-4 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              placeholder="Enter Security PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full bg-[#050505] border border-zinc-800 text-center text-xl tracking-[0.5em] text-white p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700 placeholder:tracking-normal placeholder:text-sm font-mono"
              autoFocus
            />
          </div>

          <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
            Authenticate
          </button>
        </div>

        <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-600 font-medium">
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure Connection</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Vanderbijlpark</span>
        </div>
      </form>
    </div>
  )
}
