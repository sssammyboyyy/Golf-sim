'use client';

import { useState, useEffect } from 'react';
import { getSASTDate } from '@/lib/utils';
import { ManagerModal } from './manager-modal';
import { Plus, CheckCircle, CreditCard, Activity, Layers, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function LiveViewTab() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const today = getSASTDate();

      const res = await fetch('/api/bookings/admin-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, startDate: today }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin-pin');
        window.location.reload(); // Force re-auth
        return;
      }

      if (!res.ok) throw new Error("Ledger Sync Failed");
      const bookings = await res.json();
      setData(bookings || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const handleQuickSettle = async (booking: any) => {
    try {
      const pin = sessionStorage.getItem('admin-pin');
      const res = await fetch('/api/bookings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...booking, 
          status: 'confirmed', 
          payment_type: 'cash',
          pin 
        }),
      });

      if (!res.ok) throw new Error("Settle Failed");
      fetchDashboardData();
    } catch (err) {
      alert("Could not settle record.");
    }
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500 font-black uppercase">Syncing HUD...</div>;

  return (
    <div className="w-full space-y-6 max-w-6xl mx-auto px-4 pb-20">
      <div className="flex justify-between items-end pb-6 border-b-2 border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
            <Activity size={14} /> Live Activity
          </div>
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter">The Ledger</h2>
        </div>
        <Button onClick={() => { setSelectedBooking(null); setIsModalOpen(true); }} className="bg-white text-black hover:bg-emerald-500 hover:text-white font-black uppercase text-xs px-8 h-12">
          <Plus className="mr-2 h-4 w-4" /> Add Walk-in
        </Button>
      </div>

      <div className="space-y-3">
        {data.map((booking) => (
          <div key={booking.id} onClick={() => { setSelectedBooking(booking); setIsModalOpen(true); }} className="group relative flex flex-col md:flex-row items-center justify-between p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-emerald-500 transition-all cursor-pointer overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${booking.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            
            <div className="flex items-center gap-6">
              <div className="text-center min-w-[70px] border-r border-zinc-800 pr-6">
                <span className="text-2xl font-black text-white tabular-nums">{booking.start_time}</span>
              </div>
              <div className="grid">
                <span className="text-lg font-black text-white uppercase italic">Bay {booking.simulator_id}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">{booking.player_count} Players // {booking.duration_hours}h</span>
              </div>
            </div>

            <div className="flex-1 px-10">
               <div className="text-xl font-bold text-zinc-100">{booking.guest_name}</div>
               <div className="flex gap-4 mt-1 text-[10px] font-bold text-zinc-500 uppercase">
                 {booking.addon_water_qty > 0 && <span>Water x{booking.addon_water_qty}</span>}
                 {booking.addon_club_rental && <span>Clubs</span>}
                 {booking.notes && <span className="text-emerald-500 italic truncate max-w-[200px]">Note: {booking.notes}</span>}
               </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <span className="text-2xl font-black text-white">R {booking.total_price}</span>
                <div className="text-[10px] font-black uppercase opacity-40">{booking.payment_type || 'unpaid'}</div>
              </div>
              
              <div className="flex items-center gap-3">
                {booking.status === 'pending' ? (
                  <Button 
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase h-8"
                    onClick={(e) => { e.stopPropagation(); handleQuickSettle(booking); }}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Settle Now
                  </Button>
                ) : (
                  <span className="px-3 py-1.5 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">Confirmed</span>
                )}
                <div className="p-2 bg-zinc-800 rounded-full group-hover:bg-emerald-500/20"><Edit2 size={14} className="text-zinc-500 group-hover:text-emerald-500" /></div>
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

      <ManagerModal isOpen={isModalOpen} booking={selectedBooking} onClose={() => setIsModalOpen(false)} onSave={fetchDashboardData} onDelete={fetchDashboardData} />
    </div>
  );
}
