'use client';

import { useState, useEffect } from 'react';
import { Trophy, Lock, MapPin, DollarSign, AlertCircle, Calendar as CalendarIcon, Users, LayoutDashboard, Calendar, Heart } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { LiveViewTab } from '@/components/admin/live-view-tab';
import { HealthTab } from '@/components/admin/health-tab';
import { WeeklyScheduleTab } from '@/components/admin/weekly-schedule-tab';

// --- HELPERS ---
const calculateTotal = (players: number, duration: number) => {
  const p = Math.max(1, players || 1);
  const d = Math.max(0.5, duration || 1);
  const pricing: Record<number, number> = { 1: 250, 2: 180, 3: 160, 4: 150 };
  const rate = pricing[Math.min(p, 4)] || 150;
  return rate * p * d;
};

export default function AdminDashboardPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "weekly" | "health">("live");
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- AUTH ---
  useEffect(() => {
    const savedPin = sessionStorage.getItem('admin-pin');
    if (savedPin === "8821") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "8821") {
      sessionStorage.setItem('admin-pin', pin);
      setIsAuthenticated(true);
    } else {
      alert("Invalid PIN");
    }
  };

  const supabase = createBrowserClient();

  // --- DATA FETCHING (For Stats) ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStatsData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', today)
        .eq('status', 'confirmed');
      
      setBookings(data || []);
    };

    fetchStatsData();
    const channel = supabase.channel('stats-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchStatsData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <LoginScreen pin={pin} setPin={setPin} handleLogin={handleLogin} />;
  }

  // --- STATS CALCULATIONS ---
  const totalRev = bookings.reduce((acc, b) => acc + (Number(b.amount_paid) || 0), 0);
  const outstanding = bookings.reduce((acc, b) => acc + (Number(b.total_price) - (Number(b.amount_paid) || 0)), 0);
  const occupancy = Math.round((bookings.reduce((acc, b) => acc + Number(b.duration_hours), 0) / 36) * 100);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Trophy className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-white uppercase">Venue OS</h1>
                <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> The Mulligan Dashboard
                </div>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-[#050505] p-1.5 rounded-xl border border-zinc-800 shadow-inner">
             <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={<LayoutDashboard className="w-4 h-4" />} label="Live View" />
             <TabButton active={activeTab === 'weekly'} onClick={() => setActiveTab('weekly')} icon={<Calendar className="w-4 h-4" />} label="Weekly Schedule" />
             <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon={<Heart className="w-4 h-4" />} label="System Health" />
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end pr-4 border-r border-zinc-800">
                <div className="text-xs font-bold text-white uppercase">Admin Manager</div>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Vanderbijlpark</div>
             </div>
             <div 
               className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl border border-white/5 flex items-center justify-center text-zinc-400 font-bold hover:text-white transition-all cursor-pointer"
               onClick={() => { sessionStorage.removeItem('admin-pin'); window.location.reload(); }}
               title="Sign Out"
             >
                SJ
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 py-10">
        {/* Stats Grid */}
        {activeTab !== 'health' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <StatCard label="Banked Revenue" value={`R${totalRev.toLocaleString()}`} icon={<DollarSign className="text-emerald-400" />} sub="Paid In-Store & Online" color="emerald" />
            <StatCard label="Outstanding" value={`R${outstanding.toLocaleString()}`} icon={<AlertCircle className="text-amber-400" />} sub="Pending Collection" color="amber" />
            <StatCard label="Total Bookings" value={bookings.length} icon={<CalendarIcon className="text-blue-400" />} sub="Slots Filled Today" color="blue" />
            <StatCard label="Bay Occupancy" value={`${occupancy}%`} icon={<Users className="text-purple-400" />} sub="Utilization" color="purple" />
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          {activeTab === 'live' && <LiveViewTab />}
          {activeTab === 'weekly' && <div className="p-20 text-center text-zinc-500 font-medium">Weekly Schedule coming soon...</div>}
          {activeTab === 'health' && <HealthTab />}
        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? 'bg-zinc-800 text-white shadow-md ring-1 ring-white/5' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, icon, sub, color }: any) {
  const borderStyles = {
    emerald: "border-emerald-500/10 hover:border-emerald-500/20 shadow-emerald-950/20",
    amber: "border-amber-500/10 hover:border-amber-500/20 shadow-amber-950/20",
    blue: "border-blue-500/10 hover:border-blue-500/20 shadow-blue-950/20",
    purple: "border-purple-500/10 hover:border-purple-500/20 shadow-purple-950/20"
  };

  return (
    <div className={`bg-[#09090b] border ${borderStyles[color as keyof typeof borderStyles]} p-6 rounded-2xl transition-all duration-300 group hover:translate-y-[-2px] hover:shadow-2xl`}>
       <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-[#050505] border border-zinc-800 rounded-xl group-hover:scale-110 transition-transform duration-300">{icon}</div>
          <span className="text-[10px] font-bold bg-[#050505] text-zinc-500 px-2.5 py-1 rounded-full border border-zinc-800 tracking-wider">LIVE</span>
       </div>
       <div>
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{label}</div>
          <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
          <div className="text-xs text-zinc-500 font-medium mt-2 group-hover:text-zinc-400 transition-colors uppercase tracking-tight">{sub}</div>
       </div>
    </div>
  );
}

function LoginScreen({ pin, setPin, handleLogin }: any) {
  return (
    <div className="h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
       {/* Ambient Background */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none" />
       
       <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/5 p-10 rounded-3xl shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/40 mb-8 border border-white/10">
             <Trophy className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Venue OS</h1>
          <p className="text-zinc-500 text-sm mb-8 font-medium">Administrator Access Portal</p>
          
          <div className="space-y-4">
            <div className="relative">
               <Lock className="absolute left-4 top-4 w-5 h-5 text-zinc-500" />
               <input 
                 type="password" 
                 placeholder="Enter Security PIN" 
                 value={pin}
                 onChange={e => setPin(e.target.value)}
                 className="w-full bg-[#050505] border border-zinc-800 text-center text-xl tracking-[0.5em] text-white p-4 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700 placeholder:tracking-normal placeholder:text-sm font-mono"
                 autoFocus
               />
            </div>
            
            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
               Authenticate
            </button>
          </div>
          
          <div className="mt-8 flex justify-center gap-4 text-xs text-zinc-600 font-medium">
             <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure Connection</span>
             <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Vanderbijlpark</span>
          </div>
       </form>
    </div>
  );
}