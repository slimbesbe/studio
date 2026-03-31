
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
  Clock
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// LISTE DES MINDSETS PMI (À REMPLIR AVEC VOS TEXTES)
const PMI_MINDSETS = [
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

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 500);
    // Rotation automatique toutes les 30 secondes
    const interval = setInterval(() => {
      setMindsetIdx((prev) => (prev + 1) % PMI_MINDSETS.length);
    }, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleNextMindset = () => {
    setMindsetIdx((prev) => (prev + 1) % PMI_MINDSETS.length);
  };

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      limit(50)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawAttempts } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!rawAttempts || rawAttempts.length === 0) {
      return {
        readiness: 0,
        status: 'Débutant',
        domainExplored: 0,
        scoresByDomain: { People: 0, Process: 0, Business: 0 },
        scoresByApproach: { Predictive: 0, Agile: 0, Hybrid: 0 },
        progressionData: [],
        sortedAttempts: []
      };
    }

    const sorted = [...rawAttempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const avgScore = Math.round(sorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / sorted.length);
    
    const progressionData = [...sorted].reverse().slice(-10).map((a) => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return {
        name: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        score: a.scorePercent,
      };
    });

    return {
      readiness: avgScore,
      status: avgScore >= 75 ? 'Ready' : avgScore >= 50 ? 'En Progression' : 'Débutant',
      domainExplored: 1,
      scoresByDomain: { People: Math.min(100, avgScore + 5), Process: Math.max(0, avgScore - 10), Business: 0 },
      scoresByApproach: { Predictive: Math.min(100, avgScore + 2), Agile: 0, Hybrid: 0 },
      progressionData,
      sortedAttempts: sorted.slice(0, 5)
    };
  }, [rawAttempts]);

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-7xl mx-auto px-4">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Votre progression.</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mt-2 italic">
            Dashboard interactif — {stats.readiness}% de préparation globale
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild className="h-12 px-8 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-black uppercase text-xs italic gap-2 shadow-xl">
            <Link href="/dashboard/practice"><Zap className="h-4 w-4 fill-white" /> Start Sprint <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 h-[380px] flex flex-col items-center justify-center">
          <div className="w-full flex items-center gap-3 mb-10">
            <div className="bg-primary/5 p-2 rounded-lg text-primary"><Target className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Score de Préparation</h3>
          </div>
          <SemiCircleGauge value={stats.readiness} label={stats.status} />
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 h-[380px] flex flex-col">
          <div className="w-full flex items-center gap-3 mb-8">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Award className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Recommandation</h3>
          </div>
          <div className="bg-orange-50/50 rounded-2xl p-6 border-2 border-dashed border-orange-100 flex-1 flex flex-col justify-center">
            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic mb-1">Zone à renforcer</span>
            <h4 className="text-2xl font-black text-slate-900 italic uppercase">Business Environment</h4>
            <Button asChild className="mt-6 bg-[#0F172A] hover:bg-slate-800 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest">
              <Link href="/dashboard/practice?domain=Business">Lancer ce sprint <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-[#1E293B] text-white p-10 h-[380px] flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Brain className="h-40 w-40" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/10 p-2 rounded-lg"><Lightbulb className="h-5 w-5 text-orange-400" /></div>
            <h3 className="font-black text-white text-sm uppercase tracking-tight italic">Mindset PMI</h3>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <p className="text-lg font-bold italic leading-relaxed text-slate-200 animate-slide-up" key={mindsetIdx}>
              "{PMI_MINDSETS[mindsetIdx]}"
            </p>
          </div>
          <Button onClick={handleNextMindset} variant="ghost" className="relative z-10 w-fit h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest italic gap-2 hover:bg-white/10">
            <RotateCcw className="h-3.5 w-3.5" /> Suivant
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[40px] border-none shadow-xl bg-white p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest italic flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" /> PROGRESSION DU SCORE
            </h3>
          </div>
          <div className="h-[300px] w-full" key={chartKey}>
            {stats.progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.progressionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                    {stats.progressionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#6366f1' : '#f43f5e'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={3} dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
                <Clock className="h-12 w-12 opacity-20" />
                <p className="font-black uppercase tracking-widest text-[10px] italic">Aucune donnée</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[40px] border-none shadow-xl bg-white p-10 space-y-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Dernières Activités</h3>
          <div className="divide-y divide-slate-100">
            {stats.sortedAttempts.map((a, i) => (
              <div key={i} className="py-4 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl transition-colors px-2">
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 italic text-sm">{a.examId?.replace('exam', 'Simulation ') || 'Entraînement'}</span>
                  <span className="text-[10px] font-bold text-slate-400 italic">Score : {a.scorePercent}%</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Check className="h-4 w-4" strokeWidth={4} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SemiCircleGauge({ value, label }: { value: number, label: string }) {
  const radius = 80;
  const strokeWidth = 16;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg height={radius + strokeWidth} width={radius * 2}>
        <path d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`} fill="none" stroke="url(#gaugeGradient)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        <defs><linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#fb923c" /></linearGradient></defs>
      </svg>
      <div className="absolute top-[45px] text-center"><span className="text-5xl font-black italic tracking-tighter text-slate-900">{value}%</span></div>
      <div className="mt-2"><Badge className="bg-orange-100 text-orange-600 border-none font-black italic uppercase text-[10px] tracking-widest px-4 py-1">{label}</Badge></div>
    </div>
  );
}
