'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Armchair, LayoutGrid, Maximize, Users, Clock } from 'lucide-react';
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
            <div className="flex justify-center">
                <div className="bg-orange-600 text-white rounded-full px-8 py-3 shadow-xl shadow-orange-900/20 flex items-center gap-3 transform hover:scale-105 transition-transform duration-300 border border-orange-400/30">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </div>
                    <h2 className="font-bold text-lg md:text-xl tracking-widest uppercase">
                        {3 - occupiedBayIds.length} BAYS AVAILABLE NOW
                    </h2>
                </div>
            </div>

            {/* Grid of Bays */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
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
                                relative group overflow-hidden rounded-2xl border-2 p-6 flex flex-col items-center justify-center transition-all duration-300
                                ${!isOccupied
                                    ? "bg-zinc-900/50 border-emerald-500/30 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-900/10"
                                    : "bg-zinc-900/50 border-red-500/30 opacity-90"}
                            `}
                        >
                            {/* Status Dot */}
                            <div className={`
                                absolute top-4 right-4 h-3 w-3 rounded-full shadow-sm
                                ${!isOccupied ? "bg-emerald-500 animate-pulse" : "bg-red-500"}
                            `} />

                            {/* Icon */}
                            <div className={`
                                mb-4 p-4 rounded-full transition-colors duration-300
                                ${!isOccupied ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20" : "bg-red-500/10 text-red-500"}
                            `}>
                                <Icon className="w-8 h-8" />
                            </div>

                            {/* Bay Name */}
                            <h3 className="text-2xl font-bold text-white mb-2">{bay.label}</h3>

                            {/* Current Guest if occupied */}
                            {currentBooking && (
                                <p className="text-zinc-400 text-sm font-medium mb-4 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" /> {currentBooking.guest_name}
                                </p>
                            )}

                            {/* Status Pill */}
                            <div className={`
                                px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider mb-2
                                ${!isOccupied ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-zinc-800 text-zinc-400"}
                            `}>
                                {!isOccupied ? "Available" : "Occupied"}
                            </div>

                            {/* Helper Text */}
                            <span className={`text-xs font-semibold mt-2 ${!isOccupied ? "text-emerald-500/70" : "text-zinc-500"}`}>
                                {!isOccupied ? "Walk-ins Welcome" : `Until ${new Date(currentBooking!.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Upcoming Bookings Table */}
            <div className="mt-12 bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-400" /> Live Schedule
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Today</span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-zinc-950/50 text-[10px] uppercase text-zinc-500 font-bold border-b border-zinc-800 tracking-wider">
                            <th className="px-8 py-4">Time</th>
                            <th className="px-6 py-4">Bay</th>
                            <th className="px-6 py-4">Guest</th>
                            <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {bookings.map(b => {
                            const startTime = new Date(b.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const isLive = new Date(b.slot_start) <= currentTime && new Date(b.slot_end) > currentTime;

                            return (
                                <tr key={b.id} className={`hover:bg-zinc-800/50 transition-colors group ${isLive ? 'bg-emerald-500/5' : ''}`}>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3 font-mono">
                                            <span className={`text-sm font-bold ${isLive ? 'text-emerald-400' : 'text-zinc-300'}`}>{startTime}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${b.simulator_id === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                b.simulator_id === 2 ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            }`}>
                                            {BAY_NAMES[b.simulator_id]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-white text-sm">
                                        {b.guest_name}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {isLive ? (
                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter animate-pulse">Live</span>
                                        ) : (
                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Upcoming</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {bookings.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-20 text-zinc-600 font-medium">No active bookings for today.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export function LiveViewTab() {
    const [bookings, setBookings] = useState<LiveBooking[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

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
            .subscribe((status, err) => {
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
