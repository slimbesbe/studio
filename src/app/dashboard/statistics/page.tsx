
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
    if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) return null;

    const validAttempts = rawAttempts.filter(Boolean);
    if (validAttempts.length === 0) return null;

    const avgScore = Math.round(validAttempts.reduce((acc, a) => acc + (Number(a.scorePercent) || 0), 0) / validAttempts.length);
    
    // Extraction sécurisée des réponses
    const allResponses = validAttempts.flatMap(a => Array.isArray(a.responses) ? a.responses.filter(Boolean) : []);

    // 1. Performance par Domaine
    const domains = ['People', 'Process', 'Business'];
    const performanceByDomain = domains.map(d => {
      const respForDomain = allResponses.filter(r => {
        const domainTag = String(r?.tags?.domain || '');
        return domainTag === d || 
               (d === 'Process' && domainTag === 'Processus') || 
               (d === 'Business' && domainTag.includes('Business'));
      });
      const total = respForDomain.length;
      const correctOnes = respForDomain.filter(r => r.isCorrect).length;
      const score = total > 0 ? Math.round((correctOnes / total) * 100) : 0;
      
      return { 
        name: d === 'Business' ? 'Business Env.' : d, 
        score: isNaN(score) ? 0 : score
      };
    });

    // 2. Performance par Approche
    const approaches = ['Predictive', 'Agile', 'Hybrid'];
    const performanceByApproach = approaches.map(a => {
      const respForApproach = allResponses.filter(r => String(r?.tags?.approach || '') === a);
      const total = respForApproach.length;
      const correctOnes = respForApproach.filter(r => r.isCorrect).length;
      const score = total > 0 ? Math.round((correctOnes / total) * 100) : 0;
      
      return { 
        name: a === 'Predictive' ? 'Waterfall' : a, 
        score: isNaN(score) ? 0 : score 
      };
    });

    // 3. Radar Data
    const radarLabels = [
      { s: 'Peop Pre', d: 'People', a: 'Predictive' },
      { s: 'Peop Agi', d: 'People', a: 'Agile' },
      { s: 'Peop Hyb', d: 'People', a: 'Hybrid' },
      { s: 'Proc Pre', d: 'Process', a: 'Predictive' },
      { s: 'Proc Agi', d: 'Process', a: 'Agile' },
      { s: 'Proc Hyb', d: 'Process', a: 'Hybrid' },
      { s: 'Busi Pre', d: 'Business', a: 'Predictive' },
      { s: 'Busi Agi', d: 'Business', a: 'Agile' },
      { s: 'Busi Hyb', d: 'Business', a: 'Hybrid' },
    ];

    const radarData = radarLabels.map(item => {
      const match = allResponses.filter(r => {
        const rD = String(r?.tags?.domain || '').toLowerCase();
        const rA = String(r?.tags?.approach || '');
        return rD.includes(item.d.substring(0, 3).toLowerCase()) && rA === item.a;
      });
      const total = match.length;
      const score = total > 0 ? Math.round((match.filter(r => r.isCorrect).length / total) * 100) : 0;
      return { subject: item.s, A: isNaN(score) ? 0 : score };
    });

    // 4. Confidence
    const mastery = Math.max(10, avgScore - 20);
    const inProgress = Math.max(0, 100 - mastery - 15);
    const confidenceData = [
      { name: 'Maîtrisé', value: mastery, color: '#10b981' },
      { name: 'En cours', value: inProgress, color: '#f97316' },
      { name: 'Faible', value: 15, color: '#ef4444' },
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

  if (!mounted || isUserLoading || isLoading) {
    return <div className="min-h-[70vh] flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-600" /></div>;
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

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[500px]">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Indicateurs de Maîtrise</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic">Distribution de votre compréhension globale</p>
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

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Performance par Domaine</h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceByDomain} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={{ stroke: '#94a3b8' }} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} dy={15} />
                <YAxis domain={[0, 100]} axisLine={{ stroke: '#94a3b8' }} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val) => [`${val}%`, 'Score']} />
                <Bar dataKey="score" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-[32px] border-none shadow-xl bg-white p-10 flex flex-col h-[450px]">
          <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Performance par Approche</h3>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.performanceByApproach} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={{ stroke: '#94a3b8' }} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} dy={15} />
                <YAxis domain={[0, 100]} axisLine={{ stroke: '#94a3b8' }} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val) => [`${val}%`, 'Score']} />
                <Bar dataKey="score" fill="#f97316" radius={[4, 4, 0, 0]} barSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
