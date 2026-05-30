"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ChevronRight, 
  Info, 
  CheckCircle2,
  Trophy,
  ChevronLeft,
  Zap,
  TrendingUp,
  History as HistoryIcon
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { startTrainingSession, submitPracticeAnswer } from '@/lib/services/practice-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { isValid } from 'date-fns';

interface SessionHistoryItem {
  question: any;
  userChoices: string[];
  correction: any;
}

function MatrixSprintContent() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const domain = searchParams.get('domain') || 'People';
  const approach = searchParams.get('approach') || 'Agile';

  const [step, setStep] = useState<'intro' | 'session' | 'summary' | 'review'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0 });
  const [startTime, setStartTime] = useState<number>(0);
  
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [correction, setCorrection] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid),
      where('context', '==', 'matrix_sprint'),
      where('matrixDomain', '==', domain),
      where('matrixApproach', '==', approach)
    );
  }, [db, user?.uid, isUserLoading, domain, approach]);

  const { data: pastAttempts, isLoading: isLoadingHistory } = useCollection(attemptsQuery);

  const historyData = useMemo(() => {
    if (!pastAttempts) return [];
    return [...pastAttempts]
      .filter(a => a.submittedAt && isValid(a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt)))
      .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      .map((a, i) => {
        const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
        const totalCount = a.totalQuestions || a.responses?.length || 5;
        const correctCount = a.correctCount !== undefined ? a.correctCount : Math.round(((a.scorePercent || 0) * totalCount) / 100);
        return {
          id: a.id,
          name: `T${i + 1}`,
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          score: a.scorePercent !== undefined ? a.scorePercent : Math.round((correctCount / totalCount) * 100),
          ratio: `${correctCount} / ${totalCount}`
        };
      });
  }, [pastAttempts]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      // Utilisation du mode 'matrix' pour une recherche plus flexible et robuste
      const data = await startTrainingSession(db, user!.uid, 'matrix', { domain, approach }, 5);
      setQuestions(data);
      setSessionHistory([]);
      setStartTime(Date.now());
      setStep('session');
      setCurrentIndex(0);
      setSessionResults({ correct: 0, total: data.length });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      let currentCorrection = correction;
      let currentChoices = selectedChoices;

      if (!currentCorrection && currentChoices.length > 0) {
        const res = await submitPracticeAnswer(db, user!.uid, questions[currentIndex].id, currentChoices, 'matrix');
        currentCorrection = res;
      }

      if (!currentCorrection) {
        setIsSubmitting(false);
        return;
      }

      const currentHistoryItem = { 
        question: questions[currentIndex], 
        userChoices: currentChoices, 
        correction: currentCorrection 
      };
      
      const filteredHistory = sessionHistory.filter(h => h.question.id !== questions[currentIndex].id);
      const finalHistory = [...filteredHistory, currentHistoryItem];
      
      const correctCount = finalHistory.filter(h => h.correction.isCorrect).length;

      if (currentIndex < questions.length - 1) {
        setSessionHistory(finalHistory);
        setSessionResults({ correct: correctCount, total: questions.length });
        setCurrentIndex(currentIndex + 1);
        setSelectedChoices([]);
        setCorrection(null);
      } else {
        await saveFinalResults(finalHistory, correctCount);
        setStep('summary');
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChoice = (choiceId: string, isMultiple: boolean) => {
    if (correction) return;
    if (isMultiple) {
      if (selectedChoices.includes(choiceId)) {
        setSelectedChoices(selectedChoices.filter(id => id !== choiceId));
      } else {
        setSelectedChoices([...selectedChoices, choiceId]);
      }
    } else {
      setSelectedChoices([choiceId]);
    }
  };

  const handleRevealCorrection = async (): Promise<any> => {
    if (selectedChoices.length === 0 || isSubmitting || correction) return null;
    setIsSubmitting(true);
    try {
      const res = await submitPracticeAnswer(db, user!.uid, questions[currentIndex].id, selectedChoices, 'matrix');
      setCorrection(res);
      
      const newHistoryItem = { 
        question: questions[currentIndex], 
        userChoices: selectedChoices, 
        correction: res 
      };

      setSessionHistory(prev => {
        const filtered = prev.filter(h => h.question.id !== questions[currentIndex].id);
        return [...filtered, newHistoryItem];
      });

      setSessionResults(prev => {
        const correct = res.isCorrect ? prev.correct + 1 : prev.correct;
        return { ...prev, correct };
      });
      return res;
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la correction" });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveFinalResults = async (finalHistory: SessionHistoryItem[], finalCorrect: number) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const totalCount = questions.length;
    const percent = Math.round((finalCorrect / totalCount) * 100);

    try {
      await addDoc(collection(db, 'coachingAttempts'), {
        userId: user!.uid,
        durationSec: duration,
        submittedAt: serverTimestamp(),
        responses: finalHistory.map(h => ({
          questionId: h.question.id,
          userChoices: h.userChoices,
          isCorrect: h.correction.isCorrect,
          tags: h.question.tags || {}
        })),
        context: 'matrix_sprint',
        matrixDomain: domain,
        matrixApproach: approach,
        scorePercent: percent,
        correctCount: finalCorrect,
        totalQuestions: totalCount
      });
    } catch (e) {
      console.error("Error saving matrix sprint results", e);
    }
  };

  const getLabel = (val: string) => {
    if (val === 'Predictive') return 'Waterfall';
    if (val === 'Process') return 'Processus';
    return val;
  };

  if (step === 'intro') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-12 animate-fade-in pb-32">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
          <Link href="/dashboard/matrice"><ChevronLeft className="mr-2 h-3 w-3" /> Retour à la matrice</Link>
        </Button>

        <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 text-center space-y-8 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 bg-primary/10 h-40 w-40 rounded-full" />
          <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner relative z-10">
            <Zap className="h-12 w-12 text-primary fill-primary ml-1" />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Sprint Magique</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">{getLabel(domain)} x {getLabel(approach)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-primary/10 relative z-10">
            <p className="text-lg font-bold italic text-slate-600 leading-relaxed">
              Objectif : <span className="text-primary font-black">5 Questions</span> ciblées sur cette intersection.<br />
              Atteignez <span className="text-emerald-500 font-black">80%</span> pour valider la cellule.
            </p>
          </div>
          <Button size="lg" onClick={handleStart} disabled={isLoading} className="h-20 w-full rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform relative z-10">
            {isLoading ? <Loader2 className="animate-spin h-8 w-8" /> : "LANCER LE DÉFI"}
          </Button>
        </Card>

        <div className="space-y-8 animate-slide-up">
          <div className="flex items-center gap-3 px-4">
            <HistoryIcon className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Analyse de Performance</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[40px] shadow-xl border-none bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 p-6 border-b">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Dernières tentatives</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="h-14 border-b-2">
                    <TableHead className="px-8 font-black uppercase text-[9px] tracking-widest">Date</TableHead>
                    <TableHead className="font-black uppercase text-[9px] tracking-widest text-center">Ratio</TableHead>
                    <TableHead className="px-8 font-black uppercase text-[9px] tracking-widest text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    <TableRow><TableCell colSpan={3} className="h-40 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-primary" /></TableCell></TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="h-40 text-center font-bold italic text-slate-300">Aucun historique sur ce segment.</TableCell></TableRow>
                  ) : (
                    [...historyData].reverse().slice(0, 5).map((a) => (
                      <TableRow key={a.id} className="h-16 border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <TableCell className="px-8 font-bold italic text-sm text-slate-600">{a.date}</TableCell>
                        <TableCell className="text-center font-black italic text-slate-400">{a.ratio}</TableCell>
                        <TableCell className="px-8 text-right font-black italic text-primary text-lg">{a.score}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="rounded-[40px] shadow-xl border-none bg-white p-8 space-y-6 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Courbe d'évolution</span>
                <Badge variant="outline" className="font-black italic uppercase text-[8px] border-2 border-emerald-100 text-emerald-600 bg-emerald-50 px-3">Objectif : 80%</Badge>
              </div>
              <div className="h-[250px] w-full">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                        {historyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                    <TrendingUp className="h-12 w-12 opacity-20" />
                    <p className="font-black uppercase italic tracking-widest text-[10px]">Data insuffisante pour le graphique</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'session') {
    const q = questions[currentIndex];
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1 bg-white shadow-sm">
            QUESTION {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge className="bg-primary text-white border-none font-black italic uppercase tracking-widest text-[9px] px-3 shadow-md">
            SPRINT MATRICE
          </Badge>
        </div>

        <Card className="shadow-2xl border-t-8 border-t-primary rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="p-10 pb-4">
            <div className="space-y-6">
              <CardTitle className="text-2xl leading-relaxed font-black italic text-slate-800">
                {q.statement || q.text}
              </CardTitle>
              {q.imageUrl && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-white p-1 flex justify-center shadow-md">
                  <img 
                    src={q.imageUrl} 
                    alt="Illustration" 
                    className="max-h-[45vh] w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-4">
            <div className="grid gap-3">
              {(q.options || q.choices || []).map((opt: any, idx: number) => {
                const choiceId = String(opt.id || idx + 1);
                const isSelected = selectedChoices.includes(choiceId);
                const isCorrect = correction?.correctOptionIds?.map(String).includes(choiceId);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleChoice(choiceId, q.isMultipleCorrect)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-5 shadow-sm",
                      isSelected && !correction ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300",
                      correction && isCorrect ? "border-emerald-500 bg-emerald-50 shadow-inner" : "",
                      correction && isSelected && !isCorrect ? "border-red-500 bg-red-50 shadow-inner" : ""
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2",
                      q.isMultipleCorrect ? "rounded-xl" : "rounded-full",
                      isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400",
                      correction && isCorrect ? "bg-emerald-500 text-white border-emerald-500" : "",
                      correction && isSelected && !isCorrect ? "bg-red-500 text-red-500" : ""
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={cn("flex-1 text-lg font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>
                      {opt.text || opt}
                    </div>
                  </div>
                );
              })}
            </div>

            {correction && (
              <div className="mt-8 p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary animate-slide-up shadow-inner">
                <h4 className="font-black text-primary flex items-center gap-2 mb-4 uppercase tracking-widest italic text-xs">
                   Justification Mindset PMI®
                </h4>
                <div className="text-lg font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {correction.explanation}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button 
              variant="outline" 
              className="flex-1 h-16 rounded-2xl border-4 font-black uppercase tracking-widest italic text-sm" 
              onClick={handleRevealCorrection}
              disabled={selectedChoices.length === 0 || !!correction || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Vérifier"}
            </Button>
            <Button 
              className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest italic shadow-xl text-sm group" 
              onClick={handleNext}
              disabled={(selectedChoices.length === 0 && !correction) || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : (currentIndex < questions.length - 1 ? "Suivant" : "Terminer")} <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'summary') {
    const score = Math.round((sessionResults.correct / sessionResults.total) * 100);
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-10 animate-fade-in px-4">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Sprint Terminé</h1>
        <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
          <div className="space-y-2">
            <span className="text-8xl font-black italic tracking-tighter text-primary">{score}%</span>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic">{sessionResults.correct} / {sessionResults.total} Correctes</p>
          </div>
          <div className="flex flex-col gap-4">
            <Button className="w-full h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" onClick={() => { setStep('review'); setCurrentIndex(0); }}>
              Revoir les réponses
            </Button>
            <Button variant="outline" className="w-full h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic hover:bg-slate-50 transition-colors" asChild>
              <Link href="/dashboard/matrice">Retour à la matrice</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'review') {
    const item = sessionHistory[currentIndex];
    if (!item) return null;
    const { question: q, userChoices, correction: corr } = item;
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
          <Button variant="ghost" className="font-black italic uppercase tracking-widest" onClick={() => setStep('summary')}><ChevronLeft className="mr-2 h-4 w-4" /> Score</Button>
          <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1">REVUE QUESTION {currentIndex + 1} / {questions.length}</Badge>
          <Badge className={cn("text-white font-black italic px-4 py-1 rounded-lg shadow-md", corr.isCorrect ? "bg-emerald-500" : "bg-red-500")}>
            {corr.isCorrect ? "CORRECT" : "ERREUR"}
          </Badge>
        </div>
        <Card className={cn("shadow-2xl border-t-8 rounded-[32px] overflow-hidden bg-white", corr.isCorrect ? "border-t-emerald-500" : "border-t-red-500")}>
          <CardHeader className="p-10 pb-4">
            <div className="space-y-6">
              <CardTitle className="text-2xl leading-relaxed font-black italic text-slate-800">
                {q.statement || q.text}
              </CardTitle>
              {q.imageUrl && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 bg-white p-1 flex justify-center shadow-md">
                  <img 
                    src={q.imageUrl} 
                    alt="Illustration" 
                    className="max-h-[45vh] w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-4">
            <div className="grid gap-3">
              {(q.options || q.choices || []).map((opt: any, idx: number) => {
                const choiceId = String(opt.id || idx + 1);
                const isSelected = userChoices.map(String).includes(choiceId);
                const isCorrect = corr.correctOptionIds?.map(String).includes(choiceId);
                return (
                  <div key={idx} className={cn("p-6 rounded-2xl border-2 flex items-start gap-5 transition-all shadow-sm", isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "border-slate-100 opacity-60")}>
                    <div className={cn("h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2", isCorrect ? "bg-emerald-500 text-white border-emerald-500" : isSelected ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                    <p className={cn("flex-1 text-lg font-bold italic pt-1", isCorrect ? "text-emerald-900" : isSelected ? "text-red-900" : "text-slate-500")}>{opt.text || opt}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary shadow-inner font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">{corr.explanation}</div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button variant="outline" className="flex-1 h-14 rounded-xl border-4 font-black uppercase tracking-widest text-xs italic" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Précédent</Button>
            <Button className="flex-1 h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl italic" onClick={() => setCurrentIndex(Math.min(sessionHistory.length - 1, currentIndex + 1))} disabled={currentIndex === sessionHistory.length - 1}>Suivant</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}

export default function MatrixSprintPage() {
  return (
    <Suspense fallback={<div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
      <MatrixSprintContent />
    </Suspense>
  );
}
