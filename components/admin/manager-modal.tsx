"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Trash2, Flag, Minus, Plus, RotateCcw, AlertTriangle } from "lucide-react"

const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600 + (players - 4) * 150;
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

function CompactQuantityStepper({ value, onChange, label, unitPrice, onPriceChange }: any) {
  return (
    <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 flex-1 min-w-[120px]">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-zinc-300">{label}</span>
        <div className="flex items-center">
          <span className="text-[8px] text-zinc-500">R</span>
          <input 
            type="number" 
            value={unitPrice} 
            onChange={(e) => onPriceChange && onPriceChange(Number(e.target.value))} 
            className="w-10 bg-transparent border-none text-[8px] text-zinc-500 outline-none p-0 focus:ring-0 appearance-none" 
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-6 h-6 rounded bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"><Minus size={12}/></button>
        <span className="text-xs font-black w-4 text-center tabular-nums">{value}</span>
        <button onClick={() => onChange(value + 1)} className="w-6 h-6 rounded bg-primary/20 text-primary hover:bg-primary/40 flex items-center justify-center"><Plus size={12}/></button>
      </div>
    </div>
  )
}

export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete, data }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [isManualOverride, setIsManualOverride] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const flatAddonCosts = useMemo(() => {
    if (!formData) return 0;
    const coaching = formData.addon_coaching ? COACHING_FLAT_FEE : 0;
    const water = (formData.addon_water_qty || 0) * (formData.addon_water_price ?? 20);
    const gloves = (formData.addon_gloves_qty || 0) * (formData.addon_gloves_price ?? 220);
    const balls = (formData.addon_balls_qty || 0) * (formData.addon_balls_price ?? 50);
    return coaching + water + gloves + balls;
  }, [
    formData?.addon_coaching, 
    formData?.addon_water_qty, formData?.addon_water_price, 
    formData?.addon_gloves_qty, formData?.addon_gloves_price, 
    formData?.addon_balls_qty, formData?.addon_balls_price
  ]);

  const genericHourlyRate = useMemo(() => {
    if (!formData) return 0;
    return GET_BASE_HOURLY_RATE(formData.player_count || 1) + (formData.addon_club_rental ? CLUB_RENTAL_HOURLY : 0);
  }, [formData?.player_count, formData?.addon_club_rental]);

  const calculatedDefaultTotal = useMemo(() => {
    if (!formData) return 0;
    return (genericHourlyRate * (formData.duration_hours || 1)) + flatAddonCosts;
  }, [genericHourlyRate, formData?.duration_hours, flatAddonCosts]);

  useEffect(() => {
    if (booking) {
      let initialFormData = { ...booking, amount_paid: booking.amount_paid || 0, total_price: booking.total_price || 0 };
      setIsDeleting(false);
      setIsUpdating(false);

      let isNewBooking = false;
      if (!booking.id && (!booking.start_time || booking.start_time === '12:00')) {
        isNewBooking = true;
        const now = new Date();
        const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const defaultDuration = booking.duration_hours || 1;
        const initialTotal = GET_BASE_HOURLY_RATE(1) * defaultDuration;
        
        let wPrice = 20, gPrice = 220, bPrice = 50;
        if (data && data.length > 0) {
           const latest = data[0];
           wPrice = latest.addon_water_price ?? 20;
           gPrice = latest.addon_gloves_price ?? 220;
           bPrice = latest.addon_balls_price ?? 50;
        }

        initialFormData = { 
          ...initialFormData, 
          start_time: currentStr, 
          end_time: addHoursToTime(currentStr, defaultDuration), 
          duration_hours: defaultDuration, 
          total_price: initialTotal,
          addon_water_price: wPrice,
          addon_gloves_price: gPrice,
          addon_balls_price: bPrice
        };
      }

      setFormData(initialFormData);

      // Calculate initial hourly discount to preserve custom pricing
      const coaching = initialFormData.addon_coaching ? COACHING_FLAT_FEE : 0;
      const water = (initialFormData.addon_water_qty || 0) * (initialFormData.addon_water_price ?? 20);
      const gloves = (initialFormData.addon_gloves_qty || 0) * (initialFormData.addon_gloves_price ?? 220);
      const balls = (initialFormData.addon_balls_qty || 0) * (initialFormData.addon_balls_price ?? 50);
      const initialFlatAddons = coaching + water + gloves + balls;
      
      const initialGenericHourly = GET_BASE_HOURLY_RATE(initialFormData.player_count || 1) + (initialFormData.addon_club_rental ? CLUB_RENTAL_HOURLY : 0);
      const expectedTotal = (initialGenericHourly * (initialFormData.duration_hours || 1)) + initialFlatAddons;
      
      if (isNewBooking) {
        setIsManualOverride(false);
        setOverrideConfirmed(false);
      } else {
        const isDiff = Math.abs(Number(initialFormData.total_price || 0) - expectedTotal) > 0.01;
        setIsManualOverride(isDiff);
        setOverrideConfirmed(isDiff); // Already confirmed since it's an existing saved booking
      }
    }
  }, [booking]);

  // Auto-calculate total price when duration, addons, or generic rate changes
  useEffect(() => {
    if (formData && !isManualOverride) {
      setFormData((prev: any) => ({ ...prev, total_price: Math.max(0, Math.round(calculatedDefaultTotal * 100) / 100) }));
    }
  }, [calculatedDefaultTotal, isManualOverride]);

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

  const handleLedgerUpdate = async () => {
    if (!formData.id) {
       alert("Cannot update ledger on an unsaved booking.");
       return;
    }
    if (!adminPin) {
       alert("Admin PIN is required.");
       return;
    }

    try {
      setIsUpdating(true);
      const res = await fetch("/api/bookings/admin-override", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-pin": adminPin
        },
        body: JSON.stringify({
          booking_id: formData.id,
          total_price: Number(formData.total_price),
          amount_paid: Number(formData.amount_paid)
        })
      });
      if (res.ok) {
        setAdminPin("");
        setIsUpdating(false);
        onClose(); // Parent/Realtime will refresh the UI
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update ledger");
        setIsUpdating(false);
      }
    } catch (e) {
      alert("Error updating ledger via API");
      setIsUpdating(false);
    }
  };

  const handleFinalSave = () => {
    const submitData = { ...formData };

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
              <CompactQuantityStepper label="Water" value={formData.addon_water_qty || 0} onChange={(v: number) => update("addon_water_qty", v)} unitPrice={formData.addon_water_price ?? 20} onPriceChange={(v: number) => update("addon_water_price", v)} />
              <CompactQuantityStepper label="Gloves" value={formData.addon_gloves_qty || 0} onChange={(v: number) => update("addon_gloves_qty", v)} unitPrice={formData.addon_gloves_price ?? 220} onPriceChange={(v: number) => update("addon_gloves_price", v)} />
              <CompactQuantityStepper label="Balls" value={formData.addon_balls_qty || 0} onChange={(v: number) => update("addon_balls_qty", v)} unitPrice={formData.addon_balls_price ?? 50} onPriceChange={(v: number) => update("addon_balls_price", v)} />
            </div>
          </div>

          {/* FINANCIAL LEDGER */}
          <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-800/80 rounded-xl p-3">
            <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Financial Ledger</Label>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center bg-zinc-900 border border-zinc-800 rounded-lg h-10 px-3 overflow-hidden gap-2">
                    <Label className="text-[10px] font-bold text-zinc-400 whitespace-nowrap">TOTAL</Label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={formData.total_price || 0} 
                        onChange={(e) => {
                          const newTotal = Number(e.target.value);
                          update("total_price", newTotal);
                          setIsManualOverride(true);
                          setOverrideConfirmed(false);
                        }} 
                        className={`w-20 bg-transparent border-none text-right text-sm font-black outline-none ${isManualOverride ? 'text-amber-500' : 'text-primary'}`} 
                      />
                      {isManualOverride && (
                        <button
                          title="Reset to default price"
                          onClick={() => {
                            setIsManualOverride(false);
                            setOverrideConfirmed(false);
                            update("total_price", calculatedDefaultTotal);
                          }}
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
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

              {formData.id && (
                <div className="flex gap-2 items-center bg-zinc-950 p-2 rounded-lg border border-primary/30">
                  <Input 
                    type="password" 
                    value={adminPin} 
                    onChange={(e) => setAdminPin(e.target.value)} 
                    placeholder="Admin PIN" 
                    className="bg-zinc-900 border-zinc-800 text-white flex-1 h-8 text-xs" 
                  />
                  <Button 
                    disabled={isUpdating || !adminPin || (isManualOverride && !overrideConfirmed && formData.total_price !== calculatedDefaultTotal)} 
                    onClick={handleLedgerUpdate} 
                    className="bg-primary hover:bg-primary/80 text-black uppercase text-[10px] font-black h-8 px-4"
                  >
                    {isUpdating ? "UPDATING..." : "UPDATE LEDGER"}
                  </Button>
                </div>
              )}
            </div>

            {isManualOverride && !overrideConfirmed && formData.total_price !== calculatedDefaultTotal && (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
                  <AlertTriangle size={14} />
                  <span>Are you sure you want to change this price? The default price is R{calculatedDefaultTotal}.</span>
                </div>
                <Button 
                  onClick={() => setOverrideConfirmed(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black h-8 uppercase self-start"
                >
                  Confirm Override
                </Button>
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
              <Button disabled={isManualOverride && !overrideConfirmed && formData.total_price !== calculatedDefaultTotal} onClick={handleFinalSave} className="bg-amber-500 hover:bg-amber-400 text-black uppercase text-sm font-black h-12 px-8 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:shadow-none">
                CHARGE R{displayAmountDue}
              </Button>
            ) : (
              <Button disabled={isManualOverride && !overrideConfirmed && formData.total_price !== calculatedDefaultTotal} onClick={handleFinalSave} className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-sm font-black h-12 px-8 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none">
                SAVE CHANGES
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
