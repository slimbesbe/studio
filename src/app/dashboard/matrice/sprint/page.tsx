
"use client";

import { useState, useEffect, Suspense } from 'react';
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
  Target
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { startTrainingSession, submitPracticeAnswer } from '@/lib/services/practice-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface SessionHistoryItem {
  question: any;
  userChoices: string[];
  correction: any;
}

function MatrixSprintContent() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const domain = searchParams.get('domain') || 'People';
  const approach = searchParams.get('approach') || 'Agile';

  const [step, setStep] = useState<'intro' | 'session' | 'summary' | 'review'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0 });
  
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [correction, setCorrection] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      // On force 5 questions pour le sprint matrice
      const data = await startTrainingSession(db, user!.uid, 'domain', { domain, approach }, 5);
      setQuestions(data);
      setSessionHistory([]);
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
    if (selectedChoices.length > 0 && !correction) {
      await handleRevealCorrection();
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoices([]);
      setCorrection(null);
    } else {
      await saveFinalResults();
      setStep('summary');
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

  const handleRevealCorrection = async () => {
    if (selectedChoices.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await submitPracticeAnswer(db, user!.uid, questions[currentIndex].id, selectedChoices);
      setCorrection(res);
      
      setSessionHistory(prev => [
        ...prev, 
        { 
          question: questions[currentIndex], 
          userChoices: selectedChoices, 
          correction: res 
        }
      ]);

      if (res.isCorrect) setSessionResults(prev => ({ ...prev, correct: prev.correct + 1 }));
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la correction" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveFinalResults = async () => {
    if (sessionHistory.length === 0) return;
    try {
      const percent = Math.round((sessionResults.correct / sessionResults.total) * 100);
      await addDoc(collection(db, 'coachingAttempts'), {
        userId: user!.uid,
        scorePercent: percent,
        correctCount: sessionResults.correct,
        totalQuestions: sessionResults.total,
        submittedAt: serverTimestamp(),
        responses: sessionHistory.map(h => ({
          questionId: h.question.id,
          text: h.question.statement || h.question.text,
          choices: h.question.choices || h.question.options?.map((o:any) => o.text),
          isCorrect: h.correction.isCorrect,
          userChoices: h.userChoices,
          correctOptionIds: h.correction.correctOptionIds,
          explanation: h.correction.explanation,
          tags: h.question.tags
        })),
        context: 'matrix_sprint'
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
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
          <Link href="/dashboard/matrice"><ChevronLeft className="mr-2 h-3 w-3" /> Retour à la matrice</Link>
        </Button>
        <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 text-center space-y-8 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 bg-primary/10 h-40 w-40 rounded-full" />
          <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Zap className="h-12 w-12 text-primary fill-primary ml-1" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Sprint Magique</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">{getLabel(domain)} x {getLabel(approach)}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-primary/10">
            <p className="text-lg font-bold italic text-slate-600 leading-relaxed">
              Objectif : <span className="text-primary font-black">5 Questions</span> ciblées sur cette intersection.<br />
              Atteignez <span className="text-emerald-500 font-black">80%</span> pour passer la cellule en vert.
            </p>
          </div>
          <Button size="lg" onClick={handleStart} disabled={isLoading} className="h-20 w-full rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform">
            {isLoading ? <Loader2 className="animate-spin h-8 w-8" /> : "LANCER LE DÉFI"}
          </Button>
        </Card>
      </div>
    );
  }

  if (step === 'session') {
    const q = questions[currentIndex];
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1 bg-white">
            QUESTION {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge className="bg-primary/10 text-primary border-none font-black italic uppercase tracking-widest text-[10px]">
            SPRINT MATRICE
          </Badge>
        </div>

        <Card className="shadow-2xl border-t-8 border-t-primary rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <div className="space-y-6">
              <CardTitle className="text-xl leading-relaxed font-black italic text-slate-800">
                {q.statement || q.text}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="grid gap-3">
              {(q.options || q.choices || []).map((opt: any, idx: number) => {
                const choiceId = opt.id || String(idx + 1);
                const isSelected = selectedChoices.includes(choiceId);
                const isCorrect = correction?.correctOptionIds?.includes(choiceId);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleChoice(choiceId, q.isMultipleCorrect)}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 shadow-sm",
                      isSelected && !correction ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300",
                      correction && isCorrect ? "border-emerald-500 bg-emerald-50" : "",
                      correction && isSelected && !isCorrect ? "border-red-500 bg-red-50" : ""
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 border-2",
                      q.isMultipleCorrect ? "rounded-xl" : "rounded-full",
                      isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400",
                      correction && isCorrect ? "bg-emerald-500 text-white border-emerald-500" : "",
                      correction && isSelected && !isCorrect ? "bg-red-500 text-white border-red-500" : ""
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={cn("flex-1 text-sm font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>
                      {opt.text || opt}
                    </div>
                  </div>
                );
              })}
            </div>

            {correction && (
              <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border-l-8 border-l-primary animate-slide-up shadow-inner">
                <h4 className="font-black text-primary flex items-center gap-2 mb-3 uppercase tracking-widest italic text-xs">
                  <Info className="h-4 w-4" /> Justification Mindset
                </h4>
                <div className="text-sm font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {correction.explanation}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-xl border-2 font-black uppercase tracking-widest text-xs" 
              onClick={handleRevealCorrection}
              disabled={selectedChoices.length === 0 || !!correction || isSubmitting}
            >
              Vérifier
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl" 
              onClick={handleNext}
              disabled={(selectedChoices.length === 0 && !correction) || isSubmitting}
            >
              {currentIndex < questions.length - 1 ? "Suivant" : "Résultats"} <ChevronRight className="ml-2 h-4 w-4" />
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
            <Button variant="outline" className="w-full h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" asChild>
              <Link href="/dashboard/matrice">Retour à la matrice</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'review') {
    const item = sessionHistory[currentIndex];
    const { question: q, userChoices, correction: corr } = item;
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
          <Button variant="ghost" className="font-black italic uppercase tracking-widest" onClick={() => setStep('summary')}><ChevronLeft className="mr-2 h-4 w-4" /> Score</Button>
          <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1">REVUE {currentIndex + 1} / 5</Badge>
          <Badge className={corr.isCorrect ? "bg-emerald-500" : "bg-red-500"}>{corr.isCorrect ? "CORRECT" : "ERREUR"}</Badge>
        </div>
        <Card className={cn("shadow-2xl border-t-8 rounded-[32px] overflow-hidden bg-white", corr.isCorrect ? "border-t-emerald-500" : "border-t-red-500")}>
          <CardContent className="p-10 space-y-8">
            <p className="text-xl font-black text-slate-800 italic leading-relaxed">{q.statement || q.text}</p>
            <div className="grid gap-3">
              {(q.options || q.choices || []).map((opt: any, idx: number) => {
                const choiceId = opt.id || String(idx + 1);
                const isSelected = userChoices.includes(choiceId);
                const isCorrect = corr.correctOptionIds?.includes(choiceId);
                return (
                  <div key={idx} className={cn("p-5 rounded-2xl border-2 flex items-start gap-4 shadow-sm", isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "border-slate-100")}>
                    <div className={cn("h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 border-2", isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                    <p className={cn("flex-1 text-sm font-bold italic pt-1", isCorrect ? "text-emerald-900" : isSelected ? "text-red-900" : "text-slate-500")}>{opt.text || opt}</p>
                  </div>
                );
              })}
            </div>
            <div className="p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary shadow-inner font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">{corr.explanation}</div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button variant="outline" className="flex-1 h-14 rounded-xl border-2 font-black uppercase tracking-widest text-xs" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Précédent</Button>
            <Button className="flex-1 h-14 rounded-xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl" onClick={() => setCurrentIndex(Math.min(sessionHistory.length - 1, currentIndex + 1))} disabled={currentIndex === sessionHistory.length - 1}>Suivant</Button>
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
