
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
  ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
          { date: 'Simu 1', score: 62 },
          { date: 'Simu 2', score: 91 },
          { date: 'Simu 3', score: 99 }
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
        date: `S${i+1}`,
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
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTimeHoursMinutes = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-full flex flex-col gap-6 p-6 box-border animate-fade-in bg-[#f8fafc]">
      {/* Header Path */}
      <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mb-2">
        <span>Tableau de Bord</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900">Analyses de Performance</span>
      </div>

      {/* Top Row: Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        {/* Latest Score */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 relative overflow-hidden group border-t-8 border-t-primary">
          <div className="flex justify-between items-center h-full">
            <div className="space-y-4">
              <div className="bg-blue-50 h-14 w-14 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Award className="h-8 w-8" />
              </div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">DERNIER<br/>SCORE OBTENU</p>
            </div>
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={339.29} strokeDashoffset={339.29 - (339.29 * (stats?.latestScore || 0)) / 100} className="text-primary transition-all duration-1000" />
              </svg>
              <span className="absolute text-4xl font-black italic tracking-tighter text-slate-900">{stats?.latestScore || 0}%</span>
            </div>
          </div>
        </Card>

        {/* Exams Passed */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 space-y-6 border-t-8 border-t-accent">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">EXAMENS COMPLÉTÉS</p>
              <p className="text-7xl font-black italic tracking-tighter text-slate-900 leading-none">{stats?.totalExams || 0}</p>
            </div>
            <div className="bg-cyan-50 h-14 w-14 rounded-2xl flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
              <Target className="h-8 w-8" />
            </div>
          </div>
          <div className="relative pt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex items-center">
              <div className="h-full bg-accent transition-all" style={{ width: `${Math.min((stats?.totalExams || 0) * 20, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-3 w-3 rounded-full ${(stats?.totalExams || 0) >= i ? "bg-accent" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
        </Card>

        {/* Average Score */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 border-t-8 border-t-emerald-500">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <TrendingUp className="h-5 w-5" />
                <p className="text-[11px] font-black uppercase tracking-widest">SCORE MOYEN GLOBAL</p>
              </div>
              <p className="text-7xl font-black italic tracking-tighter text-slate-900 leading-none">{stats?.avgScore || 0}%</p>
            </div>
            <div className="h-20 w-32 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats?.progressionData || []}>
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Middle: Main Progression Chart */}
      <Card className="flex-1 rounded-[40px] shadow-2xl border-none bg-white p-10 flex flex-col min-h-[450px]">
        <CardHeader className="p-0 pb-10 shrink-0">
          <CardTitle className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">PROGRESSION DYNAMIQUE</CardTitle>
          <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">Évolution de votre mindset PMP au fil des simulations</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          {stats?.progressionData && stats.progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.progressionData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false}
                  dy={15}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                />
                <Bar 
                  dataKey="score" 
                  radius={[8, 8, 0, 0]}
                  barSize={80}
                >
                  {stats.progressionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 80 ? "#10b981" : "#7dd3fc"}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#7f1d1d" 
                  strokeWidth={4} 
                  dot={{ fill: '#7f1d1d', r: 8, strokeWidth: 0 }}
                  activeDot={{ r: 10, strokeWidth: 4, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
              <Target className="h-16 w-16 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm italic">Réalisez votre première simulation pour voir la progression</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Study Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
        {/* Study Time */}
        <Card className="rounded-[32px] shadow-xl border-none bg-white p-8 overflow-hidden group hover:shadow-2xl transition-all">
          <div className="flex items-center gap-10">
            <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={301.59} strokeDashoffset={150} className="text-primary" />
              </svg>
              <Clock className="absolute h-10 w-10 text-slate-900 group-hover:rotate-12 transition-transform" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-900 mb-1">
                <Clock className="h-4 w-4" />
                <p className="text-[11px] font-black uppercase tracking-widest">TEMPS D'ÉTUDE TOTAL</p>
              </div>
              <p className="text-6xl font-black italic tracking-tighter text-slate-900">{formatTimeHoursMinutes(stats?.studyTime || 0)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">INVESTISSEMENT CUMULÉ</p>
            </div>
          </div>
        </Card>

        {/* Items Processed */}
        <Card className="rounded-[32px] shadow-xl border-none bg-white p-8 overflow-hidden group hover:shadow-2xl transition-all">
          <div className="flex items-center gap-10">
            <div className="bg-slate-50 h-28 w-28 rounded-3xl flex items-center justify-center text-slate-900 shadow-inner group-hover:scale-105 transition-transform">
              <BookOpen className="h-14 w-14" />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">VOLUME DE QUESTIONS</p>
              <p className="text-7xl font-black italic tracking-tighter text-slate-900 leading-none">{stats?.totalQuestions || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-2">TOTAL ITEMS ANALYSÉS</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
