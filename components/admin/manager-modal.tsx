"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Trash2, User, Flag, ShoppingBag, CreditCard, Calendar, Info, RotateCcw, Clock, MapPin } from "lucide-react"

// 🛡️ MODULAR BUSINESS RULES
const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600; // R150pp
  if (players === 3) return 480; // R160pp
  if (players === 2) return 360; // R180pp
  return 250; // R250pp
};

const CLUB_RENTAL_HOURLY = 100;
const COACHING_FLAT_FEE = 250; // Flat R250 for 30 min

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

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking });
      setIsDeleting(false);
      setIsManualPrice(false);
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
      setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
    }
  }, [totals.total, isManualPrice]);

  if (!formData) return null;

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleManualPriceChange = (value: string) => {
    setIsManualPrice(true);
    update("total_price", Number(value));
  };

  const handleResetPrice = () => {
    setIsManualPrice(false);
    setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[95vh] overflow-y-auto border-t-8 border-t-primary p-0">
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-2xl font-black">
              <span className="flex items-center gap-2">
                <Flag className="text-primary" /> {formData.guest_name ? `EDIT: ${formData.guest_name}` : "NEW WALK-IN"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                ID: {formData.id?.slice(0, 8) || "DRAFT"}
              </span>
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Edit or review booking details, adjust player counts, durations, and manage POS add-ons.
          </DialogDescription>
        </div>

        <div className="space-y-6 p-6">

          {/* CARD 1: GUEST IDENTITY */}
          <section className="bg-muted/30 p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <User size={14} /> Guest Identity
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="guest_name" className="text-[10px] font-bold opacity-70">FULL NAME</Label>
                <Input id="guest_name" name="guest_name" placeholder="John Doe" value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="guest_phone" className="text-[10px] font-bold opacity-70">PHONE NUMBER</Label>
                  <Input id="guest_phone" name="guest_phone" placeholder="082 123 4567" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="guest_email" className="text-[10px] font-bold opacity-70">EMAIL ADDRESS</Label>
                  <Input id="guest_email" name="guest_email" placeholder="guest@example.com" value={formData.guest_email || ""} onChange={(e) => update("guest_email", e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: SESSION SETUP (Now with Time & Bay) */}
          <section className="bg-muted/30 p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <Calendar size={14} /> Session Setup
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="player_count" className="text-[10px] font-bold">PLAYERS (1-4)</Label>
                <Input id="player_count" name="player_count" type="number" min="1" max="4" value={formData.player_count} onChange={(e) => update("player_count", Number(e.target.value))} />
                <p className="text-[10px] text-muted-foreground font-medium">Rate: R{GET_BASE_HOURLY_RATE(formData.player_count)}/hr</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration_hours" className="text-[10px] font-bold">DURATION (HRS)</Label>
                <Input id="duration_hours" name="duration_hours" type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={(e) => update("duration_hours", Number(e.target.value))} />
              </div>
            </div>

            {/* 🕐 TIME & BAY SELECTORS */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="start_time" className="text-[10px] font-bold flex items-center gap-1.5">
                  <Clock size={12} className="text-primary" /> START TIME
                </Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time || '12:00'}
                  onChange={(e) => update("start_time", e.target.value)}
                  className="font-mono font-bold text-lg tracking-tight"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="simulator_id" className="text-[10px] font-bold flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" /> BAY ASSIGNMENT
                </Label>
                <Select
                  name="simulator_id"
                  value={String(formData.simulator_id)}
                  onValueChange={(v) => update("simulator_id", Number(v))}
                >
                  <SelectTrigger id="simulator_id" className="bg-background border-2 font-bold">
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

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-[10px] font-bold">MANAGER & KITCHEN NOTES</Label>
              <textarea
                id="notes"
                name="notes"
                className="w-full min-h-[100px] p-4 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="Horse and River order # or specific requests..."
                value={formData.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </section>

          {/* CARD 3: PREMIUM SERVICES & RETAIL */}
          <section className="bg-muted/30 p-6 rounded-2xl border space-y-6">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <ShoppingBag size={14} /> Services & Inventory
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
                <div className="grid">
                  <Label htmlFor="addon_club_rental" className="font-bold text-sm cursor-pointer">Club Rentals</Label>
                  <span className="text-[10px] text-muted-foreground">R100/hr</span>
                </div>
                <Switch id="addon_club_rental" name="addon_club_rental" checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
                <div className="grid">
                  <Label htmlFor="addon_coaching" className="font-bold text-sm cursor-pointer">Coaching (Armand)</Label>
                  <span className="text-[10px] text-muted-foreground">Flat R250</span>
                </div>
                <Switch id="addon_coaching" name="addon_coaching" checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <Label className="text-[10px] font-bold opacity-70">RETAIL INVENTORY (QTY | @PRICE)</Label>
              <div className="space-y-3">
                {[
                  { label: "Water", qty: "addon_water_qty", price: "addon_water_price", def: 20 },
                  { label: "Gloves", qty: "addon_gloves_qty", price: "addon_gloves_price", def: 220 },
                  { label: "Balls", qty: "addon_balls_qty", price: "addon_balls_price", def: 50 },
                ].map((item) => (
                  <div key={item.label} className="grid grid-cols-12 gap-3 items-center bg-background p-2 pr-4 rounded-xl border border-dashed">
                    <Label htmlFor={item.qty} className="col-span-4 text-xs font-bold pl-2">{item.label}</Label>
                    <Input id={item.qty} name={item.qty} className="col-span-3 h-8 text-center bg-muted/20 border-none font-bold" type="number" min="0" value={formData[item.qty] || 0} onChange={(e) => update(item.qty, Number(e.target.value))} />
                    <span className="col-span-1 text-center text-muted-foreground font-mono text-xs">@</span>
                    <div className="col-span-4 flex items-center bg-muted/10 rounded-md px-2 border">
                      <span className="text-[10px] font-bold opacity-50 mr-1">R</span>
                      <Input id={item.price} name={item.price} aria-label={`${item.label} Price`} className="h-8 text-right border-none bg-transparent font-mono focus-visible:ring-0 p-0" type="number" value={formData[item.price] ?? item.def} onChange={(e) => update(item.price, Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CARD 4: SETTLEMENT CARD (with Manual Price Override) */}
          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <CreditCard size={14} /> Settlement
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="payment_type" className="text-[10px] font-bold">PAYMENT METHOD</Label>
                <Select name="payment_type" value={formData.payment_type} onValueChange={(v) => update("payment_type", v)}>
                  <SelectTrigger id="payment_type" className="bg-background border-2"><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Physical Cash</SelectItem>
                    <SelectItem value="card">Card Machine (In-store)</SelectItem>
                    <SelectItem value="eft">EFT / Proof of Payment</SelectItem>
                    <SelectItem value="yoco">Yoco Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-6 bg-primary text-primary-foreground rounded-2xl shadow-xl space-y-2 relative overflow-hidden">
                <div className="absolute top-[-10px] right-[-10px] opacity-10">
                  <CreditCard size={120} />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-80">
                  <span>Session: R{totals.base}</span>
                  <span>Addons: R{totals.extras}</span>
                </div>
                <Separator className="bg-primary-foreground/20" />

                {/* 🎯 MANUAL PRICE OVERRIDE */}
                <div className="flex justify-between items-end pt-2">
                  <div className="grid gap-1">
                    <span className="text-[10px] font-bold opacity-70 flex items-center gap-2">
                      TOTAL BALANCE
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
                        className="text-3xl font-black tabular-nums bg-transparent border-none text-primary-foreground p-0 h-auto focus-visible:ring-0 w-[120px]"
                      />
                      {isManualPrice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                          onClick={handleResetPrice}
                          title="Reset to calculated price"
                        >
                          <RotateCcw size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="font-black text-[10px] uppercase shadow-lg" onClick={() => onSave(formData)}>
                    Charge R{formData.total_price ?? totals.total}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t p-6 flex flex-col sm:flex-row gap-4 justify-between items-center sm:gap-0">
          <div className="w-full sm:w-auto">
            {isDeleting ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-200 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
                <Info size={14} className="text-destructive font-bold" />
                <span className="text-[10px] font-black text-destructive uppercase">Ghost Cleanup?</span>
                <Button variant="destructive" size="sm" className="h-7 text-[10px] font-black uppercase" onClick={() => onDelete(formData.id)}>Yes, Destroy</Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => setIsDeleting(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-destructive/50 hover:text-destructive hover:bg-destructive/10 font-bold text-[10px] uppercase" onClick={() => setIsDeleting(true)}>
                <Trash2 size={14} className="mr-2" /> Delete Booking
              </Button>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none font-bold text-xs uppercase" onClick={onClose}>Discard</Button>
            <Button className="flex-1 sm:flex-none px-10 font-black text-xs uppercase shadow-md hover:shadow-xl transition-all" onClick={() => onSave(formData)}>Apply Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}