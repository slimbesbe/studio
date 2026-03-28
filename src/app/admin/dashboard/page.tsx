"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Loader2,
  Activity,
  Briefcase,
  GraduationCap,
  LayoutGrid,
  MoreHorizontal,
  Clock
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import { startOfDay, endOfDay, isWithinInterval, subDays, format, startOfMonth, endOfMonth } from 'date-fns';

// LISTE BLANCHE MATÉRIELLE DE SÉCURITÉ
const ADMIN_EMAILS = ['slim.besbes@yahoo.fr'];
const ADMIN_UIDS = ['vwyrAnNtQkSojYSEEK2qkRB5feh2', 'GPgreBe1JzZYbEHQGn3xIdcQGQs1'];

export default function SuperAdminDashboard() {
  const { user, profile, isUserLoading } = useUser();
  const router = useRouter();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  // VÉRIFICATION DE SÉCURITÉ MATÉRIELLE STRICTE
  const isAuthorizedAdmin = useMemo(() => {
    if (!user) return false;
    return (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) || 
           ADMIN_UIDS.includes(user.uid);
  }, [user]);

  // isAdmin n'est vrai que si l'utilisateur est autorisé ET que son profil confirme le rôle
  const isAdmin = useMemo(() => {
    if (!isAuthorizedAdmin || !profile) return false;
    return profile.role === 'super_admin' || profile.role === 'admin';
  }, [isAuthorizedAdmin, profile]);

  // FETCH DATA - Protected by strict isAdmin check
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
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 500);
    
    if (!isUserLoading && profile && !isAdmin) {
      router.push('/dashboard');
    }
    return () => clearTimeout(timer);
  }, [profile, isUserLoading, router, isAdmin]);

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
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });

    const monthAttempts = allAttempts.filter(a => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    });

    const avgScore = allAttempts.length > 0 
      ? Math.round(allAttempts.reduce((acc, a) => acc + (Number(a.scorePercent) || 0), 0) / allAttempts.length)
      : 0;
    
    const successRate = allAttempts.length > 0
      ? Math.round((allAttempts.filter(a => (Number(a.scorePercent) || 0) >= 75).length / allAttempts.length) * 100)
      : 0;

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

    return {
      activeUsers, activeGroups, coaches, partners,
      expiredCount, suspendedCount,
      todaySims: todayAttempts.length,
      totalSimsMonth: monthAttempts.length,
      avgScore, successRate,
      chartData: last7Days
    };
  }, [allUsers, allGroups, allAttempts]);

  if (!mounted || isUserLoading) {
    return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

  if (!isAdmin) return null;

  if (!stats) {
    return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Cockpit Super Admin</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-widest italic">Pilotage en temps réel • Simu-lux</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border shadow-sm">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase text-slate-400 italic">Système Actif</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4">
          <Card className="rounded-[32px] border-none shadow-xl p-8 space-y-8 h-full bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2 italic">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <OverviewCard icon={Users} label="Users actifs" val={stats.activeUsers} color="bg-blue-50 text-blue-600" />
              <OverviewCard icon={LayoutGrid} label="Groupes" val={stats.activeGroups} color="bg-emerald-50 text-emerald-600" />
              <OverviewCard icon={GraduationCap} label="Coachs" val={stats.coaches} color="bg-indigo-50 text-indigo-600" />
              <OverviewCard icon={Briefcase} label="Partenaires" val={stats.partners} color="bg-amber-50 text-amber-600" />
            </div>
            
            <div className="pt-8 border-t border-dashed space-y-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest italic">4. Alertes Gestion</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-5 rounded-2xl border-2 border-red-100">
                  <p className="text-[9px] font-black text-red-400 uppercase italic">Expirés</p>
                  <p className="text-4xl font-black text-red-600 tracking-tighter">{stats.expiredCount}</p>
                </div>
                <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-100">
                  <p className="text-[9px] font-black text-amber-400 uppercase italic">Suspendus</p>
                  <p className="text-4xl font-black text-amber-600 tracking-tighter">{stats.suspendedCount}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card className="rounded-[32px] border-none shadow-xl p-8 h-full space-y-8 bg-white">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest italic">2. Activité Simulations</h3>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase italic">Aujourd'hui</p>
                <p className="text-4xl font-black text-slate-900 italic">{stats.todaySims}</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%" key={`bar-today-${chartKey}`}>
                    <BarChart data={stats.chartData}>
                      <XAxis dataKey="name" hide />
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase italic">Ce mois</p>
                <p className="text-4xl font-black text-slate-900 italic">{stats.totalSimsMonth}</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%" key={`bar-month-${chartKey}`}>
                    <BarChart data={stats.chartData}>
                      <XAxis dataKey="name" hide />
                      <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-4">
          <Card className="rounded-[32px] border-none shadow-xl p-8 h-full space-y-10 bg-white">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest italic">3. Performance Globale</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <GaugeCard label="Score moyen" val={stats.avgScore} color="#3b82f6" />
              <GaugeCard label="Taux réussite" val={stats.successRate} color="#10b981" />
            </div>

            <div className="pt-8 border-t border-dashed">
              <div className="bg-indigo-50/50 p-6 rounded-3xl flex justify-between items-center border-2 border-indigo-100 shadow-inner">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase italic">Statut Système</p>
                  <p className="text-xs font-bold text-indigo-400 italic">Optimisé</p>
                </div>
                <p className="text-3xl font-black text-indigo-600 italic">OK</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, val, color }: any) {
  return (
    <div className="p-5 rounded-2xl bg-white border-2 border-slate-50 shadow-sm flex flex-col gap-4 group hover:scale-105 transition-transform">
      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{val.toLocaleString()}</p>
      </div>
    </div>
  );
}

function GaugeCard({ label, val, color }: any) {
  const numericVal = Number(val) || 0;
  return (
    <div className="flex flex-col items-center justify-center space-y-3 p-6 bg-slate-50/50 rounded-3xl border-2 border-white shadow-inner">
      <p className="text-[10px] font-black text-slate-400 uppercase text-center italic">{label}</p>
      <div className="relative h-24 w-32 flex items-center justify-center overflow-hidden">
        <svg className="absolute top-0 transform" width="120" height="120">
          <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="10" fill="transparent" strokeDasharray="157 157" strokeDashoffset="0" strokeLinecap="round" transform="rotate(180 60 60)" />
          <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="10" fill="transparent" strokeDasharray="157 157" strokeDashoffset={157 - (157 * numericVal) / 100} strokeLinecap="round" transform="rotate(180 60 60)" />
        </svg>
        <span className="mt-6 text-2xl font-black text-slate-900 italic">{numericVal}%</span>
      </div>
    </div>
  );
}