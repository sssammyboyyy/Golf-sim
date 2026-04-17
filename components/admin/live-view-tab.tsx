'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSASTDate } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import { ManagerModal } from './manager-modal';
import { toast } from 'sonner';
import { Plus, CheckCircle, ChevronRight, Activity, Layers, Edit2, ChevronLeft, Calendar as CalendarIcon, Banknote, Users, Target, AlertTriangle, Globe, Smartphone, Trash2, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";

const GET_BASE_HOURLY_RATE = (players: number): number => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

const BAY_CONFIG: Record<number, { name: string; text: string; border: string }> = {
  1: { name: 'LOUNGE BAY', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  2: { name: 'MIDDLE BAY', text: 'text-amber-400', border: 'border-amber-500/30' },
  3: { name: 'WINDOW BAY', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};
const getBayConfig = (id: number) => BAY_CONFIG[id] || { name: `BAY ${id}`, text: 'text-zinc-400', border: 'border-zinc-500/30' };

export function LiveViewTab() {
  const [data, setData] = useState<any[]>([]);
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
      if (res.status === 401) { sessionStorage.removeItem('admin-pin'); window.location.reload(); return; }
      if (!res.ok) throw new Error("Sync Failed");
      setData(await res.json() || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to sync ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => { fetchDashboardData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDashboardData]);

  const activeBookings = useMemo(() => data.filter(b => b.status !== 'cancelled' && b.status !== 'rejected'), [data]);
  const grossRevenue = useMemo(() => activeBookings.reduce((sum, b) => sum + (Number(b.amount_paid) || 0), 0), [activeBookings]);
  const outstanding = useMemo(() => activeBookings.reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0), [activeBookings]);
  const totalPlayers = useMemo(() => activeBookings.reduce((sum, b) => sum + (Number(b.player_count) || 1), 0), [activeBookings]);
  const totalBookings = activeBookings.length;

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00+02:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formattedDateLabel = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T12:00:00+02:00');
      return new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    } catch { return selectedDate; }
  }, [selectedDate]);

  const handleOpenCreate = (prefillBayId: number = 1) => {
    const now = new Date();
    const defaultTime = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg', hour12: false });
    setSelectedBooking({
      guest_name: '', guest_email: 'walkin@venue-os.com', guest_phone: '',
      simulator_id: prefillBayId, player_count: 1, duration_hours: 1,
      start_time: defaultTime, booking_date: selectedDate,
      status: 'confirmed', payment_type: 'pending', payment_status: 'pending', user_type: 'guest',
      addon_water_qty: 0, addon_gloves_qty: 0, addon_balls_qty: 0,
      addon_club_rental: false, addon_coaching: false,
      addon_water_price: 20, addon_gloves_price: 220, addon_balls_price: 50, notes: ''
    });
    setIsModalOpen(true);
  };

  const handleQuickExtend = (booking: any, hours: number) => {
    const snapshot = [...data];
    const addedRate = GET_BASE_HOURLY_RATE(Number(booking.player_count || 1)) * hours;
    setData(prev => prev.map(b => {
      if (b.id !== booking.id) return b;
      return { ...b, duration_hours: Number(b.duration_hours) + hours, total_price: Number(b.total_price) + addedRate, amount_due: Number(b.amount_due || 0) + addedRate, payment_status: 'pending', payment_type: 'pending' };
    }));
    toast.success(`+${hours}H Extended`, { duration: 2000 });

    const pin = sessionStorage.getItem('admin-pin');
    const newEnd = new Date(new Date(booking.slot_end).getTime() + hours * 60 * 60 * 1000).toISOString();
    const payload = { id: booking.id, pin, new_slot_end: newEnd, duration_hours_added: hours, player_count: booking.player_count };
    
    fetch('/api/bookings/admin-extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async (res) => {
        if (!res.ok) { setData(snapshot); toast.error('Extension failed. Rolled back.', { duration: 3000 }); fetchDashboardData(); }
      }).catch(() => { setData(snapshot); toast.error('Network error.', { duration: 3000 }); });
  };

  const handleQuickSettle = async (booking: any, action: 'settle' | 'unsettle') => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const payload: any = { id: booking.id, pin };
      if (action === 'settle') {
        payload.status = 'confirmed'; payload.payment_type = 'cash'; payload.payment_status = 'paid_instore';
      } else {
        payload.payment_status = 'pending'; payload.payment_type = 'pending';
      }
      const res = await fetch('/api/bookings/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`${action} Failed`);
      toast.success(`${action} Successful`);
      fetchDashboardData();
    } catch (err) { toast.error(`Operation failed.`); }
  };

  const handleSave = async (formData: any) => {
    const isEdit = !!formData.id;
    let endpoint = isEdit ? '/api/bookings/update' : '/api/bookings/admin-create';
    let method = 'POST';

    // ━━ FINANCIAL OVERRIDE ROUTING ━━
    if (isEdit && formData.isManualOverride) {
      endpoint = '/api/bookings/admin-update';
      method = 'PATCH';
    }

    try {
      const pin = sessionStorage.getItem('admin-pin');
      const payload = { ...formData, pin };
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed.");
      setIsModalOpen(false);
      toast.success(isEdit ? 'Booking updated.' : 'Walk-in created.');
      fetchDashboardData();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch('/api/bookings/admin-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      setIsModalOpen(false);
      toast.success('Record destroyed.');
      fetchDashboardData();
    } catch (err) { toast.error("Delete failed."); }
  };

  const isPaid = (b: any) => b.payment_status === 'completed' || b.payment_status === 'paid_instore';
  const isOnline = (b: any) => !!b.yoco_payment_id || b.booking_source === 'online' || b.user_type === 'member';

  return (
    <div className="w-full space-y-4 max-w-6xl mx-auto px-2 md:px-4 pb-20 mt-4">
      {/* ━━ HEADER ━━ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b-2 border-zinc-800 gap-4">
        <div className="flex flex-col space-y-1 w-full">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
            <Activity size={14} className="animate-pulse" /> Live Activity Portal
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase text-white">{formattedDateLabel}</h2>
        </div>
        <div className="flex flex-col items-stretch gap-3 w-full md:w-auto">
          <Button onClick={() => handleOpenCreate(1)} className="bg-white text-black hover:bg-primary hover:text-white font-black uppercase text-xs h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> ADD WALK-IN
          </Button>
          <div className="flex items-center justify-between md:justify-start bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl h-12 md:h-auto">
            <button onClick={() => shiftDate(-1)} className="p-3 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white border-r border-zinc-800"><ChevronLeft size={16} /></button>
            <div className="flex-1 md:flex-none flex items-center justify-center gap-3 px-4 py-2 bg-black/40">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xs font-black text-white outline-none cursor-pointer uppercase" />
            </div>
            <button onClick={() => shiftDate(1)} className="p-3 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white border-l border-zinc-800"><ChevronRight size={16} /></button>
            <button onClick={() => setSelectedDate(getSASTDate())} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white border-l border-zinc-800 h-full hidden md:flex items-center">TODAY</button>
          </div>
        </div>
      </div>

      {/* ━━ METRICS ━━ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'BANKED', value: `R ${grossRevenue.toLocaleString()}`, icon: Banknote, color: 'text-emerald-400', border: 'border-emerald-500/20' },
          { label: 'OUTSTANDING', value: `R ${outstanding.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20' },
          { label: 'PLAYERS', value: totalPlayers, icon: Users, color: 'text-sky-400', border: 'border-sky-500/20' },
          { label: 'ROUNDS', value: totalBookings, icon: Target, color: 'text-amber-400', border: 'border-amber-500/20' },
        ].map((m) => (
          <div key={m.label} className={`relative overflow-hidden bg-[#0a0a0a] ${m.border} border border-zinc-800 rounded-xl p-3`}>
            <div className="absolute top-[-8px] right-[-8px] opacity-[0.07] pointer-events-none"><m.icon size={50} /></div>
            <div className="flex items-center gap-1.5 mb-1"><m.icon size={10} className={m.color} /><span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{m.label}</span></div>
            <span className={`text-lg md:text-2xl font-black tabular-nums tracking-tighter ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* ━━ BOOKING CARDS (COMPACTED) ━━ */}
      <div className="flex flex-col space-y-3">
        {isLoading ? (
          <div className="py-20 text-center animate-pulse text-zinc-600 font-black uppercase tracking-[0.8em] text-xs">Syncing Ledger...</div>
        ) : data.length === 0 ? (
          <div className="py-20 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-2xl text-center px-4">
            <p className="text-xs font-black uppercase tracking-[0.5em] text-zinc-700">No Operations Recorded</p>
          </div>
        ) : (
          data.map((booking) => {
            const bay = getBayConfig(booking.simulator_id);
            const paid = isPaid(booking);
            const online = isOnline(booking);

            return (
              <div key={booking.id} onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }} className={`group relative flex flex-col md:flex-row items-stretch md:items-center justify-between p-2.5 md:p-3 bg-[#0a0a0a] ${bay.border} border border-zinc-800/80 rounded-xl hover:bg-zinc-800/40 hover:border-primary/50 transition-all cursor-pointer shadow-lg`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.amount_due > 0 && Number(booking.amount_paid) > 0 ? 'bg-amber-500' : booking.amount_due > 0 ? 'bg-red-500' : 'bg-emerald-500'} ${booking.amount_due > 0 && !paid ? 'animate-pulse' : ''}`} />

                <div className="flex flex-row items-center gap-3 md:gap-5 w-full md:w-auto pl-3 mb-2 md:mb-0">
                  <div className="flex flex-col items-center justify-center min-w-[60px] md:min-w-[70px] border-r border-zinc-800/50 pr-3 md:pr-5">
                    <span className="text-xl md:text-2xl font-black text-white tabular-nums tracking-tighter leading-none">{booking.start_time}</span>
                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Start</span>
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-base md:text-lg font-black uppercase italic tracking-tighter leading-none ${bay.text}`}>{bay.name}</span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{booking.player_count}P // {booking.duration_hours}H</span>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center px-1 md:px-6 w-full md:flex-1 md:border-l border-zinc-800/30 mb-2 md:mb-0 min-w-0">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-base md:text-lg font-black text-zinc-100 tracking-tight truncate leading-none">{booking.guest_name || 'WALK-IN'}</span>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                      {booking.addon_water_qty > 0 && <span className="text-[8px] font-bold text-zinc-500">Water(x{booking.addon_water_qty})</span>}
                      {booking.addon_gloves_qty > 0 && <span className="text-[8px] font-bold text-zinc-500">Gloves(x{booking.addon_gloves_qty})</span>}
                      {booking.addon_balls_qty > 0 && <span className="text-[8px] font-bold text-zinc-500">Balls(x{booking.addon_balls_qty})</span>}
                      {booking.addon_club_rental && <span className="text-[8px] font-bold text-primary/80 uppercase">Clubs</span>}
                      {booking.addon_coaching && <span className="text-[8px] font-bold text-amber-500/80 uppercase">Coach</span>}
                    </div>
                  </div>
                </div>

                {/* ━━ EXPLICIT LEDGER BLOCK ━━ */}
                <div className="flex flex-row items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-end px-1 md:px-0 flex-shrink-0">
                  <div className="flex flex-col items-end bg-[#131313] p-2 rounded-lg border border-zinc-800/80 min-w-[130px] shadow-inner">
                    <div className="flex justify-between items-end w-full mb-1 border-b border-white/5 pb-1">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">TOTAL</span>
                      <span className="text-xl font-black text-white tabular-nums tracking-tighter leading-none">R{booking.total_price ?? 0}</span>
                    </div>
                    <div className="flex justify-between w-full text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                      <span>Paid:</span> <span className="text-emerald-400">R{booking.amount_paid || 0}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Due:</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${booking.amount_due > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>R{booking.amount_due ?? 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {paid ? (
                      <Button size="sm" className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 font-black text-[9px] uppercase h-10 px-3 transition-all rounded-lg" onClick={(e) => { e.stopPropagation(); handleQuickSettle(booking, 'unsettle'); }}>
                        <CheckCircle className="w-3 h-3 md:mr-1.5" /> <span className="hidden md:inline">Paid</span>
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-black text-[9px] uppercase h-10 px-4 shadow-xl transition-all rounded-lg animate-pulse" onClick={(e) => { e.stopPropagation(); handleQuickSettle(booking, 'settle'); }}>
                        <Plus className="w-3 h-3 md:mr-1.5" /> <span className="hidden md:inline">Settle</span>
                      </Button>
                    )}
                    <div className="flex flex-col items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                       <button onClick={(e) => { e.stopPropagation(); handleQuickExtend(booking, 0.5); }} className="text-[8px] font-black text-primary hover:text-white bg-primary/10 hover:bg-primary px-2 py-1 rounded transition-all">+30m</button>
                       <button onClick={(e) => { e.stopPropagation(); handleQuickExtend(booking, 1); }} className="text-[8px] font-black text-primary hover:text-white bg-primary/10 hover:bg-primary px-2 py-1 rounded transition-all">+1H</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <ManagerModal isOpen={isModalOpen} booking={selectedBooking} onClose={() => setIsModalOpen(false)} onSave={handleSave} onDelete={handleDelete} />
    </div>
  );
}
