
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  PlayCircle,
  Info,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EXAMS = [
  { id: 'exam1', title: 'Examen 1', desc: 'Simulation complète - Module 1' },
  { id: 'exam2', title: 'Examen 2', desc: 'Simulation complète - Module 2' },
  { id: 'exam3', title: 'Examen 3', desc: 'Simulation complète - Module 3' },
  { id: 'exam4', title: 'Examen 4', desc: 'Simulation complète - Module 4' },
  { id: 'exam5', title: 'Examen 5', desc: 'Simulation complète - Module 5' },
];

const PERFORMANCE_ZONES = [
  { label: "Needs Improvement", color: "bg-red-500", range: [0, 50] },
  { label: "Below Target", color: "bg-amber-400", range: [50, 65] },
  { label: "Target", color: "bg-emerald-400", range: [65, 80] },
  { label: "Above Target", color: "bg-teal-600", range: [80, 100] },
];

export default function ExamPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [isPauseScreenDismissed, setIsPauseScreenDismissed] = useState(false);

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
      timeLeft: timeLeft,
      questionIds: sessionQuestionIds,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, timeLeft, sessionQuestionIds, selectedExamId, examResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isExamStarted && !examResult) {
      handleFinishExam();
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft, examResult]);

  const startExam = async (resume: boolean = false) => {
    const examToLoad = resume && savedState ? savedState.selectedExamId : selectedExamId;
    if (!examToLoad) return;

    setIsSubmitting(true);
    try {
      const qSnap = await getDocs(query(collection(db, 'exams', examToLoad, 'questions'), where('isActive', '==', true)));
      const questions = qSnap.docs.map(d => ({ ...d.data(), id: d.id }));

      if (questions.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucune question dans cet examen." });
        setIsSubmitting(false);
        return;
      }

      if (resume && savedState) {
        setExamQuestions(questions.filter(q => savedState.questionIds.includes(q.id)));
        setSessionQuestionIds(savedState.questionIds || []);
        setAnswers(savedState.answers || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setTimeLeft(savedState.timeLeft || 0);
        setSelectedExamId(savedState.selectedExamId);
      } else {
        const pool = [...questions].sort(() => 0.5 - Math.random());
        const selected = pool.slice(0, isDemo ? 10 : 180);
        const ids = selected.map(q => q.id);
        
        setExamQuestions(selected);
        setSessionQuestionIds(ids);
        setTimeLeft(ids.length * 120);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setExamResult(null);
        
        if (!isDemo && examStateRef) {
          await setDoc(examStateRef, {
            selectedExamId: examToLoad,
            questionIds: ids,
            currentQuestionIndex: 0,
            answers: {},
            timeLeft: ids.length * 120,
            updatedAt: serverTimestamp()
          });
        }
      }
      setIsExamStarted(true);
      setIsReviewMode(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger l'examen." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishExam = async () => {
    if (examQuestions.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      let score = 0;
      examQuestions.forEach(q => {
        const userAns = answers[q.id] || [];
        const correctAns = q.correctOptionIds || [];
        if (userAns.length === correctAns.length && userAns.every(val => correctAns.includes(val))) {
          score++;
        }
      });

      setExamResult({ score, total: examQuestions.length });

      if (!isDemo && examStateRef) {
        await deleteDoc(examStateRef);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelExam = async () => {
    if (isDemo || !examStateRef) return;
    try {
      await deleteDoc(examStateRef);
      setIsPauseScreenDismissed(false);
      setIsExamStarted(false);
      setExamResult(null);
      toast({ title: "Session annulée" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isUserLoading || isStateLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (savedState && !isExamStarted && !isPauseScreenDismissed && !examResult) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-2xl shadow-2xl border-none">
          <CardHeader className="text-center pt-12 pb-8">
            <h1 className="text-6xl font-light text-slate-800 mb-8 uppercase tracking-widest">Pause</h1>
            <p className="text-xl text-slate-600">Session active détectée.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-12 pb-16">
            <Button className="w-full h-14 text-lg font-bold bg-[#635BFF] hover:bg-[#5249e0] uppercase tracking-widest" onClick={() => startExam(true)}>CONTINUER</Button>
            <Button variant="outline" className="w-full h-14 text-lg font-bold text-[#635BFF] uppercase tracking-widest" onClick={() => setIsPauseScreenDismissed(true)}>ARRETER ET SAUVEGARDER</Button>
            <Button variant="outline" className="w-full h-14 text-lg font-bold text-[#635BFF] uppercase tracking-widest" onClick={handleCancelExam}>ARRETER ET ANNULER</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const currentZoneIndex = PERFORMANCE_ZONES.findIndex(z => percentage >= z.range[0] && percentage < z.range[1]) === -1 
      ? (percentage >= 100 ? 3 : 0) 
      : PERFORMANCE_ZONES.findIndex(z => percentage >= z.range[0] && percentage < z.range[1]);
    
    const appreciation = PERFORMANCE_ZONES[currentZoneIndex];
    const markerPosition = 12.5 + (currentZoneIndex * 25);

    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8 animate-fade-in">
        <Card className="shadow-2xl overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-xl">Simulation d'Examen - Résultats</CardTitle>
          </CardHeader>
          <CardContent className="py-24">
            <div className="relative w-full max-w-3xl mx-auto">
              <div className="flex w-full text-[12px] font-bold text-slate-500 uppercase mb-4 px-1">
                 <div className="w-1/2 text-center">Falling</div>
                 <div className="w-1/2 text-center relative border-l border-sky-300">Passing</div>
              </div>

              <div className="relative flex w-full h-14 rounded-lg overflow-hidden border shadow-inner">
                {PERFORMANCE_ZONES.map((zone, i) => (
                  <div key={zone.label} className={`w-1/4 h-full border-r last:border-r-0 flex items-center justify-center ${zone.color} ${i === currentZoneIndex ? 'opacity-100' : 'opacity-20'}`}>
                    <span className="text-[9px] font-black text-white uppercase text-center leading-tight px-1 select-none">
                      {zone.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="absolute top-[-50px] transition-all duration-1000 flex flex-col items-center z-20" style={{ left: `${markerPosition}%`, transform: 'translateX(-50%)' }}>
                <span className="text-[12px] font-black text-black mb-1">YOU</span>
                <div className="w-[2px] h-4 bg-black" />
                <div className="w-[2px] h-4 bg-black mt-[62px]" />
                <span className="text-[14px] font-black text-[#006699] whitespace-nowrap mt-1 uppercase">
                  {appreciation.label}
                </span>
              </div>
            </div>

            <div className="text-center space-y-4 pt-20">
               <p className="text-6xl font-black text-primary tracking-tighter">{percentage}%</p>
               <p className="text-lg font-medium text-muted-foreground">{examResult.score} / {examResult.total} points</p>
               <div className="max-w-xl mx-auto p-6 bg-muted/30 rounded-2xl border border-dashed mt-10">
                 <p className="text-[11px] font-medium text-muted-foreground italic leading-relaxed">
                   « Les pourcentages affichés sont des estimations pédagogiques. Le PMI ne communique pas de score chiffré officiel. »
                 </p>
               </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 bg-muted/20 border-t">
            <Button variant="outline" className="flex-1 font-bold h-14 text-lg" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-bold h-14 text-lg" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>TERMINER</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isReviewMode) {
    const q = examQuestions[currentQuestionIndex];
    const userAns = answers[q.id] || [];
    const isCorrect = userAns.length === q.correctOptionIds.length && userAns.every(v => q.correctOptionIds.includes(v));
    
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)}><ChevronLeft className="mr-2" /> Retour</Button>
        <Card className={`border-t-8 ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500 shadow-xl'}`}>
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
               <Badge variant={isCorrect ? "default" : "destructive"}>{isCorrect ? "CORRECT" : "INCORRECT"}</Badge>
               <span className="text-xs font-mono font-bold text-muted-foreground">QUESTION {currentQuestionIndex + 1} / {examQuestions.length}</span>
            </div>
            <CardTitle className="text-2xl leading-relaxed">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = userAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-5 rounded-2xl border-2 flex items-center gap-5 ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isCorrectOpt ? 'bg-emerald-500 text-white' : 'bg-muted text-slate-600'}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1 text-base">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-8 bg-primary/5 rounded-2xl border-l-8 border-l-primary mt-8">
              <h4 className="font-bold flex items-center gap-2 mb-4"><Info className="h-5 w-5" /> Mindset PMI</h4>
              <p className="text-base whitespace-pre-wrap">{q.explanation || "Non disponible."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.min(examQuestions.length - 1, prev + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-primary italic uppercase">Simulateur d'Examen PMP®</h1>
          <p className="text-xl text-muted-foreground">Choisissez une simulation pour commencer votre entraînement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXAMS.map(exam => (
            <Card key={exam.id} className={`group hover:shadow-2xl transition-all cursor-pointer border-t-8 ${selectedExamId === exam.id ? 'border-t-primary bg-primary/5' : 'border-t-muted'}`} onClick={() => setSelectedExamId(exam.id)}>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{exam.title}</CardTitle>
                <CardDescription className="text-base mt-2">{exam.desc}</CardDescription>
              </CardHeader>
              <CardFooter><Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full h-12 font-bold uppercase">SÉLECTIONNER</Button></CardFooter>
            </Card>
          ))}
        </div>

        <div className="pt-10 flex justify-center">
          <Button size="lg" className="w-full max-w-2xl h-20 text-2xl font-black shadow-2xl uppercase tracking-widest" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <PlayCircle className="mr-3 h-8 w-8" />}
            DÉMARRER LA SIMULATION
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-fade-in py-6">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-6 border-b-2 px-4 space-y-6">
        <div className="flex justify-between items-center">
           <Badge variant="outline" className="text-xl font-mono px-6 py-2 rounded-xl">QUESTION {currentQuestionIndex + 1} / {examQuestions.length}</Badge>
           <div className="flex items-center gap-3 font-black text-2xl text-primary bg-primary/5 px-6 py-2 rounded-2xl border border-primary/20"><Clock className="h-7 w-7" /> {formatTime(timeLeft)}</div>
           <Button variant="destructive" size="lg" className="font-black h-12 px-10 uppercase tracking-widest" onClick={() => { if (confirm("Soumettre l'examen ?")) handleFinishExam(); }}>SOUMETTRE</Button>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      <Card className="shadow-2xl border-t-8 border-t-primary animate-slide-up bg-white p-8">
        <CardHeader className="pb-10 pt-10">
          <CardTitle className="text-2xl leading-snug font-bold text-slate-800">{q.statement}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5">
            {q.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  let newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updatedAnswers = { ...answers, [q.id]: newAns };
                  setAnswers(updatedAnswers);
                  saveProgress(undefined, updatedAnswers);
                }} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex items-start gap-5 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/30'}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>{String.fromCharCode(65 + idx)}</div>
                  <div className="flex-1 text-lg pt-1 text-slate-700">{opt.text}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-xl border-t-2 z-40">
        <div className="max-w-4xl mx-auto flex justify-between gap-6">
          <Button variant="outline" className="flex-1 h-16 font-black text-xl rounded-2xl uppercase" onClick={() => { const newIndex = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(newIndex); saveProgress(newIndex); }} disabled={currentQuestionIndex === 0}><ChevronLeft className="mr-2" /> PRÉCÉDENT</Button>
          <Button className="flex-1 h-16 font-black text-xl rounded-2xl shadow-2xl uppercase" onClick={() => { const newIndex = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(newIndex); saveProgress(newIndex); }} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT <ChevronRight className="ml-2" /></Button>
        </div>
      </div>
    </div>
  );
}
