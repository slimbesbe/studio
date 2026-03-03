
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Trophy, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();

  const resultsQuery = useMemoFirebase(() => {
    // Sécurité : Attendre que l'utilisateur et son profil soient chargés
    if (isUserLoading || !user?.uid || !profile || !db) return null;
    
    // Le filtre par userId est OBLIGATOIRE pour respecter les règles de sécurité Firestore
    return query(
      collection(db, 'coachingAttempts'),
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc')
    );
  }, [db, user?.uid, profile, isUserLoading]);

  const { data: results, isLoading: isCollectionLoading } = useCollection(resultsQuery);

  const formatTime = (seconds: number) => {
    if (!seconds) return '0m';
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

  if (isUserLoading || isCollectionLoading) {
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
            Historique des Simulations
          </h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Suivez votre progression et analysez vos erreurs.</p>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-8 font-black uppercase tracking-widest text-xs">Examen / Type</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Date & Heure</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Score</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Temps (Durée)</TableHead>
                <TableHead className="text-right px-8 font-black uppercase tracking-widest text-xs">Statut & Revue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!results || results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                      <History className="h-16 w-16 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Aucune simulation enregistrée</p>
                      <Button asChild variant="link" className="text-primary font-bold uppercase text-xs">
                        <Link href="/dashboard/exam">Lancer votre première simulation</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                results.map((res) => (
                  <TableRow key={res.id} className="h-24 hover:bg-slate-50/80 transition-all border-b group">
                    <TableCell className="px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-black text-lg text-slate-800 uppercase italic tracking-tighter">
                            {res.examId ? res.examId.replace('exam', 'Examen ') : res.sessionId || 'Pratique'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{res.responses ? 'Détails dispos' : 'Synthèse uniquement'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-600">{formatDate(res.submittedAt)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase italic">{formatHour(res.submittedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-2xl font-black italic tracking-tighter ${res.scorePercent >= 80 ? 'text-emerald-500' : res.scorePercent >= 65 ? 'text-blue-500' : 'text-red-500'}`}>
                          {res.scorePercent}%
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.correctCount} / {res.totalQuestions}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 font-bold">
                        <Clock className="h-4 w-4" />
                        {formatTime(res.durationSec)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-4">
                        <Badge variant={res.scorePercent >= 80 ? "default" : "outline"} className={cn(
                          "px-4 py-1 rounded-full font-black italic uppercase text-[10px] tracking-widest",
                          res.scorePercent >= 80 ? "bg-emerald-500 hover:bg-emerald-600" : ""
                        )}>
                          {res.performance || 'Terminé'}
                        </Badge>
                        <Button asChild size="icon" variant="ghost" className="h-10 w-10 rounded-xl border-2 hover:bg-primary/5 hover:text-primary transition-all">
                          <Link href={`/dashboard/history/${res.id}`} title="Revoir les réponses"><ChevronRight className="h-5 w-5" /></Link>
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
  );
}
