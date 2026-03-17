'use client';

import { useState, useEffect } from 'react';
import { getSASTDate } from '@/lib/utils';

type ManagerModalProps = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: any;
  onClose: () => void;
  onSuccess: (data: any) => void;
};

export function ManagerModal({ isOpen, mode, initialData, onClose, onSuccess }: ManagerModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reactive Total Calculation States
  const [calcTotal, setCalcTotal] = useState(0);
  const [calcDue, setCalcDue] = useState(0);

  /**
   * SAST Midnight Patch
   * Ensures 'create' mode defaults to the current SAST date, preventing UTC drift bugs.
   */
  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        setFormData({
          guest_name: '',
          guest_phone: '',
          guest_email: '',
          booking_date: getSASTDate(), // SAST Midnight Patch Applied
          start_time: '12:00',
          duration_hours: 1,
          simulator_id: 1,
          status: 'confirmed',
          base_price: 350, // Default bay price
          amount_paid: 0,
          addon_water_qty: 0,
          addon_water_price: 20,
          addon_gloves_qty: 0,
          addon_gloves_price: 150,
          addon_balls_qty: 0,
          addon_balls_price: 80
        });
      } else {
        // Legacy Data Mapping Patch
        // Resolves incorrect outstanding balances for older records
        const dbTotal = Number(initialData.total_price || 0);
        const dbBase = Number(initialData.base_price || 0);
        const resolvedBase = dbBase > 0 ? dbBase : dbTotal;

        let resolvedPaid = Number(initialData.amount_paid || 0);
        const isPaid = initialData.payment_status === 'paid' || initialData.payment_status === 'completed';

        // If DB says it's paid but amount_paid is 0, auto-fill it so the outstanding balance is 0
        if (resolvedPaid === 0 && isPaid) {
          resolvedPaid = resolvedBase;
        }

        setFormData({
          ...initialData,
          base_price: resolvedBase,
          amount_paid: resolvedPaid,
          addon_water_qty: Number(initialData.addon_water_qty || 0),
          addon_gloves_qty: Number(initialData.addon_gloves_qty || 0),
          addon_balls_qty: Number(initialData.addon_balls_qty || 0)
        });
      }
      setPin('');
      setError(null);
    }
  }, [isOpen, mode, initialData]);

  /**
   * Real-Time Financial Engine
   * Dynamically tracks totals and balances as quantities change.
   */
  useEffect(() => {
    const base = Number(formData.base_price || 0);
    const water = Number(formData.addon_water_qty || 0) * Number(formData.addon_water_price || 20);
    const gloves = Number(formData.addon_gloves_qty || 0) * Number(formData.addon_gloves_price || 0);
    const balls = Number(formData.addon_balls_qty || 0) * Number(formData.addon_balls_price || 0);
    
    const total = base + water + gloves + balls;
    const paid = Number(formData.amount_paid || 0);
    
    setCalcTotal(total);
    setCalcDue(Math.max(0, total - paid));
  }, [formData]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'create' ? '/api/bookings/admin-create' : '/api/bookings/update';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, pin })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Request failed');
      }

      onSuccess(result.data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-zinc-200">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-zinc-100">
          <div>
            <h2 className="text-3xl font-black text-black tracking-tighter uppercase">
              {mode === 'create' ? 'Register Walk-in' : 'Modify Booking'}
            </h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Management Portal v1.2</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors font-black text-2xl text-zinc-300 hover:text-black">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Context Badges */}
            {mode === 'edit' && (
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200">Source: {formData.booking_source}</span>
                <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-200">Payment: {formData.payment_status}</span>
              </div>
            )}

            {/* Section: Guest Details */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Guest Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="guest_name" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Full Name</label>
                  <input id="guest_name" name="guest_name" type="text" value={formData.guest_name || ''} onChange={handleChange} required className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all text-zinc-900 placeholder:text-zinc-400" />
                </div>
                <div>
                  <label htmlFor="guest_phone" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">WhatsApp / Cell</label>
                  <input id="guest_phone" name="guest_phone" type="text" value={formData.guest_phone || ''} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all text-zinc-900 placeholder:text-zinc-400" />
                </div>
                <div>
                  <label htmlFor="guest_email" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Email (Optional)</label>
                  <input id="guest_email" name="guest_email" type="email" value={formData.guest_email || ''} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all text-zinc-900 placeholder:text-zinc-400" />
                </div>
              </div>
            </div>

            {/* Section: Logistical Grid (High Contrast Light Mode Patch) */}
            <div className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-200 text-zinc-900">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">Bay & Schedule Parameters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label htmlFor="simulator_id" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Simulator Bay</label>
                  <select id="simulator_id" name="simulator_id" value={formData.simulator_id || 1} onChange={handleChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all">
                    <option value={1}>BAY 1</option><option value={2}>BAY 2</option><option value={3}>BAY 3</option><option value={4}>BAY 4</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="player_count" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Players</label>
                  <input id="player_count" name="player_count" type="number" min="1" max="4" value={formData.player_count || 1} onChange={handleChange} required className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
                <div>
                  <label htmlFor="status" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Booking Status</label>
                  <select id="status" name="status" value={formData.status || 'confirmed'} onChange={handleChange} className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all">
                    <option value="pending">PENDING</option>
                    <option value="confirmed">CONFIRMED</option>
                    <option value="cancelled">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="booking_date" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Booking Date</label>
                  <input id="booking_date" name="booking_date" type="date" value={formData.booking_date || ''} onChange={handleChange} required className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
                <div>
                  <label htmlFor="start_time" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Arrival Time</label>
                  <input id="start_time" name="start_time" type="time" value={formData.start_time || ''} onChange={handleChange} required className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
                <div>
                  <label htmlFor="duration_hours" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Duration (Hours)</label>
                  <input id="duration_hours" name="duration_hours" type="number" step="0.5" min="0.5" value={formData.duration_hours || 1} onChange={handleChange} required className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                </div>
              </div>
            </div>

            {/* Section: POS & Financials */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Point of Sale (Add-ons)</h3>
                <div className="space-y-4">
                  {/* Water */}
                  <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <div className="flex-1">
                      <p className="text-sm font-black text-black">Spring Water</p>
                      <input id="addon_water_price" name="addon_water_price" type="number" value={formData.addon_water_price || 20} onChange={handleChange} className="text-[10px] font-bold text-zinc-400 bg-transparent text-zinc-900 placeholder:text-zinc-400" placeholder="Price Ea." />
                    </div>
                    <input id="addon_water_qty" name="addon_water_qty" type="number" min="0" value={formData.addon_water_qty || 0} onChange={handleChange} className="w-20 bg-white border border-zinc-200 rounded-lg px-2 py-2 text-center font-black text-zinc-900 placeholder:text-zinc-400" title="Quantity" />
                  </div>
                  {/* Gloves */}
                  <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <div className="flex-1">
                      <p className="text-sm font-black text-black">Golf Gloves</p>
                      <input id="addon_gloves_price" name="addon_gloves_price" type="number" value={formData.addon_gloves_price || 0} onChange={handleChange} className="text-[10px] font-bold text-zinc-400 bg-transparent text-zinc-900 placeholder:text-zinc-400" placeholder="Price Ea." />
                    </div>
                    <input id="addon_gloves_qty" name="addon_gloves_qty" type="number" min="0" value={formData.addon_gloves_qty || 0} onChange={handleChange} className="w-20 bg-white border border-zinc-200 rounded-lg px-2 py-2 text-center font-black text-zinc-900 placeholder:text-zinc-400" title="Quantity" />
                  </div>
                  {/* Balls */}
                  <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <div className="flex-1">
                      <p className="text-sm font-black text-black">Flighted Balls (Sleeve)</p>
                      <input id="addon_balls_price" name="addon_balls_price" type="number" value={formData.addon_balls_price || 0} onChange={handleChange} className="text-[10px] font-bold text-zinc-400 bg-transparent text-zinc-900 placeholder:text-zinc-400" placeholder="Price Ea." />
                    </div>
                    <input id="addon_balls_qty" name="addon_balls_qty" type="number" min="0" value={formData.addon_balls_qty || 0} onChange={handleChange} className="w-20 bg-white border border-zinc-200 rounded-lg px-2 py-2 text-center font-black text-zinc-900 placeholder:text-zinc-400" title="Quantity" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Ledger Reconcilliation</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="base_price" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Base Bay Price</label>
                      <input id="base_price" name="base_price" type="number" value={formData.base_price || 0} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 placeholder:text-zinc-400" />
                    </div>
                    <div>
                      <label htmlFor="amount_paid" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Total Amount Paid</label>
                      <input 
                        id="amount_paid" 
                        name="amount_paid" 
                        type="number" 
                        value={formData.amount_paid || 0} 
                        onChange={handleChange} 
                        className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-900 placeholder:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                      />
                    </div>
                  </div>

                  <div className="bg-black p-6 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-inner">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Outstanding</p>
                    <p className={`text-4xl font-black ${calcDue > 0 ? 'text-red-500' : 'text-emerald-500'} tracking-tighter`}>R {calcDue}</p>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mt-2">Calculated vs R {calcTotal} total</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Authorization */}
            <div className="pt-8 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div>
                  <label htmlFor="pin" className="block text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Manager Authorization PIN</label>
                  <input 
                    id="pin" name="pin" type="password" 
                    value={pin} onChange={(e) => setPin(e.target.value)} 
                    required placeholder="****" 
                    className="w-32 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xl font-black text-center tracking-[0.5em] focus:ring-2 focus:ring-red-500 outline-none text-red-900 placeholder:text-zinc-400" 
                  />
                </div>
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <button type="button" onClick={onClose} className="flex-1 md:flex-none px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-black transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 md:flex-none px-12 py-4 bg-black text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
                  {loading ? 'Processing...' : 'Commit to Database'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
