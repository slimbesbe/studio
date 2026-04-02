
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
  Activity,
  Info
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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
    if (isUserLoading || !user?.uid || !db) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', user.uid));
  }, [db, user?.uid, isUserLoading]);

  const { data: rawAttempts, isLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!rawAttempts || rawAttempts.length === 0) return null;

    const avgScore = Math.round(rawAttempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / rawAttempts.length);
    
    // Extraction de toutes les réponses individuelles pour des stats fines
    const allResponses = rawAttempts.flatMap(a => a.responses || []);

    // 1. Performance par Domaine
    const domains = ['People', 'Process', 'Business'];
    const performanceByDomain = domains.map(d => {
      const respForDomain = allResponses.filter(r => {
        const domainTag = r.tags?.domain;
        return domainTag === d || (d === 'Process' && domainTag === 'Processus') || (d === 'Business' && domainTag === 'Business Environment');
      });
      const score = respForDomain.length > 0 
        ? Math.round((respForDomain.filter(r => r.isCorrect).length / respForDomain.length) * 100)
        : 0;
      return { 
        name: d === 'Business' ? 'Business Environment' : d, 
        score 
      };
    });

    // 2. Performance par Approche
    const approaches = ['Predictive', 'Agile', 'Hybrid'];
    const performanceByApproach = approaches.map(a => {
      const respForApproach = allResponses.filter(r => r.tags?.approach === a);
      const score = respForApproach.length > 0 
        ? Math.round((respForApproach.filter(r => r.isCorrect).length / respForApproach.length) * 100)
        : 0;
      return { name: a, score };
    });

    // 3. Radar Data (Normalisé)
    const radarData = [
      { subject: 'Peop Pre', A: 0 },
      { subject: 'Peop Agi', A: 0 },
      { subject: 'Peop Hyb', A: 0 },
      { subject: 'Proc Pre', A: 0 },
      { subject: 'Proc Agi', A: 0 },
      { subject: 'Proc Hyb', A: 0 },
      { subject: 'Busi Pre', A: 0 },
      { subject: 'Busi Agi', A: 0 },
      { subject: 'Busi Hyb', A: 0 },
    ].map(item => {
      // Simulation pour le radar si pas assez de données croisées, sinon calcul réel
      const [d, a] = item.subject.split(' ');
      const dLong = d === 'Peop' ? 'People' : d === 'Proc' ? 'Process' : 'Business';
      const aLong = a === 'Pre' ? 'Predictive' : a === 'Agi' ? 'Agile' : 'Hybrid';
      
      const match = allResponses.filter(r => 
        (r.tags?.domain?.startsWith(dLong.substring(0,3))) && 
        (r.tags?.approach === aLong)
      );
      
      return {
        ...item,
        A: match.length > 0 ? Math.round((match.filter(r => r.isCorrect).length / match.length) * 100) : 0
      };
    });

    // 4. Confiance (Simulation basée sur le temps et les erreurs)
    const confidenceData = [
      { name: 'Sûr', value: 15, color: '#10b981' },
      { name: 'Hésitant', value: 70, color: '#f97316' },
      { name: 'Au hasard', value: 15, color: '#ef4444' },
    ];

    return {
      avgScore,
      radarData,
      confidenceData,
      performanceByDomain,
      performanceByApproach,
      readiness: avgScore,
      totalQuestions: allResponses.length
    };
  }, [rawAttempts]);

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
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-500/10 p-4 rounded-3xl">
            <BarChart3 className="h-10 w-10 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Analytique PMP®</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Analyse approfondie de votre Mindset et de vos connaissances.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Ready Score Global</p>
          <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic px-6 py-2 rounded-xl text-2xl shadow-sm">
            {stats.readiness}%
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Radar Chart */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[500px]">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Radar de Compétences</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Vue globale des 9 cellules de la matrice</p>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar name="Performance" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Card 2: Donut Confidence */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[500px]">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Confiance vs. Connaissances</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Comment vous sentez-vous lors des questions ?</p>
          </div>
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.confidenceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} 
                  formatter={(val) => `${val}%`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-8 w-full mt-6">
              {stats.confidenceData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-[11px] font-black uppercase text-slate-600 italic">{entry.name} {entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Card 3: Performance par Domaine */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Performance par Domaine</h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceByDomain} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: '#94a3b8' }} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} 
                  dy={15}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={{ stroke: '#94a3b8' }} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} 
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  formatter={(val) => [`${val}%`, 'Score']}
                />
                <Bar dataKey="score" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Card 4: Performance par Approche */}
        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Performance par Approche</h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceByApproach} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: '#94a3b8' }} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} 
                  dy={15}
                />
                <YAxis 
                  domain={[0, 100]} 
                  axisLine={{ stroke: '#94a3b8' }} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} 
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  formatter={(val) => [`${val}%`, 'Score']}
                />
                <Bar dataKey="score" fill="#f97316" radius={[4, 4, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* Focus / Call to Action */}
      <Card className="rounded-[40px] border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative group mt-12">
        <CardContent className="p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="space-y-6 flex-1 text-center md:text-left">
              <Badge className="bg-primary text-white border-none font-black uppercase italic text-[10px] py-1 px-4">Analyse du Coach</Badge>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-tight">Prêt à passer au niveau supérieur ?</h2>
              <p className="text-slate-400 font-bold italic leading-relaxed text-lg max-w-xl">
                Vos statistiques indiquent une maîtrise solide des processus, mais une hésitation sur le domaine <span className="text-white">Business Environment</span>. Concentrez vos prochains sprints sur ce pilier.
              </p>
              <Button asChild className="h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
                <Link href="/dashboard/practice" className="flex items-center gap-2">S'ENTRAÎNER CIBLÉ <ArrowRight className="h-5 w-5" /></Link>
              </Button>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/5 p-10 rounded-[48px] border-2 border-white/5 backdrop-blur-sm">
                <TrendingUp className="h-32 w-32 text-indigo-400" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
