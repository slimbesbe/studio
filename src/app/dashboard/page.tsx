
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
import { TargetExamDateCard } from '@/components/dashboard/TargetExamDateCard';

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
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-6 animate-fade-in pb-20">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tableau de Bord - {profile?.firstName || 'Candidat'}</h1>
        <div className="flex items-center gap-2">
          <Button asChild className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-bold rounded-xl h-9 px-5 text-xs">
            <Link href="/dashboard/practice" className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" /> Start Sprint
            </Link>
          </Button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* --- PREMIERE LIGNE (STRATÉGIQUE) --- */}

        {/* 1. Target Exam Date */}
        <div className="md:col-span-4 h-[220px]">
          <TargetExamDateCard profile={profile} />
        </div>

        {/* 2. Temps d'étude (Donut) */}
        <div className="md:col-span-4 h-[220px]">
          <Card className="rounded-2xl border-none shadow-sm p-4 bg-white h-full flex flex-col justify-between">
            <h3 className="font-bold text-slate-500 text-[11px] uppercase">5. Temps d'étude</h3>
            <div className="flex items-center gap-6 flex-1">
              <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'Used', value: profile?.totalTimeSpent || 0 }, { name: 'Free', value: 36000 }]}
                      cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#1d4ed8" />
                      <Cell fill="#e2e8f0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-0.5">
                <p className="text-xl font-bold text-slate-900">{Math.floor((profile?.totalTimeSpent || 0) / 3600)} hrs</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Temps d'étude cumulé</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Mindset Card */}
        <div className="md:col-span-4 h-[220px]">
          <Card className="rounded-2xl border-none shadow-sm p-4 bg-[#b2bdfc] h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-indigo-700" />
              <h3 className="font-bold text-[9px] uppercase tracking-widest text-indigo-800/60">Le Mindset du Coach</h3>
            </div>
            <p className="text-xs font-black italic text-indigo-950 mt-2 leading-relaxed">
              "Analysez toujours l'impact d'un changement avant de le soumettre au CCB."
            </p>
            <div className="mt-2">
              <Button asChild variant="link" className="p-0 text-indigo-800 font-bold text-[9px] h-auto uppercase tracking-widest">
                <Link href="/dashboard/coach">Parler au coach <ChevronRight className="h-2.5 w-2.5" /></Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* --- DEUXIÈME LIGNE (ANALYTIQUE) --- */}

        {/* 4. Vue d'ensemble (KPIs) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-4 space-y-4 bg-white h-full">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-[11px] uppercase">1. Vue d'ensemble</h3>
              <MoreHorizontal className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KPICard icon={Trophy} label="Dernier Score" val={`${stats.lastScore}%`} color="text-[#1d4ed8] bg-blue-50" />
              <KPICard icon={History} label="Examens" val={stats.examCount} color="text-[#22c55e] bg-emerald-50" />
              <KPICard icon={TrendingUp} label="Score Moyen" val={`${stats.avgScore}%`} color="text-indigo-600 bg-indigo-50" />
              <KPICard icon={FileQuestion} label="Questions" val={stats.questionsCount} color="text-amber-600 bg-amber-50" />
            </div>
          </Card>
        </div>

        {/* 5. Activité (Charts) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-4 h-full space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-[11px] uppercase">2. Activité</h3>
              <Info className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Simulations</p>
                <p className="text-xl font-bold text-slate-900">{stats.progressionData.length}</p>
                <div className="h-[90px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.progressionData}>
                      <Bar dataKey="val" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Progression</p>
                <p className="text-xl font-bold text-slate-900">{stats.readiness}%</p>
                <div className="h-[90px] w-full">
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

        {/* 6. Performance (Gauges) */}
        <div className="md:col-span-4">
          <Card className="rounded-2xl border-none shadow-sm p-4 h-full space-y-4 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-500 text-[11px] uppercase">3. Performance</h3>
              <MoreHorizontal className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Prêt pour l'examen</p>
                <RadialGauge value={stats.readiness} color="#1d4ed8" />
              </div>
              <div className="flex flex-col items-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Taux de réussite</p>
                <RadialGauge value={Math.min(100, stats.avgScore + 5)} color="#22c55e" />
              </div>
            </div>
          </Card>
        </div>

        {/* --- TROISIÈME LIGNE (DÉTAILS) --- */}

        {/* 7. Analyse groupe / Activités (Table) */}
        <div className="md:col-span-12">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase">6. Dernières activités</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-none h-10">
                  <TableHead className="font-bold text-[9px] uppercase text-slate-400 h-10">Nom de la Session</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase text-slate-400 h-10">Type</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase text-slate-400 h-10">Progression Moy.</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase text-slate-400 h-10">Score</TableHead>
                  <TableHead className="font-bold text-[9px] uppercase text-slate-400 h-10">Date</TableHead>
                  <TableHead className="text-right font-bold text-[9px] uppercase text-slate-400 h-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.sortedAttempts.map((a, i) => (
                  <TableRow key={i} className="border-b border-slate-50 h-12">
                    <TableCell className="font-bold text-slate-700 text-xs py-2">{a.examId ? a.examId.replace('exam', 'Simulation ') : a.sessionId || 'Entraînement'}</TableCell>
                    <TableCell className="text-slate-500 text-[10px] py-2">{a.examId ? 'Examen' : 'Micro-simulation'}</TableCell>
                    <TableCell className="w-[180px] py-2">
                      <div className="flex items-center gap-2">
                        <Progress value={a.scorePercent} className="h-1" />
                        <span className="text-[9px] font-bold text-slate-400">{a.scorePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 text-xs py-2">{a.scorePercent}%</TableCell>
                    <TableCell className="text-slate-400 text-[9px] py-2">{a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString() : 'Récemment'}</TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" asChild>
                          <Link href={`/dashboard/history/${a.id}`}><Edit2 className="h-3 w-3 text-slate-400" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
                          <Trash2 className="h-3 w-3 text-slate-400" />
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
    <div className="p-3 rounded-xl bg-white border border-slate-50 flex items-center gap-3 group hover:shadow-md transition-all">
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="overflow-hidden">
        <p className="text-[8px] font-bold text-slate-400 uppercase truncate leading-none mb-1">{label}</p>
        <p className="text-base font-bold text-slate-900 leading-none">{val}</p>
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
    <div className="relative h-[65px] w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={35}
            outerRadius={50}
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
        <span className="text-sm font-bold text-slate-900">{value}%</span>
      </div>
    </div>
  );
}
