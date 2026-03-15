'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Armchair, LayoutGrid, Maximize, Users, Clock, Smartphone, Globe, CheckCircle, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { addDays } from 'date-fns';

// Define a basic type for the booking. You might have a more detailed one in `lib/types.ts`
interface LiveBooking {
    id: string;
    guest_name: string;
    simulator_id: number;
    slot_start: string;
    slot_end: string;
}

// This component would be your BayStatusDisplay.tsx or similar
const BAY_NAMES: Record<number, string> = {
    1: "Lounge Bay",
    2: "Middle Bay",
    3: "Window Bay"
};

const BayStatusDisplay = ({ bookings }: { bookings: LiveBooking[] }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const bayInfo = [
        { id: 1, label: "Lounge Bay", icon: Armchair },
        { id: 2, label: "Middle Bay", icon: LayoutGrid },
        { id: 3, label: "Window Bay", icon: Maximize },
    ];

    const occupiedBayIds = bookings
        .filter(b => {
            const start = new Date(b.slot_start).getTime();
            const end = new Date(b.slot_end).getTime();
            const now = currentTime.getTime();
            return start <= now && end > now;
        })
        .map(b => b.simulator_id);

    return (
        <div className="w-full space-y-12">
            {/* Header Status Badge */}
            <div className="flex justify-center animate-in zoom-in duration-500">
                <div className="bg-orange-600 text-white rounded-full px-10 py-4 shadow-2xl shadow-orange-950/40 flex items-center gap-4 transform hover:scale-105 transition-all duration-500 border border-orange-400/30 ring-4 ring-orange-600/10">
                    <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                    </div>
                    <h2 className="font-black text-xl md:text-2xl tracking-[0.15em] uppercase">
                        {3 - occupiedBayIds.length} BAYS AVAILABLE
                    </h2>
                </div>
            </div>

            {/* Grid of Bays */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                {bayInfo.map((bay) => {
                    const isOccupied = occupiedBayIds.includes(bay.id);
                    const Icon = bay.icon;
                    const currentBooking = isOccupied ? bookings.find(b => {
                        const start = new Date(b.slot_start).getTime();
                        const end = new Date(b.slot_end).getTime();
                        const now = currentTime.getTime();
                        return b.simulator_id === bay.id && start <= now && end > now;
                    }) : null;

                    return (
                        <div
                            key={bay.id}
                            className={`
                                relative group overflow-hidden rounded-[2.5rem] border-2 p-8 flex flex-col items-center justify-center transition-all duration-500
                                ${!isOccupied
                                    ? "bg-[#09090b] border-emerald-500/10 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-950/20"
                                    : "bg-[#09090b] border-red-500/10 opacity-90 shadow-2xl"}
                            `}
                        >
                            {/* Status Dot */}
                            <div className={`
                                absolute top-6 right-6 h-3 w-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]
                                ${!isOccupied ? "bg-emerald-500 shadow-emerald-500/50 animate-pulse" : "bg-red-500 shadow-red-500/50"}
                            `} />

                            {/* Icon */}
                            <div className={`
                                mb-6 p-6 rounded-3xl transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3
                                ${!isOccupied ? "bg-emerald-500/5 text-emerald-500 group-hover:bg-emerald-500/10" : "bg-red-500/5 text-red-500"}
                            `}>
                                <Icon className="w-10 h-10" />
                            </div>

                            {/* Bay Name */}
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight uppercase group-hover:text-emerald-400 transition-colors">{bay.label}</h3>

                            {/* Current Guest if occupied */}
                            <div className="h-6 mb-6">
                                {currentBooking ? (
                                    <div className="text-zinc-500 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2">
                                        <Users className="w-3.5 h-3.5 text-zinc-600" /> {currentBooking.guest_name}
                                    </div>
                                ) : (
                                    <div className="text-zinc-700 text-sm font-black tracking-widest uppercase">Vacant</div>
                                )}
                            </div>

                            {/* Status Pill */}
                            <div className={`
                                px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mb-4 transition-all duration-500
                                ${!isOccupied ? "bg-emerald-600 text-white shadow-xl shadow-emerald-900/40" : "bg-zinc-800 text-zinc-500"}
                            `}>
                                {!isOccupied ? "Available" : "Occupied"}
                            </div>

                            {/* Helper Text */}
                            <span className={`text-[10px] font-black uppercase tracking-widest ${!isOccupied ? "text-emerald-500/50" : "text-zinc-500"}`}>
                                {!isOccupied ? "Walk-ins Welcome" : `Until ${new Date(currentBooking!.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Upcoming Bookings Table */}
            <div className="bg-[#09090b] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/5 animate-in slide-in-from-bottom-8 duration-1000">
                <div className="px-10 py-8 border-b border-zinc-900 flex justify-between items-center bg-[#0d0d11]">
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <Clock className="w-6 h-6 text-zinc-500" /> LIVE SCHEDULE
                        </h3>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1 ml-9">Operational Overview</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Today</span>
                            <span className="text-sm font-black text-white">{currentTime.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800" />
                        <button className="p-3 bg-[#050505] rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-500 hover:text-white">
                            <Maximize className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0d0d11] text-[10px] uppercase text-zinc-500 font-black border-b border-zinc-900 tracking-[0.2em]">
                                <th className="px-10 py-6">Time</th>
                                <th className="px-8 py-6">Bay</th>
                                <th className="px-8 py-6">Source</th>
                                <th className="px-8 py-6">Guest</th>
                                <th className="px-8 py-6 text-right">Balance</th>
                                <th className="px-8 py-6 text-center">Status</th>
                                <th className="px-10 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {bookings.map((b: any) => {
                                const startTime = new Date(b.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                const isLive = new Date(b.slot_start) <= currentTime && new Date(b.slot_end) > currentTime;
                                const isWalkIn = b.booking_source === 'walk_in' || b.user_type === 'walk_in';
                                const balance = Number(b.total_price) - (Number(b.amount_paid) || 0);

                                return (
                                    <tr key={b.id} className={`hover:bg-zinc-800/30 transition-all duration-300 group ${isLive ? 'bg-emerald-500/5' : ''}`}>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3 font-mono">
                                                <div className={`p-2 rounded-lg border transition-colors ${isLive ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-base font-black tracking-tight ${isLive ? 'text-emerald-400' : 'text-zinc-200'}`}>{startTime}</span>
                                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight">{b.duration_hours}H Session</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                                                b.simulator_id === 1 ? 'bg-blue-500/5 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-900/10' :
                                                b.simulator_id === 2 ? 'bg-purple-500/5 text-purple-400 border-purple-500/20 shadow-lg shadow-purple-900/10' :
                                                'bg-orange-500/5 text-orange-400 border-orange-500/20 shadow-lg shadow-orange-900/10'
                                            }`}>
                                                {BAY_NAMES[b.simulator_id]}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                {isWalkIn ? (
                                                    <div className="flex items-center gap-2 text-purple-400 text-[10px] font-black uppercase tracking-wider bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/20">
                                                        <Smartphone className="w-3 h-3" /> Walk-in
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-wider bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                        <Globe className="w-3 h-3" /> Online
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-white text-base tracking-tight">{b.guest_name}</div>
                                            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{b.players} Players</div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className={`font-mono font-black text-base ${balance > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
                                                {balance > 0 ? `R${balance}` : 'R0'}
                                            </div>
                                            {balance > 0 && <span className="text-[9px] text-amber-500/50 font-black tracking-widest uppercase">Due In-Store</span>}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {balance <= 0 ? (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.1em]">
                                                    <CheckCircle className="w-3 h-3" /> PAID
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 text-[10px] font-black border border-amber-500/20 uppercase tracking-[0.1em]">
                                                    <Clock className="w-3 h-3" /> PENDING
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-10 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                                                <button className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all text-zinc-500 hover:text-white group/btn relative">
                                                    <Edit className="w-4 h-4" />
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity">Edit</span>
                                                </button>
                                                <button className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 hover:border-red-500/50 transition-all text-red-500/50 hover:text-red-500 group/btn relative">
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-500 text-white text-[9px] font-black uppercase rounded opacity-0 group-hover/btn:opacity-100 transition-opacity">Void</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-32">
                                        <div className="flex flex-col items-center opacity-20">
                                            <CalendarIcon className="w-12 h-12 mb-4 text-zinc-500" />
                                            <div className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">No Operational Data</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


export function LiveViewTab() {
    const [bookings, setBookings] = useState<LiveBooking[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createBrowserClient();

        const fetchInitialData = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('bookings')
                .select('id, guest_name, simulator_id, slot_start, slot_end')
                .eq('status', 'confirmed')
                .gte('slot_start', today)
                .lt('slot_start', addDays(new Date(today), 1).toISOString())
                .order('slot_start', { ascending: true });

            if (error) {
                console.error('Error fetching initial live view data:', error);
                setError('Failed to load initial data.');
            } else {
                setBookings(data || []);
            }
        };

        fetchInitialData();

        const channel = supabase
            .channel('realtime-bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' },
                () => {
                    fetchInitialData(); // Re-fetch on any change
                }
            )
            .subscribe((status: string, err?: any) => {
                if (status === 'CHANNEL_ERROR' || err) {
                    console.error('Subscription error:', err);
                    setError('Real-time connection failed.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (error) return <div className="text-red-500 p-4">{error}</div>;

    return <BayStatusDisplay bookings={bookings} />;
}
