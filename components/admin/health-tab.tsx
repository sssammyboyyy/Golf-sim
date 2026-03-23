'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

// Define a basic type for anomalous bookings.
type AnomalousBooking = {
    id: string;
    guest_name: string | null;
    guest_email: string | null;
    yoco_payment_id: string | null;
    created_at: string;
    total_price: number;
};

export function HealthTab() {
    const [anomalies, setAnomalies] = useState<AnomalousBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reconcilingId, setReconcilingId] = useState<string | null>(null);

    const fetchAnomalies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const adminPin = sessionStorage.getItem('admin-pin');
        
        try {
            const response = await fetch('/api/admin/anomalies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: adminPin }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to fetch anomalies`);
            }

            const data = await response.json();
            setAnomalies(data.anomalies || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnomalies();
    }, [fetchAnomalies]);

    const handleReconcile = async (bookingId: string) => {
        setReconcilingId(bookingId);
        const adminPin = sessionStorage.getItem('admin-pin');
        
        try {
            const response = await fetch('/api/reconcile-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, pin: adminPin }),
            });

            const result = await response.json();
            
            if (response.ok) {
                const reconciledBooking = result.results?.find((r: any) => r.bookingId === bookingId);
                if (reconciledBooking?.healed) {
                    alert(`Sync Complete: Booking successfully confirmed.`);
                } else {
                    alert(`Sync Checked: No successful payment found for this booking.`);
                }
                fetchAnomalies();
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setReconcilingId(null);
        }
    };

    if (error) return (
        <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" /> {error}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500" /> System Health
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1 ml-9">Pending Payment Anomalies</p>
                </div>
                <button 
                    onClick={fetchAnomalies} 
                    disabled={isLoading}
                    className="p-3 bg-[#09090b] rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="bg-[#09090b] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0d0d11] text-[10px] uppercase text-zinc-500 font-black border-b border-zinc-900 tracking-[0.2em]">
                                <th className="px-10 py-6">Guest / Contact</th>
                                <th className="px-8 py-6">Timestamp</th>
                                <th className="px-8 py-6">Yoco Reference</th>
                                <th className="px-10 py-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {anomalies.map((b) => (
                                <tr key={b.id} className="hover:bg-red-500/5 transition-all duration-300 group">
                                    <td className="px-10 py-6">
                                        <div className="font-black text-white text-base tracking-tight">{b.guest_name || 'Anonymous'}</div>
                                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{b.guest_email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-zinc-300">{new Date(b.created_at).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-zinc-600 font-black uppercase">{new Date(b.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 text-[10px] font-black border border-zinc-800 uppercase tracking-widest">
                                            {b.yoco_payment_id || 'NO_REF'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <button 
                                            onClick={() => handleReconcile(b.id)} 
                                            disabled={reconcilingId === b.id}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${reconcilingId === b.id ? 'animate-spin' : ''}`} />
                                            {reconcilingId === b.id ? 'Syncing' : 'Sync Status'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {anomalies.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={4} className="text-center py-32">
                                        <div className="flex flex-col items-center opacity-20">
                                            <CheckCircle className="w-12 h-12 mb-4 text-emerald-500" />
                                            <div className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">System Healthy - No Anomalies</div>
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
}
