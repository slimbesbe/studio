
/* eslint-disable react-hooks/exhaustive-deps */
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
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
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
            cx="80" cy="80" r={radius} stroke={color} strokeWidth={visualPercent > 0 ? 12 : 0} fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="z-10 flex items-center justify-center">
          <span className="text-4xl font-black text-slate-900 tracking-tighter italic tabular-nums">{value}</span>
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

  // Sécurité : Vérifier si l'utilisateur est admin (pour savoir si on doit filtrer ou pas)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // 1. Correction de la requête Exam Results
  const resultsQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    // On cherche dans la collection de l'utilisateur pour ses propres résultats
    return query(collection(db, 'users', user.uid, 'exam_results'), orderBy('completedAt', 'asc'), limit(50));
  }, [db, user, isDemo]);

  // 2. Requête Coaching Attempts : Toujours filtrer par userId pour les stats personnelles
  const attemptsQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    
    // Pour le Cockpit de Performance personnel, on filtre TOUJOURS par userId
    // Même si l'utilisateur est admin, ici il regarde ses PROPRES scores
    return query(
        collection(db, 'coachingAttempts'), 
        where('userId', '==', user.uid),
        limit(500)
    );
  }, [db, user, isDemo]);

  const { data: results, isLoading: isResultsLoading } = useCollection(resultsQuery);
  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (isDemo) {
      return {
        avgExamScore: 72,
        avgPracticeScore: 68,
        totalQuestions: 450,
        domainData: [
          { name: 'People', score: 75 },
          { name: 'Process', score: 62 },
          { name: 'Business', score: 80 }
        ],
        approachData: [
          { name: 'Predictive', score: 65 },
          { name: 'Agile', score: 78 },
          { name: 'Hybrid', score: 70 }
        ],
        avgTimePerQuestion: 72,
        recurrenceRate: 12,
        probability: 78,
        progressionData: [
          { name: 'Sim 1', score: 60 },
          { name: 'Sim 2', score: 65 },
          { name: 'Sim 3', score: 72 },
          { name: 'Sim 4', score: 70 },
          { name: 'Sim 5', score: 75 }
        ],
        demoTimeSpent: 45000 
      };
    }

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
  }, [results, attempts, isDemo]);

  if (isUserLoading || (!isDemo && (isResultsLoading || isAttemptsLoading))) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTotalTime = (seconds: number) => {
    const s = seconds || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const displayTime = isDemo ? (stats?.demoTimeSpent || 0) : (profile?.totalTimeSpent || 0);

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-24 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="space-y-2">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Cockpit de Performance</h1>
          <p className="text-base text-slate-500 font-bold uppercase tracking-widest italic">
            {isDemo ? "Mode DÉMO (Visualisation des KPIs)" : `Participant : ${profile?.firstName} ${profile?.lastName}`}
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
            <CircularStat value={formatTotalTime(displayTime)} sublabel="CUMULÉ TOTAL" percent={Math.min(100, (displayTime) / 180000)} color="#f59e0b" />
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
              <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Zap className="h-6 w-6 text-white" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic text-white">Rythme moyen</p>
                <h3 className="text-3xl font-black italic tracking-tighter text-white">{stats?.avgTimePerQuestion || 0}s / Q</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold leading-relaxed opacity-80 uppercase italic text-white">
              Cible PMP : 75s par question. {stats?.avgTimePerQuestion && stats.avgTimePerQuestion <= 75 ? "Excellent rythme !" : "Attention à la gestion du temps."}
            </p>
          </Card>

          <Card className="rounded-[32px] border-none shadow-lg bg-amber-500 text-white p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform"><Brain className="h-6 w-6 text-white" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 italic text-white">Taux de récidive</p>
                <h3 className="text-3xl font-black italic tracking-tighter text-white">{stats?.recurrenceRate || 0}%</h3>
              </div>
            </div>
            <p className="text-[10px] font-bold leading-relaxed opacity-80 uppercase italic text-white">
              Questions ratées plusieurs fois. Un taux élevé indique des lacunes structurelles (faux acquis).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
