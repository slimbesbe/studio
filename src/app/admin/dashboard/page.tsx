
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Loader2,
  ArrowRight,
  GraduationCap,
  Activity,
  Briefcase,
  Clock,
  ChevronUp,
  MoreHorizontal,
  Search,
  Pencil,
  Trash2,
  Info,
  LayoutGrid,
  Target,
  TrendingUp
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, LineChart, Line, 
  ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, isWithinInterval, subDays, format } from 'date-fns';

export default function SuperAdminDashboard() {
  const { profile, isUserLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  // 1. FETCH DATA
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);

  const groupsQuery = useMemoFirebase(() => collection(db, 'coachingGroups'), [db]);
  const { data: allGroups, isLoading: loadingGroups } = useCollection(groupsQuery);

  const attemptsQuery = useMemoFirebase(() => collection(db, 'coachingAttempts'), [db]);
  const { data: allAttempts, isLoading: loadingAttempts } = useCollection(attemptsQuery);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [profile, isUserLoading, router]);

  // 2. ANALYTICS LOGIC
  const stats = useMemo(() => {
    if (!allUsers || !allGroups || !allAttempts) return null;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Overview
    const activeUsers = allUsers.filter(u => u.status === 'active').length;
    const activeGroups = allGroups.filter(g => g.status === 'active').length;
    const coaches = allUsers.filter(u => u.role === 'coach').length;
    const partners = allUsers.filter(u => u.role === 'partner').length;
    const expiredCount = allUsers.filter(u => u.status === 'expired').length;
    const suspendedCount = allUsers.filter(u => u.status === 'disabled' || u.status === 'suspended').length;

    // Activity
    const todayAttempts = allAttempts.filter(a => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const totalStudyTime = allUsers.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0);
    const totalQuestions = allAttempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);

    // Performance
    const avgScore = allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / allAttempts.length)
      : 0;
    
    const successRate = allAttempts.length > 0
      ? Math.round((allAttempts.filter(a => a.scorePercent >= 75).length / allAttempts.length) * 100)
      : 0;

    // Business
    const totalLicences = allGroups.reduce((acc, g) => acc + (Number(g.maxUsers) || 0), 0);
    const usedLicences = allUsers.filter(u => u.groupId).length;

    // Chart Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(now, 6 - i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      const count = allAttempts.filter(a => {
        const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
        return isWithinInterval(date, { start: dayStart, end: dayEnd });
      }).length;
      return { name: format(d, 'EEE'), val: count };
    });

    // Group Analysis
    const groupAnalysis = allGroups.map(g => {
      const groupMembers = allUsers.filter(u => u.groupId === g.id);
      const groupAttempts = allAttempts.filter(a => a.groupId === g.id);
      const groupAvg = groupAttempts.length > 0
        ? Math.round(groupAttempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / groupAttempts.length)
        : 0;
      const coach = allUsers.find(u => u.id === g.coachId);
      
      return {
        id: g.id,
        name: g.name,
        coach: coach ? `${coach.firstName} ${coach.lastName}` : 'Non assigné',
        members: groupMembers.length,
        prog: Math.min(100, Math.round((groupAttempts.length / (groupMembers.length || 1)) * 20)),
        score: groupAvg
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    return {
      activeUsers, activeGroups, coaches, partners,
      expiredCount, suspendedCount,
      todaySims: todayAttempts.length,
      totalSimsMonth: allAttempts.length, // Simplified
      totalStudyTime, totalQuestions,
      avgScore, successRate,
      totalLicences, usedLicences,
      chartData: last7Days,
      groupAnalysis
    };
  }, [allUsers, allGroups, allAttempts]);

  if (isUserLoading || !mounted || !stats) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    return h.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-8 space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Cockpit Super Admin</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest italic">Pilotage en temps réel de Simu-lux</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white border-none shadow-sm rounded-xl font-bold h-11 px-6">
            <Search className="h-4 w-4 mr-2" /> Rechercher...
          </Button>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg"><Activity className="h-4 w-4 text-blue-600" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg"><Clock className="h-4 w-4 text-slate-400" /></Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. Vue d'ensemble */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 space-y-6 h-full bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 italic">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <OverviewCard icon={Users} label="Users actifs" val={stats.activeUsers.toLocaleString()} color="bg-blue-50 text-blue-600" />
              <OverviewCard icon={LayoutGrid} label="Groupes actifs" val={stats.activeGroups.toLocaleString()} color="bg-emerald-50 text-emerald-600" />
              <OverviewCard icon={GraduationCap} label="Coachs" val={stats.coaches.toLocaleString()} color="bg-indigo-50 text-indigo-600" />
              <OverviewCard icon={Briefcase} label="Partenaires" val={stats.partners.toLocaleString()} color="bg-amber-50 text-amber-600" />
            </div>
            
            {/* 4. Gestion */}
            <div className="pt-6 border-t border-slate-50 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">4. Gestion & Alertes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 group hover:scale-105 transition-transform">
                  <p className="text-[10px] font-black text-red-400 uppercase italic">Comptes expirés</p>
                  <p className="text-3xl font-black text-red-600 tracking-tighter">{stats.expiredCount}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 group hover:scale-105 transition-transform">
                  <p className="text-[10px] font-black text-amber-400 uppercase italic">Comptes suspendus</p>
                  <p className="text-3xl font-black text-amber-600 tracking-tighter">{stats.suspendedCount}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Activité */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 italic">2. Activité</h3>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Simulations aujourd'hui</p>
                  <p className="text-2xl font-black text-slate-900">{stats.todaySims}</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Total Simulations</p>
                  <p className="text-2xl font-black text-slate-900">{stats.totalSimsMonth.toLocaleString()}</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Temps d'étude global</p>
                <div className="relative h-24 w-24 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="transparent" strokeDasharray="251.3" strokeDashoffset={251.3 * 0.4} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-black text-slate-900">{formatTime(stats.totalStudyTime)}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">hrs</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Questions traitées</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{stats.totalQuestions.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] italic">
                  <TrendingUp className="h-3 w-3" /> Données cumulées
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Performance */}
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">3. Performance</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <GaugeCard label="Score moyen" val={stats.avgScore} color="#3b82f6" />
              <GaugeCard label="Taux réussite" val={stats.successRate} color="#10b981" />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase italic">Densité de réussite par simulation</p>
              <div className="h-20 w-full flex items-end gap-1">
                {stats.chartData.map((d, i) => (
                  <div key={i} className="flex-1 bg-blue-100 rounded-t-sm relative group" style={{ height: `${Math.min(100, d.val * 10 + 20)}%` }}>
                    <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-50">
              <div className="bg-indigo-50/50 p-4 rounded-2xl flex justify-between items-center border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase italic">Moyenne groupe top</p>
                <p className="text-xl font-black text-indigo-600">{stats.groupAnalysis[0]?.score || 0}%</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Stabilité du mindset</p>
                  <p className="text-xl font-black text-slate-900">Stable</p>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%] rounded-full" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Business */}
        <div className="md:col-span-5">
          <Card className="rounded-[24px] border-none shadow-sm p-8 h-full space-y-8 bg-white">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">5. Business & Licences</h3>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Capacité Licences B2B</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{stats.totalLicences.toLocaleString()}</p>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <Bar dataKey="val" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Utilisation réelle</p>
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle cx="64" cy="64" r="50" stroke="#6366f1" strokeWidth="12" fill="transparent" strokeDasharray="314.15" strokeDashoffset={314.15 - (314.15 * (stats.usedLicences / (stats.totalLicences || 1)))} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-slate-900">{stats.usedLicences}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase italic">Occupées</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Ratio d'usage</p>
                <div className="flex items-end gap-4">
                  <p className="text-2xl font-black text-slate-900">{Math.round((stats.usedLicences / (stats.totalLicences || 1)) * 100)}%</p>
                  <div className="h-8 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.chartData}>
                        <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Cohortes actives</p>
                <p className="text-2xl font-black text-slate-900">{stats.activeGroups}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 6. Analyse Groupe */}
        <div className="md:col-span-7">
          <Card className="rounded-[24px] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">6. Top Cohortes par Performance</h3>
              <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-blue-600 hover:bg-blue-50">
                <Link href="/admin/coaching/stats">Voir tout <ArrowRight className="ml-2 h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 italic">Nom du Groupe</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 italic">Coach Responsable</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center italic">Élèves</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 italic">Activité</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center italic">Moyenne</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-400 text-right pr-6 italic">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.groupAnalysis.map((g, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50 transition-colors border-slate-50 h-16">
                      <TableCell className="font-bold text-blue-600 text-xs italic uppercase tracking-tighter">{g.name}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-600 italic">{g.coach}</TableCell>
                      <TableCell className="text-center text-xs font-black text-slate-900">{g.members}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${g.prog}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-slate-400 italic">{g.prog}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 text-sm italic">{g.score}%</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-blue-600 border rounded-lg">
                          <Link href={`/admin/coaching/config-groups/${g.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.groupAnalysis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-bold italic uppercase text-xs">
                        Aucun groupe actif détecté.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, val, color }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{val}</p>
      </div>
    </div>
  );
}

function GaugeCard({ label, val, color }: any) {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
      <p className="text-[10px] font-black text-slate-400 uppercase text-center italic">{label}</p>
      <div className="relative h-24 w-32 flex items-center justify-center overflow-hidden">
        <svg className="absolute top-0 transform" width="120" height="120">
          <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset="0" strokeLinecap="round" transform="rotate(180 60 60)" />
          <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset={157 - (157 * val) / 100} strokeLinecap="round" transform="rotate(180 60 60)" />
        </svg>
        <span className="mt-6 text-2xl font-black text-slate-900 italic">{val}%</span>
      </div>
    </div>
  );
}
