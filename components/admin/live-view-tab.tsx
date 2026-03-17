'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { getSASTDate } from '@/lib/utils';
import { ManagerModal } from './manager-modal';
import { Plus, Edit2 } from 'lucide-react';

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
      console.error("Dashboard Fetch Error:", err);
      if (err.message?.includes('Legacy API keys') || err.code === 'PGRST301') {
        setError("Database connection failed: 401 Unauthorized. Please update to modern publishable API keys.");
      } else {
        setError(err.message || "Failed to load dashboard data. Check environment configuration.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedBooking({
      player_count: 1,
      duration_hours: 1,
      booking_date: getSASTDate(),
      status: 'confirmed',
      payment_type: 'cash',
      addon_water_qty: 0,
      addon_gloves_qty: 0,
      addon_balls_qty: 0,
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
        throw new Error(err.message || "Failed to save booking.");
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

      if (!res.ok) throw new Error("Failed to execute Ghost Cleanup");
      
      setIsModalOpen(false);
      fetchDashboardData();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Deletion failed. Check console.");
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-zinc-500 font-black uppercase tracking-widest">Loading live view...</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Live Dashboard</h2>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-all shadow-xl"
        >
          <Plus className="w-4 h-4" />
          Quick Add Walk-in
        </button>
      </div>

      {error && (
        <div className="p-6 mb-8 text-white bg-red-600/10 border border-red-600/30 rounded-2xl shadow-xl backdrop-blur-md">
          <h3 className="font-black text-lg uppercase tracking-tight mb-2">System Configuration Error</h3>
          <p className="text-sm font-medium opacity-90">{error}</p>
          <div className="mt-4 p-3 bg-red-600/20 rounded-xl border border-red-600/20 text-[10px] font-black uppercase tracking-widest">
            Action Required: Check Cloudflare Environment Variables or Supabase API Key Status.
          </div>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((booking) => (
            <div key={booking.id} className="p-6 bg-[#09090b] border border-zinc-900 rounded-[2rem] shadow-2xl ring-1 ring-white/5 group hover:border-zinc-700 transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-black text-white text-lg tracking-tight leading-tight">{booking.guest_name}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Bay {booking.simulator_id}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl ${booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {booking.status}
                  </span>
                  {booking.booking_source === 'walk_in' && (
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700">
                      Walk-in
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <p className="text-sm font-bold">{booking.start_time}</p>
                </div>
                
                <button 
                  onClick={() => handleOpenEdit(booking)}
                  className="p-2 bg-zinc-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="col-span-full py-20 bg-zinc-900/10 border border-zinc-900 border-dashed rounded-[2rem] text-center">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-600">No bookings scheduled for today.</p>
            </div>
          )}
        </div>
      )}

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

