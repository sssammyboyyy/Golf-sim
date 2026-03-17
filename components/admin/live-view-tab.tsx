'use client';

import { useState, useEffect } from 'react';
import { getSASTDate } from '@/lib/utils';
import { ManagerModal } from './manager-modal';
import { Plus, CheckCircle, CreditCard, ChevronRight, Activity, Layers, Edit2, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function LiveViewTab() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🗓️ Date Finder State (SAST Enforcement)
  const [selectedDate, setSelectedDate] = useState<string>(getSASTDate());

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchDashboardData = async () => {
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
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleOpenCreate = () => {
    setSelectedBooking({
      guest_name: '', guest_email: '', guest_phone: '',
      simulator_id: 1, player_count: 1, duration_hours: 1,
      start_time: '12:00', booking_date: selectedDate,
      status: 'confirmed', payment_type: 'cash', payment_status: 'paid_instore',
      addon_water_qty: 0, addon_gloves_qty: 0, addon_balls_qty: 0,
      addon_club_rental: false, addon_coaching: false,
      addon_water_price: 20, addon_gloves_price: 220, addon_balls_price: 50,
      notes: ''
    });
    setIsModalOpen(true);
  };

  // ⚡ THE QUICK SETTLE ACTION (Stripped payload to only required fields)
  const handleQuickSettle = async (booking: any) => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const res = await fetch('/api/bookings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: booking.id,
          status: 'confirmed',
          payment_type: 'cash',
          payment_status: 'paid_instore',
          pin
        }),
      });

      if (!res.ok) throw new Error("Quick Settle Failed");
      fetchDashboardData();
    } catch (err) {
      console.error("Settle Error:", err);
      alert("Could not settle record. System offline or API mismatch.");
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

      if (!res.ok) throw new Error("Save operation failed.");
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
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
      fetchDashboardData();
    } catch (err) {
      alert("System could not destroy record. Ghost cleanup failed.");
    }
  };

  return (
    <div className="w-full space-y-6 max-w-6xl mx-auto px-4 pb-20 mt-4">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 border-b-2 border-zinc-800 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.3em]">
            <Activity size={14} className="animate-pulse" /> Live Activity Portal
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-white">The Ledger</h2>
        </div>

        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={handleOpenCreate}
              className="flex-1 md:flex-none bg-white text-black hover:bg-primary hover:text-white font-black uppercase text-xs px-8 h-12 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Walk-in
            </Button>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl w-full md:w-auto">
            <button onClick={() => shiftDate(-1)} className="p-3 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white border-r border-zinc-800">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3 px-6 py-2 bg-black/40">
              <CalendarIcon size={14} className="text-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-black text-white outline-none cursor-pointer uppercase tracking-tighter"
              />
            </div>
            <button onClick={() => shiftDate(1)} className="p-3 hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white border-l border-zinc-800">
              <ChevronRight size={20} />
            </button>
            <button onClick={() => setSelectedDate(getSASTDate())} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border-l border-zinc-800">
              TODAY
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-1">
          SYSTEM FAULT: {error}
        </div>
      )}

      <div className="space-y-3 min-h-[450px]">
        {isLoading ? (
          <div className="py-32 text-center animate-pulse">
            <div className="text-zinc-600 font-black uppercase tracking-[0.8em] text-xs">Syncing Ledger HUD...</div>
            <div className="mt-4 h-1 w-32 bg-zinc-800 mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress w-full" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="py-32 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-3xl text-center">
            <Layers size={48} className="mx-auto text-zinc-800 mb-6" />
            <p className="text-xs font-black uppercase tracking-[0.5em] text-zinc-700">No Operations Recorded for this Cycle</p>
          </div>
        ) : (
          data.map((booking) => (
            <div
              key={booking.id}
              onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }}
              className="group relative flex flex-col md:flex-row items-center justify-between p-6 bg-[#0a0a0a] border border-zinc-800/80 rounded-2xl hover:bg-zinc-800/20 hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-lg"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-2 ${booking.status === 'confirmed' ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'bg-amber-500 animate-pulse'}`} />

              <div className="flex items-center gap-8 w-full md:w-auto">
                <div className="flex flex-col items-center justify-center min-w-[90px] border-r border-zinc-800/50 pr-8">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">{booking.start_time}</span>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2">Cycle Start</span>
                </div>
                <div className="grid">
                  <span className="text-xl font-black text-white uppercase italic tracking-tighter">Bay {booking.simulator_id}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                    {booking.player_count} Players // {booking.duration_hours}H
                  </span>
                </div>
              </div>

              <div className="flex-1 px-10 py-4 md:py-0 w-full md:border-l border-zinc-800/30 my-4 md:my-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-zinc-100 tracking-tight">{booking.guest_name || 'WALK-IN'}</span>
                  {booking.booking_source === 'walk_in' && (
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase bg-zinc-800 text-zinc-500 rounded border border-zinc-700">POS Entry</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                  {booking.addon_water_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Water(x{booking.addon_water_qty})</span>}
                  {booking.addon_gloves_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Gloves(x{booking.addon_gloves_qty})</span>}
                  {booking.addon_balls_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Balls(x{booking.addon_balls_qty})</span>}
                  {booking.addon_club_rental && <span className="text-[10px] font-bold text-primary/80 uppercase">Clubs Req.</span>}
                  {booking.addon_coaching && <span className="text-[10px] font-bold text-amber-500/80 uppercase">Coaching session</span>}
                  {booking.notes && <span className="text-[10px] font-medium text-zinc-400 italic truncate max-w-[250px]">— "{booking.notes}"</span>}
                </div>
              </div>

              <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end">
                <div className="flex flex-col items-end">
                  <span className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none">R {booking.total_price}</span>
                  <div className="flex items-center gap-2 opacity-40 mt-2">
                    <CreditCard size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{booking.payment_type || 'PENDING'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {booking.payment_status !== 'completed' && booking.payment_status !== 'paid_instore' ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase h-10 px-5 shadow-lg group-hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickSettle(booking);
                      }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-2" /> Settle Now
                    </Button>
                  ) : (
                    <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 rounded-md">
                      PAID
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all">
                    <Edit2 size={16} className="text-zinc-600 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          ))
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