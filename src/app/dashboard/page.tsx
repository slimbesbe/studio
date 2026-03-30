
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  TrendingUp, 
  Award, 
  BookOpen,
  Target,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Brain,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(10)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return {
        readiness: 15,
        status: 'Beginner',
        latestScore: 0,
        totalQuestions: 0,
        strongDomain: 'N/A',
        weakDomain: 'N/A',
        recommendation: 'Commencez par explorer les concepts de base.',
        progressionData: []
      };
    }

    const latest = attempts[0];
    const avgScore = Math.round(attempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attempts.length);
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    let status = 'Beginner';
    if (avgScore >= 75) status = 'Ready';
    else if (avgScore >= 50) status = 'Intermediate';

    const progressionData = [...attempts].reverse().map((a, i) => ({
      name: `S${i+1}`,
      score: a.scorePercent
    }));

    return {
      readiness: avgScore,
      status,
      latestScore: latest.scorePercent,
      totalQuestions,
      strongDomain: 'Processus',
      weakDomain: 'Agile',
      recommendation: 'Concentrez-vous sur le mindset Agile pour passer le cap des 80%.',
      progressionData
    };
  }, [attempts]);

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
          <span>Plateforme</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900">Dashboard Intelligence</span>
        </div>
        <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase italic">
          Coach Actif • V2.0
        </div>
      </div>

      {/* Hero: Readiness Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[40px] border-none shadow-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Award className="h-64 w-64" />
          </div>
          <CardContent className="p-12 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative h-48 w-48 shrink-0">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                  <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={553} strokeDashoffset={553 - (553 * stats.readiness) / 100} className="text-indigo-400 transition-all duration-1000 ease-out" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black italic tracking-tighter">{stats.readiness}%</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Readiness</span>
                </div>
              </div>
              <div className="space-y-6 text-center md:text-left">
                <div>
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-full font-black uppercase italic text-[10px] tracking-widest mb-4",
                    stats.status === 'Ready' ? "bg-emerald-500 text-white" : stats.status === 'Intermediate' ? "bg-amber-500 text-white" : "bg-indigo-500 text-white"
                  )}>
                    Statut : {stats.status}
                  </Badge>
                  <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">Analyse de Préparation</h1>
                  <p className="text-slate-400 font-bold italic text-sm max-w-md">
                    Votre niveau actuel indique une compréhension {stats.status.toLowerCase()} des principes PMI. Suivez le parcours recommandé.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <Button asChild className="h-14 px-8 rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-black uppercase tracking-widest text-xs shadow-xl">
                    <Link href="/dashboard/exam">Lancer une simulation <ChevronRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="outline" className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-xs">
                    <Link href="/dashboard/statistics">Voir mes stats détaillées</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Insights */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white p-8 space-y-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2 italic">
              <Brain className="h-4 w-4 text-indigo-500" /> Smart Insights
            </h3>
            
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl flex items-center gap-4">
                <div className="bg-emerald-500 p-2 rounded-xl text-white"><Zap className="h-4 w-4" /></div>
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase italic">Point Fort</p>
                  <p className="text-sm font-black text-slate-800 italic">{stats.strongDomain}</p>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl flex items-center gap-4">
                <div className="bg-red-500 p-2 rounded-xl text-white"><Target className="h-4 w-4" /></div>
                <div>
                  <p className="text-[9px] font-black text-red-600 uppercase italic">Point Faible</p>
                  <p className="text-sm font-black text-slate-800 italic">{stats.weakDomain}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase italic mb-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" /> Recommandation Coach
            </p>
            <p className="text-xs font-bold text-slate-600 italic leading-relaxed">
              "{stats.recommendation}"
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progression Rapide */}
        <Card className="lg:col-span-2 rounded-[40px] border-none shadow-xl bg-white p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest italic flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Progression du Score
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase italic">10 dernières sessions</span>
          </div>
          <div className="h-64 w-full">
            {stats.progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.progressionData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
                <Clock className="h-12 w-12 opacity-20" />
                <p className="font-black uppercase tracking-widest text-[10px] italic">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </Card>

        {/* Matrice Couverture (Mini) */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest italic">Couverture Matrice</h3>
            <ArrowUpRight className="h-4 w-4 text-slate-300" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={cn(
                "aspect-square rounded-xl border-2 flex items-center justify-center",
                i % 3 === 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
              )}>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  i % 3 === 0 ? "bg-emerald-500" : "bg-slate-200"
                )} />
              </div>
            ))}
          </div>
          <div className="pt-4 space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
              <span className="text-slate-400">Total Items Traités</span>
              <span className="text-slate-900">{stats.totalQuestions}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: '45%' }} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 italic text-center uppercase tracking-widest">45% du programme couvert</p>
          </div>
        </Card>
      </div>

      {/* Activité Récente */}
      <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="p-10 border-b bg-slate-50/50">
          <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Clock className="h-6 w-6 text-slate-400" /> Activité Récente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {attempts?.map((a) => (
              <div key={a.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                    a.scorePercent >= 75 ? "bg-emerald-500" : a.scorePercent >= 50 ? "bg-indigo-500" : "bg-red-500"
                  )}>
                    {a.scorePercent >= 75 ? <CheckCircle2 className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800 italic uppercase">{a.examId ? a.examId.replace('exam', 'Simulation ') : 'Pratique Libre'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                      {a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Récemment'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xl font-black italic tracking-tighter",
                    a.scorePercent >= 75 ? "text-emerald-500" : a.scorePercent >= 50 ? "text-indigo-500" : "text-red-500"
                  )}>{a.scorePercent}%</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">Score final</p>
                </div>
              </div>
            ))}
            {(!attempts || attempts.length === 0) && (
              <div className="p-20 text-center space-y-4">
                <p className="font-black text-slate-300 uppercase italic tracking-widest">Aucune activité enregistrée</p>
                <Button asChild variant="outline" className="rounded-xl font-black uppercase text-xs">
                  <Link href="/dashboard/practice">Lancer mon premier quiz</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
