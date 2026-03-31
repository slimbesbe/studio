
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  TrendingUp, 
  Award, 
  Target,
  ChevronRight,
  Zap,
  Brain,
  RotateCcw,
  Lightbulb,
  Check,
  Clock,
  History,
  Trophy,
  FileQuestion,
  Activity
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DEFAULT_MINDSETS = [
  "Si la loi ou la régulation change, adaptez le projet immédiatement. C'est non négociable.",
  "Un Leader Serviteur protège l'équipe des interruptions externes pour maintenir la vélocité.",
  "Face à un conflit, privilégiez toujours la collaboration et la résolution de problèmes.",
  "Analysez toujours l'impact d'un changement avant de le soumettre au CCB.",
  "Le Product Owner est le seul responsable de la priorité du Backlog en Agile.",
  "En cas de risque identifié, mettez d'abord à jour le registre des risques."
];

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);
  const [mindsetIdx, setMindsetIdx] = useState(0);

  // Read Mindsets from Firestore
  const mindsetsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, 'mindsets');
  }, [db, user]);
  const { data: dbMindsets } = useCollection(mindsetsQuery);

  const displayMindsets = useMemo(() => {
    if (dbMindsets && dbMindsets.length > 0) return dbMindsets.map(m => m.text);
    return DEFAULT_MINDSETS;
  }, [dbMindsets]);

  useEffect(() => {
    setMounted(true);
    if (displayMindsets.length > 0) {
      setMindsetIdx(Math.floor(Math.random() * displayMindsets.length));
    }
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 500);
    const interval = setInterval(() => {
      setMindsetIdx((prev) => (prev + 1) % displayMindsets.length);
    }, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [displayMindsets.length]);

  const handleNextMindset = () => {
    setMindsetIdx((prev) => (prev + 1) % displayMindsets.length);
  };

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
        status: 'Débutant',
        lastScore: 0,
        examCount: 0,
        avgScore: 0,
        questionsCount: 0,
        progressionData: [],
        sortedAttempts: []
      };
    }

    const sorted = [...rawAttempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const avgScore = Math.round(sorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / sorted.length);
    const lastScore = sorted[0]?.scorePercent || 0;
    const examCount = rawAttempts.filter(a => a.examId && a.examId.startsWith('exam')).length;
    const questionsCount = rawAttempts.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    const progressionData = [...sorted].reverse().slice(-7).map((a) => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return {
        name: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        score: a.scorePercent,
      };
    });

    return {
      readiness: avgScore,
      status: avgScore >= 75 ? 'Ready' : avgScore >= 50 ? 'En Progression' : 'Débutant',
      lastScore,
      examCount,
      avgScore,
      questionsCount,
      progressionData,
      sortedAttempts: sorted.slice(0, 4)
    };
  }, [rawAttempts]);

  const formatStudyTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Votre progression.</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1 italic">
            Tableau de bord — {stats.readiness}% de préparation globale
          </p>
        </div>
        <Button asChild className="h-12 px-8 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-black uppercase text-xs italic gap-2 shadow-xl">
          <Link href="/dashboard/practice"><Zap className="h-4 w-4 fill-white" /> Start Sprint <ChevronRight className="h-4 w-4" /></Link>
        </Button>
      </div>

      {/* Top Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 h-[200px] flex flex-col items-center justify-center">
          <div className="w-full flex items-center gap-3 mb-2">
            <div className="bg-primary/5 p-2 rounded-lg text-primary"><Target className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-tight italic">Score de Préparation</h3>
          </div>
          <SemiCircleGauge value={stats.readiness} label={stats.status} />
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 h-[200px] flex flex-col">
          <div className="w-full flex items-center gap-3 mb-2">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Award className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-tight italic">Zone de focus</h3>
          </div>
          <div className="bg-orange-50/50 rounded-2xl p-4 border-2 border-dashed border-orange-100 flex-1 flex flex-col justify-center">
            <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest italic mb-1">Amélioration suggérée</span>
            <h4 className="text-lg font-black text-slate-900 italic uppercase">Business Environment</h4>
            <Button asChild variant="link" className="mt-2 text-primary p-0 h-auto font-black uppercase text-[9px] tracking-widest w-fit">
              <Link href="/dashboard/practice?domain=Business">Lancer ce sprint <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-[#1E293B] text-white p-6 h-[200px] flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Brain className="h-20 w-20" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/10 p-2 rounded-lg"><Lightbulb className="h-5 w-5 text-orange-400" /></div>
            <h3 className="font-black text-white text-[10px] uppercase tracking-tight italic">Le Mindset du jour</h3>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold italic leading-relaxed text-slate-200 animate-slide-up line-clamp-3" key={mindsetIdx}>
              "{displayMindsets[mindsetIdx]}"
            </p>
          </div>
          <Button onClick={handleNextMindset} variant="ghost" className="relative z-10 w-fit h-7 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-black uppercase text-[8px] tracking-widest italic gap-2 hover:bg-white/10">
            <RotateCcw className="h-3 w-3" /> Changer
          </Button>
        </Card>
      </div>

      {/* New Row of 5 Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MiniStatCard icon={Trophy} label="Dernier Score" val={`${stats.lastScore}%`} color="text-emerald-500" />
        <MiniStatCard icon={History} label="Examens Passés" val={stats.examCount} color="text-indigo-500" />
        <MiniStatCard icon={TrendingUp} label="Score Moyen" val={`${stats.avgScore}%`} color="text-primary" />
        <MiniStatCard icon={Clock} label="Temps d'étude" val={formatStudyTime(profile?.totalTimeSpent || 0)} color="text-amber-500" />
        <MiniStatCard icon={FileQuestion} label="Questions" val={stats.questionsCount} color="text-slate-600" />
      </div>

      {/* Charts Row - Height Reduced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest italic flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" /> PROGRESSION DU SCORE
            </h3>
          </div>
          <div className="h-[150px] w-full" key={chartKey}>
            {stats.progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.progressionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} dy={5} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                    {stats.progressionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#6366f1' : '#f43f5e'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 border-2 border-dashed border-slate-50 rounded-2xl">
                <p className="font-black uppercase tracking-widest text-[8px] italic">En attente de données</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-6 space-y-4">
          <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-tight italic">Dernières Activités</h3>
          <div className="space-y-3">
            {stats.sortedAttempts.length > 0 ? stats.sortedAttempts.map((a, i) => (
              <div key={i} className="flex items-center justify-between group hover:bg-slate-50 rounded-xl transition-colors p-2 border border-slate-50">
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 italic text-xs truncate max-w-[180px]">
                    {a.examId ? a.examId.replace('exam', 'Simu ') : a.sessionId || 'Entraînement'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 italic">Score : {a.scorePercent}%</span>
                </div>
                <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm">
                  <Check className="h-3 w-3" strokeWidth={4} />
                </div>
              </div>
            )) : (
              <div className="h-[120px] flex items-center justify-center text-slate-300 font-bold italic text-[10px] uppercase">Aucun historique</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStatCard({ icon: Icon, label, val, color }: any) {
  return (
    <Card className="rounded-3xl border-none shadow-lg bg-white p-4 space-y-1 hover:scale-[1.02] transition-transform">
      <div className={cn("bg-slate-50 p-1.5 rounded-lg w-fit mb-1", color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">{label}</p>
      <p className="text-lg font-black text-slate-900 italic tracking-tighter">{val}</p>
    </Card>
  );
}

function SemiCircleGauge({ value, label }: { value: number, label: string }) {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg height={radius + strokeWidth} width={radius * 2}>
        <path d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`} fill="none" stroke="url(#gaugeGradient)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        <defs><linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
      </svg>
      <div className="absolute top-[25px] text-center"><span className="text-3xl font-black italic tracking-tighter text-slate-900">{value}%</span></div>
      <div className="mt-1"><Badge className="bg-primary/10 text-primary border-none font-black italic uppercase text-[7px] tracking-widest px-2 py-0.5">{label}</Badge></div>
    </div>
  );
}
