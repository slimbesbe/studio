
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, ChevronRight, ChevronLeft, Loader2, PlayCircle, 
  Info, Pause, Flag, Calculator as CalcIcon, 
  MessageSquare, CheckCircle2, AlertTriangle, ListChecks,
  Coffee, ShieldAlert, FileQuestion
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logExamAttempts } from '@/lib/services/practice-service';
import { Calculator } from '@/components/dashboard/Calculator';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

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

const QUESTIONS_PER_PART = 60;
const TOTAL_PMP_TIME = 230 * 60; 
const BREAK_DURATION = 10 * 60; 

export default function ExamPage() {
  const { user, profile, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_PMP_TIME);
  const [initialTime, setInitialTime] = useState(TOTAL_PMP_TIME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ 
    score: number; 
    total: number; 
    domainScores: Record<string, { score: number, total: number }> 
  } | null>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isItemReviewMode, setIsItemReviewMode] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  
  const [examPart, setExamPart] = useState<1 | 2 | 3>(1);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(BREAK_DURATION);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  const [filledExams, setFilledExams] = useState<string[]>([]);
  const [isLoadingFilled, setIsLoadingFilled] = useState(true);

  useEffect(() => {
    async function checkFilledExams() {
      if (!db) return;
      try {
        const results: string[] = [];
        for (const exam of ALL_EXAMS) {
          const q = query(
            collection(db, 'questions'), 
            where('examId', '==', exam.id), 
            where('isActive', '==', true), 
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            results.push(exam.id);
          }
        }
        setFilledExams(results);
      } catch (e) {
        console.error("Error checking filled exams:", e);
      } finally {
        setIsLoadingFilled(false);
      }
    }
    checkFilledExams();
  }, [db]);

  const allowedExams = useMemo(() => {
    if (isUserLoading || isLoadingFilled) return [];
    
    let baseAllowed = ALL_EXAMS;
    if (!(isDemo || profile?.role === 'super_admin' || profile?.role === 'admin')) {
      const userAllowedIds = profile?.allowedExams || [];
      baseAllowed = ALL_EXAMS.filter(exam => userAllowedIds.includes(exam.id));
    }

    return baseAllowed.filter(exam => filledExams.includes(exam.id));
  }, [profile, isDemo, isUserLoading, filledExams, isLoadingFilled]);

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
      flags,
      comments,
      timeLeft,
      initialTime,
      questionIds: examQuestions.map(q => q.id),
      examPart,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, flags, comments, timeLeft, initialTime, examQuestions, selectedExamId, examResult, examPart]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult && !showPauseScreen && !isItemReviewMode && !isOnBreak) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft, examResult, showPauseScreen, isItemReviewMode, isOnBreak]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOnBreak && breakTimeLeft > 0) {
      timer = setInterval(() => setBreakTimeLeft((prev) => prev - 1), 1000);
    } else if (isOnBreak && breakTimeLeft === 0) {
      setIsOnBreak(false);
      setBreakTimeLeft(BREAK_DURATION);
    }
    return () => clearInterval(timer);
  }, [isOnBreak, breakTimeLeft]);

  const startExam = async (resume: boolean = false) => {
    const examToLoad = resume && savedState ? savedState.selectedExamId : selectedExamId;
    if (!examToLoad) return;
    setIsSubmitting(true);
    try {
      const qSnap = await getDocs(query(collection(db, 'questions'), where('examId', '==', examToLoad), where('isActive', '==', true)));
      let questions = qSnap.docs.map(d => ({ ...d.data(), id: d.id }));
      
      if (questions.length === 0) {
        toast({ variant: "destructive", title: "Erreur", description: "Pas de questions configurées pour cette simulation." });
        setIsSubmitting(false);
        return;
      }

      // NORMALISATION CRITIQUE : Supporte les formats Manual, Excel et Coaching
      questions = questions.map(q => {
        const options = q.options || (q.choices ? q.choices.map((c: string, i: number) => ({ id: (i + 1).toString(), text: c })) : []);
        const correctOptionIds = q.correctOptionIds || (q.correctChoice ? [String(q.correctChoice)] : []);
        return { ...q, options, correctOptionIds };
      });

      if (resume && savedState) {
        const filtered = questions.filter(q => savedState.questionIds.includes(q.id));
        setExamQuestions(filtered);
        setAnswers(savedState.answers || {});
        setFlags(savedState.flags || {});
        setComments(savedState.comments || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setTimeLeft(savedState.timeLeft || TOTAL_PMP_TIME);
        setInitialTime(savedState.initialTime || TOTAL_PMP_TIME);
        setSelectedExamId(savedState.selectedExamId);
        setExamPart(savedState.examPart || 1);
      } else {
        const pool = [...questions].sort(() => 0.5 - Math.random());
        const selected = isDemo ? pool.slice(0, 2) : pool.slice(0, 180);
        setExamQuestions(selected);
        setTimeLeft(TOTAL_PMP_TIME);
        setInitialTime(TOTAL_PMP_TIME);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setFlags({});
        setComments({});
        setExamResult(null);
        setExamPart(1);
      }
      setIsExamStarted(true);
      setShowPauseScreen(false);
      setIsItemReviewMode(false);
      setIsReviewMode(false);
      setIsOnBreak(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors du chargement" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSection = () => {
    setIsConfirmSubmitOpen(true);
  };

  const confirmSectionSubmission = async () => {
    setIsConfirmSubmitOpen(false);
    if (isDemo || examPart === 3) {
      await finishExam();
      return;
    }
    if (examPart < 3) {
      setIsOnBreak(true);
      setBreakTimeLeft(BREAK_DURATION);
      const nextPart = (examPart + 1) as 2 | 3;
      setExamPart(nextPart);
      setCurrentQuestionIndex((nextPart - 1) * QUESTIONS_PER_PART);
      setIsItemReviewMode(false);
      saveProgress((nextPart - 1) * QUESTIONS_PER_PART);
    }
  };

  const finishExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let score = 0;
      const domainScores: Record<string, { score: number, total: number }> = {
        'People': { score: 0, total: 0 },
        'Process': { score: 0, total: 0 },
        'Business': { score: 0, total: 0 }
      };
      const attemptResults: any[] = [];

      examQuestions.forEach(q => {
        const uAns = answers[q.id] || [];
        const cAns = q.correctOptionIds || [];
        const isCorrect = uAns.length === cAns.length && uAns.every(v => cAns.includes(v));
        
        const domain = q.tags?.domain || 'Process';
        if (domainScores[domain]) {
          domainScores[domain].total++;
          if (isCorrect) domainScores[domain].score++;
        }
        if (isCorrect) score++;
        
        attemptResults.push({
          questionId: q.id,
          selectedChoiceIds: uAns,
          isCorrect,
          tags: q.tags || {}
        });
      });

      const percentage = Math.round((score / examQuestions.length) * 100);
      
      if (!isDemo && user) {
        if (examStateRef) await deleteDoc(examStateRef);
        await addDoc(collection(db, 'users', user.uid, 'exam_results'), {
          examId: selectedExamId,
          score,
          total: examQuestions.length,
          percentage,
          timeSpent: initialTime - timeLeft,
          completedAt: serverTimestamp()
        });
        await logExamAttempts(db, user.uid, attemptResults);
      }
      setExamResult({ score, total: examQuestions.length, domainScores });
      setIsItemReviewMode(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFlag = (qId: string) => {
    const newFlags = { ...flags, [qId]: !flags[qId] };
    setFlags(newFlags);
    saveProgress();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isUserLoading || isStateLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  if (isOnBreak) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl bg-white border-none rounded-[40px] overflow-hidden animate-slide-up">
          <CardHeader className="text-center py-12 bg-primary/5">
            <div className="mx-auto bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
              <Coffee className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-wider uppercase italic">PAUSE OPTIONNELLE</h1>
            <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest italic">Vous avez terminé la Partie {examPart - 1}</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-8 p-12 bg-white">
            <div className="text-7xl font-black text-primary tabular-nums italic bg-slate-50 px-12 py-6 rounded-3xl border-4 border-dashed border-primary/20">
              {formatTime(breakTimeLeft)}
            </div>
            <Button size="lg" className="h-16 px-12 text-xl font-black bg-primary hover:bg-primary/90 rounded-2xl uppercase tracking-widest shadow-xl scale-105" onClick={() => setIsOnBreak(false)}>
              REPRENDRE L'EXAMEN
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPauseScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl bg-white border-none rounded-3xl overflow-hidden">
          <CardHeader className="text-center py-8 bg-muted/20">
            <h1 className="text-4xl font-black text-slate-900 tracking-wider uppercase italic">Pause</h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-8 bg-white">
            <Button className="h-14 text-xl font-black bg-primary hover:bg-primary/90 rounded-xl uppercase tracking-widest shadow-lg" onClick={() => setShowPauseScreen(false)}>
              CONTINUER
            </Button>
            <Button variant="outline" className="h-14 text-xl font-black text-primary border-primary hover:bg-primary/5 rounded-xl uppercase tracking-widest border-2" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>
              SAUVEGARDER & QUITTER
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isItemReviewMode) {
    const startIdx = isDemo ? 0 : (examPart - 1) * QUESTIONS_PER_PART;
    const endIdx = isDemo ? 2 : Math.min(examPart * QUESTIONS_PER_PART, examQuestions.length);
    const partQuestions = examQuestions.slice(startIdx, endIdx);

    return (
      <div className="max-w-6xl mx-auto py-10 space-y-8 animate-fade-in px-4">
        <div className="flex justify-between items-center bg-white p-8 rounded-[32px] shadow-xl border-2">
          <div>
            <h1 className="text-3xl font-black text-primary uppercase italic tracking-tight flex items-center gap-3">
              <ListChecks className="h-8 w-8" /> Item Review Screen
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
              {isDemo ? "MODE DÉMO" : `Partie ${examPart} : Vérifiez vos réponses.`}
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" className="h-12 px-8 font-black uppercase tracking-widest border-2 rounded-xl" onClick={() => setIsItemReviewMode(false)}>RETOUR</Button>
            <Button className="h-12 px-8 font-black uppercase tracking-widest bg-primary text-white rounded-xl shadow-lg" onClick={handleFinishSection}>
              {isDemo || examPart === 3 ? "SOUMETTRE L'EXAMEN" : `TERMINER SECTION ${examPart}`}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {partQuestions.map((q, idx) => {
            const absoluteIdx = startIdx + idx;
            const hasAnswer = answers[q.id] && answers[q.id].length > 0;
            const isFlagged = flags[q.id];
            return (
              <div 
                key={q.id} 
                onClick={() => { setCurrentQuestionIndex(absoluteIdx); setIsItemReviewMode(false); }}
                className={cn(
                  "relative p-4 h-24 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group overflow-hidden",
                  hasAnswer ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200',
                  isFlagged && 'ring-2 ring-amber-400'
                )}
              >
                {isFlagged && <div className="absolute top-1 right-1"><Flag className="h-3 w-3 fill-amber-500 text-amber-500" /></div>}
                <span className="text-xl font-black italic text-slate-800">{absoluteIdx + 1}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{hasAnswer ? 'REPONDU' : 'INCOMPLET'}</span>
              </div>
            );
          })}
        </div>

        <AlertDialog open={isConfirmSubmitOpen} onOpenChange={setIsConfirmSubmitOpen}>
          <AlertDialogContent className="bg-white rounded-[32px] p-10 border-none shadow-2xl max-w-xl z-[100]">
            <AlertDialogHeader className="space-y-4 flex flex-col items-center">
              <div className="mx-auto bg-amber-50 h-16 w-16 rounded-full flex items-center justify-center mb-2">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
              </div>
              <AlertDialogTitle className="text-2xl font-black text-center uppercase italic tracking-tight text-slate-900">
                CONFIRMATION FINALE
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg font-bold text-center text-slate-600 leading-relaxed uppercase tracking-tight">
                Êtes-vous sûr de vouloir soumettre la <span className="text-primary font-black">{isDemo ? "Simulation" : `Partie ${examPart}`}</span> ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
              <AlertDialogCancel className="h-14 flex-1 rounded-xl font-black uppercase tracking-widest border-2">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSectionSubmission} className="h-14 flex-1 rounded-xl font-black bg-primary hover:bg-primary/90 shadow-lg uppercase tracking-widest">Oui, je confirme</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            <div className="text-center space-y-4">
              <p className="text-6xl leading-none font-black text-primary tracking-tighter italic">{percentage}%</p>
              <p className="text-lg font-black text-muted-foreground uppercase tracking-widest italic">{examResult.score} / {examResult.total} POINTS</p>
              <Badge className={cn("text-lg px-6 py-2 rounded-xl", appreciation.color)}>{appreciation.label}</Badge>
            </div>

            <div className="mt-12 space-y-6 pt-8 border-t">
              <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">Performance par Domaine :</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['People', 'Process', 'Business'].map(domainKey => {
                  const dStats = examResult.domainScores[domainKey] || { score: 0, total: 0 };
                  const dPercent = dStats.total > 0 ? Math.round((dStats.score / dStats.total) * 100) : 0;
                  return (
                    <div key={domainKey} className="bg-slate-50 p-6 rounded-2xl text-center border-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{domainKey}</p>
                      <p className="text-3xl font-black italic text-primary">{dPercent}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 border-t bg-muted/10">
            <Button variant="outline" className="flex-1 font-black h-12 rounded-2xl border-2 uppercase tracking-widest" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-black h-12 rounded-2xl bg-primary text-white shadow-xl uppercase tracking-widest" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); setIsReviewMode(false); }}>RETOUR DASHBOARD</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-8 px-4">
        <div className="text-center space-y-1">
          <h1 className="text-3xl leading-none font-black text-primary uppercase italic tracking-tighter">Simulateur PMP®</h1>
          <p className="text-lg text-slate-500 font-black uppercase tracking-widest italic">Simulations Complètes (Remplies uniquement)</p>
        </div>
        
        {isLoadingFilled ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-black uppercase italic text-slate-400 text-xs tracking-widest">Analyse de la banque de questions...</p>
          </div>
        ) : allowedExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white rounded-[40px] shadow-inner border-4 border-dashed border-slate-100">
            <FileQuestion className="h-16 w-16 text-slate-300" />
            <h2 className="text-2xl font-black text-slate-400 italic uppercase">Aucune simulation prête</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-md">
              Les simulations s'afficheront ici dès qu'elles seront alimentées en questions dans la banque d'administration.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allowedExams.map(exam => (
              <Card key={exam.id} className={cn("cursor-pointer border-t-4 transition-all hover:scale-[1.01] hover:shadow-md rounded-2xl overflow-hidden", selectedExamId === exam.id ? 'border-t-primary bg-primary/5 ring-2 ring-primary/10 shadow-md' : 'border-t-muted shadow-sm')} onClick={() => setSelectedExamId(exam.id)}>
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-black uppercase tracking-tight italic">Examen {exam.num}</CardTitle>
                  <p className="text-slate-600 font-bold leading-relaxed text-xs uppercase tracking-tight italic">180 Questions • 230 Minutes</p>
                </CardHeader>
                <CardFooter className="p-6 pt-0">
                  <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full h-10 font-black text-xs rounded-lg uppercase tracking-widest bg-primary text-white">
                    {selectedExamId === exam.id ? "SÉLECTIONNÉ" : "SÉLECTIONNER"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {allowedExams.length > 0 && (
          <div className="flex flex-col gap-4 items-center pt-6">
            {savedState && (
              <Button variant="outline" className="w-full max-w-lg h-12 border-2 border-primary text-primary font-black text-lg rounded-xl hover:bg-primary/5 shadow-md uppercase tracking-widest italic" onClick={() => startExam(true)}>
                REPRENDRE LA SESSION EN COURS
              </Button>
            )}
            <Button size="lg" className="w-full max-w-lg h-14 text-2xl font-black bg-primary text-white uppercase shadow-lg rounded-xl hover:scale-[1.01] transition-transform tracking-widest italic" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
              {isSubmitting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <PlayCircle className="mr-3 h-6 w-6" />} LANCER LA SIMULATION
            </Button>
          </div>
        )}
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  const isFlagged = flags[q?.id];

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-32 py-4 px-4 animate-fade-in">
      <div className="sticky top-0 z-[60] bg-background/95 backdrop-blur-3xl py-4 border-b-2 shadow-sm px-6 rounded-b-2xl border-primary/10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg font-mono px-3 py-1 bg-white border-2 shadow-sm rounded-lg italic font-black">
              Q-{currentQuestionIndex + 1} / {examQuestions.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted/80 rounded-lg border-2" onClick={() => setShowPauseScreen(true)}>
              <Pause className="h-5 w-5 text-slate-800" />
            </Button>
            <Button variant={isFlagged ? "default" : "outline"} size="icon" className={cn("h-10 w-10 rounded-lg border-2", isFlagged ? "bg-amber-500 hover:bg-amber-600 border-amber-600" : "")} onClick={() => toggleFlag(q.id)}>
              <Flag className={cn("h-5 w-5", isFlagged ? "fill-white" : "")} />
            </Button>
            <Button variant="outline" size="icon" className={cn("h-10 w-10 rounded-lg border-2", isCalcOpen ? "bg-primary text-white" : "")} onClick={() => setIsCalcOpen(!isCalcOpen)}>
              <CalcIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-black text-primary bg-primary/5 border-2 border-primary/20 px-4 py-1.5 rounded-xl italic">
              {formatTime(timeLeft)}
            </div>
          </div>
          <Button variant="destructive" size="sm" className="font-black h-10 px-6 uppercase shadow-sm rounded-lg text-sm italic border-2" onClick={() => setIsItemReviewMode(true)}>
            REVIEW SECTION
          </Button>
        </div>
        <Progress value={progress} className="h-3 rounded-full bg-slate-100 border-2" />
      </div>

      <div className="lg:col-span-3 space-y-6">
        <Card className="shadow-lg border-t-[8px] border-t-primary bg-white p-6 min-h-[300px] rounded-3xl overflow-hidden relative">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl leading-relaxed font-black text-slate-900 tracking-tight italic">
              {q?.statement || q?.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {q?.options?.map((opt: any, idx: number) => {
                const isSelected = answers[q.id]?.includes(opt.id);
                const isMulti = q.isMultipleCorrect;
                return (
                  <div key={opt.id} onClick={() => {
                    const current = answers[q.id] || [];
                    const newAns = isMulti ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                    const updated = { ...answers, [q.id]: newAns };
                    setAnswers(updated);
                    saveProgress(undefined, updated);
                  }} className={cn(
                    "p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-5 shadow-sm group", 
                    isSelected ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'border-slate-100 hover:border-primary/40 bg-slate-50/30'
                  )}>
                    <div className={cn(
                      "h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 shadow-sm transition-all border-2",
                      isMulti ? "rounded-lg" : "rounded-full",
                      isSelected ? 'bg-primary text-white scale-110 border-primary' : 'bg-white text-primary border-slate-300 group-hover:border-primary/50'
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={cn("flex-1 text-base pt-0.5 leading-relaxed", isSelected ? 'font-black text-slate-900 italic' : 'text-slate-700 font-bold')}>
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-2 border-dashed bg-slate-50/50 p-6">
          <div className="flex items-center gap-3 text-slate-500 mb-4 font-black uppercase text-xs tracking-widest italic">
            <MessageSquare className="h-4 w-4" /> Notes & Commentaires
          </div>
          <Textarea 
            placeholder="Prenez des notes sur cette question..." 
            className="bg-white rounded-xl h-24 border-2 focus:ring-primary font-bold italic"
            value={comments[q?.id] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setComments({...comments, [q?.id]: val});
            }}
          />
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-3xl border-t-2 z-[70] shadow-xl">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button 
            variant="outline" 
            className="flex-1 h-14 font-black text-lg rounded-xl uppercase border-2 hover:bg-slate-50 tracking-widest italic" 
            onClick={() => { 
              const i = Math.max(0, currentQuestionIndex - 1); 
              setCurrentQuestionIndex(i); 
              saveProgress(i); 
            }} 
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-3 h-6 w-6" /> PRÉCÉDENT
          </Button>
          <Button 
            className="flex-1 h-14 font-black text-lg rounded-xl shadow-lg uppercase bg-primary text-white hover:scale-[1.01] transition-transform tracking-widest italic" 
            onClick={() => {
              if (currentQuestionIndex < examQuestions.length - 1) {
                const nextIdx = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIdx);
                saveProgress(nextIdx);
              } else {
                setIsItemReviewMode(true);
              }
            }}
          >
            {currentQuestionIndex === examQuestions.length - 1 ? "REVIEW SECTION" : "SUIVANT"} <ChevronRight className="mr-3 h-6 w-6" />
          </Button>
        </div>
      </div>

      {isCalcOpen && <Calculator onClose={() => setIsCalcOpen(false)} />}
    </div>
  );
}
