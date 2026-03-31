
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Target,
  ChevronRight,
  Zap,
  Brain,
  Check,
  Clock,
  History,
  Trophy,
  FileQuestion,
  Users,
  LayoutGrid,
  GraduationCap,
  Briefcase,
  Activity,
  MoreHorizontal,
  Info,
  Edit2,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      limit(100)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawAttempts } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!rawAttempts || rawAttempts.length === 0) {
      return {
        readiness: 0,
        lastScore: 0,
        examCount: 0,
        avgScore: 0,
        questionsCount: 0,
        progressionData: [],
        sortedAttempts: []
      };
    }

    const sorted = [...rawAttempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const avgScore = Math.round(sorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / sorted.length);
    const lastScore = sorted[0]?.scorePercent || 0;
    const examCount = rawAttempts.filter(a => a.examId && a.examId.startsWith('exam')).length;
    const questionsCount = rawAttempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    const progressionData = [...sorted].reverse().slice(-7).map((a, i) => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return {
        name: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        val: a.scorePercent,
      };
    });

    return {
      readiness: avgScore,
      lastScore,
      examCount,
      avgScore,
      questionsCount,
      progressionData,
      sortedAttempts: sorted.slice(0, 5)
    };
  }, [rawAttempts]);

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-[#1d4ed8]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-8 animate-fade-in pb-20">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de Bord - {profile?.firstName || 'Candidat'}</h1>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-xl h-10 px-6">
            <Link href="/dashboard/practice" className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Start Sprint
            </Link>
          </Button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* 1. Vue d'ensemble (KPIs) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 space-y-6 bg-white h-full">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-sm">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <KPICard icon={Trophy} label="Dernier Score" val={`${stats.lastScore}%`} color="text-[#1d4ed8] bg-blue-50" />
              <KPICard icon={History} label="Examens" val={stats.examCount} color="text-[#22c55e] bg-emerald-50" />
              <KPICard icon={TrendingUp} label="Score Moyen" val={`${stats.avgScore}%`} color="text-indigo-600 bg-indigo-50" />
              <KPICard icon={FileQuestion} label="Questions" val={stats.questionsCount} color="text-amber-600 bg-amber-50" />
            </div>
          </Card>
        </div>

        {/* 2. Activité (Charts) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-sm">2. Activité</h3>
              <Info className="h-4 w-4 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Simulations</p>
                <p className="text-2xl font-bold text-slate-900">{stats.progressionData.length}</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.progressionData}>
                      <Bar dataKey="val" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Progression</p>
                <p className="text-2xl font-bold text-slate-900">{stats.readiness}%</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.progressionData}>
                      <Area type="monotone" dataKey="val" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Performance (Gauges) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 h-full space-y-6 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-sm">3. Performance</h3>
              <MoreHorizontal className="h-4 w-4 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Prêt pour l'examen</p>
                <RadialGauge value={stats.readiness} color="#1d4ed8" />
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Taux de réussite</p>
                <RadialGauge value={Math.min(100, stats.avgScore + 5)} color="#22c55e" />
              </div>
            </div>
          </Card>
        </div>

        {/* 4. Gestion (Alerts) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 bg-white space-y-6">
            <h3 className="font-bold text-slate-500 text-sm">4. Statut</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-[10px] font-bold text-red-400 uppercase">Alertes erreurs</p>
                <p className="text-3xl font-bold text-red-600">12</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-400 uppercase">En attente</p>
                <p className="text-3xl font-bold text-amber-600">3</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Temps d'étude (Donut) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 bg-white space-y-6">
            <h3 className="font-bold text-slate-500 text-sm">5. Temps d'étude</h3>
            <div className="flex items-center gap-8">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'Used', value: profile?.totalTimeSpent || 0 }, { name: 'Free', value: 36000 }]}
                      cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#1d4ed8" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">{Math.floor((profile?.totalTimeSpent || 0) / 3600)} hrs</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Temps cumulé</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Mindset Card */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-6 bg-[#1e293b] text-white h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Le Mindset du Coach</h3>
            </div>
            <p className="text-sm font-medium italic text-slate-200 mt-4 leading-relaxed">
              "Analysez toujours l'impact d'un changement avant de le soumettre au CCB."
            </p>
            <div className="mt-6">
              <Button asChild variant="link" className="p-0 text-[#1d4ed8] font-bold text-[10px] uppercase tracking-widest">
                <Link href="/dashboard/coach">Parler au coach <ChevronRight className="h-3 w-3" /></Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* 6. Analyse groupe / Activités (Table) */}
        <div className="md:col-span-12">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 border-b">
              <CardTitle className="text-sm font-bold text-slate-500">6. Dernières activités</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none">
                  <TableHead className="font-bold text-[10px] uppercase text-slate-400">Nom de la Session</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-400">Type</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-400">Progression</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-400">Score</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase text-slate-400">Date</TableHead>
                  <TableHead className="text-right font-bold text-[10px] uppercase text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.sortedAttempts.map((a, i) => (
                  <TableRow key={i} className="border-b border-slate-50">
                    <TableCell className="font-bold text-slate-700 text-sm">{a.examId ? a.examId.replace('exam', 'Simulation ') : a.sessionId || 'Entraînement'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{a.examId ? 'Examen' : 'Micro-simulation'}</TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-3">
                        <Progress value={a.scorePercent} className="h-1.5" />
                        <span className="text-[10px] font-bold text-slate-400">{a.scorePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{a.scorePercent}%</TableCell>
                    <TableCell className="text-slate-400 text-[10px]">{a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString() : 'Récemment'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                          <Link href={`/dashboard/history/${a.id}`}><Edit2 className="h-3.5 w-3.5 text-slate-400" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                        </Button>
                      </div>
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

function KPICard({ icon: Icon, label, val, color }: any) {
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-50 flex items-center gap-4 group hover:shadow-md transition-all">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="overflow-hidden">
        <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900">{val}</p>
      </div>
    </div>
  );
}

function RadialGauge({ value, color }: { value: number, color: string }) {
  const data = [
    { name: 'score', value: value },
    { name: 'rest', value: 100 - value }
  ];

  return (
    <div className="relative h-24 w-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={50}
            outerRadius={70}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 left-0 w-full text-center">
        <span className="text-xl font-bold text-slate-900">{value}%</span>
      </div>
    </div>
  );
}
