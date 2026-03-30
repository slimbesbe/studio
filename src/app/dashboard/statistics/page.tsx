
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Target, 
  Zap, 
  Brain, 
  TrendingUp, 
  Loader2, 
  ChevronRight,
  ShieldCheck,
  Award,
  ChevronLeft,
  ArrowRight,
  Activity
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function StatisticsV2Page() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', user.uid), orderBy('submittedAt', 'desc'));
  }, [db, user?.uid, isUserLoading]);

  const { data: attempts, isLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!attempts || attempts.length === 0) return null;

    const avgScore = Math.round(attempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attempts.length);
    
    // Simulation Radar Data
    const radarData = [
      { subject: 'People', A: 65, fullMark: 100 },
      { subject: 'Process', A: 85, fullMark: 100 },
      { subject: 'Business', A: 45, fullMark: 100 },
      { subject: 'Agile', A: 70, fullMark: 100 },
      { subject: 'Waterfall', A: 90, fullMark: 100 },
      { subject: 'Hybrid', A: 55, fullMark: 100 },
    ];

    // Simulation Confiance Data
    const confidenceData = [
      { name: 'Sûr de soi', value: 45, color: '#10b981' },
      { name: 'Hésitant', value: 35, color: '#6366f1' },
      { name: 'Au hasard', value: 20, color: '#f43f5e' },
    ];

    const performanceByDomain = [
      { domain: 'People', score: 68 },
      { domain: 'Process', score: 82 },
      { domain: 'Business', score: 54 },
    ];

    return {
      avgScore,
      radarData,
      confidenceData,
      performanceByDomain,
      readiness: avgScore,
      totalQuestions: attempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0)
    };
  }, [attempts]);

  if (isUserLoading || !mounted || isLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>;
  }

  if (!stats) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-6">
        <div className="bg-slate-100 p-8 rounded-full"><Activity className="h-16 w-16 text-slate-300" /></div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-400">Aucune donnée statistique</h2>
        <Button asChild className="h-14 px-8 rounded-2xl bg-indigo-500 font-black uppercase text-xs">
          <Link href="/dashboard/practice">Lancer un entraînement <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-500/10 p-4 rounded-3xl">
            <BarChart3 className="h-10 w-10 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Analytique V2</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Votre performance décortiquée par le coach.</p>
          </div>
        </div>
        <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic px-6 py-2 rounded-xl text-lg shadow-sm">
          READY SCORE : {stats.readiness}%
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Radar Compétences */}
        <Card className="rounded-[48px] border-none shadow-xl bg-white p-12 space-y-8 h-[500px] flex flex-col">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest italic flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" /> Radar des Compétences
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar name="Performance" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Confiance vs Connaissance */}
        <Card className="rounded-[48px] border-none shadow-xl bg-white p-12 space-y-8 h-[500px] flex flex-col">
          <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest italic flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" /> Confiance vs Connaissance
          </h3>
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.confidenceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 w-full mt-8">
              {stats.confidenceData.map((entry) => (
                <div key={entry.name} className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] font-black uppercase text-slate-400 italic">{entry.name}</span>
                  </div>
                  <p className="text-xl font-black italic text-slate-800">{entry.value}%</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Focus Recommandé */}
      <Card className="rounded-[40px] border-none shadow-2xl bg-indigo-600 text-white overflow-hidden relative group">
        <CardContent className="p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-6 flex-1">
              <Badge className="bg-white/20 text-white border-none font-black uppercase italic text-[10px] py-1 px-4">Focus Prioritaire</Badge>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Votre prochain objectif</h2>
              <p className="text-indigo-100 font-bold italic leading-relaxed text-lg max-w-xl">
                Améliorez votre score sur le domaine <span className="text-amber-400">Business Environment</span>. C'est votre zone de plus faible maîtrise actuelle (54%) mais elle pèse 8% de l'examen final.
              </p>
              <Button asChild className="h-16 px-10 rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
                <Link href="/dashboard/practice?domain=Business">S'ENTRAÎNER MAINTENANT <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 p-8 rounded-[48px] border-2 border-white/5 backdrop-blur-sm">
                <Zap className="h-32 w-32 text-amber-400 fill-amber-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
