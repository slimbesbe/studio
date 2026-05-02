
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Trophy, ChevronRight, TrendingUp, BookOpen, LayoutGrid, Zap, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { isValid } from 'date-fns';
import { fetchQuestionsByIds } from '@/lib/services/practice-service';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type HistoryFilter = 'concepts' | 'matrice' | 'practice' | 'exams';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<HistoryFilter>('exams');
  const [computedResults, setComputedResults] = useState<any[]>([]);
  const [isComputing, setIsComputing] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const coachingQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'coachingAttempts'),
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawCoaching, isLoading: isLoadingCoaching } = useCollection(coachingQuery);

  const quickQuizQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'quickQuizAttempts'),
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawQuickQuizzes, isLoading: isLoadingQuizzes } = useCollection(quickQuizQuery);

  const safeGetTime = (ts: any) => {
    if (!ts) return 0;
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return isValid(date) ? date.getTime() : 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    async function computeAll() {
      if (!mounted || isUserLoading || !db) return;
      
      setIsComputing(true);
      try {
        const coachingAttempts = Array.isArray(rawCoaching) ? rawCoaching.filter(Boolean) : [];
        const quickQuizzes = Array.isArray(rawQuickQuizzes) ? rawQuickQuizzes.filter(Boolean) : [];
        
        // Extraction sécurisée des IDs de questions
        const allQuestionIds = Array.from(new Set(
          coachingAttempts.flatMap(attempt => {
            if (!attempt || !Array.isArray(attempt.responses)) return [];
            return attempt.responses
              .filter((r: any) => r && r.questionId)
              .map((r: any) => String(r.questionId));
          })
        ));

        const latestQuestions = allQuestionIds.length > 0 ? await fetchQuestionsByIds(db, allQuestionIds) : [];
        
        const coachingComputed = coachingAttempts.map(attempt => {
          if (!attempt) return null;
          
          let correct = 0;
          const responses = Array.isArray(attempt.responses) ? attempt.responses.filter(Boolean) : [];
          
          responses.forEach((resp: any) => {
            if (!resp || !resp.questionId) return;
            const q = latestQuestions.find(lq => lq.id === resp.questionId);
            if (!q) return;
            const correctIds = (q.correctOptionIds || [String(q.correctChoice || "1")]).map(String);
            const userChoices = (resp.userChoices || (resp.userChoice ? [resp.userChoice] : [])).map(String);
            if (userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id))) {
              correct++;
            }
          });

          let filterType: HistoryFilter = 'practice';
          const eId = String(attempt.examId || '');
          if (eId.startsWith('exam')) filterType = 'exams';
          else if (attempt.context === 'matrix_sprint') filterType = 'matrice';
          else if (attempt.sessionId) filterType = 'exams'; 

          const finalTotal = Number(attempt.totalQuestions) || responses.length || 0;
          const finalCorrect = attempt.correctCount !== undefined ? Number(attempt.correctCount) : correct;

          const displayDomain = attempt.matrixDomain === 'Process' ? 'Processus' : (attempt.matrixDomain || '??');
          const displayApproach = attempt.matrixApproach === 'Predictive' ? 'Waterfall' : (attempt.matrixApproach || '??');

          return {
            ...attempt,
            filterType,
            scorePercent: attempt.scorePercent !== undefined ? Number(attempt.scorePercent) : (finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0),
            correctCount: finalCorrect,
            totalQuestions: finalTotal,
            displayTitle: eId ? eId.replace('exam', 'Simulation ') : 
                          attempt.context === 'matrix_sprint' ? `Sprint : ${displayDomain} x ${displayApproach}` :
                          attempt.sessionId ? `Session ${attempt.sessionId}` : 'Pratique Libre'
          };
        }).filter(Boolean);

        // Compute quick quizzes (Concepts)
        const quizComputed = quickQuizzes.map(q => {
          if (!q) return null;
          return {
            ...q,
            filterType: 'concepts' as const,
            scorePercent: Number(q.score || 0),
            displayTitle: `Quiz : ${String(q.axisId || 'Inconnu').toUpperCase()}`,
            submittedAt: q.submittedAt,
            durationSec: 0,
            totalQuestions: Number(q.totalQuestions || 5),
            correctCount: Number(q.correctCount || 0)
          };
        }).filter(Boolean);

        const combined = [...coachingComputed, ...quizComputed].sort((a, b) => safeGetTime(b.submittedAt) - safeGetTime(a.submittedAt));
        setComputedResults(combined);
      } catch (e) {
        console.error("Score merge error", e);
      } finally {
        setIsComputing(false);
      }
    }
    computeAll();
  }, [rawCoaching, rawQuickQuizzes, db, mounted, isUserLoading]);

  const filteredResults = useMemo(() => {
    if (!Array.isArray(computedResults)) return [];
    return computedResults.filter(r => r && r.filterType === activeTab);
  }, [computedResults, activeTab]);

  const chartData = useMemo(() => {
    return [...filteredResults]
      .filter(res => {
        if (!res || !res.submittedAt) return false;
        try {
          const date = res.submittedAt.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
          return isValid(date);
        } catch {
          return false;
        }
      })
      .reverse()
      .slice(-10)
      .map((res, i) => {
        let dateLabel = '-';
        try {
          const date = res.submittedAt?.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
          dateLabel = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        } catch {}
        
        return {
          name: `T${i + 1}`,
          score: Number(res.scorePercent) || 0,
          fullDate: dateLabel
        };
      });
  }, [filteredResults]);

  const formatTime = (seconds: any) => {
    const s = Number(seconds);
    if (isNaN(s) || s <= 0) return '-';
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
  };

  const formatDateLabel = (ts: any) => {
    if (!ts) return '-';
    try {
      const date = ts?.toDate ? ts.toDate() : new Date(ts);
      if (!isValid(date)) return 'Récemment';
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch {
      return 'Récemment';
    }
  };

  if (!mounted || isUserLoading || isLoadingCoaching || isLoadingQuizzes || isComputing) {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-8 rounded-[32px] shadow-xl border-2 border-slate-100 gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-4">
            <History className="h-12 w-12 text-primary" /> Historique de Simulation
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Filtrez vos tentatives par catégorie.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HistoryFilter)} className="w-full md:w-auto">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-16 border-2 grid grid-cols-2 md:flex md:w-auto">
            <TabsTrigger value="concepts" className="rounded-xl font-black italic uppercase text-[10px] px-6 gap-2">
              <BookOpen className="h-3.5 w-3.5" /> Concept de base
            </TabsTrigger>
            <TabsTrigger value="matrice" className="rounded-xl font-black italic uppercase text-[10px] px-6 gap-2">
              <LayoutGrid className="h-3.5 w-3.5" /> Matrice magique
            </TabsTrigger>
            <TabsTrigger value="practice" className="rounded-xl font-black italic uppercase text-[10px] px-6 gap-2">
              <Zap className="h-3.5 w-3.5" /> Pratique libre
            </TabsTrigger>
            <TabsTrigger value="exams" className="rounded-xl font-black italic uppercase text-[10px] px-6 gap-2">
              <GraduationCap className="h-3.5 w-3.5" /> Simulation Examen
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <Card className="rounded-[32px] shadow-xl border-none overflow-hidden bg-white min-h-[500px]">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="h-20 border-b-4">
                    <TableHead className="px-6 font-black uppercase tracking-widest text-[10px]">Type / Détails</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Score</TableHead>
                    {activeTab !== 'concepts' && <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Durée</TableHead>}
                    <TableHead className="text-right px-6 font-black uppercase tracking-widest text-[10px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-black uppercase italic tracking-widest">Aucune donnée dans cette catégorie</TableCell></TableRow>
                  ) : (
                    filteredResults.map((res) => (
                      <TableRow key={res.id} className="h-24 hover:bg-slate-50 transition-all border-b group">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                              activeTab === 'concepts' ? "bg-amber-50 text-amber-600" :
                              activeTab === 'matrice' ? "bg-emerald-50 text-emerald-600" :
                              activeTab === 'practice' ? "bg-indigo-50 text-indigo-600" :
                              "bg-primary/10 text-primary"
                            )}><Trophy className="h-5 w-5" /></div>
                            <div className="font-black text-sm text-slate-800 uppercase italic truncate max-w-[200px]">{res.displayTitle}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-600 italic">{formatDateLabel(res.submittedAt)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className={cn("text-xl font-black italic", res.scorePercent >= 75 ? 'text-emerald-500' : 'text-red-500')}>{res.scorePercent}%</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{res.correctCount} / {res.totalQuestions}</span>
                          </div>
                        </TableCell>
                        {activeTab !== 'concepts' && <TableCell className="text-center text-xs font-bold text-slate-500 italic">{formatTime(res.durationSec)}</TableCell>}
                        <TableCell className="text-right px-6">
                          {activeTab !== 'concepts' ? (
                            <Button asChild size="icon" variant="ghost" className="h-10 w-10 rounded-xl border-2 hover:bg-primary/5"><Link href={`/dashboard/history/${res.id}`}><ChevronRight className="h-4 w-4" /></Link></Button>
                          ) : (
                            <span className="text-[10px] font-black text-slate-300 italic uppercase">Auto</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="rounded-[32px] shadow-xl border-none bg-white p-8 space-y-8 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" /> Progression : {activeTab.replace('_', ' ')}
              </h3>
            </div>
            <div className="flex-1 w-full flex flex-col justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.score >= 75 ? '#10b981' : '#ef4444'} />)}
                    </Bar>
                    <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e', stroke: '#fff' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <TrendingUp className="h-16 w-16 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-[10px] italic">Statistiques graphiques non disponibles</p>
                </div>
              )}
            </div>
            {chartData.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed text-center">
                  Ce graphique suit vos 10 dernières sessions sur ce thème pour mesurer votre vélocité d'apprentissage.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
