'use client';

import { useState, useEffect } from 'react';
import { getSASTDate } from '@/lib/utils';
import { format, startOfWeek, addDays, endOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, Smartphone, Globe, MapPin } from 'lucide-react';

const BAY_CONFIG: Record<number, { name: string; bg: string; border: string; text: string }> = {
    1: { name: "Lounge Bay", bg: "bg-indigo-500/10", border: 'border-indigo-500/40', text: 'text-indigo-400' },
    2: { name: "Middle Bay", bg: "bg-amber-500/10", border: 'border-amber-500/40', text: 'text-amber-400' },
    3: { name: "Window Bay", bg: "bg-emerald-500/10", border: 'border-emerald-500/40', text: 'text-emerald-400' }
};

export function WeeklyScheduleTab() {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(getSASTDate()), { weekStartsOn: 1 }));
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchBookings = async () => {
        setIsLoading(true);
        try {
            const pin = sessionStorage.getItem('admin-pin');
            const startStr = format(weekStart, "yyyy-MM-dd");
            const endStr = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
            
            const res = await fetch('/api/bookings/admin-dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pin, 
                    startDate: startStr, 
                    endDate: endStr 
                }),
            });

            if (res.status === 401) {
                sessionStorage.removeItem('admin-pin');
                window.location.reload();
                return;
            }

            if (!res.ok) throw new Error("Calendar sync failed.");
            
            const data = await res.json();
            setBookings(data.filter((b: any) => b.status !== 'cancelled') || []);
        } catch (err) {
            console.error("Error fetching weekly bookings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [weekStart]);

    const isOnline = (b: any) => !!b.yoco_payment_id || b.booking_source === 'online' || b.user_type === 'member';

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 w-full px-4 md:px-8 pb-20 mt-4 max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col w-full gap-4">
                    <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Weekly Agenda</h2>
                    <div className="flex flex-row items-center justify-between bg-[#09090b] rounded-xl border border-zinc-800 p-1.5 shadow-inner w-full md:w-auto h-14 md:h-12">
                        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-3 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all h-full flex items-center">
                            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <span className="px-4 md:px-6 text-xs md:text-sm font-mono text-zinc-300 font-bold tracking-widest uppercase truncate flex-1 text-center">
                            {format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d")}
                        </span>
                        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-3 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all h-full flex items-center">
                            <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={fetchBookings} 
                    className="p-4 bg-[#09090b] rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/40 h-14 md:h-12 w-full md:w-16 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isLoading}
                >
                    <RefreshCw className={`w-5 h-5 md:w-4 md:h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex overflow-x-auto pb-6 w-full snap-x snap-mandatory">
                <div className="grid grid-cols-7 gap-px min-w-[1000px] bg-zinc-800/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5 backdrop-blur-sm">
                  {Array.from({ length: 7 }).map((_, i) => {
                      const day = addDays(weekStart, i);
                      const isToday = isSameDay(day, new Date(getSASTDate()));
                      return (
                          <div key={i} className={`bg-[#050505] p-5 text-center border-b border-zinc-800/50 ${isToday ? 'bg-emerald-500/5 border-b-emerald-500/30' : ''} snap-center`}>
                              <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">{format(day, "EEE")}</div>
                              <div className={`text-3xl font-black ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>{format(day, "d")}</div>
                          </div>
                      );
                  })}
                  
                  {Array.from({ length: 7 }).map((_, i) => {
                      const day = addDays(weekStart, i);
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayBookings = bookings.filter(b => b.booking_date === dateStr)
                                                  .sort((a,b) => a.start_time.localeCompare(b.start_time));
                      
                      return (
                          <div key={i} className="bg-[#09090b]/40 min-h-[500px] p-2 space-y-3 border-r border-zinc-800/30 last:border-0 hover:bg-[#09090b]/80 transition-colors duration-500 pt-3">
                              {dayBookings.length === 0 && (
                                  <div className="text-zinc-600 text-[10px] text-center pt-24 font-bold uppercase tracking-widest opacity-40">Zero<br/>Scheduled</div>
                              )}
                              {dayBookings.map(b => {
                                  const config = BAY_CONFIG[b.simulator_id] || { text: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700', name: `Bay ${b.simulator_id}` };
                                  const online = isOnline(b);
                                  
                                  return (
                                      <div 
                                          key={b.id} 
                                          className={`p-3.5 rounded-xl border ${config.bg} ${config.border} flex flex-col cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md group`}
                                      >
                                          <div className="flex justify-between items-center mb-1">
                                              <span className="font-mono text-xs font-black text-white">{b.start_time.slice(0,5)}</span>
                                              <span className="text-[9px] uppercase tracking-tighter opacity-60 font-bold">{b.duration_hours}H</span>
                                          </div>
                                          <div className={`font-black text-xs mb-2 truncate ${config.text}`}>{b.guest_name || 'WALK-IN'}</div>
                                          
                                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                              <div className="flex items-center gap-1 opacity-75">
                                                  {online ? <Globe className="w-3 h-3 text-emerald-400" /> : <Smartphone className="w-3 h-3 text-purple-400" />}
                                                  <span className="text-[8px] font-black uppercase tracking-widest">{online ? 'ONLINE' : 'WALK-IN'}</span>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      );
                  })}
              </div>
            </div>
        </div>
    );
}
