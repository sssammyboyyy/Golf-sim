"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Trash2, User, Flag, ShoppingBag, CreditCard, Calendar, Info, RotateCcw, Clock, MapPin, Search } from "lucide-react"

// 🛡️ MODULAR BUSINESS RULES
const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600; 
  if (players === 3) return 480; 
  if (players === 2) return 360; 
  return 250; 
};

const CLUB_RENTAL_HOURLY = 100;
const COACHING_FLAT_FEE = 250; 

// 🏗️ BAY CONFIGURATION
const BAY_OPTIONS = [
  { id: '1', label: 'Lounge Bay', color: 'text-indigo-400' },
  { id: '2', label: 'Middle Bay', color: 'text-amber-400' },
  { id: '3', label: 'Window Bay', color: 'text-emerald-400' },
];

export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking, manual_price_override: !!booking.manual_price_override });
      setIsDeleting(false);
      setIsManualPrice(!!booking.manual_price_override);
    }
  }, [booking]);

  // 🧠 REACTIVE POS LEDGER
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

  // 🔗 SYNC TOTAL — only if NOT manually overridden
  useEffect(() => {
    if (formData && !isManualPrice && formData.total_price !== totals.total) {
      setFormData((prev: any) => ({ ...prev, total_price: totals.total, manual_price_override: false }));
    }
  }, [totals.total, isManualPrice]);

  if (!formData) return null;

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleManualPriceChange = (value: string) => {
    setIsManualPrice(true);
    update("total_price", Number(value));
    update("manual_price_override", true);
    update("payment_status", "pending"); // Revert badge to Red explicitly if they are changing price
  };

  const handleResetPrice = () => {
    setIsManualPrice(false);
    update("manual_price_override", false);
    setFormData((prev: any) => ({ ...prev, total_price: totals.total, manual_price_override: false }));
  };

  const extendTime = (hours: number) => {
    update("duration_hours", formData.duration_hours + hours);
    update("payment_status", "pending"); // instantly revert payment badge to Settle (Red)
    update("payment_type", "pending");
  };

  const verifyYocoPayment = async () => {
    if (!formData.yoco_payment_id) return alert("No Yoco ID found on this record.");
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
            alert("Yoco Verification Successful! Marked as Paid.");
            onSave({ ...formData, payment_status: 'paid_instore', payment_type: 'yoco' });
        } else {
            alert(`Yoco Verification Pending/Failed. Status: ${data.status}`);
        }
    } catch (e: any) {
        alert("Verification failed: " + e.message);
    } finally {
        setIsVerifying(false);
    }
  };

  const isPaidOut = formData.payment_status === 'completed' || formData.payment_status === 'paid_instore';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[650px] max-h-[95vh] overflow-y-auto border-t-8 border-t-primary p-0">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 px-4 py-3 sm:px-6 sm:py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-xl sm:text-2xl font-black">
              <span className="flex items-center gap-2">
                <Flag className="text-primary" /> {formData.guest_name ? `EDIT: ${formData.guest_name}` : "NEW WALK-IN"}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex flex-col space-y-4 p-4 sm:p-6 sm:space-y-6">

          {/* CARD 1: GUEST IDENTITY */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4 flex flex-col">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <User size={14} /> Guest Identity
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="guest_name" className="text-[10px] font-bold opacity-70">FULL NAME</Label>
                <Input id="guest_name" name="guest_name" placeholder="John Doe" value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} className="h-12 min-h-[48px]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <Label htmlFor="guest_phone" className="text-[10px] font-bold opacity-70">PHONE NUMBER</Label>
                  <Input id="guest_phone" name="guest_phone" placeholder="082 123 4567" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} className="h-12 min-h-[48px]" />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <Label htmlFor="guest_email" className="text-[10px] font-bold opacity-70">EMAIL ADDRESS</Label>
                  <Input id="guest_email" name="guest_email" placeholder="guest@example.com" value={formData.guest_email || ""} onChange={(e) => update("guest_email", e.target.value)} className="h-12 min-h-[48px]" />
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: SESSION SETUP */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border flex flex-col space-y-4">
            <div className="flex flex-col justify-between items-start gap-2">
               <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                 <Calendar size={14} /> Session Setup
               </div>
               
               {/* Quick Extensions */}
               {formData.id && (
                   <div className="flex gap-2">
                       <Button size="sm" variant="outline" className="h-10 min-h-[40px] text-[10px] font-black uppercase" onClick={() => extendTime(0.5)}>+30 Min</Button>
                       <Button size="sm" variant="outline" className="h-10 min-h-[40px] text-[10px] font-black uppercase" onClick={() => extendTime(1)}>+60 Min</Button>
                   </div>
               )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="player_count" className="text-[10px] font-bold">PLAYERS (1-4)</Label>
                <Input id="player_count" name="player_count" type="number" min="1" max="4" value={formData.player_count} onChange={(e) => update("player_count", Number(e.target.value))} className="h-12 min-h-[48px]" />
                <p className="text-[10px] text-muted-foreground font-medium">Rate: R{GET_BASE_HOURLY_RATE(formData.player_count)}/hr</p>
              </div>
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="duration_hours" className="text-[10px] font-bold">DURATION (HRS)</Label>
                <Input id="duration_hours" name="duration_hours" type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={(e) => update("duration_hours", Number(e.target.value))} className="h-12 min-h-[48px]" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-2 w-full">
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="start_time" className="text-[10px] font-bold flex items-center gap-1.5">
                  <Clock size={12} className="text-primary" /> START TIME
                </Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time || '12:00'}
                  onChange={(e) => update("start_time", e.target.value)}
                  className="font-mono font-bold text-lg tracking-tight h-12 min-h-[48px]"
                />
              </div>
              <div className="flex flex-col space-y-1.5 w-full">
                <Label htmlFor="simulator_id" className="text-[10px] font-bold flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" /> BAY ASSIGNMENT
                </Label>
                <Select
                  name="simulator_id"
                  value={String(formData.simulator_id)}
                  onValueChange={(v) => update("simulator_id", Number(v))}
                >
                  <SelectTrigger id="simulator_id" className="bg-background border-2 font-bold h-12 min-h-[48px]">
                    <SelectValue placeholder="Select Bay" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAY_OPTIONS.map((bay) => (
                      <SelectItem key={bay.id} value={bay.id}>
                        <span className={`font-bold ${bay.color}`}>{bay.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="notes" className="text-[10px] font-bold">MANAGER & KITCHEN NOTES</Label>
              <textarea
                id="notes"
                name="notes"
                className="w-full min-h-[100px] p-4 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="..."
                value={formData.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </section>

          {/* CARD 3: RETAIL */}
          <section className="bg-muted/30 p-4 sm:p-6 rounded-2xl border space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <ShoppingBag size={14} /> Services & Inventory
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm w-full min-h-[60px]">
                <div className="flex flex-col">
                  <Label htmlFor="addon_club_rental" className="font-bold text-sm cursor-pointer">Club Rentals</Label>
                  <span className="text-[10px] text-muted-foreground">R100/hr</span>
                </div>
                <Switch id="addon_club_rental" name="addon_club_rental" checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm w-full min-h-[60px]">
                <div className="flex flex-col">
                  <Label htmlFor="addon_coaching" className="font-bold text-sm cursor-pointer">Coaching</Label>
                  <span className="text-[10px] text-muted-foreground">Flat R250</span>
                </div>
                <Switch id="addon_coaching" name="addon_coaching" checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
              </div>
            </div>

            <div className="flex flex-col space-y-4 pt-2">
              <Label className="text-[10px] font-bold opacity-70">RETAIL INVENTORY (QTY | @PRICE)</Label>
              <div className="flex flex-col space-y-3">
                {[
                  { label: "Water", qty: "addon_water_qty", price: "addon_water_price", def: 20 },
                  { label: "Gloves", qty: "addon_gloves_qty", price: "addon_gloves_price", def: 220 },
                  { label: "Balls", qty: "addon_balls_qty", price: "addon_balls_price", def: 50 },
                ].map((item) => (
                  <div key={item.label} className="flex flex-row gap-2 sm:gap-3 items-center bg-background p-2 pr-2 sm:pr-4 rounded-xl border border-dashed justify-between">
                    <Label htmlFor={item.qty} className="w-16 sm:w-20 text-xs font-bold pl-1 sm:pl-2">{item.label}</Label>
                    <Input id={item.qty} name={item.qty} className="w-16 h-12 min-h-[48px] text-center bg-muted/20 border-none font-bold" type="number" min="0" value={formData[item.qty] || 0} onChange={(e) => update(item.qty, Number(e.target.value))} />
                    <span className="text-center text-muted-foreground font-mono text-xs">@</span>
                    <div className="flex flex-1 items-center bg-muted/10 rounded-md px-2 border h-12 min-h-[48px]">
                      <span className="text-[10px] font-bold opacity-50 mr-1">R</span>
                      <Input id={item.price} name={item.price} aria-label={`${item.label} Price`} className="h-full text-right border-none bg-transparent font-mono focus-visible:ring-0 p-0" type="number" value={formData[item.price] ?? item.def} onChange={(e) => update(item.price, Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CARD 4: SETTLEMENT CARD */}
          <section className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
                <CreditCard size={14} /> Settlement
                </div>
                {/* State Badge Map */}
                <div className={`px-2.5 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-all ${isPaidOut ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}>
                    {isPaidOut ? '✅ Paid (Green)' : '❌ Settle (Red)'}
                </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="payment_type" className="text-[10px] font-bold">PAYMENT METHOD</Label>
                <Select name="payment_type" value={formData.payment_type} onValueChange={(v) => {
                    update("payment_type", v)
                    if (v === 'cash' || v === 'card' || v === 'eft') update("payment_status", "paid_instore");
                    if (v === 'pending') update("payment_status", "pending");
                }}>
                  <SelectTrigger id="payment_type" className="bg-background border-2 h-12 min-h-[48px]"><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cash">Physical Cash</SelectItem>
                    <SelectItem value="card">Card Machine (In-store)</SelectItem>
                    <SelectItem value="eft">EFT / Proof of Payment</SelectItem>
                    <SelectItem value="yoco">Yoco Online Checkout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payment_type === 'yoco' && formData.yoco_payment_id && !isPaidOut && (
                  <Button variant="outline" className="h-12 border-primary/40 text-primary-foreground bg-primary/20 hover:bg-primary/30 font-bold uppercase gap-2" onClick={verifyYocoPayment} disabled={isVerifying}>
                     {isVerifying ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Verify Yoco Payment
                  </Button>
              )}

              <div className="p-4 sm:p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-[-10px] right-[-10px] opacity-10 pointer-events-none">
                  <CreditCard size={120} />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80">
                  <span>Session: R{totals.base}</span>
                  <span>Addons: R{totals.extras}</span>
                </div>
                
                <Separator className="bg-primary-foreground/20" />

                <div className="flex flex-col sm:flex-row justify-between items-start pt-2 gap-4">
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[10px] font-bold opacity-70 flex items-center gap-2">
                       NEW AMOUNT DUE
                      {isManualPrice && (
                        <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                          OVERRIDE
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black">R</span>
                      <Input
                        type="number"
                        value={formData.total_price ?? totals.total}
                        onChange={(e) => handleManualPriceChange(e.target.value)}
                        className="text-3xl font-black tabular-nums bg-transparent border-none text-primary-foreground p-0 h-12 focus-visible:ring-0 w-[140px]"
                      />
                      {isManualPrice && (
                        <Button variant="ghost" size="sm" className="h-12 min-h-[48px] px-3 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={handleResetPrice}>
                          <RotateCcw size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto font-black text-[12px] uppercase shadow-lg h-14" onClick={() => onSave(formData)}>
                    Charge R{formData.total_price ?? totals.total}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

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
                <Button variant="ghost" className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase h-12 min-h-[48px] w-full" onClick={() => setIsDeleting(true)}>
                    <Trash2 size={14} className="mr-2" /> Delete Record
                </Button>
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
