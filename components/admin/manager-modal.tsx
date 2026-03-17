"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Trash2, User, Flag, ShoppingBag, CreditCard, Utensils, Info, Calendar } from "lucide-react"

// 🛡️ MODULAR BUSINESS RULES
const GET_BASE_HOURLY_RATE = (players: number) => {
  if (players >= 4) return 600; // R150pp
  if (players === 3) return 480; // R160pp
  if (players === 2) return 360; // R180pp
  return 250; // R250pp
};

const CLUB_RENTAL_HOURLY = 100;
const COACHING_FLAT_FEE = 250; // Flat R250 for 30 min

export function ManagerModal({ isOpen, onClose, booking, onSave, onDelete }: any) {
  const [formData, setFormData] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking });
      setIsDeleting(false);
    }
  }, [booking]);

  // 🧠 REACTIVE POS LEDGER
  const totals = useMemo(() => {
    if (!formData) return { base: 0, extras: 0, total: 0 };

    // 1. Tiered Hourly Rate
    const baseTotal = GET_BASE_HOURLY_RATE(formData.player_count) * formData.duration_hours;

    // 2. Add-ons (Clubs are per hour, Coaching is a flat addon)
    const clubs = formData.addon_club_rental ? (CLUB_RENTAL_HOURLY * formData.duration_hours) : 0;
    const coaching = formData.addon_coaching ? COACHING_FLAT_FEE : 0;
    
    // 3. Retail (Uses the Unit Price typed by the manager for persistence)
    // Default prices are only used if the formData value is missing
    const water = (formData.addon_water_qty || 0) * (formData.addon_water_price ?? 20);
    const gloves = (formData.addon_gloves_qty || 0) * (formData.addon_gloves_price ?? 220);
    const balls = (formData.addon_balls_qty || 0) * (formData.addon_balls_price ?? 50);

    return {
      base: baseTotal,
      extras: clubs + coaching + water + gloves + balls,
      total: baseTotal + clubs + coaching + water + gloves + balls
    };
  }, [formData]);

  // Sync calculated total to state for persistence
  useEffect(() => {
    if (formData && formData.total_price !== totals.total) {
      setFormData((prev: any) => ({ ...prev, total_price: totals.total }));
    }
  }, [totals.total]);

  if (!formData) return null;

  const update = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
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
                ID: {formData.id?.slice(0,8) || "DRAFT"}
              </span>
            </DialogTitle>
          </DialogHeader>
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
                <Input id="guest_name" placeholder="John Doe" value={formData.guest_name || ""} onChange={(e) => update("guest_name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="guest_phone" className="text-[10px] font-bold opacity-70">PHONE NUMBER</Label>
                  <Input id="guest_phone" placeholder="082 123 4567" value={formData.guest_phone || ""} onChange={(e) => update("guest_phone", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="guest_email" className="text-[10px] font-bold opacity-70">EMAIL ADDRESS</Label>
                  <Input id="guest_email" placeholder="guest@example.com" value={formData.guest_email || ""} onChange={(e) => update("guest_email", e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: SESSION SETUP */}
          <section className="bg-muted/30 p-6 rounded-2xl border space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <Calendar size={14} /> Session Setup
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold">PLAYERS (1-4)</Label>
                <Input type="number" min="1" max="4" value={formData.player_count} onChange={(e) => update("player_count", Number(e.target.value))} />
                <p className="text-[10px] text-muted-foreground font-medium">Rate: R{GET_BASE_HOURLY_RATE(formData.player_count)}/hr</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold">DURATION (HRS)</Label>
                <Input type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={(e) => update("duration_hours", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold">MANAGER & KITCHEN NOTES</Label>
              <textarea 
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
                  <span className="font-bold text-sm">Club Rentals</span>
                  <span className="text-[10px] text-muted-foreground">R100/hr</span>
                </div>
                <Switch checked={formData.addon_club_rental} onCheckedChange={(v) => update("addon_club_rental", v)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm">
                <div className="grid">
                  <span className="font-bold text-sm">Coaching (Armand)</span>
                  <span className="text-[10px] text-muted-foreground">Flat R250</span>
                </div>
                <Switch checked={formData.addon_coaching} onCheckedChange={(v) => update("addon_coaching", v)} />
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
                    <span className="col-span-4 text-xs font-bold pl-2">{item.label}</span>
                    <Input className="col-span-3 h-8 text-center bg-muted/20 border-none font-bold" type="number" min="0" value={formData[item.qty] || 0} onChange={(e) => update(item.qty, Number(e.target.value))} />
                    <span className="col-span-1 text-center text-muted-foreground font-mono text-xs">@</span>
                    <div className="col-span-4 flex items-center bg-muted/10 rounded-md px-2 border">
                      <span className="text-[10px] font-bold opacity-50 mr-1">R</span>
                      <Input className="h-8 text-right border-none bg-transparent font-mono focus-visible:ring-0 p-0" type="number" value={formData[item.price] ?? item.def} onChange={(e) => update(item.price, Number(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CARD 4: SETTLEMENT CARD */}
          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-primary">
              <CreditCard size={14} /> Settlement
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold">PAYMENT METHOD</Label>
                <Select value={formData.payment_type} onValueChange={(v) => update("payment_type", v)}>
                  <SelectTrigger className="bg-background border-2"><SelectValue placeholder="Select Method" /></SelectTrigger>
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
                <div className="flex justify-between items-end pt-2">
                  <div className="grid">
                    <span className="text-[10px] font-bold opacity-70">TOTAL BALANCE</span>
                    <span className="text-4xl font-black tabular-nums">R {totals.total}</span>
                  </div>
                  <Button variant="secondary" size="sm" className="font-black text-[10px] uppercase shadow-lg" onClick={() => onSave(formData)}>
                    Charge R{totals.total}
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
  );
}