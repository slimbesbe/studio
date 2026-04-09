"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Trophy, Clock, ChevronRight, TrendingUp, Calendar } from 'lucide-react';
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

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [computedResults, setComputedResponses] = useState<any[]>([]);
  const [isComputing, setIsComputing] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resultsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !db) return null;
    return query(
      collection(db, 'coachingAttempts'),
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid, isUserLoading]);

  const { data: rawResults, isLoading: isCollectionLoading } = useCollection(resultsQuery);

  // Recalcul dynamique des scores pour la liste
  useEffect(() => {
    async function computeScores() {
      if (!rawResults || rawResults.length === 0) {
        setComputedResponses([]);
        setIsComputing(false);
        return;
      }

      setIsComputing(true);
      try {
        const allQuestionIds = Array.from(new Set(rawResults.flatMap(r => r.responses?.map((resp: any) => resp.questionId) || [])));
        const latestQuestions = await fetchQuestionsByIds(db, allQuestionIds);
        
        const computed = rawResults.map(attempt => {
          let correct = 0;
          const total = attempt.responses?.length || 0;
          
          attempt.responses?.forEach((resp: any) => {
            const q = latestQuestions.find(lq => lq.id === resp.questionId);
            if (!q) return;
            const correctIds = q.correctOptionIds || [String(q.correctChoice || "1")];
            const userChoices = resp.userChoices || (resp.userChoice ? [resp.userChoice] : []);
            if (userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id))) {
              correct++;
            }
          });

          return {
            ...attempt,
            scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
            correctCount: correct,
            totalQuestions: total
          };
        }).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));

        setComputedResponses(computed);
      } catch (e) {
        console.error("Score compute error", e);
      } finally {
        setIsComputing(false);
      }
    }
    computeScores();
  }, [rawResults, db]);

  const chartData = useMemo(() => {
    if (!computedResults) return [];
    return [...computedResults]
      .filter(res => res.submittedAt && isValid(res.submittedAt?.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt)))
      .reverse()
      .slice(-10)
      .map((res, i) => {
        const date = res.submittedAt?.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
        return {
          name: `S${i + 1}`,
          score: res.scorePercent,
          fullDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        };
      });
  }, [computedResults]);

  const formatTime = (seconds: any) => {
    if (seconds === undefined || seconds === null) return '-';
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    if (totalSeconds === 0) return '0m';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!isValid(date)) return 'Récemment';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isUserLoading || isCollectionLoading || isComputing || !mounted) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-4">
            <History className="h-12 w-12 text-primary" /> Historique Dynamique
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Scores recalculés selon la dernière banque de questions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white h-full">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="h-20 border-b-4">
                    <TableHead className="px-6 font-black uppercase tracking-widest text-[10px]">Examen / Type</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Date</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Score</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Durée</TableHead>
                    <TableHead className="text-right px-6 font-black uppercase tracking-widest text-[10px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computedResults.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-400 font-black uppercase italic tracking-widest">Aucun résultat</TableCell></TableRow>
                  ) : (
                    computedResults.map((res) => (
                      <TableRow key={res.id} className="h-24 hover:bg-slate-50/80 transition-all border-b group">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Trophy className="h-5 w-5" /></div>
                            <div className="font-black text-sm text-slate-800 uppercase italic truncate">{res.examId ? res.examId.replace('exam', 'Examen ') : res.sessionId || 'Simulation'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-600">{formatDate(res.submittedAt)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className={cn("text-xl font-black italic", res.scorePercent >= 75 ? 'text-emerald-500' : 'text-red-500')}>{res.scorePercent}%</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{res.correctCount} / {res.totalQuestions}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold text-slate-500">{formatTime(res.durationSec)}</TableCell>
                        <TableCell className="text-right px-6">
                          <Button asChild size="icon" variant="ghost" className="h-10 w-10 rounded-xl border-2 hover:bg-primary/5 transition-all"><Link href={`/dashboard/history/${res.id}`}><ChevronRight className="h-4 w-4" /></Link></Button>
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
          <Card className="rounded-[40px] shadow-2xl border-none bg-white p-8 space-y-8 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-primary" /> Évolution du Ready Score</h3>
            </div>
            <div className="flex-1 min-h-[400px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
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
                <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-[10px] italic">Données graphiques en attente</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
