
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

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

  const results = useMemo(() => {
    if (!rawResults) return [];
    return [...rawResults].sort((a, b) => {
      const timeA = a.submittedAt?.seconds || 0;
      const timeB = b.submittedAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [rawResults]);

  const chartData = useMemo(() => {
    if (!results) return [];
    // Chronologique pour le graphique (gauche à droite)
    return [...results].reverse().slice(-10).map((res, i) => {
      const date = res.submittedAt?.toDate ? res.submittedAt.toDate() : new Date(res.submittedAt);
      return {
        name: `S${i + 1}`,
        score: res.scorePercent,
        fullDate: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      };
    });
  }, [results]);

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
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    });
  };

  const formatHour = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isUserLoading || isCollectionLoading || !mounted) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-4">
            <History className="h-12 w-12 text-primary" />
            Historique des Simulations
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Suivez votre progression et analysez vos erreurs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TABLEAU (GAUCHE) */}
        <div className="lg:col-span-7">
          <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white h-full">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="h-20 border-b-4">
                    <TableHead className="px-6 font-black uppercase tracking-widest text-[10px]">Examen / Type</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Date & Heure</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Score</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Temps (Durée)</TableHead>
                    <TableHead className="text-right px-6 font-black uppercase tracking-widest text-[10px]">Statut & Revue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                          <History className="h-16 w-16 opacity-20" />
                          <p className="font-black uppercase italic tracking-widest">Aucune simulation enregistrée</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    results.map((res) => (
                      <TableRow key={res.id} className="h-24 hover:bg-slate-50/80 transition-all border-b group">
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Trophy className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-black text-sm text-slate-800 uppercase italic tracking-tighter truncate">
                                {res.examId ? res.examId.replace('exam', 'Examen ') : res.sessionId || 'Simulation'}
                              </div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Analyse disponible</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-600">{formatDate(res.submittedAt)}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase italic">{formatHour(res.submittedAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className={cn(
                              "text-xl font-black italic tracking-tighter",
                              res.scorePercent >= 75 ? 'text-emerald-500' : res.scorePercent >= 50 ? 'text-[#6366f1]' : 'text-red-500'
                            )}>
                              {res.scorePercent}%
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{res.correctCount} / {res.totalQuestions}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-xs">
                            <Clock className="h-3 w-3" />
                            {formatTime(res.durationSec)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className="px-3 py-1 rounded-full font-black italic uppercase text-[8px] tracking-widest bg-slate-50 border-2">
                              Terminé
                            </Badge>
                            <Button asChild size="icon" variant="ghost" className="h-10 w-10 rounded-xl border-2 hover:bg-primary/5 transition-all">
                              <Link href={`/dashboard/history/${res.id}`}><ChevronRight className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* GRAPHIQUE (DROITE) */}
        <div className="lg:col-span-5">
          <Card className="rounded-[40px] shadow-2xl border-none bg-white p-8 space-y-8 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-primary" /> Courbe d'avancement
              </h3>
              <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic text-[10px] px-4 py-1 uppercase">CIBLE : 100%</Badge>
            </div>

            <div className="flex-1 min-h-[400px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                      formatter={(value: any) => [`${value}%`, 'Score']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) return payload[0].payload.fullDate;
                        return label;
                      }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#6366f1' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#f43f5e" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 8 }}
                      animationDuration={1500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
                  <Clock className="h-12 w-12 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-[10px] italic">Aucune donnée graphique</p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-100">
              <p className="text-xs font-bold italic text-slate-500 leading-relaxed">
                <span className="text-primary font-black">Analyse :</span> Les barres colorées reflètent votre niveau immédiat tandis que la courbe rouge montre la tendance globale de votre préparation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
