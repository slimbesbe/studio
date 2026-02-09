
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  Loader2,
  Clock,
  History,
  TrendingUp,
  Award,
  Target,
  Layers,
  Brain,
  Zap,
  BarChart3,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface CircularStatProps {
  value: string | number;
  sublabel: string;
  percent: number;
  color?: string;
}

const CircularStat = ({ value, sublabel, percent, color = "hsl(var(--primary))" }: CircularStatProps) => {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const visualPercent = Math.min(100, Math.max(0, percent));
  const offset = circumference - (visualPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center text-center animate-fade-in group">
      <div className="relative h-40 w-40 flex items-center justify-center mb-6">
        <svg viewBox="0 0 160 160" className="absolute h-full w-full transform -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
          <circle
            cx="80" cy="80" r={radius} stroke={color} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="z-10 flex items-center justify-center">
          <span className="text-4xl font-black text-slate-900 tracking-tighter italic">{value}</span>
        </div>
      </div>
      <div className="h-10 flex items-start justify-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic leading-tight text-center">
          {sublabel}
        </span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;

  const resultsQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'exam_results'), orderBy('completedAt', 'asc'), limit(50));
  }, [db, user, isDemo]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'attempts'), orderBy('answeredAt', 'desc'), limit(500));
  }, [db, user, isDemo]);

  const { data: results, isLoading: isResultsLoading } = useCollection(resultsQuery);
  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!results || !attempts) return null;

    const totalQuestions = attempts.length;
    const examResults = results.filter(r => r.examId);
    const practiceResults = attempts.filter(a => a.context === 'training');
    
    const avgExamScore = examResults.length > 0 
      ? Math.round(examResults.reduce((acc, r) => acc + r.percentage, 0) / examResults.length) 
      : 0;
    
    const avgPracticeScore = practiceResults.length > 0
      ? Math.round((practiceResults.filter(a => a.isCorrect).length / practiceResults.length) * 100)
      : 0;

    const domainStats: Record<string, { correct: number, total: number }> = {
      'People': { correct: 0, total: 0 },
      'Process': { correct: 0, total: 0 },
      'Business': { correct: 0, total: 0 }
    };

    const approachStats: Record<string, { correct: number, total: number }> = {
      'Predictive': { correct: 0, total: 0 },
      'Agile': { correct: 0, total: 0 },
      'Hybrid': { correct: 0, total: 0 }
    };

    attempts.forEach(a => {
      const d = a.tags?.domain;
      const app = a.tags?.approach;
      if (d && domainStats[d]) {
        domainStats[d].total++;
        if (a.isCorrect) domainStats[d].correct++;
      }
      if (app && approachStats[app]) {
        approachStats[app].total++;
        if (a.isCorrect) approachStats[app].correct++;
      }
    });

    const domainData = Object.keys(domainStats).map(name => ({
      name,
      score: domainStats[name].total > 0 ? Math.round((domainStats[name].correct / domainStats[name].total) * 100) : 0
    }));

    const approachData = Object.keys(approachStats).map(name => ({
      name,
      score: approachStats[name].total > 0 ? Math.round((approachStats[name].correct / approachStats[name].total) * 100) : 0
    }));

    const totalExamTime = results.reduce((acc, r) => acc + (r.timeSpent || 0), 0);
    const totalExamQuestions = results.reduce((acc, r) => acc + (r.total || 0), 0);
    const avgTimePerQuestion = totalExamQuestions > 0 ? Math.round(totalExamTime / totalExamQuestions) : 0;

    const questionFails: Record<string, number> = {};
    attempts.forEach(a => {
      if (!a.isCorrect) {
        questionFails[a.questionId] = (questionFails[a.questionId] || 0) + 1;
      }
    });
    const multiFailed = Object.values(questionFails).filter(count => count >= 2).length;
    const recurrenceRate = totalQuestions > 0 ? Math.round((multiFailed / totalQuestions) * 100) : 0;

    // Estimation probability
    const weight = Math.min(1, results.length / 5); 
    const probability = Math.round((avgExamScore * 0.7 + avgPracticeScore * 0.3) * (0.8 + 0.2 * weight));

    return {
      avgExamScore,
      avgPracticeScore,
      totalQuestions,
      domainData,
      approachData,
      avgTimePerQuestion,
      recurrenceRate,
      probability,
      progressionData: results.map((r, i) => ({ name: `Sim ${i+1}`, score: r.percentage }))
    };
  }, [results, attempts]);

  if (isUserLoading || isResultsLoading || isAttemptsLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTotalTime = (seconds: number) => {
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}H ${m.toString().padStart(2, '0')}`;
    return `${m} MIN`;
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-24 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter">Cockpit de Performance</h1>
          <p className="text-base text-slate-500 font-bold uppercase tracking-widest italic">
            {isDemo ? "Mode DÉMO" : `Participant : ${profile?.firstName} ${profile?.lastName}`}
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest border-4" asChild disabled={isDemo}>
            <Link href="/dashboard/history"><History className="mr-2 h-5 w-5" /> Historique</Link>
          </Button>
          <Button className="rounded-2xl h-14 px-10 shadow-xl uppercase font-black tracking-widest bg-primary italic hover:scale-105 transition-all" asChild>
            <Link href="/dashboard/exam"><PlayCircle className="mr-2 h-6 w-6" /> Lancer Simulation</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <CircularStat value={`${stats?.avgExamScore || 0}%`} sublabel="SCORE SIMULATION" percent={stats?.avgExamScore || 0} color="#3F51B5" />
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <CircularStat value={`${stats?.avgPracticeScore || 0}%`} sublabel="SCORE PRATIQUE" percent={stats?.avgPracticeScore || 0} color="#7E57C2" />
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <CircularStat value={stats?.totalQuestions || 0} sublabel="QUESTIONS TRAITÉES" percent={Math.min(100, (stats?.totalQuestions || 0) / 10)} color="#10b981" />
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <CircularStat value={formatTotalTime(profile?.totalTimeSpent || 0)} sublabel="TEMPS D'ÉTUDE TOTAL" percent={Math.min(100, (profile?.totalTimeSpent || 0) / 180000)} color="#f59e0b" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[40px] shadow-xl border-none bg-white overflow-hidden">
          <CardHeader className="border-b p-8 bg-slate-50/50">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 italic">
              <TrendingUp className="h-5 w-5" /> Courbe de progression individuelle
            </CardTitle>
            <CardDescription className="uppercase text-[10px] font-bold italic">Evolution des scores sur les dernières simulations</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[350px]">
            {stats?.progressionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.progressionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                    itemStyle={{ color: '#3F51B5' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3F51B5" strokeWidth={4} dot={{ r: 6, fill: '#3F51B5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <BarChart3 className="h-12 w-12 opacity-20" />
                <p className="text-xs font-black uppercase italic tracking-widest">Données de progression insuffisantes</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[32px] border-none shadow-lg bg-primary text-white p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/20 p-3 rounded-2xl"><Zap className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic">Rythme moyen</p>
                <h3 className="text-3xl font-black italic tracking-tighter">{stats?.avgTimePerQuestion || 0}s / Q</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold leading-relaxed opacity-80 uppercase italic">
              Cible PMP : 75s par question. {stats?.avgTimePerQuestion && stats.avgTimePerQuestion <= 75 ? "Excellent rythme !" : "Attention à la gestion du temps."}
            </p>
          </Card>

          <Card className="rounded-[32px] border-none shadow-lg bg-amber-500 text-white p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/20 p-3 rounded-2xl"><Brain className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic">Taux de récidive</p>
                <h3 className="text-3xl font-black italic tracking-tighter">{stats?.recurrenceRate || 0}%</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold leading-relaxed opacity-80 uppercase italic">
              Questions ratées plusieurs fois. Un taux élevé indique des lacunes structurelles (faux acquis).
            </p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[40px] shadow-xl border-none bg-white overflow-hidden">
          <CardHeader className="border-b p-8 bg-slate-50/50">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 italic">
              <Layers className="h-5 w-5" /> Performance par Domaine PMP
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.domainData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} fontWeight="bold" width={80} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={30}>
                  {stats?.domainData.map((entry, index) => (
                    <Cell key={index} fill={entry.score >= 80 ? '#10b981' : entry.score >= 65 ? '#3F51B5' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[40px] shadow-xl border-none bg-white overflow-hidden">
          <CardHeader className="border-b p-8 bg-slate-50/50">
            <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3 italic">
              <Target className="h-5 w-5" /> Performance par Approche
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.approachData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} fontWeight="bold" width={80} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={30}>
                  {stats?.approachData.map((entry, index) => (
                    <Cell key={index} fill={entry.score >= 80 ? '#10b981' : entry.score >= 65 ? '#7E57C2' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="rounded-[40px] shadow-2xl border-none bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 p-10 text-center border-b">
            <div className="flex justify-center mb-4">
              <ShieldCheck className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-3xl font-black italic uppercase tracking-tight">Probabilité estimée de réussite PMP®</CardTitle>
            <CardDescription className="font-bold uppercase tracking-widest text-xs italic text-slate-500 mt-2">
              Basé sur l'historique des utilisateurs ayant réussi leur certification avec SIMOVEX
            </CardDescription>
          </CardHeader>
          <CardContent className="p-12">
            <div className="flex flex-col md:flex-row items-center justify-around gap-12">
              <div className="relative h-64 w-64 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute h-full w-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50" cy="50" r="45" stroke="hsl(var(--primary))" strokeWidth="10" fill="transparent"
                    strokeDasharray="283"
                    style={{ strokeDashoffset: 283 - (stats?.probability || 0) / 100 * 283, transition: 'stroke-dashoffset 2s ease-out' }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-6xl font-black text-slate-900 italic tracking-tighter">{stats?.probability || 0}%</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">READINESS SCORE</p>
                </div>
              </div>

              <div className="flex-1 max-w-xl space-y-6">
                <div className={cn(
                  "p-6 rounded-3xl border-2 flex items-start gap-4",
                  (stats?.probability || 0) >= 75 ? "bg-emerald-50 border-emerald-100" : (stats?.probability || 0) >= 60 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
                )}>
                  {(stats?.probability || 0) >= 75 ? <Target className="h-8 w-8 text-emerald-600 shrink-0" /> : <TrendingDown className="h-8 w-8 text-amber-600 shrink-0" />}
                  <div>
                    <h4 className={cn("text-xl font-black uppercase italic italic tracking-tight", (stats?.probability || 0) >= 75 ? "text-emerald-700" : "text-amber-700")}>
                      {(stats?.probability || 0) >= 80 ? "VOUS ÊTES PRÊT !" : (stats?.probability || 0) >= 65 ? "EN BONNE VOIE" : "TRAVAIL REQUIS"}
                    </h4>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed italic mt-2">
                      {(stats?.probability || 0) >= 80 
                        ? "Vos statistiques actuelles sont comparables aux candidats ayant réussi l'examen réel. Maintenez ce rythme jusqu'au jour J." 
                        : (stats?.probability || 0) >= 60 
                        ? "Vous maîtrisez les bases mais certains domaines (Process/Agile) nécessitent encore un renforcement pour garantir le succès." 
                        : "Le volume de questions traitées ou le score moyen est encore trop bas pour garantir une réussite sécurisée."}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mb-1">Cible Score Simulation</p>
                    <p className="text-lg font-black text-primary italic">75%+</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mb-1">Cible Rythme</p>
                    <p className="text-lg font-black text-primary italic">75s / Q</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
