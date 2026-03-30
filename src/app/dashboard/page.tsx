
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  TrendingUp, 
  Award, 
  Target,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Brain,
  ArrowUpRight,
  Clock,
  RotateCcw,
  Play,
  Lightbulb,
  Check,
  X
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setChartKey(prev => prev + 1), 500);
    return () => clearTimeout(timer);
  }, []);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      limit(50)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawAttempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!rawAttempts || rawAttempts.length === 0) {
      return {
        readiness: 0,
        status: 'Beginner',
        totalQuestions: 0,
        domainExplored: 0,
        scoresByDomain: { People: 0, Process: 0, Business: 0 },
        scoresByApproach: { Predictive: 0, Agile: 0, Hybrid: 0 },
        progressionData: [],
        sortedAttempts: []
      };
    }

    const sorted = [...rawAttempts].sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
    const avgScore = Math.round(sorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / sorted.length);
    
    // Calcul des scores par Domaine / Approche (Simulé ou via les tags des réponses si disponibles)
    // Pour cet affichage on simule une distribution basée sur la moyenne pour l'UI
    const domainScores = { 
      People: Math.min(100, avgScore + 5), 
      Process: Math.max(0, avgScore - 10), 
      Business: 0 
    };
    const approachScores = { 
      Predictive: Math.min(100, avgScore + 2), 
      Agile: 0, 
      Hybrid: 0 
    };

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
      totalQuestions: sorted.reduce((acc, a) => acc + (a.totalQuestions || 0), 0),
      domainExplored: 1, // Simulé pour l'image
      scoresByDomain: domainScores,
      scoresByApproach: approachScores,
      progressionData,
      sortedAttempts: sorted.slice(0, 5)
    };
  }, [rawAttempts]);

  if (isUserLoading || !mounted) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-7xl mx-auto px-4">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Votre progression.</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mt-2 italic">
            {stats.domainExplored}/9 domaines explorés — {stats.readiness}% de score global
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-2 font-black uppercase text-xs italic gap-2 shadow-sm">
            <RotateCcw className="h-4 w-4" /> Reprendre
          </Button>
          <Button asChild className="h-12 px-8 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-black uppercase text-xs italic gap-2 shadow-xl">
            <Link href="/dashboard/practice"><Zap className="h-4 w-4 fill-white" /> Start Sprint <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* TOP ROW: Readiness, Recommandation, Mindset */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card 1: Score de Préparation */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 h-[380px] flex flex-col items-center justify-center">
          <div className="w-full flex items-center gap-3 mb-10">
            <div className="bg-primary/5 p-2 rounded-lg text-primary"><Target className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Score de Préparation</h3>
          </div>
          <SemiCircleGauge value={stats.readiness} label={stats.status} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8 italic">{stats.domainExplored}/9 domaines explorés</p>
        </Card>

        {/* Card 2: Recommandation IA */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 h-[380px] flex flex-col">
          <div className="w-full flex items-center gap-3 mb-8">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Award className="h-5 w-5" /></div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Recommandation IA</h3>
          </div>
          <div className="bg-orange-50/50 rounded-2xl p-6 border-2 border-dashed border-orange-100 flex-1 flex flex-col justify-center">
            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic mb-1">Prochaine Cible</span>
            <h4 className="text-2xl font-black text-slate-900 italic uppercase">People · Agile</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-1">Jamais exploré</p>
            <Button asChild className="mt-6 bg-[#0F172A] hover:bg-slate-800 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest">
              <Link href="/dashboard/practice?domain=People&approach=Agile">Attaquer ce sprint <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest italic">A travailler en priorité</p>
            <div className="bg-red-50 rounded-xl p-3 flex justify-between items-center border border-red-100">
              <span className="text-[11px] font-black italic text-slate-700">People · Predictive</span>
              <span className="text-sm font-black text-red-600">90%</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Mindset PMI */}
        <Card className="rounded-[32px] border-none shadow-xl bg-[#1E293B] text-white p-10 h-[380px] flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Brain className="h-40 w-40" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-white/10 p-2 rounded-lg"><Lightbulb className="h-5 w-5 text-orange-400" /></div>
            <h3 className="font-black text-white text-sm uppercase tracking-tight italic">Mindset PMI</h3>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <p className="text-lg font-bold italic leading-relaxed text-slate-200">
              "Si la loi ou la régulation change, adaptez le projet immédiatement. C'est non négociable."
            </p>
          </div>
          <Button variant="ghost" className="relative z-10 w-fit h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest italic gap-2 hover:bg-white/10">
            <RotateCcw className="h-3.5 w-3.5" /> Nouveau conseil
          </Button>
        </Card>
      </div>

      {/* MIDDLE ROW: Domain, Approach, Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score par Domaine */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 space-y-8">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Score par Domaine</h3>
          </div>
          <div className="space-y-6">
            <ScoreBar label="People" value={stats.scoresByDomain.People} color="bg-primary" />
            <ScoreBar label="Process" value={stats.scoresByDomain.Process} color="bg-slate-200" />
            <ScoreBar label="Business Environment" value={stats.scoresByDomain.Business} color="bg-slate-200" />
          </div>
        </Card>

        {/* Score par Approche */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 space-y-8">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-orange-500" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Score par Approche</h3>
          </div>
          <div className="space-y-6">
            <ScoreBar label="Predictive" value={stats.scoresByApproach.Predictive} color="bg-[#1E293B]" />
            <ScoreBar label="Agile" value={stats.scoresByApproach.Agile} color="bg-slate-200" />
            <ScoreBar label="Hybrid" value={stats.scoresByApproach.Hybrid} color="bg-slate-200" />
          </div>
        </Card>

        {/* Confidence Tracking */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 space-y-6 bg-slate-50/50 border-2 border-slate-100">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Confidence Tracking</h3>
          </div>
          <p className="text-[10px] font-bold text-slate-400 italic">Votre avantage unique : on mesure aussi votre certitude.</p>
          <div className="space-y-3">
            <ConfidenceCard label="Sûr de moi" value={100} count={8} color="bg-emerald-100 text-emerald-600 border-emerald-200" />
            <ConfidenceCard label="Hésitant" value={0} count={1} color="bg-orange-100 text-orange-600 border-orange-200" />
            <ConfidenceCard label="Au hasard" value={100} count={1} color="bg-red-100 text-red-600 border-red-200" />
          </div>
        </Card>
      </div>

      {/* BOTTOM ROW: Performance Analysis & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Analyse de Performance */}
        <Card className="lg:col-span-2 rounded-[32px] border-none shadow-xl bg-white p-8 space-y-8">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Analyse de Performance</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">Points Forts</span>
              <div className="bg-emerald-50 rounded-xl p-4 flex justify-between items-center border border-emerald-100">
                <span className="font-black italic text-slate-700 text-sm">People · Predictive</span>
                <span className="text-lg font-black text-emerald-600 italic">90%</span>
              </div>
            </div>
            <div className="space-y-3">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] italic">A travailler</span>
              <div className="bg-red-50 rounded-xl p-4 flex justify-between items-center border border-red-100">
                <span className="font-black italic text-slate-700 text-sm">People · Predictive</span>
                <span className="text-lg font-black text-red-600 italic">90%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Activité Récente */}
        <Card className="lg:col-span-3 rounded-[32px] border-none shadow-xl bg-white p-8 space-y-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight italic">Activité Récente</h3>
          <div className="divide-y divide-slate-100">
            {stats.sortedAttempts.map((a, i) => (
              <div key={i} className="py-4 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl transition-colors px-2">
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 italic text-sm">People · Predictive</span>
                  <span className="text-[10px] font-bold text-slate-400 italic lowercase">il y a environ {i + 1} heure</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-black italic text-[9px] uppercase tracking-widest px-3">Sûr</Badge>
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={4} />
                  </div>
                </div>
              </div>
            ))}
            {stats.sortedAttempts.length === 0 && (
              <div className="py-20 text-center space-y-2">
                <Clock className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="text-xs font-black text-slate-300 uppercase italic">Aucun historique récent</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* HISTOGRAMME (Déplacé en bas) */}
      <Card className="rounded-[40px] border-none shadow-xl bg-white p-10 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest italic flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" /> PROGRESSION DU SCORE (HISTORIQUE)
          </h3>
          <span className="text-[10px] font-black text-slate-400 uppercase italic">Trait rouge : Courbe de tendance</span>
        </div>
        <div className="h-[400px] w-full" key={chartKey}>
          {stats.progressionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.progressionData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                  {stats.progressionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#6366f1' : '#f43f5e'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={3} dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} animationDuration={1000} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
              <Clock className="h-12 w-12 opacity-20" />
              <p className="font-black uppercase tracking-widest text-[10px] italic">Aucune donnée de simulation</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Composants Internes Spécifiques
function SemiCircleGauge({ value, label }: { value: number, label: string }) {
  const radius = 80;
  const strokeWidth = 16;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg height={radius + strokeWidth} width={radius * 2}>
        <path
          d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth/2},${radius + strokeWidth/2} A ${normalizedRadius},${normalizedRadius} 0 0,1 ${radius * 2 - strokeWidth/2},${radius + strokeWidth/2}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-[45px] text-center">
        <span className="text-5xl font-black italic tracking-tighter text-slate-900">{value}%</span>
      </div>
      <div className="mt-2 flex flex-col items-center">
        <Badge className="bg-orange-100 text-orange-600 border-none font-black italic uppercase text-[10px] tracking-widest px-4 py-1">
          {label}
        </Badge>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-slate-600 italic">{label}</span>
        <span className={cn("text-xs font-black italic", value > 0 ? "text-slate-900" : "text-slate-300")}>
          {value > 0 ? `${value}%` : '—'}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ConfidenceCard({ label, value, count, color }: { label: string, value: number, count: number, color: string }) {
  return (
    <div className={cn("p-4 rounded-xl border-2 flex items-center justify-between shadow-sm", color)}>
      <div className="flex flex-col">
        <span className="font-black italic text-xs uppercase">{label}</span>
        <span className="text-[10px] font-bold opacity-70 italic">{count} réponses</span>
      </div>
      <span className="text-2xl font-black italic">{value}%</span>
    </div>
  );
}
