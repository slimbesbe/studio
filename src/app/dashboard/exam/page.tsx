
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Loader2,
  PlayCircle,
  Info,
  Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PERFORMANCE_ZONES = [
  { label: "Needs Improvement", color: "bg-[#F44336]", range: [0, 50] },
  { label: "Below Target", color: "bg-[#FFC107]", range: [50, 65] },
  { label: "Target", color: "bg-[#4CAF50]", range: [65, 80] },
  { label: "Above Target", color: "bg-[#009688]", range: [80, 101] },
];

const EXAMS = [
  { id: 'exam1', title: 'Examen 1', desc: 'Simulation complète - 180 questions' },
  { id: 'exam2', title: 'Examen 2', desc: 'Simulation complète - 180 questions' },
  { id: 'exam3', title: 'Examen 3', desc: 'Simulation complète - 180 questions' },
  { id: 'exam4', title: 'Examen 4', desc: 'Simulation complète - 180 questions' },
  { id: 'exam5', title: 'Examen 5', desc: 'Simulation complète - 180 questions' },
];

export default function ExamPage() {
  const { user, profile, isUserLoading } = useUser();
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
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [showPauseScreen, setShowPauseScreen] = useState(false);

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
      initialTime: initialTime,
      questionIds: sessionQuestionIds,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, timeLeft, initialTime, sessionQuestionIds, selectedExamId, examResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult && !showPauseScreen) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
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
        toast({ variant: "destructive", title: "Erreur", description: "Aucune question disponible." });
        setIsSubmitting(false);
        return;
      }

      if (resume && savedState) {
        const filteredQuestions = questions.filter(q => savedState.questionIds.includes(q.id));
        setExamQuestions(filteredQuestions);
        setAnswers(savedState.answers || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setTimeLeft(savedState.timeLeft || 0);
        setInitialTime(savedState.initialTime || 0);
        setSelectedExamId(savedState.selectedExamId);
      } else {
        const pool = [...questions].sort(() => 0.5 - Math.random());
        const selected = pool.slice(0, isDemo ? 10 : 180);
        const ids = selected.map(q => q.id);
        const totalDuration = ids.length * 72; 
        
        setExamQuestions(selected);
        setSessionQuestionIds(ids);
        setTimeLeft(totalDuration);
        setInitialTime(totalDuration);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setExamResult(null);
      }
      setIsExamStarted(true);
      setShowPauseScreen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de chargement." });
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

      const percentage = Math.round((score / examQuestions.length) * 100);
      const timeSpent = initialTime - timeLeft;

      setExamResult({ score, total: examQuestions.length });

      if (!isDemo && user) {
        const userDocRef = doc(db, 'users', user.uid);
        const resultsColRef = collection(db, 'users', user.uid, 'exam_results');

        const currentSimsCount = profile?.simulationsCount || 0;
        const currentTotalScore = profile?.totalScore || 0;
        const newSimsCount = currentSimsCount + 1;
        const newTotalScore = currentTotalScore + percentage;
        const newAvgScore = Math.round(newTotalScore / newSimsCount);

        await setDoc(userDocRef, {
          simulationsCount: newSimsCount,
          totalScore: newTotalScore,
          averageScore: newAvgScore,
          totalTimeSpent: increment(timeSpent),
          updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(resultsColRef, {
          examId: selectedExamId,
          score,
          total: examQuestions.length,
          percentage,
          timeSpent,
          completedAt: serverTimestamp()
        });

        if (examStateRef) await deleteDoc(examStateRef);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelExam = async () => {
    if (isDemo || !examStateRef) {
      setIsExamStarted(false);
      return;
    }
    try {
      await deleteDoc(examStateRef);
      setIsExamStarted(false);
      setExamResult(null);
      setSelectedExamId(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur." });
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

  // Pause Screen
  if (showPauseScreen) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
        <Card className="w-full max-w-2xl shadow-2xl border-none bg-white overflow-hidden">
          <CardHeader className="text-center pt-16 pb-12 bg-muted/10">
            <h1 className="text-7xl font-light text-slate-800 tracking-[0.2em] uppercase">Pause</h1>
            <p className="text-xl text-slate-500 mt-4">Simulation suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-16 py-16">
            <Button 
              className="w-full h-16 text-xl font-bold bg-[#635BFF] hover:bg-[#5249e0] uppercase tracking-widest rounded-md" 
              onClick={() => setShowPauseScreen(false)}
            >
              CONTINUER
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-16 text-xl font-bold text-[#635BFF] border-[#635BFF] hover:bg-[#635BFF]/5 uppercase tracking-widest rounded-md" 
              onClick={() => { saveProgress(); setIsExamStarted(false); }}
            >
              ARRETER ET SAUVEGARDER
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-16 text-xl font-bold text-red-500 border-red-500 hover:bg-red-50 uppercase tracking-widest rounded-md" 
              onClick={handleCancelExam}
            >
              ARRETER ET ANNULER
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const currentZoneIndex = PERFORMANCE_ZONES.findIndex(z => percentage >= z.range[0] && percentage < z.range[1]);
    const appreciation = PERFORMANCE_ZONES[currentZoneIndex === -1 ? 0 : currentZoneIndex];
    const markerPosition = percentage; // Use raw percentage for positioning

    return (
      <div className="max-w-4xl mx-auto py-12 space-y-8 animate-fade-in">
        <Card className="shadow-2xl overflow-hidden border-none bg-white">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-center font-bold">Rapport de Performance PMP®</CardTitle>
          </CardHeader>
          <CardContent className="py-24">
            <div className="relative w-full max-w-3xl mx-auto px-4">
              <div className="flex w-full text-[12px] font-black text-slate-400 uppercase mb-4 tracking-widest">
                 <div className="w-[65%] text-center">Falling</div>
                 <div className="w-[35%] text-center relative border-l-2 border-slate-200">Passing</div>
              </div>

              <div className="relative flex w-full h-20 rounded-lg overflow-hidden border shadow-inner bg-slate-100">
                <div className="w-[50%] h-full bg-[#F44336] border-r flex items-center justify-center">
                   <span className="text-[10px] font-black text-white uppercase text-center px-1 leading-tight select-none">Needs Improvement</span>
                </div>
                <div className="w-[15%] h-full bg-[#FFC107] border-r flex items-center justify-center">
                   <span className="text-[10px] font-black text-white uppercase text-center px-1 leading-tight select-none">Below Target</span>
                </div>
                <div className="w-[15%] h-full bg-[#4CAF50] border-r flex items-center justify-center">
                   <span className="text-[10px] font-black text-white uppercase text-center px-1 leading-tight select-none">Target</span>
                </div>
                <div className="w-[20%] h-full bg-[#009688] flex items-center justify-center">
                   <span className="text-[10px] font-black text-white uppercase text-center px-1 leading-tight select-none">Above Target</span>
                </div>
              </div>

              <div className="absolute top-[-40px] transition-all duration-1000 flex flex-col items-center z-20" style={{ left: `${markerPosition}%`, transform: 'translateX(-50%)' }}>
                <span className="text-[14px] font-black text-black mb-1">YOU</span>
                <div className="w-[4px] h-6 bg-black" />
                <div className="h-20" />
                <div className="w-[4px] h-6 bg-black" />
                <span className="text-[18px] font-black text-[#006699] whitespace-nowrap mt-2 uppercase tracking-tight">
                  {appreciation.label}
                </span>
              </div>
            </div>

            <div className="text-center space-y-4 pt-24">
               <p className="text-7xl font-black text-primary tracking-tighter">{percentage}%</p>
               <p className="text-xl font-bold text-muted-foreground">{examResult.score} / {examResult.total} points obtenus</p>
               <div className="max-w-2xl mx-auto p-6 bg-muted/20 rounded-2xl border border-dashed mt-12 text-[12px] font-medium text-muted-foreground italic leading-relaxed">
                 « Ce simulateur utilise une estimation pédagogique basée sur le barème standard du PMI. Seul le rapport officiel du PMI fait foi pour l'obtention de la certification. »
               </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 bg-muted/10 border-t">
            <Button variant="outline" className="flex-1 font-bold h-14 text-lg" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-bold h-14 text-lg bg-primary text-white" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>QUITTER LE RAPPORT</Button>
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
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in py-10">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-bold text-primary"><ChevronLeft className="mr-2" /> Retour au menu</Button>
        <Card className={`border-t-8 bg-white ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500 shadow-xl'}`}>
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
               <Badge variant={isCorrect ? "default" : "destructive"}>{isCorrect ? "POINT OBTENU" : "ZÉRO POINT"}</Badge>
               <span className="text-xs font-mono font-black text-muted-foreground">Q-{currentQuestionIndex + 1} / {examQuestions.length}</span>
            </div>
            <CardTitle className="text-2xl leading-relaxed">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = userAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-5 rounded-2xl border-2 flex items-center gap-5 transition-colors ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${isCorrectOpt ? 'bg-emerald-500 text-white' : 'bg-muted text-slate-600'}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1 text-base font-medium">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-8 bg-primary/5 rounded-2xl border-l-8 border-l-primary mt-10">
              <h4 className="font-bold flex items-center gap-2 mb-4 text-primary"><Info className="h-5 w-5" /> JUSTIFICATION MINDSET PMI</h4>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{q.explanation || "L'explication n'est pas disponible pour cette question."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-8 border-t">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.min(examQuestions.length - 1, prev + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 py-12 animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black text-primary italic uppercase tracking-tighter">Simulateur PMP®</h1>
          <p className="text-xl text-muted-foreground">Préparez-vous dans les conditions réelles de l'examen.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {EXAMS.map(exam => (
            <Card 
              key={exam.id} 
              className={`group hover:shadow-2xl transition-all cursor-pointer border-t-8 bg-white flex flex-col ${selectedExamId === exam.id ? 'border-t-primary bg-primary/5 shadow-xl' : 'border-t-muted'}`} 
              onClick={() => setSelectedExamId(exam.id)}
            >
              <CardHeader className="flex-1">
                <CardTitle className="text-2xl font-bold">{exam.title}</CardTitle>
                <CardDescription className="text-base mt-4 leading-relaxed">{exam.desc}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-6">
                <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full h-12 font-black uppercase tracking-widest">
                  SÉLECTIONNER
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {savedState && (
          <div className="max-w-2xl mx-auto">
            <Button 
              variant="outline" 
              className="w-full h-20 border-2 border-primary text-primary font-black text-xl rounded-2xl flex flex-col gap-1 py-10"
              onClick={() => startExam(true)}
            >
              <span className="flex items-center gap-2"><Clock className="h-5 w-5" /> REPRENDRE LA SESSION EN COURS</span>
              <span className="text-xs font-medium opacity-70 italic">Sauvegardé le {formatDate(savedState.updatedAt)}</span>
            </Button>
          </div>
        )}

        <div className="pt-8 flex justify-center">
          <Button 
            size="lg" 
            className="w-full max-w-2xl h-24 text-3xl font-black shadow-2xl uppercase tracking-[0.1em] bg-primary text-white hover:scale-105 transition-transform" 
            disabled={!selectedExamId || isSubmitting} 
            onClick={() => startExam(false)}
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-4 h-10 w-10" /> : <PlayCircle className="mr-4 h-10 w-10" />}
            LANCER LA SIMULATION
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 py-10">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-6 border-b-2 px-6 flex flex-col gap-6">
        <div className="flex justify-between items-center gap-4">
           <div className="flex items-center gap-3">
             <Badge variant="outline" className="text-2xl font-mono px-6 py-2 rounded-xl bg-white">Q-{currentQuestionIndex + 1} / {examQuestions.length}</Badge>
             <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground hover:bg-muted" onClick={() => setShowPauseScreen(true)}>
               <Pause className="h-6 w-6" />
             </Button>
           </div>
           
           <div className="flex items-center gap-4 font-black text-2xl text-primary bg-primary/5 px-8 py-2 rounded-2xl border border-primary/20 shadow-sm">
             <Clock className="h-8 w-8" /> {formatTime(timeLeft)}
           </div>
           
           <Button variant="destructive" size="lg" className="font-black h-12 px-12 uppercase tracking-widest shadow-lg text-white" onClick={() => { if (confirm("Soumettre l'examen maintenant ?")) handleFinishExam(); }}>
             SOUMETTRE
           </Button>
        </div>
        <Progress value={progress} className="h-4 rounded-full" />
      </div>

      <Card className="shadow-2xl border-t-8 border-t-primary animate-slide-up bg-white p-10 min-h-[400px]">
        <CardHeader className="pb-12 pt-6">
          <CardTitle className="text-2xl leading-relaxed font-bold text-slate-800">{q.statement}</CardTitle>
          {q.isMultipleCorrect && (
            <Badge variant="secondary" className="w-fit mt-4 text-xs font-black bg-accent/10 text-accent">CHOIX MULTIPLES</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6">
            {q.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  let newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updatedAnswers = { ...answers, [q.id]: newAns };
                  setAnswers(updatedAnswers);
                  saveProgress(undefined, updatedAnswers);
                }} className={`p-7 rounded-3xl border-2 cursor-pointer transition-all flex items-start gap-6 group ${isSelected ? 'border-primary bg-primary/5 shadow-inner ring-1 ring-primary/20' : 'border-muted hover:border-primary/30'}`}>
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-primary group-hover:bg-primary/10'}`}>{String.fromCharCode(65 + idx)}</div>
                  <div className={`flex-1 text-xl pt-1 transition-colors ${isSelected ? 'font-bold text-slate-900' : 'text-slate-600'}`}>{opt.text}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-10 bg-white/95 backdrop-blur-xl border-t-2 z-40 shadow-2xl">
        <div className="max-w-4xl mx-auto flex justify-between gap-8">
          <Button variant="outline" className="flex-1 h-16 font-black text-xl rounded-2xl uppercase border-2 hover:bg-muted" onClick={() => { const newIndex = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(newIndex); saveProgress(newIndex); }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-3" /> PRÉCÉDENT
          </Button>
          <Button className="flex-1 h-16 font-black text-xl rounded-2xl shadow-xl uppercase bg-primary text-white hover:scale-105 transition-transform" onClick={() => { const newIndex = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(newIndex); saveProgress(newIndex); }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            SUIVANT <ChevronRight className="ml-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatDate(ts: any) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
