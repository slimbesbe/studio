
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Trophy, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const MOCK_HISTORY = [
  { id: 'h5', examId: 'exam2', percentage: 75, score: 135, total: 180, timeSpent: 12600, completedAt: { toDate: () => new Date(Date.now() - 86400000 * 1) } },
  { id: 'h4', examId: 'exam1', percentage: 70, score: 126, total: 180, timeSpent: 13200, completedAt: { toDate: () => new Date(Date.now() - 86400000 * 2) } },
  { id: 'h3', examId: 'exam3', percentage: 72, score: 130, total: 180, timeSpent: 12900, completedAt: { toDate: () => new Date(Date.now() - 86400000 * 4) } },
  { id: 'h2', examId: 'exam2', percentage: 65, score: 117, total: 180, timeSpent: 13800, completedAt: { toDate: () => new Date(Date.now() - 86400000 * 7) } },
  { id: 'h1', examId: 'exam1', percentage: 60, score: 108, total: 180, timeSpent: 14400, completedAt: { toDate: () => new Date(Date.now() - 86400000 * 10) } },
];

export default function HistoryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const isDemo = user?.isAnonymous;

  const resultsQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(
      collection(db, 'users', user.uid, 'exam_results'),
      orderBy('completedAt', 'desc')
    );
  }, [db, user, isDemo]);

  const { data: results, isLoading } = useCollection(resultsQuery);

  const displayData = isDemo ? MOCK_HISTORY : results;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading && !isDemo) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div>
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-4">
            <History className="h-12 w-12 text-primary" />
            Historique {isDemo && <span className="text-amber-500 text-sm">(MODE DÉMO)</span>}
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Suivez votre progression et vos performances passées.</p>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-8 font-black uppercase tracking-widest text-xs">Examen / Session</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Date</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Score</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Temps</TableHead>
                <TableHead className="text-right px-8 font-black uppercase tracking-widest text-xs">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!displayData || displayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                      <History className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucune simulation enregistrée</p>
                      <Link href="/dashboard/exam" className="text-primary hover:underline font-bold uppercase text-xs">
                        Lancer votre première simulation
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((res) => (
                  <TableRow key={res.id} className="h-24 hover:bg-slate-50/80 transition-all border-b group">
                    <TableCell className="px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Trophy className="h-6 w-6" />
                        </div>
                        <div className="font-black text-lg text-slate-800 uppercase italic tracking-tighter">
                          {res.examId ? res.examId.replace('exam', 'Examen ') : 'Session Libre'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-bold text-slate-600">{formatDate(res.completedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-2xl font-black italic tracking-tighter ${res.percentage >= 80 ? 'text-emerald-500' : res.percentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {res.percentage}%
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.score} / {res.total}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 font-bold">
                        <Clock className="h-4 w-4" />
                        {formatTime(res.timeSpent)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <Badge variant={res.percentage >= 80 ? "default" : "outline"} className="px-4 py-1 rounded-full font-black italic uppercase text-[10px] tracking-widest">
                        {res.percentage >= 80 ? 'Succès' : 'À renforcer'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
