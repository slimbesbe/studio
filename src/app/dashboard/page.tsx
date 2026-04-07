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
import { isValid } from 'date-fns';

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
    
    // Filtrage des tentatives valides pour les stats
    const validSorted = sorted.filter(a => a.submittedAt && isValid(a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt)));
    
    const avgScore = validSorted.length > 0 ? Math.round(validSorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / validSorted.length) : 0;
    const lastScore = validSorted[0]?.scorePercent || 0;
    const examCount = validSorted.filter(a => a.examId && a.examId.startsWith('exam')).length;
    const questionsCount = validSorted.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    const progressionData = [...validSorted].reverse().slice(-7).map((a, i) => {
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
      sortedAttempts: validSorted.slice(0, 5)
    };
  }, [rawAttempts]);

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-[#1d4ed8]" /></div>;
  }

  return (
    <div className="h-full flex flex-col space-y-[2vh] animate-fade-in p-[1vh] overflow-hidden bg-[#f8fafc]">
      
      {/* Header Compact */}
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-2 px-2">
        <div>
          <h1 className="text-[clamp(1.2rem,3vh,2rem)] font-black italic text-slate-900 tracking-tighter uppercase leading-none">Tableau de Bord</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[clamp(0.6rem,1.2vh,0.8rem)] italic mt-1">Bonjour {profile?.firstName || 'Candidat'} • Vision 360°</p>
        </div>
        <Button asChild className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-black uppercase italic rounded-xl h-[6vh] px-6 text-[1.4vh] shadow-lg">
          <Link href="/dashboard/practice" className="flex items-center gap-2">
            <Zap className="h-4 w-4 fill-white" /> Start Practice
          </Link>
        </Button>
      </div>

      {/* Bento Grid Scalable */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-[2vh]">
        
        {/* ROW 1: STRATEGIC */}
        <div className="md:col-span-4 h-full min-h-0">
          <TargetExamDateCard profile={profile} />
        </div>

        <div className="md:col-span-4 h-full min-h-0">
          <Card className="rounded-[2.5vh] border-none shadow-sm p-[2vh] bg-white h-full flex flex-col justify-between overflow-hidden">
            <h3 className="font-black text-slate-400 text-[1vh] uppercase tracking-[0.2em] italic">Temps d'étude</h3>
            <div className="flex items-center gap-[2vw] flex-1 min-h-0">
              <div className="h-[12vh] w-[12vh] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'Used', value: profile?.totalTimeSpent || 0 }, { name: 'Free', value: 36000 }]}
                      cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" paddingAngle={5} dataKey="value"
                    >
                      <Cell fill="#1d4ed8" />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-[0.5vh]">
                <p className="text-[clamp(1.5rem,4vh,3rem)] font-black italic text-slate-900 leading-none">{Math.floor((profile?.totalTimeSpent || 0) / 3600)}h</p>
                <p className="text-[1vh] font-bold text-slate-400 uppercase leading-tight italic">Temps cumulé</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-4 h-full min-h-0">
          <Card className="rounded-[2.5vh] border-none shadow-sm p-[2vh] bg-[#004aad] h-full flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain className="h-[25vh] w-[25vh] text-white" />
            </div>
            <div className="relative z-10 flex items-center gap-2">
              <Brain className="h-[2vh] w-[2vh] text-blue-100" />
              <h3 className="font-black text-[1vh] uppercase tracking-widest text-blue-100/80 italic">Mindset Coach</h3>
            </div>
            <p className="relative z-10 text-[clamp(0.8rem,1.8vh,1.4rem)] font-black italic text-white leading-relaxed line-clamp-3">
              "Privilégiez toujours la collaboration interne à l'équipe avant d'escalader au management."
            </p>
            <Button asChild variant="link" className="relative z-10 p-0 text-white font-black text-[1vh] h-auto uppercase tracking-widest hover:text-blue-200 justify-start">
              <Link href="/dashboard/coach">Plus de conseils <ChevronRight className="h-2 w-2 ml-1" /></Link>
            </Button>
          </Card>
        </div>

        {/* ROW 2: ANALYTICAL */}
        <div className="md:col-span-4 h-full min-h-0">
          <Card className="rounded-[2.5vh] border-none shadow-sm p-[2vh] space-y-[2vh] bg-white h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-400 text-[1vh] uppercase tracking-widest italic">Performance</h3>
              <Activity className="h-3 w-3 text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-[1.5vh] flex-1">
              <KPICard label="Dernier Score" val={`${stats.lastScore}%`} color="text-[#1d4ed8] bg-blue-50" />
              <KPICard label="Examens" val={stats.examCount} color="text-[#22c55e] bg-emerald-50" />
              <KPICard label="Score Moyen" val={`${stats.avgScore}%`} color="text-indigo-600 bg-indigo-50" />
              <KPICard label="Questions" val={stats.questionsCount} color="text-amber-600 bg-amber-50" />
            </div>
          </Card>
        </div>

        <div className="md:col-span-8 h-full min-h-0">
          <Card className="rounded-[2.5vh] border-none shadow-sm p-[2vh] h-full space-y-[2vh] bg-white flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-400 text-[1vh] uppercase tracking-widest italic">Historique de progression</h3>
              <TrendingUp className="h-3 w-3 text-slate-300" />
            </div>
            <div className="flex-1 w-full min-h-0">
              {stats.progressionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.progressionData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="val" stroke="#1d4ed8" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-bold italic text-[1.4vh]">Données insuffisantes</div>
              )}
            </div>
          </Card>
        </div>

        {/* ROW 3: RECENT ACTIVITY TABLE */}
        <div className="md:col-span-12 h-full min-h-0">
          <Card className="rounded-[2.5vh] border-none shadow-sm bg-white overflow-hidden h-full flex flex-col">
            <CardHeader className="p-[1.5vh] border-b bg-slate-50/50 flex-none">
              <CardTitle className="text-[1vh] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                <History className="h-3 w-3" /> Activités récentes
              </CardTitle>
            </CardHeader>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="border-none h-[4vh]">
                    <TableHead className="font-black text-[0.9vh] uppercase text-slate-400">Session</TableHead>
                    <TableHead className="font-black text-[0.9vh] uppercase text-slate-400 text-center">Score</TableHead>
                    <TableHead className="font-black text-[0.9vh] uppercase text-slate-400">Progression</TableHead>
                    <TableHead className="text-right font-black text-[0.9vh] uppercase text-slate-400 pr-6">Revue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.sortedAttempts.map((a, i) => (
                    <TableRow key={i} className="border-b border-slate-50 h-[6vh] hover:bg-slate-50 transition-colors">
                      <TableCell className="py-1">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-700 text-[1.3vh] italic truncate uppercase">{a.examId ? a.examId.replace('exam', 'Simulation ') : a.sessionId || 'Sprint'}</span>
                          <span className="text-[0.8vh] font-bold text-slate-400 uppercase italic">
                            {a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString() : 'Récemment'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <Badge className={cn(
                          "font-black italic text-[1.1vh] px-2 py-0.5 rounded-lg border-none",
                          a.scorePercent >= 75 ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {a.scorePercent}%
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1 w-[15vw]">
                        <div className="flex items-center gap-2">
                          <Progress value={a.scorePercent} className="h-[0.6vh]" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-1 pr-6">
                        <Button variant="ghost" size="icon" className="h-[4vh] w-[4vh] rounded-lg hover:bg-primary/5" asChild>
                          <Link href={`/dashboard/history/${a.id}`}><ChevronRight className="h-4 w-4 text-primary" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.sortedAttempts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-[15vh] text-center font-bold italic text-slate-300 text-[1.2vh]">Aucune activité</TableCell></TableRow>
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

function KPICard({ label, val, color }: any) {
  return (
    <div className={cn("p-[1.5vh] rounded-[1.5vh] border flex flex-col justify-center gap-1 group hover:shadow-md transition-all", color.split(' ')[1])}>
      <p className="text-[0.8vh] font-black text-slate-400 uppercase tracking-widest truncate italic">{label}</p>
      <p className={cn("text-[clamp(1rem,2.5vh,2rem)] font-black italic tracking-tighter leading-none", color.split(' ')[0])}>{val}</p>
    </div>
  );
}