
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, 
  Clock, 
  TrendingUp, 
  Award, 
  BookOpen,
  Target,
  ChevronRight,
  Watch
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 200);
    return () => clearTimeout(timer);
  }, []);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || isDemo) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid, isDemo, isUserLoading]);

  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (isDemo) {
      return {
        latestScore: 99,
        totalExams: 3,
        avgScore: 86,
        totalQuestions: 540,
        studyTime: 82020, // 22h 47m
        progressionData: [
          { date: '11 Mars', score: 62 },
          { date: '11 Mars', score: 91 },
          { date: '11 Mars', score: 99 }
        ]
      };
    }

    if (!attempts || attempts.length === 0) return null;

    const sorted = [...attempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const latest = sorted[0];
    
    const avgScore = Math.round(attempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attempts.length);
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    const progressionData = [...attempts]
      .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      .map((a, i) => ({
        date: a.submittedAt ? new Date(a.submittedAt.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : `S${i+1}`,
        score: a.scorePercent
      }));

    return {
      latestScore: latest.scorePercent,
      totalExams: attempts.length,
      avgScore,
      totalQuestions,
      studyTime: profile?.totalTimeSpent || 0,
      progressionData
    };
  }, [attempts, profile, isDemo]);

  if (isUserLoading || (!isDemo && isAttemptsLoading) || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTimeHoursMinutes = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-full flex flex-col gap-6 p-6 box-border animate-fade-in bg-[#f8fafc]">
      {/* Header Breadcrumb */}
      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">
        <span>Tableau de Bord</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900">Analyses</span>
      </div>

      {/* Top Row: KPIs (Matching the image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dernier Score */}
        <Card className="rounded-[24px] border-none shadow-md bg-white p-6 relative overflow-hidden group">
          <div className="flex justify-between items-center h-full">
            <div className="space-y-4">
              <Award className="h-8 w-8 text-primary" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">DERNIER<br/>SCORE</p>
            </div>
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-50" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={301.59} strokeDashoffset={301.59 - (301.59 * (stats?.latestScore || 0)) / 100} className="text-blue-600 transition-all duration-1000" />
              </svg>
              <span className="absolute text-3xl font-black italic text-slate-900">{stats?.latestScore || 0}%</span>
            </div>
          </div>
        </Card>

        {/* Examens Passés */}
        <Card className="rounded-[24px] border-none shadow-md bg-white p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">EXAMENS PASSÉS</p>
              <p className="text-6xl font-black italic tracking-tighter text-slate-900 leading-none">{stats?.totalExams || 0}</p>
            </div>
            <div className="bg-cyan-50 h-12 w-12 rounded-xl flex items-center justify-center text-cyan-500">
              <Target className="h-6 w-6" />
            </div>
          </div>
          <div className="flex justify-between items-center px-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-2.5 w-2.5 rounded-full ${(stats?.totalExams || 0) >= i ? "bg-slate-300" : "bg-slate-100"}`} />
            ))}
            <div className="h-0.5 flex-1 mx-4 bg-slate-100" />
          </div>
        </Card>

        {/* Score Moyen */}
        <Card className="rounded-[24px] border-none shadow-md bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-500 mb-2">
                <TrendingUp className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">SCORE MOYEN</p>
              </div>
              <p className="text-6xl font-black italic tracking-tighter text-slate-900 leading-none">{stats?.avgScore || 0}%</p>
            </div>
            <div className="h-16 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats?.progressionData || []}>
                  <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Middle: Progression du Score (Main Chart) */}
      <Card className="rounded-[32px] shadow-lg border-none bg-white p-10 flex flex-col">
        <CardHeader className="p-0 pb-10">
          <CardTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">PROGRESSION DU SCORE</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">Analyse de performance par session</CardDescription>
        </CardHeader>
        <CardContent className="p-0 h-[400px]">
          {stats?.progressionData && stats.progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" key={chartKey}>
              <ComposedChart data={stats.progressionData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                />
                <Bar 
                  dataKey="score" 
                  radius={[4, 4, 0, 0]}
                  barSize={80}
                  fill="#7dd3fc"
                >
                  {stats.progressionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#7dd3fc" fillOpacity={0.8} />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#7f1d1d" 
                  strokeWidth={4} 
                  dot={{ fill: '#7f1d1d', r: 6, strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
              <Target className="h-16 w-16 opacity-20" />
              <p className="font-black uppercase tracking-widest text-xs italic">Réalisez une simulation pour voir votre courbe de réussite</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        {/* Study Time */}
        <Card className="rounded-[24px] shadow-md border-none bg-white p-8">
          <div className="flex items-center gap-10">
            <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={263.89} strokeDashoffset={130} className="text-blue-600" />
              </svg>
              <Watch className="absolute h-8 w-8 text-slate-900" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 mb-1">
                <Clock className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">TEMPS D'ÉTUDE CUMULÉ</p>
              </div>
              <p className="text-5xl font-black italic text-slate-900">{formatTimeHoursMinutes(stats?.studyTime || 0)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">TOTAL DE L'APPRENTISSAGE</p>
            </div>
          </div>
        </Card>

        {/* Items Processed */}
        <Card className="rounded-[24px] shadow-md border-none bg-white p-8">
          <div className="flex items-center gap-10">
            <div className="bg-slate-50 h-24 w-24 rounded-[32px] flex items-center justify-center text-slate-900 shadow-inner">
              <BookOpen className="h-12 w-12" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">QUESTIONS TRAITÉES</p>
              <p className="text-6xl font-black italic text-slate-900 leading-none">{stats?.totalQuestions || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-2">ITEMS TRAITÉS</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
