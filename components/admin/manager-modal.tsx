"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Trash2, Flag, Minus, Plus } from "lucide-react"

const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

const CLUB_RENTAL_HOURLY = 100;
const COACHING_FLAT_FEE = 250;
const BAY_OPTIONS = [
  { id: '1', label: 'Lounge Bay', activeBg: 'bg-indigo-500', bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
  { id: '2', label: 'Middle Bay', activeBg: 'bg-amber-500', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  { id: '3', label: 'Window Bay', activeBg: 'bg-emerald-500', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
];

const addHoursToTime = (timeStr: string, hours: number): string => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

const diffInHours = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 0;
  const [sH, sM] = startStr.split(':').map(Number);
  const [eH, eM] = endStr.split(':').map(Number);
  let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMins < 0) diffMins += 24 * 60;
  return Number((diffMins / 60).toFixed(2));
};

function CustomSlider({ min, max, step = 1, value, onChange, label, format = String }: any) {
  const steps = [];
  for (let i = min; i <= max; i += step) steps.push(i);
  return (
    <div className="flex flex-col gap-1.5 w-full bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
      <div className="flex justify-between items-center mb-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</Label>
        <span className="text-sm font-black text-primary">{format(value)}</span>
      </div>
      <div className="flex justify-between px-1 mb-1 relative">
        {steps.map(s => (
          <div key={s} onClick={() => onChange(s)} className={`cursor-pointer text-[10px] font-black transition-all hover:text-primary z-10 w-6 text-center ${value === s ? 'text-primary scale-125' : 'text-zinc-600'}`}>
            {format(s)}
          </div>
        ))}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
    </div>
  );
}

function CompactQuantityStepper({ value, onChange, label, unitPrice }: any) {
  return (
    <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 flex-1 min-w-[120px]">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-zinc-300">{label}</span>
        <span className="text-[8px] text-zinc-500">R{unitPrice}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"><Minus size={12}/></button>
        <span className="text-xs font-black w-4 text-center tabular-nums">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-6 h-6 rounded bg-primary/20 text-primary hover:bg-primary/40 flex items-center justify-center"><Plus size={12}/></button>
      </div>
    </div>
  )
}

export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [manualTotal, setManualTotal] = useState(0);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking, amount_paid: booking.amount_paid || 0 });
      setIsDeleting(false);
      setIsManualPrice(false);
      setIsEditingTotal(false);
      setManualTotal(Number(booking.total_price || 0));

      if (!booking.id && (!booking.start_time || booking.start_time === '12:00')) {
        const now = new Date();
        const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const defaultDuration = booking.duration_hours || 1;
        const initialTotal = GET_BASE_HOURLY_RATE(1) * defaultDuration;
        setFormData((prev: any) => ({ ...prev, start_time: currentStr, end_time: addHoursToTime(currentStr, defaultDuration), duration_hours: defaultDuration, total_price: initialTotal }));
      }
    }
  }, [booking]);

  const totals = useMemo(() => {
    if (!formData) return { total: 0 };
    const baseTotal = GET_BASE_HOURLY_RATE(formData.player_count) * formData.duration_hours;
    const clubs = formData.addon_club_rental ? (CLUB_RENTAL_HOURLY * formData.duration_hours) : 0;
    const coaching = formData.addon_coaching ? COACHING_FLAT_FEE : 0;
    const water = (formData.addon_water_qty || 0) * (formData.addon_water_price ?? 20);
    const gloves = (formData.addon_gloves_qty || 0) * (formData.addon_gloves_price ?? 220);
    const balls = (formData.addon_balls_qty || 0) * (formData.addon_balls_price ?? 50);
    return { total: baseTotal + clubs + coaching + water + gloves + balls };
  }, [formData]);

  useEffect(() => {
    if (formData && !isManualPrice) {
      setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
    }
  }, [totals.total, isManualPrice]);

  if (!formData) return null;

  const update = (field: string, value: any) => setFormData((prev: any) => ({ ...prev, [field]: value }));

  const handleDurationChange = (hours: number) => {
    update("duration_hours", hours);
    update("end_time", addHoursToTime(formData.start_time, hours));
    update("payment_status", "pending");
  };

  const handleStartTimeChange = (newStart: string) => {
    update("start_time", newStart);
    update("end_time", addHoursToTime(newStart, formData.duration_hours));
  };

  const handleEndTimeChange = (newEnd: string) => {
    update("end_time", newEnd);
    update("duration_hours", diffInHours(formData.start_time, newEnd));
    update("payment_status", "pending");
  };

  const handleFinalSave = () => {
    const submitData = { ...formData };
    
    if (isEditingTotal) {
      submitData.total_price = manualTotal;
      submitData.isManualOverride = true; // Flag for Tab to hit admin-update
    }

    submitData.amount_due = Math.max(0, Number(submitData.total_price || 0) - Number(submitData.amount_paid || 0));
    
    if (submitData.payment_type === 'cash' || submitData.payment_type === 'card') {
      submitData.action = 'settle';
      submitData.payment_status = 'paid_instore';
    }
    if (submitData.payment_status === 'pending') {
      const isOnline = submitData.booking_source === 'online' || submitData.yoco_payment_id === null;
      if (isOnline && submitData.guest_email !== 'walkin@venue-os.com') {
        submitData.payment_status = 'paid_online'; submitData.status = 'confirmed'; submitData.reconciled_manually = true;
      }
    }
    onSave(submitData);
  };

  const displayAmountDue = Math.max(0, Number(formData.total_price || 0) - Number(formData.amount_paid || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden border-t-4 border-t-primary bg-[#0a0a0a]">
        
        {/* HEADER */}
        <div className="bg-zinc-950 px-4 py-3 flex items-center justify-between border-b border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-white uppercase tracking-wider">
            <Flag className="text-primary w-4 h-4" /> {formData.guest_name || "WALK-IN"}
          </DialogTitle>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          
          {/* Identity - Always Visible */}
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500" />
            <Input placeholder="Phone Number" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500" />
          </div>

          {/* Session Setup Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-row gap-1.5 h-[42px]">
                {BAY_OPTIONS.map((bay) => (
                  <button key={bay.id} type="button" onClick={() => update("simulator_id", Number(bay.id))}
                    className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${String(formData.simulator_id) === bay.id ? `${bay.activeBg} text-white` : `${bay.bg} ${bay.text} hover:opacity-80`}`}>
                    {bay.label.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-[9px] font-bold text-zinc-500 uppercase">Start Time</Label>
                  <input type="time" value={formData.start_time || '12:00'} onChange={(e) => handleStartTimeChange(e.target.value)}
                    style={{ colorScheme: 'light' }} className="w-full bg-zinc-100 text-zinc-900 text-sm font-black px-2 py-2 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="flex-1">
                  <Label className="text-[9px] font-bold text-zinc-500 uppercase">End Time</Label>
                  <input type="time" value={formData.end_time || ""} onChange={(e) => handleEndTimeChange(e.target.value)}
                    style={{ colorScheme: 'light' }} className="w-full bg-zinc-100 text-zinc-900 text-sm font-black px-2 py-2 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
               <CustomSlider min={1} max={6} value={formData.player_count} onChange={(v: number) => update("player_count", v)} label="Players" format={(v: number) => `${v}P`} />
               <CustomSlider min={0.5} max={6} step={0.5} value={formData.duration_hours} onChange={handleDurationChange} label="Duration" format={(v: number) => `${v}H`} />
            </div>
          </div>

          {/* Add-ons */}
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Add-ons</Label>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-zinc-300 w-full">Clubs</span>
                <Switch checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 flex-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-zinc-300 w-full">Coach</span>
                <Switch checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
              </div>
              <CompactQuantityStepper label="Water" value={formData.addon_water_qty || 0} onChange={(v: number) => update("addon_water_qty", v)} unitPrice={formData.addon_water_price ?? 20} />
              <CompactQuantityStepper label="Gloves" value={formData.addon_gloves_qty || 0} onChange={(v: number) => update("addon_gloves_qty", v)} unitPrice={formData.addon_gloves_price ?? 220} />
              <CompactQuantityStepper label="Balls" value={formData.addon_balls_qty || 0} onChange={(v: number) => update("addon_balls_qty", v)} unitPrice={formData.addon_balls_price ?? 50} />
            </div>
          </div>

          {/* FINANCIAL LEDGER OVERRIDE */}
          <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Financial Ledger Override</Label>
              <Switch checked={isManualPrice} onCheckedChange={(v) => setIsManualPrice(v)} />
            </div>
            {isManualPrice && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex-1">
                  <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-lg h-10 px-3 overflow-hidden">
                    <Label className="text-[10px] font-bold text-zinc-400">TOTAL</Label>
                    {!isEditingTotal ? (
                      <span 
                        onClick={() => setIsEditingTotal(true)}
                        className="text-sm font-black text-white hover:text-primary cursor-pointer transition-colors"
                      >
                        R{manualTotal}
                      </span>
                    ) : (
                      <input 
                        type="number" 
                        autoFocus
                        value={manualTotal} 
                        onBlur={() => setIsEditingTotal(false)}
                        onChange={(e) => setManualTotal(Number(e.target.value))} 
                        className="w-20 bg-transparent border-none text-right text-sm font-black text-primary outline-none" 
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <div className="flex justify-between items-center bg-zinc-900 border border-emerald-500/20 rounded-lg h-10 px-3">
                      <Label className="text-[10px] font-bold text-emerald-500/60 uppercase">Paid</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-emerald-500/40">R</span>
                        <input 
                          type="number" 
                          value={formData.amount_paid || 0} 
                          onChange={(e) => update("amount_paid", Number(e.target.value))} 
                          className="w-16 bg-transparent border-none text-right text-sm font-black text-emerald-400 outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="flex w-full">
             <Select value={formData.payment_type} onValueChange={(v) => update("payment_type", v)}>
               <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 h-10 rounded-lg text-xs font-bold text-white"><SelectValue placeholder="Payment Method" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="pending">Pending</SelectItem>
                 <SelectItem value="cash">In-Store (Cash/Card)</SelectItem>
                 <SelectItem value="yoco">Online</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-zinc-950 border-t border-zinc-800 p-4 flex items-center justify-between z-20">
          {formData.id ? (
            <Button variant="ghost" onClick={() => setIsDeleting(!isDeleting)} className={`${isDeleting ? 'bg-red-500 text-white' : 'text-zinc-500 hover:text-red-500'} text-xs font-black uppercase h-12 px-4 rounded-xl transition-all`}>
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : <div />}
          
          <div className="flex items-center gap-3">
            {isDeleting ? (
              <Button onClick={() => onDelete(formData.id)} className="bg-red-600 hover:bg-red-500 text-white uppercase text-xs font-black h-12 px-8 rounded-xl animate-in slide-in-from-right-2">CONFIRM DELETE</Button>
            ) : displayAmountDue > 0 ? (
              <Button onClick={handleFinalSave} className="bg-amber-500 hover:bg-amber-400 text-black uppercase text-sm font-black h-12 px-8 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                CHARGE R{displayAmountDue}
              </Button>
            ) : (
              <Button onClick={handleFinalSave} className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-sm font-black h-12 px-8 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                SAVE CHANGES
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
