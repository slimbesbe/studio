
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Loader2,
  ArrowRight,
  GraduationCap,
  Activity,
  Briefcase,
  Clock,
  MoreHorizontal,
  Search,
  Pencil,
  Info,
  LayoutGrid,
  Target,
  TrendingUp
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, isWithinInterval, subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { profile, isUserLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // 1. FETCH DATA - Protected by isAdmin check
  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'users'), limit(1000));
  }, [db, isAdmin]);
  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);

  const groupsQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'coachingGroups'), limit(500));
  }, [db, isAdmin]);
  const { data: allGroups, isLoading: loadingGroups } = useCollection(groupsQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'coachingAttempts'), limit(1000));
  }, [db, isAdmin]);
  const { data: allAttempts, isLoading: loadingAttempts } = useCollection(attemptsQuery);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 300);
    if (!isUserLoading && profile && profile.role !== 'admin' && profile.role !== 'super_admin') {
      router.push('/dashboard');
    }
    return () => clearTimeout(timer);
  }, [profile, isUserLoading, router]);

  const safeParseDate = (ts: any) => {
    if (!ts) return new Date();
    if (ts.toDate) return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // 2. ANALYTICS LOGIC
  const stats = useMemo(() => {
    if (!allUsers || !allGroups || !allAttempts) return null;

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const activeUsers = allUsers.filter(u => u.status === 'active').length;
    const activeGroups = allGroups.filter(g => g.status === 'active').length;
    const coaches = allUsers.filter(u => u.role === 'coach').length;
    const partners = allUsers.filter(u => u.role === 'partner').length;
    const expiredCount = allUsers.filter(u => u.status === 'expired').length;
    const suspendedCount = allUsers.filter(u => u.status === 'disabled' || u.status === 'suspended').length;

    const todayAttempts = allAttempts.filter(a => {
      const date = safeParseDate(a.submittedAt);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const monthAttempts = allAttempts.filter(a => {
      const date = safeParseDate(a.submittedAt);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const totalStudyTime = allUsers.reduce((acc, u) => acc + (Number(u.totalTimeSpent) || 0), 0);
    const totalQuestions = allAttempts.reduce((acc, a) => acc + (Number(a.totalQuestions) || 0), 0);

    const avgScore = allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((acc, a) => acc + (Number(a.scorePercent) || 0), 0) / allAttempts.length)
      : 0;
    
    const successRate = allAttempts.length > 0
      ? Math.round((allAttempts.filter(a => (Number(a.scorePercent) || 0) >= 75).length / allAttempts.length) * 100)
      : 0;

    const totalLicences = allGroups.reduce((acc, g) => acc + (Number(g.maxUsers) || 0), 0);
    const usedLicences = allUsers.filter(u => !!u.groupId).length;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(now, 6 - i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      const count = allAttempts.filter(a => {
        const date = safeParseDate(a.submittedAt);
        return isWithinInterval(date, { start: dayStart, end: dayEnd });
      }).length;
      return { name: format(d, 'EEE'), val: count };
    });

    const groupAnalysis = allGroups.map(g => {
      const groupMembers = allUsers.filter(u => u.groupId === g.id);
      const groupAttempts = allAttempts.filter(a => a.groupId === g.id);
      const groupAvg = groupAttempts.length > 0
        ? Math.round(groupAttempts.reduce((acc, a) => acc + (Number(a.scorePercent) || 0), 0) / groupAttempts.length)
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
      totalSimsMonth: monthAttempts.length,
      totalStudyTime, totalQuestions,
      avgScore, successRate,
      totalLicences, usedLicences,
      chartData: last7Days,
      groupAnalysis
    };
  }, [allUsers, allGroups, allAttempts]);

  if (!mounted || isUserLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

  if (!isAdmin) {
    return null; // Let the redirect happen
  }

  if (!stats) {
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Cockpit Super Admin</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest italic">Pilotage en temps réel • Simu-lux</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border">
            <Activity className="h-4 w-4 text-blue-600 ml-2" />
            <span className="text-[10px] font-black uppercase text-slate-400 italic mr-2">Système Actif</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 1. Vue d'ensemble */}
        <div className="md:col-span-4">
          <Card className="rounded-[24px] border-none shadow-sm p-6 space-y-6 h-full bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 italic">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <OverviewCard icon={Users} label="Users actifs" val={stats.activeUsers} color="bg-blue-50 text-blue-600" />
              <OverviewCard icon={LayoutGrid} label="Groupes" val={stats.activeGroups} color="bg-emerald-50 text-emerald-600" />
              <OverviewCard icon={GraduationCap} label="Coachs" val={stats.coaches} color="bg-indigo-50 text-indigo-600" />
              <OverviewCard icon={Briefcase} label="Partenaires" val={stats.partners} color="bg-amber-50 text-amber-600" />
            </div>
            
            <div className="pt-6 border-t border-slate-50 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">4. Alertes Gestion</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase italic">Expirés</p>
                  <p className="text-3xl font-black text-red-600 tracking-tighter">{stats.expiredCount}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-400 uppercase italic">Suspendus</p>
                  <p className="text-3xl font-black text-amber-600 tracking-tighter">{stats.suspendedCount}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Activité */}
        <div className="md:col-span-4">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">2. Activité Simulations</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Aujourd'hui</p>
                <p className="text-3xl font-black text-slate-900">{stats.todaySims}</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%" key={`bar-today-${chartKey}`}>
                    <BarChart data={stats.chartData} margin={{ left: -20 }}>
                      <XAxis dataKey="name" hide />
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Ce mois</p>
                <p className="text-3xl font-black text-slate-900">{stats.totalSimsMonth}</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%" key={`bar-month-${chartKey}`}>
                    <BarChart data={stats.chartData} margin={{ left: -20 }}>
                      <XAxis dataKey="name" hide />
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Temps d'étude</p>
                <div className="relative h-20 w-20 flex items-center justify-center mt-2">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="40" cy="40" r="35" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                    <circle cx="40" cy="40" r="35" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray="220" strokeDashoffset="80" strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-900">{formatTime(stats.totalStudyTime)}h</span>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Questions</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalQuestions.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-emerald-500 font-bold text-[9px] italic"><TrendingUp className="h-3 w-3" /> Volume cumulé</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Performance */}
        <div className="md:col-span-4">
          <Card className="rounded-[24px] border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">3. Performance Globale</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <GaugeCard label="Score moyen" val={stats.avgScore} color="#3b82f6" />
              <GaugeCard label="Taux réussite" val={stats.successRate} color="#10b981" />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-50">
              <div className="bg-indigo-50/50 p-4 rounded-2xl flex justify-between items-center border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase italic">Top Score Groupe</p>
                <p className="text-xl font-black text-indigo-600">{stats.groupAnalysis[0]?.score || 0}%</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">Indice Confiance</p>
                  <p className="text-sm font-black text-slate-900">Optimal</p>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]" />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Business */}
        <div className="md:col-span-5">
          <Card className="rounded-[24px] border-none shadow-sm p-8 h-full space-y-8 bg-white">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">5. Business & Licences B2B</h3>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Capacité Licences</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter">{stats.totalLicences}</p>
                <div className="h-20 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%" key={`lic-${chartKey}`}>
                    <BarChart data={stats.chartData}>
                      <XAxis dataKey="name" hide />
                      <Bar dataKey="val" fill="#6366f1" radius={[2, 2, 0, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Taux d'occupation</p>
                <div className="relative h-32 w-32 flex items-center justify-center">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="50" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle cx="64" cy="64" r="50" stroke="#6366f1" strokeWidth="12" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - (314 * (stats.usedLicences / (stats.totalLicences || 1)))} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-slate-900">{stats.usedLicences}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase italic">Occupées</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 6. Analyse Groupe */}
        <div className="md:col-span-7">
          <Card className="rounded-[24px] border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b bg-slate-50/30 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest italic">6. Top Cohortes Actives</h3>
              <Button variant="ghost" size="sm" asChild className="text-[10px] font-black text-blue-600 uppercase italic">
                <Link href="/admin/coaching/stats">Détails <ArrowRight className="ml-2 h-3 w-3" /></Link>
              </Button>
            </div>
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 italic">Groupe</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center italic">Élèves</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center italic">Score</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 text-right pr-6 italic">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.groupAnalysis.map((g, i) => (
                  <TableRow key={i} className="h-16">
                    <TableCell className="font-bold text-blue-600 text-xs italic uppercase">{g.name}</TableCell>
                    <TableCell className="text-center text-xs font-black text-slate-900">{g.members}</TableCell>
                    <TableCell className="text-center font-black text-slate-900 text-sm italic">{g.score}%</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 border rounded-lg">
                        <Link href={`/admin/coaching/config-groups/${g.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, val, color }: any) {
  return (
    <div className="p-4 rounded-2xl bg-white border shadow-sm flex flex-col gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter">{val.toLocaleString()}</p>
      </div>
    </div>
  );
}

function GaugeCard({ label, val, color }: any) {
  const numericVal = Number(val) || 0;
  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-slate-50/50 rounded-2xl border shadow-inner">
      <p className="text-[10px] font-black text-slate-400 uppercase text-center italic">{label}</p>
      <div className="relative h-24 w-32 flex items-center justify-center overflow-hidden">
        <svg className="absolute top-0 transform" width="120" height="120">
          <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset="0" strokeLinecap="round" transform="rotate(180 60 60)" />
          <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="8" fill="transparent" strokeDasharray="157 157" strokeDashoffset={157 - (157 * numericVal) / 100} strokeLinecap="round" transform="rotate(180 60 60)" />
        </svg>
        <span className="mt-6 text-2xl font-black text-slate-900 italic">{numericVal}%</span>
      </div>
    </div>
  );
}
