
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight, ChevronLeft, Loader2, PlayCircle, Info, Pause, Tags, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logExamAttempts } from '@/lib/services/practice-service';

const PERFORMANCE_ZONES = [
  { label: "Needs Improvement", color: "bg-[#F44336]", range: [0, 50], width: '50%' },
  { label: "Below Target", color: "bg-[#FFC107]", range: [50, 65], width: '15%' },
  { label: "Target", color: "bg-[#4CAF50]", range: [65, 80], width: '15%' },
  { label: "Above Target", color: "bg-[#009688]", range: [80, 101], width: '20%' },
];

const ALL_EXAMS = [
  { id: 'exam1', num: 1 },
  { id: 'exam2', num: 2 },
  { id: 'exam3', num: 3 },
  { id: 'exam4', num: 4 },
  { id: 'exam5', num: 5 },
];

export default function ExamPage() {
  const { user, profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Filtrer les examens autorisés
  const allowedExams = isDemo 
    ? ALL_EXAMS // Mode démo voit tout mais limité à 10 questions
    : ALL_EXAMS.filter(exam => profile?.allowedExams?.includes(exam.id) || profile?.role === 'super_admin');

  const examStateRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(db, 'users', user.uid, 'exam_state', 'current') : null;
  }, [db, user]);

  const { data: savedState, isLoading: isStateLoading } = useDoc(examStateRef);

  const saveProgress = useCallback((updatedIndex?: number, updatedAnswers?: any) => {
    if (isDemo || !examStateRef || !isExamStarted || examResult) return;
    setDoc(examStateRef, {
      selectedExamId,
      currentQuestionIndex: updatedIndex !== undefined ? updatedIndex : currentQuestionIndex,
      answers: updatedAnswers !== undefined ? updatedAnswers : answers,
      timeLeft,
      initialTime,
      questionIds: examQuestions.map(q => q.id),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, timeLeft, initialTime, examQuestions, selectedExamId, examResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult && !showPauseScreen) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft, examResult, showPauseScreen]);

  const startExam = async (resume: boolean = false) => {
    const examToLoad = resume && savedState ? savedState.selectedExamId : selectedExamId;
    if (!examToLoad) return;
    setIsSubmitting(true);
    try {
      const qSnap = await getDocs(query(collection(db, 'exams', examToLoad, 'questions'), where('isActive', '==', true)));
      const questions = qSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      
      if (questions.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Pas de questions disponibles." });
        setIsSubmitting(false);
        return;
      }

      if (resume && savedState) {
        const filtered = questions.filter(q => savedState.questionIds.includes(q.id));
        setExamQuestions(filtered);
        setAnswers(savedState.answers || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setTimeLeft(savedState.timeLeft || 0);
        setInitialTime(savedState.initialTime || 0);
        setSelectedExamId(savedState.selectedExamId);
      } else {
        const pool = [...questions].sort(() => 0.5 - Math.random());
        const selected = pool.slice(0, isDemo ? 10 : 180);
        const duration = selected.length * 72;
        setExamQuestions(selected);
        setTimeLeft(duration);
        setInitialTime(duration);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setExamResult(null);
      }
      setIsExamStarted(true);
      setShowPauseScreen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors du chargement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let score = 0;
      const attemptResults: any[] = [];

      examQuestions.forEach(q => {
        const uAns = answers[q.id] || [];
        const cAns = q.correctOptionIds || [];
        const isCorrect = uAns.length === cAns.length && uAns.every(v => cAns.includes(v));
        if (isCorrect) score++;
        
        attemptResults.push({
          questionId: q.id,
          selectedChoiceIds: uAns,
          isCorrect
        });
      });

      const percentage = Math.round((score / examQuestions.length) * 100);
      setExamResult({ score, total: examQuestions.length });
      
      if (!isDemo && user) {
        const newCount = (profile?.simulationsCount || 0) + 1;
        const newTotalScore = (profile?.totalScore || 0) + percentage;
        
        await setDoc(doc(db, 'users', user.uid), {
          simulationsCount: newCount,
          totalScore: newTotalScore,
          averageScore: Math.round(newTotalScore / newCount),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        await addDoc(collection(db, 'users', user.uid, 'exam_results'), {
          examId: selectedExamId,
          score,
          total: examQuestions.length,
          percentage,
          timeSpent: initialTime - timeLeft,
          completedAt: serverTimestamp()
        });

        await logExamAttempts(db, user.uid, attemptResults);
        if (examStateRef) await deleteDoc(examStateRef);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isStateLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  if (showPauseScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl bg-white border-none rounded-3xl overflow-hidden">
          <CardHeader className="text-center py-8 bg-muted/20">
            <h1 className="text-4xl font-black text-slate-900 tracking-wider uppercase italic">Pause</h1>
            <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest italic">Simulation Suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-8 bg-white">
            <Button className="h-14 text-xl font-black bg-primary hover:bg-primary/90 rounded-xl uppercase tracking-widest shadow-lg" onClick={() => setShowPauseScreen(false)}>
              CONTINUER
            </Button>
            <Button variant="outline" className="h-14 text-xl font-black text-primary border-primary hover:bg-primary/5 rounded-xl uppercase tracking-widest border-2" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>
              SAUVEGARDER
            </Button>
            <Button variant="outline" className="h-14 text-xl font-black text-red-500 border-red-500 hover:bg-red-50 rounded-xl uppercase tracking-widest border-2" onClick={() => { if(confirm("Arrêter sans sauvegarder ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>
              ANNULER
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const appreciation = PERFORMANCE_ZONES.find(z => percentage >= z.range[0] && percentage < z.range[1]) || PERFORMANCE_ZONES[0];
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6 animate-fade-in">
        <Card className="shadow-xl overflow-hidden bg-white border-none rounded-[40px]">
          <CardHeader className="border-b bg-muted/30 py-6">
            <CardTitle className="text-center font-black text-xl uppercase tracking-widest text-primary italic">Rapport de Performance</CardTitle>
          </CardHeader>
          <CardContent className="py-16 px-10">
            <div className="relative w-full max-w-2xl mx-auto">
              <div className="flex w-full text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">
                <div className="w-[50%] text-center">Needs Improvement</div>
                <div className="w-[15%] text-center">Below Target</div>
                <div className="w-[15%] text-center">Target</div>
                <div className="w-[20%] text-center">Above Target</div>
              </div>
              
              <div className="relative flex w-full h-10 rounded-full overflow-hidden border-2 shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={cn(zone.color, "border-r border-white/50")} style={{ width: zone.width }}></div>
                ))}
              </div>
              
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-30" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-10 flex flex-col items-center w-24 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-black text-black mb-1 tracking-widest italic uppercase">YOU</span>
                    <div className="w-1 h-3 bg-black rounded-full" />
                 </div>
                 <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-black text-primary italic uppercase">
                    {appreciation.label}
                 </div>
              </div>
            </div>

            <div className="text-center space-y-4 pt-12">
              <p className="text-6xl leading-none font-black text-primary tracking-tighter italic">{percentage}%</p>
              <p className="text-lg font-black text-muted-foreground uppercase tracking-widest italic">{examResult.score} / {examResult.total} POINTS</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-12 rounded-2xl border-2 uppercase tracking-widest hover:bg-slate-50" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-12 rounded-2xl bg-primary text-white shadow-xl uppercase tracking-widest hover:scale-[1.02] transition-transform" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>RETOUR DASHBOARD</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isReviewMode) {
    const q = examQuestions[currentQuestionIndex];
    const uAns = answers[q.id] || [];
    const isCorrect = uAns.length === (q.correctOptionIds?.length || 0) && uAns.every(v => q.correctOptionIds?.includes(v));
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-black text-primary uppercase tracking-widest mb-2 hover:bg-primary/5 h-10 px-4 rounded-xl border-2">
          <ChevronLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Card className={cn("border-t-8 shadow-xl rounded-3xl overflow-hidden", isCorrect ? 'border-t-emerald-500' : 'border-t-red-500')}>
          <CardHeader className="bg-muted/5 p-6 pb-2">
            <div className="flex justify-between items-center mb-4">
              <Badge variant={isCorrect ? "default" : "destructive"} className="px-3 py-0.5 text-xs font-black tracking-widest uppercase rounded-full shadow-sm">
                {isCorrect ? "CORRECT" : "ERREUR"}
              </Badge>
              <span className="text-xs font-black text-muted-foreground bg-white border-2 px-3 py-1.5 rounded-lg shadow-sm italic">
                {currentQuestionIndex + 1} / {examQuestions.length}
              </span>
            </div>
            <CardTitle className="text-lg leading-relaxed font-black text-slate-800 italic">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={cn("p-3 rounded-xl border-2 flex items-center gap-3 transition-all", isCorrectOpt ? 'border-emerald-500 bg-emerald-50 shadow-sm' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted bg-white')}>
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0", isCorrectOpt ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground')}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 font-black text-sm text-slate-700 italic">{opt.text}</div>
                  </div>
                );
              })}
            </div>

            {q.tags && (
              <div className="flex flex-wrap gap-2 pt-4">
                <Badge variant="outline" className="flex items-center gap-1.5 font-bold uppercase text-[10px] py-1 border-slate-200">
                  <Tags className="h-3 w-3 text-primary" /> Approche : {q.tags.approach}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 font-bold uppercase text-[10px] py-1 border-slate-200">
                  <Tags className="h-3 w-3 text-primary" /> Domaine : {q.tags.domain}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1.5 font-bold uppercase text-[10px] py-1 border-slate-200">
                  <Tags className="h-3 w-3 text-primary" /> Niveau : {q.tags.difficulty}
                </Badge>
              </div>
            )}

            <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-l-primary mt-6 shadow-inner">
              <h4 className="font-black mb-2 text-primary flex items-center gap-2 text-xs uppercase tracking-widest italic">
                <Info className="h-4 w-4" /> MINDSET OFFICIEL
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-bold italic">{q.explanation || "Explication non disponible."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-6 border-t bg-muted/5">
            <Button variant="outline" size="sm" className="font-black px-4 h-9 rounded-lg uppercase border-2 text-xs" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" size="sm" className="font-black px-4 h-9 rounded-lg uppercase border-2 text-xs" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-3xl leading-none font-black text-primary uppercase italic tracking-tighter">Simulateur PMP®</h1>
          <p className="text-lg text-slate-500 font-black uppercase tracking-widest italic">Excellence & Performance</p>
        </div>
        
        {allowedExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-[40px] shadow-inner border-4 border-dashed border-slate-100">
            <Lock className="h-16 w-16 text-slate-300" />
            <h2 className="text-2xl font-black text-slate-400 italic uppercase">Accès restreint</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-md">Vous n'avez pas encore accès aux simulations d'examen. Veuillez contacter votre formateur.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allowedExams.map(exam => (
              <Card key={exam.id} className={cn("cursor-pointer border-t-4 transition-all hover:scale-[1.01] hover:shadow-md rounded-2xl overflow-hidden", selectedExamId === exam.id ? 'border-t-primary bg-primary/5 ring-2 ring-primary/10 shadow-md' : 'border-t-muted shadow-sm')} onClick={() => setSelectedExamId(exam.id)}>
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-black uppercase tracking-tight italic">Examen {exam.num}</CardTitle>
                  <div className="h-0.5 w-8 bg-primary/20 rounded-full my-3" />
                  <p className="text-slate-600 font-bold leading-relaxed text-xs uppercase tracking-tight italic">Simulation complète.</p>
                </CardHeader>
                <CardFooter className="p-6 pt-0">
                  <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full h-10 font-black text-xs rounded-lg uppercase tracking-widest shadow-sm border-2 transition-all bg-primary text-white">
                    {selectedExamId === exam.id ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {allowedExams.length > 0 && (
          <div className="flex flex-col gap-4 items-center pt-6">
            {savedState && allowedExams.some(e => e.id === savedState.selectedExamId) && (
              <Button variant="outline" className="w-full max-w-lg h-12 border-2 border-primary text-primary font-black text-lg rounded-xl hover:bg-primary/5 shadow-md uppercase tracking-widest animate-pulse italic" onClick={() => startExam(true)}>
                REPRENDRE LA SESSION
              </Button>
            )}
            <Button size="lg" className="w-full max-w-lg h-14 text-2xl font-black bg-primary text-white uppercase shadow-lg rounded-xl hover:scale-[1.01] transition-transform tracking-widest italic" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
              {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <PlayCircle className="mr-3 h-6 w-6" />} LANCER
            </Button>
          </div>
        )}
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32 py-4 animate-fade-in">
      <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-3xl py-4 border-b-2 shadow-sm px-6 rounded-b-2xl border-primary/10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg font-mono px-3 py-1 bg-white border-2 shadow-sm rounded-lg italic font-black">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted/80 rounded-lg border-2" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-5 w-5 text-slate-800" />
            </Button>
          </div>
          <div className="text-2xl font-black text-primary bg-primary/5 border-2 border-primary/20 px-4 py-1.5 rounded-xl shadow-inner tabular-nums italic">
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" size="sm" className="font-black h-10 px-6 uppercase shadow-sm rounded-lg text-sm tracking-widest hover:scale-[1.02] transition-transform italic border-2" onClick={() => { if(confirm("Terminer ?")) finishExam(); }}>
            TERMINER
          </Button>
        </div>
        <Progress value={progress} className="h-3 rounded-full bg-slate-100 border-2 shadow-inner" />
      </div>

      <Card className="shadow-lg border-t-[8px] border-t-primary bg-white p-6 min-h-[250px] rounded-3xl overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg leading-relaxed font-black text-slate-900 tracking-tight italic">
            {q?.statement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={cn("p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 shadow-sm", isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40 bg-slate-50/50')}>
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-sm", isSelected ? 'bg-primary text-white scale-105' : 'bg-white text-primary border-2')}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className={cn("flex-1 text-sm pt-0.5 leading-relaxed", isSelected ? 'font-black text-slate-900 italic' : 'text-slate-700 font-bold')}>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-3xl border-t-2 z-[70] shadow-xl">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button variant="outline" className="flex-1 h-12 font-black text-lg rounded-xl uppercase border-2 hover:bg-slate-50 tracking-widest italic" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-3 h-6 w-6" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-12 font-black text-lg rounded-xl shadow-lg uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest italic" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="mr-3 h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
