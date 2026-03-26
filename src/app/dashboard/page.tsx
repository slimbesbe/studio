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
  Target
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
        latestScore: 80,
        totalExams: 2,
        avgScore: 73,
        totalQuestions: 540,
        studyTime: 66660,
        progressionData: [
          { date: '15 Mai', score: 65 },
          { date: '18 Mai', score: 80 },
          { date: '20 Mai', score: 72 },
          { date: '22 Mai', score: 91 },
          { date: '25 Mai', score: 85 }
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
      .map(a => ({
        date: a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'N/A',
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
    <div className="min-h-full flex flex-col gap-4 p-4 box-border animate-fade-in">
      {/* Top 3 Indicator Cards (20% preferred height) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <Card className="flex flex-col justify-center border-t-[6px] border-t-[#004d73] shadow-lg rounded-none bg-white py-4">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0">
            <Award className="h-5 w-5 text-[#004d73]" />
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Latest Score</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-7xl font-black text-slate-900 tracking-tighter leading-none italic">{stats?.latestScore || 0}%</div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border-t-[6px] border-t-[#4fc3f7] shadow-lg rounded-none bg-white py-4">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0">
            <Target className="h-5 w-5 text-[#4fc3f7]" />
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Exams Taken</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-7xl font-black text-slate-900 tracking-tighter leading-none italic">{stats?.totalExams || 0}</div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border-t-[6px] border-t-[#004d73] shadow-lg rounded-none bg-white py-4">
          <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2 space-y-0">
            <TrendingUp className="h-5 w-5 text-[#004d73]" />
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Average Score</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-7xl font-black text-slate-900 tracking-tighter leading-none italic">{stats?.avgScore || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Middle large progression card (Flexible) */}
      <Card className="flex-1 min-h-[300px] rounded-none shadow-lg border-none bg-white p-6 flex flex-col">
        <CardHeader className="p-0 pb-4 shrink-0">
          <CardTitle className="text-3xl font-black text-[#004d73] uppercase italic tracking-tighter">Score Progression</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Analyse temporelle des performances</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0">
          {stats?.progressionData && stats.progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="800" 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                />
                <Bar 
                  dataKey="score" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                >
                  {stats.progressionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 75 ? '#004d73' : '#4fc3f7'} 
                    />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-4 border-dashed border-slate-50">
              <Target className="h-12 w-12 opacity-20" />
              <p className="font-black uppercase tracking-widest text-[10px] italic">Réalisez votre première simulation pour voir la progression</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row large indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 pb-4">
        <Card className="border-t-[8px] border-t-[#4fc3f7] shadow-xl rounded-none bg-white overflow-hidden py-4">
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-[#4fc3f7] mb-1">
              <Clock className="h-6 w-6" />
              <h3 className="text-lg font-black uppercase tracking-[0.2em] italic">Study Time</h3>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic">
              {formatTimeHoursMinutes(stats?.studyTime || 0)}
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-2">Cumulated learning</p>
          </CardContent>
        </Card>

        <Card className="border-t-[8px] border-t-[#004d73] shadow-xl rounded-none bg-white overflow-hidden py-4">
          <CardContent className="p-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-[#004d73] mb-1">
              <BookOpen className="h-6 w-6" />
              <h3 className="text-lg font-black uppercase tracking-[0.2em] italic">Questions</h3>
            </div>
            <div className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic">
              {stats?.totalQuestions || 0}
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic mt-2">Items processed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}