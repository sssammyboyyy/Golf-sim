"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Trash2, User, Flag, ShoppingBag, CreditCard, Calendar, Info, RotateCcw, Clock, MapPin, Search, Minus, Plus, Zap, CheckCircle } from "lucide-react"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ BUSINESS RULES (mirrors GEMINI.md §POS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

const CLUB_RENTAL_HOURLY = 100;
const COACHING_FLAT_FEE = 250;

const BAY_OPTIONS = [
  { id: '1', label: 'Lounge Bay', color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', activeBg: 'bg-indigo-500' },
  { id: '2', label: 'Middle Bay', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', activeBg: 'bg-amber-500' },
  { id: '3', label: 'Window Bay', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', activeBg: 'bg-emerald-500' },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕒 SYNC ENGINE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
  if (diffMins < 0) diffMins += 24 * 60; // Handle midnight wrap-around
  return Number((diffMins / 60).toFixed(2));
};

/**
 * 🎛️ SEGMENTED PILL COMPONENT
 */
function SegmentedPill({ options, value, onChange, label, className }: {
  options: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</Label>
      <div className="flex flex-row flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-h-[44px] min-w-[44px] rounded-xl text-sm font-black uppercase transition-all active:scale-95 border
              ${value === opt.value
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                : 'bg-zinc-900/50 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * ➕➖ STEPPER COMPONENT
 */
function QuantityStepper({ value, onChange, label, unitPrice }: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  unitPrice: number;
}) {
  return (
    <div className="flex flex-col justify-between bg-zinc-900/40 border border-dashed border-zinc-700/50 rounded-xl p-3 min-h-[100px]">
      <div className="flex flex-col mb-2">
        <span className="text-sm font-bold tracking-tight flex items-center gap-1.5 text-zinc-300">{label}</span>
        <span className="text-[10px] text-zinc-400">R{unitPrice}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-[44px] h-[44px] rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 flex items-center justify-center transition-all active:scale-95 border border-zinc-600 shrink-0"
        >
          <Minus size={16} />
        </button>
        <span className="flex-1 text-center font-black text-lg tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-[44px] h-[44px] rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-all active:scale-95 border border-primary/30 shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * 🏗️ MAIN MODAL
 */
export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking });
      setIsDeleting(false);
      setIsManualPrice(false);
      const walkInStatus = !booking.id || booking.user_type === 'walk_in' || booking.guest_email === 'walkin@venue-os.com';
      setIsWalkIn(walkInStatus);
      setIsExtending(false);

      // Default walk-in start time to NOW if it's a new booking
      if (walkInStatus && !booking.id && (!booking.start_time || booking.start_time === '12:00')) {
        const now = new Date();
        const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const defaultDuration = booking.duration_hours || 1;
        const endStr = addHoursToTime(currentStr, defaultDuration);
        
        setFormData((prev: any) => ({ 
          ...prev, 
          start_time: currentStr,
          end_time: endStr,
          duration_hours: defaultDuration
        }));
      }
    }
  }, [booking]);

  // REACTIVE POS LEDGER
  const totals = useMemo(() => {
    if (!formData) return { base: 0, extras: 0, total: 0 };

    const baseTotal = GET_BASE_HOURLY_RATE(formData.player_count) * formData.duration_hours;
    const clubs = formData.addon_club_rental ? (CLUB_RENTAL_HOURLY * formData.duration_hours) : 0;
    const coaching = formData.addon_coaching ? COACHING_FLAT_FEE : 0;

    const water = (formData.addon_water_qty || 0) * (formData.addon_water_price ?? 20);
    const gloves = (formData.addon_gloves_qty || 0) * (formData.addon_gloves_price ?? 220);
    const balls = (formData.addon_balls_qty || 0) * (formData.addon_balls_price ?? 50);

    return {
      base: baseTotal,
      extras: clubs + coaching + water + gloves + balls,
      total: baseTotal + clubs + coaching + water + gloves + balls
    };
  }, [formData]);

  // SYNC TOTAL
  useEffect(() => {
    if (formData && !isManualPrice) {
      const amountAlreadyPaid = Number(booking?.amount_paid) || 0;
      const outstandingBalance = totals.total - amountAlreadyPaid;
      
      if (formData.total_price !== totals.total || formData.amount_due !== outstandingBalance) {
        setFormData((prev: any) => ({ 
          ...prev, 
          total_price: totals.total,
          amount_due: outstandingBalance 
        }));
      }
    }
  }, [totals.total, isManualPrice, booking?.amount_paid]);

  if (!formData) return null;

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleResetPrice = () => {
    setIsManualPrice(false);
    setFormData((prev: any) => ({ ...prev, amount_due: totals.total - Number(prev.amount_paid || 0), total_price: totals.total }));
  };

  const extendDuration = (hours: number) => {
    const newEndTime = addHoursToTime(formData.start_time, hours);
    setFormData((prev: any) => ({
      ...prev,
      duration_hours: hours,
      end_time: newEndTime,
      payment_status: "pending"
    }));
  };

  const handleStartTimeChange = (newStart: string) => {
    const newEndTime = addHoursToTime(newStart, formData.duration_hours);
    setFormData((prev: any) => ({ ...prev, start_time: newStart, end_time: newEndTime }));
  };

  const handleEndTimeChange = (newEnd: string) => {
    const derivedDuration = diffInHours(formData.start_time, newEnd);
    setFormData((prev: any) => ({ 
      ...prev, 
      end_time: newEnd, 
      duration_hours: derivedDuration,
      payment_status: "pending"
    }));
  };

  const handleFinalSave = () => {
    const submitData = { ...formData };
    delete submitData.balance_due;
    delete submitData.xmin;
    
    if (!isManualPrice) {
      delete submitData.amount_due;
      delete submitData.total_price;
    }

    if (submitData.payment_status === 'paid_instore') {
      submitData.action = 'settle';
    }

    if (submitData.payment_status === 'pending') {
      const isOnline = submitData.booking_source === 'online' || submitData.yoco_payment_id === null;
      if (isOnline && submitData.guest_email !== 'walkin@venue-os.com') {
        submitData.payment_status = 'paid_online';
        submitData.status = 'confirmed';
        submitData.reconciled_manually = true;
      }
    }
    
    onSave(submitData);
  };

  const isPaidOut = formData.payment_status === 'completed' || formData.payment_status === 'paid_instore';
  const amountAlreadyPaid = Number(booking?.amount_paid) || 0;
  const outstandingBalance = totals.total - amountAlreadyPaid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[95vh] flex flex-col p-0 border-t-8 border-t-primary overflow-hidden">
        {/* ━━ STICKY HEADER ━━ */}
        <div className="bg-background/95 backdrop-blur-md z-10 px-4 py-3 sm:px-6 sm:py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl sm:text-2xl font-black">
              <span className="flex items-center gap-2">
                <Flag className="text-primary" /> {formData.guest_name ? `EDIT: ${formData.guest_name}` : "NEW WALK-IN"}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Booking Management</DialogDescription>
          </DialogHeader>
        </div>

        {/* ━━ SCROLLABLE CONTENT ━━ */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6 scrollbar-hide">

          {/* ━━ CARD 1: GUEST IDENTITY ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4 flex flex-col transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                <User size={14} /> Guest Identity
              </div>
              {!formData.id && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="walkin-toggle" className="text-[10px] font-bold opacity-70 cursor-pointer uppercase">WALK-IN</Label>
                  <Switch
                    id="walkin-toggle"
                    checked={isWalkIn}
                    onCheckedChange={(v) => {
                      setIsWalkIn(v);
                      if (v) {
                        update('guest_email', 'walkin@venue-os.com');
                        update('guest_phone', '');
                        update('user_type', 'walk_in');
                        update('payment_status', 'pending');
                        update('payment_type', 'pending');
                      } else {
                        update('guest_email', '');
                        update('user_type', 'guest');
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {isWalkIn ? (
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-dashed border-zinc-700 flex items-center gap-3 text-zinc-400 animate-in fade-in zoom-in-95">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User size={18} className="opacity-50" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">POS Mode Active</span>
                  <span className="text-sm font-bold text-zinc-300">Anonymous Walk-In Guest</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guest_name" className="text-[10px] font-bold opacity-70 uppercase">Full Name</Label>
                  <Input id="guest_name" placeholder="John Doe" value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} className="h-12 min-h-[48px] text-base md:text-sm bg-background border-zinc-200" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <Label htmlFor="guest_phone" className="text-[10px] font-bold opacity-70 uppercase">Phone</Label>
                    <Input id="guest_phone" placeholder="082 123 4567" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} className="h-12 min-h-[48px] text-base md:text-sm bg-background border-zinc-200" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <Label htmlFor="guest_email" className="text-[10px] font-bold opacity-70 uppercase">Email</Label>
                    <Input id="guest_email" placeholder="guest@example.com" value={formData.guest_email || ""} onChange={(e) => update("guest_email", e.target.value)} className="h-12 min-h-[48px] text-base md:text-sm bg-background border-zinc-200" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ━━ CARD 2: SESSION SETUP ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border flex flex-col space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <Calendar size={14} /> Session Setup
            </div>

            {/* Expans Player Capacity (1-6) */}
            <SegmentedPill
              label="Players"
              options={[
                { label: '1', value: 1 },
                { label: '2', value: 2 },
                { label: '3', value: 3 },
                { label: '4', value: 4 },
                { label: '5', value: 5 },
                { label: '6', value: 6 },
              ]}
              value={formData.player_count}
              onChange={(v) => update("player_count", v)}
            />
            <p className="text-[10px] text-muted-foreground font-medium -mt-2">Rate: R{GET_BASE_HOURLY_RATE(formData.player_count)}/hr</p>

            {/* Unified Duration Selector */}
            <SegmentedPill
              label="Quick Duration"
              options={[
                { label: '1h', value: 1 },
                { label: '1.5h', value: 1.5 },
                { label: '2h', value: 2 },
                { label: '2.5h', value: 2.5 },
                { label: '3h', value: 3 },
                { label: '3.5h', value: 3.5 },
                { label: '4h', value: 4 },
                { label: '5h', value: 5 },
                { label: '6h', value: 6 },
              ]}
              value={formData.duration_hours}
              onChange={(v) => extendDuration(v)}
            />

            {/* Time Controls with High Contrast */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-2 w-full">
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="start_time" className="text-[10px] font-bold flex items-center gap-1.5 opacity-70">
                  <Clock size={12} className="text-primary" /> START TIME
                </Label>
                <input
                  id="start_time"
                  type="time"
                  value={formData.start_time || '12:00'}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 text-lg font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-12"
                />
              </div>
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="end_time" className="text-[10px] font-bold flex items-center gap-1.5 opacity-70">
                  <Clock size={12} className="text-primary" /> END TIME (DYNAMIC)
                </Label>
                <input
                  id="end_time"
                  type="time"
                  value={formData.end_time || ""}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 text-lg font-bold px-3 py-2 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none h-12"
                />
              </div>
            </div>

            {/* Bay selection */}
            <div className="flex flex-col space-y-1.5 w-full">
              <Label className="text-[10px] font-bold flex items-center gap-1.5 opacity-70 uppercase tracking-widest">
                <MapPin size={12} className="text-primary" /> BAY Selection
              </Label>
              <div className="flex flex-row gap-1.5">
                {BAY_OPTIONS.map((bay) => (
                  <button
                    key={bay.id}
                    type="button"
                    onClick={() => update("simulator_id", Number(bay.id))}
                    className={`flex-1 min-h-[44px] rounded-xl text-xs font-black uppercase transition-all active:scale-95 border
                      ${String(formData.simulator_id) === bay.id
                        ? `${bay.activeBg} text-white ${bay.border} shadow-lg scale-[1.02]`
                        : `${bay.bg} ${bay.color} ${bay.border} hover:opacity-80`
                      }`}
                  >
                    {bay.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="notes" className="text-[10px] font-bold">NOTES</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] p-4 text-base md:text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Kitchen orders, special requests..."
                value={formData.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </section>

          {/* ━━ CARD 3: SERVICES & INVENTORY ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <ShoppingBag size={14} /> Services & Inventory
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between p-4 bg-zinc-800/80 border border-zinc-600 rounded-xl w-full">
                <div className="flex flex-col">
                  <Label htmlFor="addon_club_rental" className="font-bold text-sm text-zinc-100">Clubs</Label>
                  <span className="text-[10px] text-zinc-400">R{CLUB_RENTAL_HOURLY}/hr</span>
                </div>
                <Switch id="addon_club_rental" checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/80 border border-zinc-600 rounded-xl w-full">
                <div className="flex flex-col">
                  <Label htmlFor="addon_coaching" className="font-bold text-sm text-zinc-100">Coach</Label>
                  <span className="text-[10px] text-zinc-400">R{COACHING_FLAT_FEE}</span>
                </div>
                <Switch id="addon_coaching" checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <QuantityStepper label="💧 Water" value={formData.addon_water_qty || 0} onChange={(v) => update("addon_water_qty", v)} unitPrice={formData.addon_water_price ?? 20} />
              <QuantityStepper label="🧤 Gloves" value={formData.addon_gloves_qty || 0} onChange={(v) => update("addon_gloves_qty", v)} unitPrice={formData.addon_gloves_price ?? 220} />
              <QuantityStepper label="🎾 Balls" value={formData.addon_balls_qty || 0} onChange={(v) => update("addon_balls_qty", v)} unitPrice={formData.addon_balls_price ?? 50} />
              <div className="flex flex-col items-center justify-center p-3 border border-dashed border-zinc-600 rounded-xl bg-zinc-800/10 opacity-50 min-h-[100px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 truncate">More Stock</span>
              </div>
            </div>
          </section>

          {/* ━━ CARD 4: SETTLEMENT ━━ */}
          <section className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                <CreditCard size={14} /> Settlement
              </div>
              <div className={`px-2.5 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all ${isPaidOut ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}>
                {isPaidOut ? '✅ Paid' : '❌ Unsettled'}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="payment_type" className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Payment Method</Label>
                <Select name="payment_type" value={formData.payment_type} onValueChange={(v) => {
                  update("payment_type", v);
                  if (v === 'cash' || v === 'card' || v === 'eft') update("payment_status", "paid_instore");
                  if (v === 'pending') update("payment_status", "pending");
                }}>
                  <SelectTrigger id="payment_type" className="bg-background border-2 h-12 rounded-xl text-sm font-bold"><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cash">Physical Cash</SelectItem>
                    <SelectItem value="card">Card Machine</SelectItem>
                    <SelectItem value="eft">EFT / Proof</SelectItem>
                    <SelectItem value="yoco">Yoco Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isManualPrice && (
                <div className="flex flex-col space-y-1.5 bg-background p-4 rounded-xl border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Manual Price Override</Label>
                    <Switch checked={isManualPrice} onCheckedChange={(v) => !v ? handleResetPrice() : setIsManualPrice(true)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold opacity-40">R</span>
                    <input 
                      type="number" 
                      value={formData.amount_due} 
                      onChange={(e) => update("amount_due", Number(e.target.value))}
                      className="bg-transparent border-b-2 border-primary/30 p-1 w-full focus:ring-0 text-xl font-black outline-none"
                    />
                  </div>
                </div>
              )}

              {!isManualPrice && outstandingBalance > 0 && (
                <div className="flex items-center justify-between px-2">
                   <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Financial Override</span>
                    <span className="text-[8px] text-zinc-400">Enable manual price adjustments</span>
                   </div>
                   <Switch checked={isManualPrice} onCheckedChange={(v) => !v ? handleResetPrice() : setIsManualPrice(true)} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ━━ UNIFIED CHECKOUT STICKY FOOTER ━━ */}
        <div className="bg-background/95 backdrop-blur-md border-t p-4 sm:p-6 flex items-center justify-between z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.15)]">
          {/* Destructive Action (Distant Left) */}
          {formData.id ? (
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleting(!isDeleting)}
              className={`${isDeleting ? 'bg-destructive text-destructive-foreground' : 'text-zinc-500 hover:text-destructive'} text-[10px] font-black uppercase h-12 px-4 rounded-xl transition-all duration-300`}
            >
              <Trash2 className="w-4 h-4 mr-2" /> 
              {isDeleting ? 'Confirm?' : 'Delete'}
            </Button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="text-zinc-500 border-zinc-200 hover:bg-zinc-50 uppercase text-[10px] font-black h-12 px-6 rounded-xl">
              Discard
            </Button>
            
            {isDeleting ? (
              <Button variant="destructive" onClick={() => onDelete(formData.id)} className="uppercase text-[10px] font-black h-14 px-10 rounded-xl animate-in slide-in-from-right-2">
                DESTROY RECORD
              </Button>
            ) : outstandingBalance > 0 ? (
              <Button 
                onClick={handleFinalSave} 
                className="bg-[#b88642] hover:bg-[#a07436] text-white uppercase text-sm font-black h-14 px-10 rounded-xl shadow-[0_10px_20px_rgba(184,134,66,0.3)] animate-pulse hover:animate-none transition-all"
              >
                CHARGE R{formData.amount_due ?? outstandingBalance}
              </Button>
            ) : (
              <Button 
                onClick={handleFinalSave} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-sm font-black h-14 px-10 rounded-xl shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all"
              >
                SAVE CHANGES
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
