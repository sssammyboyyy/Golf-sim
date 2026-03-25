'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSASTDate } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import { ManagerModal } from './manager-modal';
import { toast } from 'sonner';
import { Plus, CheckCircle, CreditCard, ChevronRight, Activity, Layers, Edit2, ChevronLeft, Calendar as CalendarIcon, Banknote, Users, Target, XCircle, AlertTriangle, Globe, Smartphone, Clock } from 'lucide-react';

/** POS Tiered Pricing — mirrors GEMINI.md §POS */
const GET_BASE_HOURLY_RATE = (players: number): number => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

const BAY_CONFIG: Record<number, { name: string; text: string; glow: string; border: string }> = {
  1: { name: 'LOUNGE BAY', text: 'text-indigo-400', glow: 'bg-indigo-500', border: 'border-indigo-500/30' },
  2: { name: 'MIDDLE BAY', text: 'text-amber-400', glow: 'bg-amber-500', border: 'border-amber-500/30' },
  3: { name: 'WINDOW BAY', text: 'text-emerald-400', glow: 'bg-emerald-500', border: 'border-emerald-500/30' },
};
const getBayConfig = (id: number) => BAY_CONFIG[id] || { name: `BAY ${id}`, text: 'text-zinc-400', glow: 'bg-zinc-500', border: 'border-zinc-500/30' };

import { Button } from "@/components/ui/button";

export function LiveViewTab() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(getSASTDate());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pin = sessionStorage.getItem('admin-pin');

      const res = await fetch('/api/bookings/admin-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, startDate: selectedDate }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin-pin');
        window.location.reload();
        return;
      }

      if (!res.ok) throw new Error("Ledger Sync Failed");
      const bookings = await res.json();

      setData(bookings || []);
      setError(null);
    } catch (err: any) {
      console.error("HUD Sync Error:", err);
      setError(err.message || "Failed to sync ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime HUD: Auto-refresh on any bookings table mutation
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 AGGREGATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const grossRevenue = useMemo(() =>
    data
      .filter(b => b.payment_status === 'completed' || b.payment_status === 'paid_instore')
      .reduce((s, b) => s + Number(b.amount_paid || b.total_price || 0), 0),
    [data]
  );

  const outstanding = useMemo(() =>
    data
      .filter(b => b.payment_status === 'pending' || b.payment_status === 'deposit_paid')
      .reduce((s, b) => s + Number(b.total_price || 0), 0),
    [data]
  );

  const totalPlayers = useMemo(() => data.reduce((s, b) => s + Number(b.player_count || 0), 0), [data]);
  const totalBookings = data.length;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00+02:00'); // Use mid-day to avoid timezone boundary issues
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  /** Human-readable date: "Tuesday, 25 Mar" */
  const formattedDateLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T12:00:00+02:00');
      return new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    } catch { return selectedDate; }
  }, [selectedDate]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** 
   * Open modal with auto-bay pre-fill and explicit PENDING status for walk-ins
   */
  const handleOpenCreate = (prefillBayId: number = 1) => {
    const now = new Date();
    const defaultTime = now.toLocaleTimeString('en-ZA', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg', hour12: false
    });

    setSelectedBooking({
      guest_name: '', guest_email: 'walkin@venue-os.com', guest_phone: '',
      simulator_id: prefillBayId, player_count: 1, duration_hours: 1,
      start_time: defaultTime, booking_date: selectedDate,
      status: 'confirmed', 
      payment_type: 'pending', // Explicitly pending
      payment_status: 'pending', // Explicitly pending
      user_type: 'walk_in',
      addon_water_qty: 0, addon_gloves_qty: 0, addon_balls_qty: 0,
      addon_club_rental: false, addon_coaching: false,
      addon_water_price: 20, addon_gloves_price: 220, addon_balls_price: 50,
      notes: ''
    });
    setIsModalOpen(true);
  };

  /** TRUE OPTIMISTIC Quick Extend (+1h) — local state first, server second */
  const handleQuickExtend = (booking: any) => {
    const snapshot = [...data];
    const hourlyRate = GET_BASE_HOURLY_RATE(Number(booking.player_count || 1));

    // Immediate local update
    setData(prev => prev.map(b => {
      if (b.id !== booking.id) return b;
      return {
        ...b,
        duration_hours: Number(b.duration_hours) + 1,
        total_price: Number(b.total_price) + hourlyRate,
        amount_due: Number(b.amount_due || 0) + hourlyRate,
      };
    }));
    toast.success(`+1H Extended — R${hourlyRate} added`, { duration: 2000 });

    // Background server call
    const pin = sessionStorage.getItem('admin-pin');
    const newEnd = new Date(new Date(booking.slot_end).getTime() + 60 * 60 * 1000).toISOString();

    fetch('/api/bookings/admin-extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: booking.id, pin, xmin: booking.xmin,
        new_slot_end: newEnd, duration_hours_added: 1,
        player_count: booking.player_count
      })
    }).then(async (res) => {
      if (!res.ok) {
        setData(snapshot);
        if (res.status === 409) {
          toast.error('Bay occupied! Cannot extend. Refreshing...', { duration: 3000 });
        } else {
          toast.error('Extension failed. Rolled back.', { duration: 3000 });
        }
        fetchDashboardData();
      }
    }).catch(() => {
      setData(snapshot);
      toast.error('Network error. Rolled back.', { duration: 3000 });
    });
  };

  const handleQuickSettle = async (booking: any, action: 'settle' | 'unsettle') => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const payload: any = { id: booking.id, pin };

      if (action === 'settle') {
        payload.status = 'confirmed';
        payload.payment_type = 'cash';
        payload.payment_status = 'paid_instore';
      } else {
        payload.payment_status = 'pending';
        payload.payment_type = 'pending';
      }

      const res = await fetch('/api/bookings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`${action} Failed`);
      fetchDashboardData();
    } catch (err) {
      console.error("Settle/Unsettle Error:", err);
      toast.error(`Could not ${action} record.`);
    }
  };

  const handleSave = async (formData: any) => {
    const isEdit = !!formData.id;
    const endpoint = isEdit ? '/api/bookings/update' : '/api/bookings/admin-create';

    try {
      const pin = sessionStorage.getItem('admin-pin');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, pin }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Save failed.");
      }
      setIsModalOpen(false);
      toast.success(isEdit ? 'Booking updated.' : 'Walk-in created.');
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/bookings/admin-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setIsModalOpen(false);
      toast.success('Record destroyed.');
      fetchDashboardData();
    } catch (err) {
      toast.error("Ghost cleanup failed.");
    }
  };

  const isPaid = (b: any) => b.payment_status === 'completed' || b.payment_status === 'paid_instore';
  const isOnline = (b: any) => !!b.yoco_payment_id || b.booking_source === 'online' || b.user_type === 'member';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🖼️ RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="w-full space-y-6 max-w-6xl mx-auto px-4 pb-20 mt-4">

      {/* ━━ HEADER ━━ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b-2 border-zinc-800 gap-6">
        <div className="flex flex-col space-y-1 w-full">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
            <Activity size={14} className="animate-pulse" /> Live Activity Portal
          </div>
          <h2 className="text-2xl font-black tracking-tighter uppercase text-white">{formattedDateLabel}</h2>
        </div>

        <div className="flex flex-col items-stretch gap-4 w-full md:w-auto">
          {/* Primary Walk-In CTA — 56px height for accessibility */}
          <Button
            onClick={() => handleOpenCreate(1)}
            className="bg-white text-black hover:bg-primary hover:text-white font-black uppercase text-xs h-14 min-h-[56px] shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all w-full md:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> ADD WALK-IN
          </Button>

          {/* Bay Quick-Select Row */}
          <div className="flex gap-2">
            {[
              { id: 1, label: 'Lounge', bg: 'bg-indigo-500/20', text: 'text-indigo-300', hover: 'hover:bg-indigo-500', border: 'border-indigo-500/30' },
              { id: 2, label: 'Middle', bg: 'bg-amber-500/20', text: 'text-amber-300', hover: 'hover:bg-amber-500', border: 'border-amber-500/30' },
              { id: 3, label: 'Window', bg: 'bg-emerald-500/20', text: 'text-emerald-300', hover: 'hover:bg-emerald-500', border: 'border-emerald-500/30' },
            ].map((bay) => (
              <button
                key={bay.id}
                onClick={() => handleOpenCreate(bay.id)}
                className={`flex-1 min-h-[44px] rounded-xl text-[10px] font-black uppercase ${bay.bg} ${bay.text} ${bay.hover} hover:text-white border ${bay.border} transition-all active:scale-95`}
              >
                {bay.label}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between md:justify-start bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl h-14 md:h-auto">
            <button onClick={() => shiftDate(-1)} className="p-4 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-500 hover:text-white border-r border-zinc-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-2 bg-black/40">
              <CalendarIcon size={14} className="text-primary hidden md:block" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-base md:text-sm font-black text-white outline-none cursor-pointer uppercase tracking-tighter"
              />
            </div>
            <button onClick={() => shiftDate(1)} className="p-4 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-500 hover:text-white border-l border-zinc-800 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setSelectedDate(getSASTDate())} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 border-l border-zinc-800 h-full hidden md:flex items-center min-h-[44px]">
              TODAY
            </button>
          </div>
        </div>
      </div>

      {/* ━━ METRICS ━━ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'GROSS', value: `R ${grossRevenue.toLocaleString()}`, icon: Banknote, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'OUTSTANDING', value: `R ${outstanding.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'PLAYERS', value: totalPlayers, icon: Users, color: 'text-sky-400', border: 'border-sky-500/20' },
          { label: 'ROUNDS', value: totalBookings, icon: Target, color: 'text-amber-400', border: 'border-amber-500/20' },
        ].map((metric) => (
          <div key={metric.label} className={`relative overflow-hidden bg-[#0a0a0a] ${metric.border} border border-zinc-800 rounded-2xl p-4 transition-all hover:scale-[1.02]`}>
            <div className="absolute top-[-8px] right-[-8px] opacity-[0.07] pointer-events-none">
              <metric.icon size={60} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <metric.icon size={12} className={metric.color} />
              <span className="text-[9px] font-black uppercase tracking-[0.1em] md:tracking-[0.25em] text-zinc-500 truncate">{metric.label}</span>
            </div>
            <span className={`text-xl md:text-3xl font-black tabular-nums tracking-tighter ${metric.color}`}>{metric.value}</span>
          </div>
        ))}
      </div>

      {/* ━━ ERROR BANNER ━━ */}
      {error && (
        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-1">
          SYSTEM FAULT: {error}
        </div>
      )}

      {/* ━━ BOOKING CARDS ━━ */}
      <div className="flex flex-col space-y-4 min-h-[450px]">
        {isLoading ? (
          <div className="py-20 md:py-32 text-center animate-pulse">
            <div className="text-zinc-600 font-black uppercase tracking-[0.8em] text-xs">Syncing Ledger...</div>
            <div className="mt-4 h-1 w-20 md:w-32 bg-zinc-800 mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress w-full" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="py-20 md:py-32 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-3xl text-center px-4">
            <Layers size={48} className="mx-auto text-zinc-800 mb-6" />
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-zinc-700">No Operations Recorded</p>
          </div>
        ) : (
          data.map((booking) => {
            const bay = getBayConfig(booking.simulator_id);
            const paid = isPaid(booking);
            const online = isOnline(booking);

            return (
              <div
                key={booking.id}
                onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }}
                className={`group relative flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-6 bg-[#0a0a0a] ${bay.border} border border-zinc-800/80 rounded-2xl hover:bg-zinc-800/40 hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-lg`}
              >
                {/* Bay Glow Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:w-2 ${bay.glow} ${!paid ? 'animate-pulse' : ''} shadow-[0_0_15px_currentColor]`} />

                {/* Time + Bay Info */}
                <div className="flex flex-row items-center gap-4 md:gap-8 w-full md:w-auto pl-2 mb-4 md:mb-0">
                  <div className="flex flex-col items-center justify-center min-w-[70px] md:min-w-[90px] border-r border-zinc-800/50 pr-4 md:pr-8">
                    <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{booking.start_time}</span>
                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1 md:mt-2">Start</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-lg md:text-xl font-black uppercase italic tracking-tighter ${bay.text}`}>{bay.name}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                      {booking.player_count}P // {booking.duration_hours}H
                    </span>
                  </div>
                </div>

                {/* Guest Info — grid layout for overflow control */}
                <div className="grid grid-cols-[1fr_auto] items-center px-2 md:px-10 py-2 md:py-0 w-full md:flex-1 md:border-l border-zinc-800/30 mb-4 md:mb-0 min-w-0">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight truncate max-w-[140px] md:max-w-[220px]">{booking.guest_name || 'WALK-IN'}</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      {booking.addon_water_qty > 0 && <span className="text-[9px] font-bold text-zinc-500">Water(x{booking.addon_water_qty})</span>}
                      {booking.addon_gloves_qty > 0 && <span className="text-[9px] font-bold text-zinc-500">Gloves(x{booking.addon_gloves_qty})</span>}
                      {booking.addon_balls_qty > 0 && <span className="text-[9px] font-bold text-zinc-500">Balls(x{booking.addon_balls_qty})</span>}
                      {booking.addon_club_rental && <span className="text-[9px] font-bold text-primary/80 uppercase">Clubs</span>}
                      {booking.addon_coaching && <span className="text-[9px] font-bold text-amber-500/80 uppercase">Coach</span>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {online ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] md:text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><Globe size={10} /> Online</span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] md:text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20"><Smartphone size={10} /> POS</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount + Actions — pushed right */}
                <div className="flex flex-row items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end px-2 md:px-0 flex-shrink-0">
                  <div className="flex flex-col items-start md:items-end">
                    <div className="flex items-center gap-2 md:gap-0 md:flex-col md:items-end">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase md:hidden">Total</span>
                      <span className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tighter leading-none">R{booking.total_price}</span>
                    </div>
                    {/* Quick Extend — Optimistic */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickExtend(booking); }}
                      className="mt-1.5 flex items-center gap-1 text-[8px] font-black uppercase text-primary/70 hover:text-primary transition-all active:scale-95 border border-primary/20 hover:border-primary/50 px-2 py-1 rounded min-h-[32px]"
                    >
                      <Clock size={10} /> +1H
                    </button>
                    <div className="flex items-center gap-1.5 opacity-60 mt-1">
                      <CreditCard size={10} />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">{booking.payment_type || 'PENDING'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    {paid ? (
                      <Button
                        size="sm"
                        className="bg-emerald-600/80 hover:bg-emerald-500 text-white font-black text-[9px] uppercase h-12 min-h-[44px] px-3 md:px-5 shadow-lg group-hover:scale-105 transition-transform min-w-[44px]"
                        onClick={(e) => { e.stopPropagation(); handleQuickSettle(booking, 'unsettle'); }}
                      >
                        <CheckCircle className="w-3 h-3 md:mr-1.5" /> <span className="hidden md:inline">Paid</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase h-12 min-h-[44px] px-3 md:px-5 shadow-lg group-hover:scale-105 transition-transform min-w-[44px]"
                        onClick={(e) => { e.stopPropagation(); handleQuickSettle(booking, 'settle'); }}
                      >
                        <XCircle className="w-3 h-3 md:mr-1.5" /> <span className="hidden md:inline">Settle</span>
                      </Button>
                    )}

                    <div className="p-2.5 md:p-3 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <Edit2 size={14} className="text-zinc-500 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ManagerModal
        isOpen={isModalOpen}
        booking={selectedBooking}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
