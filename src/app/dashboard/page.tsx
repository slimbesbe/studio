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
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const formatTimeHoursMinutes = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-fade-in box-border">
      {/* Top 3 Indicator Cards - Height ~18% */}
      <div className="h-[18%] shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Latest Score */}
        <Card className="flex flex-col justify-center border-t-4 border-t-[#004d73] shadow-sm rounded-none bg-white">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0 shrink-0">
            <Award className="h-4 w-4 text-[#004d73]" />
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Latest Score</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-end">
            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats?.latestScore || 0}%</div>
          </CardContent>
        </Card>

        {/* 2. Exams Taken */}
        <Card className="flex flex-col justify-center border-t-4 border-t-[#4fc3f7] shadow-sm rounded-none bg-white">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0 shrink-0">
            <Target className="h-4 w-4 text-[#4fc3f7]" />
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Exams Taken</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-end">
            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats?.totalExams || 0}</div>
          </CardContent>
        </Card>

        {/* 3. Average Score */}
        <Card className="flex flex-col justify-center border-t-4 border-t-[#004d73] shadow-sm rounded-none bg-white">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0 shrink-0">
            <TrendingUp className="h-4 w-4 text-[#004d73]" />
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Average Score</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex items-end">
            <div className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{stats?.avgScore || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Middle large progression card - Height: flex-1 */}
      <Card className="flex-1 min-h-0 flex flex-col rounded-none shadow-sm border-none bg-white p-6">
        <CardHeader className="p-0 pb-4 shrink-0">
          <CardTitle className="text-2xl font-black text-[#004d73] uppercase italic tracking-tighter">Score Progression</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Evolution of your performance</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          {stats?.progressionData && stats.progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#004d73" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#004d73', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="Start your first simulation to see progression" />
          )}
        </CardContent>
      </Card>

      {/* Bottom row large indicators - Height ~35% */}
      <div className="h-[35%] shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Study Time Card */}
        <Card className="border-t-8 border-t-[#4fc3f7] shadow-lg rounded-none bg-white flex flex-col justify-center overflow-hidden">
          <CardContent className="p-6 space-y-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 text-[#4fc3f7] shrink-0">
              <Clock className="h-8 w-8" />
              <h3 className="text-xl font-black uppercase tracking-[0.1em] italic">Study Time</h3>
            </div>
            <div className="text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-tight shrink-0">
              {formatTimeHoursMinutes(stats?.studyTime || 0)}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic shrink-0">Cumulated learning</p>
          </CardContent>
        </Card>

        {/* Questions Card */}
        <Card className="border-t-8 border-t-[#004d73] shadow-lg rounded-none bg-white flex flex-col justify-center overflow-hidden">
          <CardContent className="p-6 space-y-2 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 text-[#004d73] shrink-0">
              <BookOpen className="h-8 w-8" />
              <h3 className="text-xl font-black uppercase tracking-[0.1em] italic">Questions</h3>
            </div>
            <div className="text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-tight shrink-0">
              {stats?.totalQuestions || 0}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic shrink-0">Items processed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-none bg-slate-50/30">
      <Target className="h-12 w-12 opacity-20" />
      <p className="text-[10px] font-black uppercase tracking-widest text-center px-8">{message}</p>
    </div>
  );
}
