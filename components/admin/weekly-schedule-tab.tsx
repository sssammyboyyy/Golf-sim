'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { getSASTDate } from '@/lib/utils';
import { format, startOfWeek, addDays, endOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, Smartphone, Globe } from 'lucide-react';

const BAY_NAMES: Record<number, string> = {
    1: "Lounge Bay",
    2: "Middle Bay",
    3: "Window Bay"
};

export function WeeklyScheduleTab() {
    const supabase = createBrowserClient();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(getSASTDate()), { weekStartsOn: 1 }));
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchBookings = async () => {
        setIsLoading(true);
        try {
            const start = format(weekStart, "yyyy-MM-dd");
            const end = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");
            
            const { data, error } = await supabase
                .from("bookings")
                .select("*")
                .gte("booking_date", start)
                .lte("booking_date", end)
                .neq("status", "cancelled");

            if (error) throw error;
            setBookings(data || []);
        } catch (err) {
            console.error("Error fetching weekly bookings:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [weekStart]);

    const isWalkIn = (b: any) => b.booking_source === 'walk_in' || b.user_type === 'walk_in';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Weekly Schedule</h2>
                    <div className="flex items-center bg-[#09090b] rounded-xl border border-zinc-800 p-1 shadow-inner">
                        <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-6 text-sm font-mono text-zinc-300 font-bold tracking-widest uppercase">
                            {format(weekStart, "MMM d")} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d")}
                        </span>
                        <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <button 
                    onClick={fetchBookings} 
                    className="p-3 bg-[#09090b] rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/40"
                    disabled={isLoading}
                >
                    <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-800/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5 backdrop-blur-sm">
                {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(weekStart, i);
                    const isToday = isSameDay(day, new Date(getSASTDate()));
                    return (
                        <div key={i} className={`bg-[#050505] p-5 text-center border-b border-zinc-800/50 ${isToday ? 'bg-emerald-500/5' : ''}`}>
                            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">{format(day, "EEE")}</div>
                            <div className={`text-2xl font-black ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>{format(day, "d")}</div>
                        </div>
                    );
                })}
                
                {Array.from({ length: 7 }).map((_, i) => {
                    const day = addDays(weekStart, i);
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayBookings = bookings.filter(b => b.booking_date === dateStr)
                                                .sort((a,b) => a.start_time.localeCompare(b.start_time));
                    
                    return (
                        <div key={i} className="bg-[#09090b]/40 min-h-[500px] p-2.5 space-y-3 border-r border-zinc-800/30 last:border-0 hover:bg-[#09090b]/60 transition-colors duration-500">
                            {dayBookings.length === 0 && (
                                <div className="text-zinc-800 text-[10px] text-center pt-24 font-bold uppercase tracking-widest opacity-40">Empty</div>
                            )}
                            {dayBookings.map(b => (
                                <div 
                                    key={b.id} 
                                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer hover:scale-[1.04] transition-all duration-300 shadow-lg group relative overflow-hidden ${
                                        isWalkIn(b)
                                            ? 'bg-purple-600/5 border-purple-500/20 text-purple-200 hover:bg-purple-600/10 hover:border-purple-500/40' 
                                            : 'bg-emerald-600/5 border-emerald-500/20 text-emerald-200 hover:bg-emerald-600/10 hover:border-emerald-500/40'
                                    }`}
                                >
                                    {/* Ambient Glow on hover */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isWalkIn(b) ? 'bg-purple-500/5' : 'bg-emerald-500/5'}`} />
                                    
                                    <div className="font-bold flex justify-between items-center mb-1.5 relative z-10">
                                        <span className="font-mono text-white/90">{b.start_time.slice(0,5)}</span>
                                        <span className="text-[9px] uppercase tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">{b.duration_hours}H</span>
                                    </div>
                                    <div className="font-bold text-white mb-2 truncate relative z-10 group-hover:text-emerald-400 transition-colors">{b.guest_name}</div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="text-[9px] uppercase font-bold tracking-widest opacity-30 group-hover:opacity-60 transition-opacity">
                                            {BAY_NAMES[b.simulator_id] || "TBD"}
                                        </div>
                                        {isWalkIn(b) ? <Smartphone className="w-3 h-3 text-purple-400/50" /> : <Globe className="w-3 h-3 text-emerald-400/50" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
