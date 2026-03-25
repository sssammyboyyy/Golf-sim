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
import { Trash2, User, Flag, ShoppingBag, CreditCard, Calendar, Info, RotateCcw, Clock, MapPin, Search, Minus, Plus, Zap } from "lucide-react"

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
// 🎛️ SEGMENTED PILL COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SegmentedPill({ options, value, onChange, label }: {
  options: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</Label>
      <div className="flex flex-row gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-h-[44px] min-w-[44px] rounded-xl text-sm font-black uppercase transition-all border
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ➕➖ STEPPER COMPONENT (44px touch targets)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function QuantityStepper({ value, onChange, label, unitPrice }: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  unitPrice: number;
}) {
  return (
    <div className="flex flex-col justify-between bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 min-h-[100px]">
      <div className="flex flex-col mb-2">
        <span className="text-sm font-bold tracking-tight flex items-center gap-1.5">{label}</span>
        <span className="text-[10px] text-zinc-500">R{unitPrice}</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-[44px] h-[44px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors border border-zinc-700 shrink-0"
        >
          <Minus size={16} />
        </button>
        <span className="flex-1 text-center font-black text-lg tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-[44px] h-[44px] rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors border border-primary/30 shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏗️ MAIN MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking });
      setIsDeleting(false);
      setIsManualPrice(false);
      setIsWalkIn(!booking.id || booking.user_type === 'walk_in' || booking.guest_email === 'walkin@venue-os.com');
      setIsExtending(false);
    }
  }, [booking]);

  // 🧠 REACTIVE POS LEDGER — calculates the "system" total
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

  // 🔗 SYNC TOTAL — only when manual override is OFF
  useEffect(() => {
    if (formData && !isManualPrice && formData.total_price !== totals.total) {
      setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
    }
  }, [totals.total, isManualPrice]);

  if (!formData) return null;

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleManualPriceChange = (value: number) => {
    setIsManualPrice(true);
    update("total_price", value);
    update("payment_status", "pending");
  };

  const handleResetPrice = () => {
    setIsManualPrice(false);
    setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
  };

  const extendTime = async (hours: number) => {
    if (formData.id && formData.slot_end) {
      setIsExtending(true);
      try {
        const currentEnd = new Date(formData.slot_end);
        const newEnd = new Date(currentEnd.getTime() + hours * 60 * 60 * 1000);
        const pin = sessionStorage.getItem('admin-pin');

        const res = await fetch('/api/bookings/admin-extend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formData.id,
            pin,
            xmin: String(formData.xmin || ''),
            new_slot_end: newEnd.toISOString(),
            duration_hours_added: hours,
            player_count: formData.player_count
          })
        });

        if (res.status === 409) {
          toast.error('Conflict: Bay occupied or state changed. Refresh the ledger.');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Extension failed');
        }

        const result = await res.json();
        if (result.data) {
          setFormData((prev: any) => ({ ...prev, ...result.data }));
        }
        toast.success(`Extended by ${hours}h`);
        onClose();
      } catch (err: any) {
        toast.error(err.message || 'Extension failed');
      } finally {
        setIsExtending(false);
      }
    } else {
      update("duration_hours", formData.duration_hours + hours);
      update("payment_status", "pending");
      update("payment_type", "pending");
    }
  };

  const verifyYocoPayment = async () => {
    if (!formData.yoco_payment_id) return toast.error("No Yoco ID found on this record.");
    setIsVerifying(true);
    try {
      const res = await fetch('/api/admin/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: sessionStorage.getItem("admin-pin"),
          yoco_payment_id: formData.yoco_payment_id
        })
      });
      const data = await res.json();
      if (data.isPaid) {
        update("payment_status", "paid_instore");
        update("payment_type", "yoco");
        toast.success("Yoco Verification Successful!");
        onSave({ ...formData, payment_status: 'paid_instore', payment_type: 'yoco' });
      } else {
        toast.warning(`Yoco status: ${data.status}`);
      }
    } catch (e: any) {
      toast.error("Verification failed: " + e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const isPaidOut = formData.payment_status === 'completed' || formData.payment_status === 'paid_instore';
  const currentTotal = formData.total_price ?? totals.total;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[650px] max-h-[95vh] overflow-y-auto border-t-8 border-t-primary p-0">
        {/* ━━ STICKY HEADER ━━ */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 px-4 py-3 sm:px-6 sm:py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl sm:text-2xl font-black">
              <span className="flex items-center gap-2">
                <Flag className="text-primary" /> {formData.guest_name ? `EDIT: ${formData.guest_name}` : "NEW WALK-IN"}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">Booking Management</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col space-y-4 p-4 sm:p-6 sm:space-y-6">

          {/* ━━ CARD 1: GUEST IDENTITY ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                <User size={14} /> Guest Identity
              </div>
              {!formData.id && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="walkin-toggle" className="text-[10px] font-bold opacity-70 cursor-pointer">WALK-IN</Label>
                  <Switch
                    id="walkin-toggle"
                    checked={isWalkIn}
                    onCheckedChange={(v) => {
                      setIsWalkIn(v);
                      if (v) {
                        update('guest_email', 'walkin@venue-os.com');
                        update('guest_phone', '');
                        update('user_type', 'walk_in');
                      } else {
                        update('guest_email', '');
                        update('user_type', 'guest');
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Name — always visible */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guest_name" className="text-[10px] font-bold opacity-70">FULL NAME</Label>
              <Input id="guest_name" placeholder={isWalkIn ? "Walk-In / Guest Name" : "John Doe"} value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} className="h-12 min-h-[48px]" />
            </div>

            {/* Contact — hidden for walk-ins */}
            {!isWalkIn && (
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="flex flex-col gap-1.5 w-full">
                  <Label htmlFor="guest_phone" className="text-[10px] font-bold opacity-70">PHONE</Label>
                  <Input id="guest_phone" placeholder="082 123 4567" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} className="h-12 min-h-[48px]" />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <Label htmlFor="guest_email" className="text-[10px] font-bold opacity-70">EMAIL</Label>
                  <Input id="guest_email" placeholder="guest@example.com" value={formData.guest_email || ""} onChange={(e) => update("guest_email", e.target.value)} className="h-12 min-h-[48px]" />
                </div>
              </div>
            )}
            {isWalkIn && (
              <div className="py-2 px-3 text-[10px] font-bold text-zinc-500 italic bg-zinc-900/30 rounded-lg border border-dashed border-zinc-700">
                POS Mode — contact info not required
              </div>
            )}
          </section>

          {/* ━━ CARD 2: SESSION SETUP (Segmented Pills) ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                <Calendar size={14} /> Session Setup
              </div>
              {formData.id && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-[44px] min-w-[44px] text-[10px] font-black uppercase" onClick={() => extendTime(0.5)} disabled={isExtending}>
                    {isExtending ? '...' : '+30m'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-[44px] min-w-[44px] text-[10px] font-black uppercase" onClick={() => extendTime(1)} disabled={isExtending}>
                    {isExtending ? '...' : '+1h'}
                  </Button>
                </div>
              )}
            </div>

            {/* Player Count — Segmented Pills */}
            <SegmentedPill
              label="Players"
              options={[
                { label: '1', value: 1 },
                { label: '2', value: 2 },
                { label: '3', value: 3 },
                { label: '4+', value: 4 },
              ]}
              value={formData.player_count}
              onChange={(v) => update("player_count", v)}
            />
            <p className="text-[10px] text-muted-foreground font-medium -mt-2">Rate: R{GET_BASE_HOURLY_RATE(formData.player_count)}/hr</p>

            {/* Duration — Segmented Pills */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Duration</Label>
              <div className="flex flex-row gap-1.5">
                {[
                  { label: '1h', value: 1 },
                  { label: '2h', value: 2 },
                  { label: '3h', value: 3 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("duration_hours", opt.value)}
                    className={`flex-1 min-h-[44px] min-w-[44px] rounded-xl text-sm font-black uppercase transition-all border
                      ${formData.duration_hours === opt.value
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-zinc-900/50 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {/* +30m addative button */}
                <button
                  type="button"
                  onClick={() => update("duration_hours", formData.duration_hours + 0.5)}
                  className="flex-1 min-h-[44px] min-w-[44px] rounded-xl text-sm font-black uppercase transition-all border bg-zinc-900/50 text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200"
                >
                  +30m
                </button>
              </div>
            </div>

            {/* Time + Bay */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-2 w-full">
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="start_time" className="text-[10px] font-bold flex items-center gap-1.5">
                  <Clock size={12} className="text-primary" /> START TIME
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time || '12:00'}
                  onChange={(e) => update("start_time", e.target.value)}
                  className="font-mono font-bold text-lg tracking-tight h-12 min-h-[48px]"
                />
              </div>
              <div className="flex flex-col space-y-1.5 w-full">
                <Label className="text-[10px] font-bold flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" /> BAY
                </Label>
                {/* Bay — Segmented Pills with color */}
                <div className="flex flex-row gap-1.5">
                  {BAY_OPTIONS.map((bay) => (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => update("simulator_id", Number(bay.id))}
                      className={`flex-1 min-h-[44px] rounded-xl text-xs font-black uppercase transition-all border
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
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="notes" className="text-[10px] font-bold">NOTES</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] p-4 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Kitchen orders, special requests..."
                value={formData.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </section>

          {/* ━━ CARD 3: SERVICES & INVENTORY (Stepper Grid) ━━ */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <ShoppingBag size={14} /> Services & Inventory
            </div>

            {/* Toggle Services */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl w-full min-h-[60px]">
                <div className="flex flex-col">
                  <Label htmlFor="addon_club_rental" className="font-bold text-sm cursor-pointer">Club Rentals</Label>
                  <span className="text-[10px] text-zinc-500">R{CLUB_RENTAL_HOURLY}/hr</span>
                </div>
                <Switch id="addon_club_rental" checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl w-full min-h-[60px]">
                <div className="flex flex-col">
                  <Label htmlFor="addon_coaching" className="font-bold text-sm cursor-pointer">Coaching</Label>
                  <span className="text-[10px] text-zinc-500">Flat R{COACHING_FLAT_FEE}</span>
                </div>
                <Switch id="addon_coaching" checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
              </div>
            </div>

            {/* Inventory Steppers */}
            <div className="grid grid-cols-2 gap-3">
              <QuantityStepper label="💧 Water" value={formData.addon_water_qty || 0} onChange={(v) => update("addon_water_qty", v)} unitPrice={formData.addon_water_price ?? 20} />
              <QuantityStepper label="🧤 Gloves" value={formData.addon_gloves_qty || 0} onChange={(v) => update("addon_gloves_qty", v)} unitPrice={formData.addon_gloves_price ?? 220} />
              <QuantityStepper label="🎾 Balls" value={formData.addon_balls_qty || 0} onChange={(v) => update("addon_balls_qty", v)} unitPrice={formData.addon_balls_price ?? 50} />
              
              {/* Empty placeholder to complete 2x2 grid if needed */}
              <div className="flex flex-col items-center justify-center p-3 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 opacity-50 min-h-[100px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">More Soon</span>
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
              {/* Payment Method */}
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="payment_type" className="text-[10px] font-bold">PAYMENT METHOD</Label>
                <Select name="payment_type" value={formData.payment_type} onValueChange={(v) => {
                  update("payment_type", v);
                  if (v === 'cash' || v === 'card' || v === 'eft') update("payment_status", "paid_instore");
                  if (v === 'pending') update("payment_status", "pending");
                }}>
                  <SelectTrigger id="payment_type" className="bg-background border-2 h-12 min-h-[48px]"><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cash">Physical Cash</SelectItem>
                    <SelectItem value="card">Card Machine</SelectItem>
                    <SelectItem value="eft">EFT / Proof of Payment</SelectItem>
                    <SelectItem value="yoco">Yoco Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_type === 'yoco' && formData.yoco_payment_id && !isPaidOut && (
                <Button variant="outline" className="h-12 min-h-[48px] border-primary/40 bg-primary/20 hover:bg-primary/30 font-bold uppercase gap-2" onClick={verifyYocoPayment} disabled={isVerifying}>
                  {isVerifying ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Verify Yoco
                </Button>
              )}

              {/* ━━ PRICE CARD ━━ */}
              <div className="p-4 sm:p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
                <div className="absolute top-[-10px] right-[-10px] opacity-10 pointer-events-none">
                  <CreditCard size={120} />
                </div>

                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80">
                  <span>Session: R{totals.base}</span>
                  <span>Extras: R{totals.extras}</span>
                </div>

                <Separator className="bg-primary-foreground/20" />

                {/* Manual Override Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold opacity-70 flex items-center gap-2">
                    AMOUNT DUE
                    {isManualPrice && (
                      <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                        UNLOCKED
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manual-override" className="text-[9px] font-bold opacity-60 cursor-pointer">PRICE UNLOCK </Label>
                    <Switch
                      id="manual-override"
                      checked={isManualPrice}
                      onCheckedChange={(v) => {
                        if (!v) handleResetPrice();
                        else setIsManualPrice(true);
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black">R</span>
                  {isManualPrice ? (
                    <Input
                      type="number"
                      value={currentTotal}
                      onChange={(e) => handleManualPriceChange(Number(e.target.value))}
                      className="text-3xl font-black tabular-nums bg-transparent border-none text-primary-foreground p-0 h-12 focus-visible:ring-0 w-[140px]"
                    />
                  ) : (
                    <span className="text-3xl font-black tabular-nums">{currentTotal}</span>
                  )}
                  {isManualPrice && (
                    <Button variant="ghost" size="sm" className="h-[44px] min-w-[44px] px-3 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={handleResetPrice}>
                      <RotateCcw size={16} />
                    </Button>
                  )}
                </div>

                {/* Quick Override Actions */}
                {isManualPrice && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <button type="button" onClick={() => handleManualPriceChange(0)} className="flex-1 min-h-[44px] rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 text-[10px] font-black uppercase border border-primary-foreground/20 transition-all">
                      <Zap size={12} className="inline mr-1" />COMP (R0)
                    </button>
                    <button type="button" onClick={() => handleManualPriceChange(Math.max(0, currentTotal - 50))} className="flex-1 min-h-[44px] rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 text-[10px] font-black uppercase border border-primary-foreground/20 transition-all">
                      -R50
                    </button>
                    <button type="button" onClick={() => handleManualPriceChange(Math.max(0, currentTotal - 100))} className="flex-1 min-h-[44px] rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 text-[10px] font-black uppercase border border-primary-foreground/20 transition-all">
                      -R100
                    </button>
                  </div>
                )}

                <Button variant="secondary" size="lg" className="w-full font-black text-[12px] uppercase shadow-lg h-14 min-h-[56px] mt-2" onClick={() => onSave(formData)}>
                  Charge R{currentTotal}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* ━━ FOOTER ━━ */}
        <DialogFooter className="bg-background border-t p-4 sm:p-6 flex flex-col gap-4 relative z-20">
          {isDeleting ? (
            <div className="flex flex-col items-stretch gap-3 bg-destructive/10 p-4 rounded-xl border border-destructive/20 w-full animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 flex-col sm:flex-row flex-1 text-center sm:text-left">
                <Info size={16} className="text-destructive font-bold mx-auto sm:mx-0" />
                <span className="text-xs font-black text-destructive uppercase">Destroy entry natively?</span>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button variant="destructive" className="h-12 min-h-[48px] w-full text-[10px] font-black uppercase" onClick={() => onDelete(formData.id)}>Yes, Execute</Button>
                <Button variant="ghost" className="h-12 min-h-[48px] w-full text-[10px] font-bold" onClick={() => setIsDeleting(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {formData.id && (
                <Button variant="ghost" className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase h-12 min-h-[48px] w-full" onClick={() => setIsDeleting(true)}>
                  <Trash2 size={14} className="mr-2" /> Delete Record
                </Button>
              )}
              <div className="flex flex-col gap-3 w-full">
                <Button variant="outline" className="font-bold text-xs uppercase h-12 min-h-[48px] w-full" onClick={onClose}>Discard</Button>
                <Button className="font-black text-xs uppercase shadow-md hover:shadow-xl transition-all h-14 min-h-[56px] w-full" onClick={() => onSave(formData)}>Persist Changes</Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
