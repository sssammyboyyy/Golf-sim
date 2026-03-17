'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { getSASTDate } from '@/lib/utils';
import { ManagerModal } from './manager-modal';
import { Plus, Edit2, CreditCard, ChevronRight, Activity, Layers } from 'lucide-react';

export function LiveViewTab() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const supabase = createBrowserClient();
      const todaySAST = getSASTDate();

      const { data: bookings, error: dbError } = await supabase
        .from('booking_dashboard')
        .select('*')
        .eq('booking_date', todaySAST)
        .order('start_time', { ascending: true });

      if (dbError) throw dbError;
      setData(bookings || []);
    } catch (err: any) {
      console.error("HUD Sync Error:", err);
      setError(err.message || "Failed to sync ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    // Pre-filled defaults to prevent DB constraint violations or UI crashes
    setSelectedBooking({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      simulator_id: 1,
      player_count: 1,
      duration_hours: 1,
      start_time: '12:00',
      booking_date: getSASTDate(),
      status: 'confirmed',
      payment_type: 'cash',
      addon_water_qty: 0,
      addon_gloves_qty: 0,
      addon_balls_qty: 0,
      addon_club_rental: false,
      addon_coaching: false,
      addon_water_price: 20,
      addon_gloves_price: 220,
      addon_balls_price: 50,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (booking: any) => {
    setModalMode('edit');
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const isEdit = !!formData.id;
      const endpoint = isEdit ? '/api/bookings/update' : '/api/bookings/admin-create';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, pin }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Save failed.");
      }
      
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
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

      if (!res.ok) throw new Error("Ghost Cleanup failed.");
      
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (error: any) {
      console.error(error);
      alert("System could not destroy record.");
    }
  };

  if (isLoading) return <div className="p-12 text-center animate-pulse text-zinc-500 font-black uppercase tracking-[0.5em]">Initialising Ledger...</div>;

  return (
    <div className="w-full space-y-6 max-w-6xl mx-auto px-4 pb-20 text-white">
      
      {/* INDUSTRIAL HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-6 border-b-2 border-zinc-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
             <Activity size={16} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Venue OS // Live Activity Feed</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">The Mulligan Ledger</h2>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="mt-4 md:mt-0 flex items-center gap-3 px-8 py-3 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95 rounded-md"
        >
          <Plus size={16} />
          Walk-in Entry
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-500 text-xs font-bold uppercase tracking-wide">
          DATA SYNC ERROR: {error}
        </div>
      )}

      {/* THE ACTIVITY LEDGER (HUD STYLE) */}
      <div className="space-y-3">
        {data.map((booking) => (
          <div 
            key={booking.id} 
            onClick={() => handleOpenEdit(booking)}
            className="group relative flex flex-col md:flex-row items-center justify-between p-5 bg-[#0a0a0a] border border-zinc-800 rounded-xl hover:bg-zinc-800/60 hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden shadow-md"
          >
            {/* Status Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

            {/* Left: Time & Session Context */}
            <div className="flex items-center gap-6 w-full md:w-auto pl-2">
              <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-zinc-800/50 pr-6 text-center">
                <span className="text-2xl font-black tabular-nums tracking-tighter leading-none">{booking.start_time}</span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">T-Time</span>
              </div>
              <div className="grid">
                <span className="text-lg font-black uppercase italic tracking-tight leading-none">Bay {booking.simulator_id}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mt-1">
                  {booking.player_count} Plyrs // {booking.duration_hours}h
                </span>
              </div>
            </div>

            {/* Middle: Identity & Micro-Ledger */}
            <div className="flex-1 px-8 py-4 md:py-0 w-full border-y md:border-y-0 border-zinc-800/30 my-4 md:my-0">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-zinc-100">{booking.guest_name || 'Walk-in Guest'}</span>
                {booking.booking_source === 'walk_in' && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-zinc-800 text-zinc-400 rounded-sm border border-zinc-700 tracking-wider">Walk-in</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {booking.addon_water_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Water(x{booking.addon_water_qty})</span>}
                {booking.addon_gloves_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Gloves(x{booking.addon_gloves_qty})</span>}
                {booking.addon_balls_qty > 0 && <span className="text-[10px] font-bold text-zinc-500">Balls(x{booking.addon_balls_qty})</span>}
                {booking.addon_club_rental && <span className="text-[10px] font-bold text-zinc-500">Clubs</span>}
                {booking.addon_coaching && <span className="text-[10px] font-bold text-zinc-500 uppercase">Coaching</span>}
                {booking.notes && <span className="text-[10px] font-bold text-emerald-500 italic truncate max-w-[200px]">Note: {booking.notes}</span>}
              </div>
            </div>

            {/* Right: Financial Settlement */}
            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black tabular-nums tracking-tighter leading-none">R {booking.total_price}</span>
                <div className="flex items-center gap-1.5 opacity-60 mt-1">
                  <CreditCard size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{booking.payment_type || 'unpaid'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] rounded-sm border ${
                  booking.status === 'confirmed' 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {booking.status}
                </span>
                <div className="p-2 rounded-full bg-zinc-800/50 group-hover:bg-emerald-500/20 transition-colors">
                   <Edit2 size={16} className="text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="py-24 border border-dashed border-zinc-800 bg-zinc-900/20 rounded-2xl text-center">
            <Layers size={32} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600">Ledger Empty // No Bookings Today</p>
          </div>
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
