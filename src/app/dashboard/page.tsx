
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, 
  Clock, 
  TrendingUp, 
  Target, 
  Award, 
  BookOpen
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Récupération des tentatives (Examens et Coaching)
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
        latestScore: 80,
        totalExams: 2,
        avgScore: 73,
        totalQuestions: 540,
        studyTime: 66660, // 18h 31m
        progressionData: [
          { date: '2024-05-15', score: 65 },
          { date: '2024-05-18', score: 80 }
        ],
        strengthData: [
          { name: 'People', value: 85, color: '#004d73' },
          { name: 'Business Environment', value: 45, color: '#4fc3f7' }
        ]
      };
    }

    if (!attempts || attempts.length === 0) return null;

    // Tri par date décroissante pour le dernier score
    const sorted = [...attempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const latest = sorted[0];
    
    const avgScore = Math.round(attempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attempts.length);
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    // Données de progression (chronologique)
    const progressionData = [...attempts]
      .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      .map(a => ({
        date: a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString('en-CA') : 'N/A',
        score: a.scorePercent
      }));

    // Analyse des forces par domaine
    const domains: Record<string, { strong: number, total: number }> = {
      'People': { strong: 0, total: 0 },
      'Process': { strong: 0, total: 0 },
      'Business Environment': { strong: 0, total: 0 }
    };

    attempts.forEach(a => {
      // Simplification pour l'analyse de domaine
      const domain = a.tags?.domain || 'Process';
      const dKey = domain === 'Business' ? 'Business Environment' : domain;
      
      if (domains[dKey]) {
        domains[dKey].total++;
        if (a.scorePercent >= 75) domains[dKey].strong++;
      }
    });

    const strengthData = Object.keys(domains)
      .map(name => ({
        name,
        value: domains[name].total > 0 ? Math.round((domains[name].strong / attempts.length) * 100) : 0,
        color: name === 'People' ? '#004d73' : '#4fc3f7'
      }))
      .filter(d => d.value > 0 || isDemo)
      .sort((a, b) => b.value - a.value);

    return {
      latestScore: latest.scorePercent,
      totalExams: attempts.length,
      avgScore,
      totalQuestions,
      studyTime: profile?.totalTimeSpent || 0,
      progressionData,
      strengthData
    };
  }, [attempts, profile, isDemo]);

  if (isUserLoading || (!isDemo && isAttemptsLoading) || !mounted) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTimeHoursMinutes = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Top 3 Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Latest Score */}
        <Card className="border-t-4 border-t-[#004d73] shadow-sm rounded-none">
          <CardHeader className="p-6 pb-0 flex flex-row items-center gap-2 space-y-0">
            <Award className="h-4 w-4 text-[#004d73]" />
            <CardTitle className="text-sm font-semibold text-slate-600">Latest Score</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-4xl font-black text-slate-900">{stats?.latestScore || 0}%</div>
            <p className="text-xs text-slate-400 font-medium mt-1">From last session</p>
          </CardContent>
        </Card>

        {/* 2. Exams Taken */}
        <Card className="border-t-4 border-t-[#4fc3f7] shadow-sm rounded-none">
          <CardHeader className="p-6 pb-0 flex flex-row items-center gap-2 space-y-0">
            <Target className="h-4 w-4 text-[#4fc3f7]" />
            <CardTitle className="text-sm font-semibold text-slate-600">Exams Taken</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-4xl font-black text-slate-900">{stats?.totalExams || 0}</div>
            <p className="text-xs text-slate-400 font-medium mt-1">Full & Mini simulations</p>
          </CardContent>
        </Card>

        {/* 3. Average Score */}
        <Card className="border-t-4 border-t-[#004d73] shadow-sm rounded-none">
          <CardHeader className="p-6 pb-0 flex flex-row items-center gap-2 space-y-0">
            <TrendingUp className="h-4 w-4 text-[#004d73]" />
            <CardTitle className="text-sm font-semibold text-slate-600">Average Score</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="text-4xl font-black text-slate-900">{stats?.avgScore || 0}%</div>
            <p className="text-xs text-slate-400 font-medium mt-1">Overall progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Progression Chart */}
        <Card className="rounded-none shadow-sm border-none bg-white p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-bold text-slate-800">Score Progression</CardTitle>
            <CardDescription className="text-sm text-slate-400">Visualizing your improvement over time</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 h-[350px] mt-8">
            {stats?.progressionData && stats.progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.progressionData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#004d73" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#004d73', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 7 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Start your first simulation to see progression" />
            )}
          </CardContent>
        </Card>

        {/* Strength Areas Chart */}
        <Card className="rounded-none shadow-sm border-none bg-white p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-bold text-slate-800">Strength Areas</CardTitle>
            <CardDescription className="text-sm text-slate-400">Frequency of "Strong" performance by Domain</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0 h-[350px] mt-8">
            {stats?.strengthData && stats.strengthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={stats.strengthData} 
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#64748b" 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={60}>
                    {stats.strengthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Analyze your mistakes to identify strengths" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Large Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Study Time Card */}
        <Card className="border-t-4 border-t-[#4fc3f7] shadow-sm rounded-none overflow-hidden bg-white">
          <CardContent className="p-10 text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-[#4fc3f7]">
              <Clock className="h-10 w-10" />
              <h3 className="text-xl font-black uppercase tracking-[0.2em] italic">Study Time</h3>
            </div>
            <div className="text-7xl font-black text-slate-900 tracking-tighter">
              {formatTimeHoursMinutes(stats?.studyTime || 0)}
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Cumulated learning</p>
          </CardContent>
        </Card>

        {/* Questions Card */}
        <Card className="border-t-4 border-t-[#004d73] shadow-sm rounded-none overflow-hidden bg-white">
          <CardContent className="p-10 text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-[#004d73]">
              <BookOpen className="h-10 w-10" />
              <h3 className="text-xl font-black uppercase tracking-[0.2em] italic">Questions</h3>
            </div>
            <div className="text-7xl font-black text-slate-900 tracking-tighter">
              {stats?.totalQuestions || 0}
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Items processed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed rounded-3xl">
      <TrendingUp className="h-12 w-12 opacity-20" />
      <p className="text-xs font-black uppercase tracking-widest text-center px-8">{message}</p>
    </div>
  );
}
