
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  Send, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  PlayCircle,
  History as HistoryIcon,
  BookOpen,
  XCircle,
  Info,
  Check
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const EXAMS = [
  { id: 'exam1', title: 'Examen 1', desc: 'Simulation complète - Module 1' },
  { id: 'exam2', title: 'Examen 2', desc: 'Simulation complète - Module 2' },
  { id: 'exam3', title: 'Examen 3', desc: 'Simulation complète - Module 3' },
  { id: 'exam4', title: 'Examen 4', desc: 'Simulation complète - Module 4' },
  { id: 'exam5', title: 'Examen 5', desc: 'Simulation complète - Module 5' },
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

  // State persistence ref
  const examStateRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(db, 'users', user.uid, 'exam_state', 'current') : null;
  }, [db, user]);

  const { data: savedState, isLoading: isStateLoading } = useDoc(examStateRef);

  // Sync state to Firestore on change
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

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          return newTime;
        });
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
        // Suppression asynchrone sans bloquer l'UI
        deleteDoc(examStateRef).catch(err => console.error("Erreur suppression état:", err));
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue lors de la soumission." });
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

  if (isUserLoading || isStateLoading) {
    return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const getAppreciation = (pct: number) => {
      if (pct < 50) return { label: "NEEDS IMPROVEMENT", index: 0, color: "bg-red-500" };
      if (pct < 65) return { label: "BELOW TARGET", index: 1, color: "bg-amber-400" };
      if (pct < 80) return { label: "TARGET", index: 2, color: "bg-emerald-400" };
      return { label: "ABOVE TARGET", index: 3, color: "bg-teal-600" };
    };
    const app = getAppreciation(percentage);

    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8 animate-fade-in">
        <Card className="shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle>Résultat Simulation - {EXAMS.find(e => e.id === selectedExamId)?.title}</CardTitle>
          </CardHeader>
          <CardContent className="py-10 space-y-12">
            <div className="relative mt-8 mb-16 w-full max-w-2xl mx-auto">
              <div className="flex w-full h-10 border rounded-sm overflow-hidden bg-muted/20">
                {[0, 1, 2, 3].map(idx => (
                  <div key={idx} className={`w-1/4 border-r last:border-0 ${app.index === idx ? app.color : 'opacity-20'}`} />
                ))}
              </div>
              <div className="absolute top-[-30px] w-full flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span>Needs Imp.</span>
                <span>Below Target</span>
                <span>Target</span>
                <span>Above Target</span>
              </div>
              <div className="absolute bottom-[-25px] w-full flex justify-center">
                 <Badge variant="outline" className="font-bold text-primary uppercase">{app.label}</Badge>
              </div>
            </div>

            <div className="text-center space-y-4">
               <p className="text-5xl font-black text-primary">{percentage}%</p>
               <p className="text-muted-foreground">{examResult.score} / {examResult.total} questions correctes</p>
               <p className="text-[10px] italic text-muted-foreground mt-6">
                 « Les pourcentages affichés sont des estimations pédagogiques. Le PMI ne communique pas de score chiffré officiel. »
               </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-6 bg-muted/20">
            <Button variant="outline" className="flex-1" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>
              EXPLICATIONS
            </Button>
            <Button className="flex-1" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>
              TERMINER
            </Button>
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
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)}><ChevronLeft /> Retour aux résultats</Button>
        <Card className={`border-t-4 ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500'}`}>
          <CardHeader>
            <div className="flex justify-between mb-2">
               <Badge variant={isCorrect ? "default" : "destructive"}>{isCorrect ? "Correct" : "Incorrect"}</Badge>
               <span className="text-xs font-mono">{currentQuestionIndex + 1} / {examQuestions.length}</span>
            </div>
            <CardTitle className="text-xl">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = userAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50' : isSelected ? 'border-red-500 bg-red-50' : 'border-muted'}`}>
                    <div className="font-bold">{String.fromCharCode(65 + idx)}.</div>
                    <div className="flex-1">{opt.text}</div>
                    {isCorrectOpt && <CheckCircle2 className="text-emerald-500" />}
                  </div>
                );
              })}
            </div>
            <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-l-primary">
              <h4 className="font-bold mb-2 flex items-center gap-2"><Info className="h-4 w-4" /> Explication</h4>
              <p className="text-sm">{q.explanation || "Pas d'explication."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0}>Précédent</Button>
            <Button onClick={() => setCurrentQuestionIndex(prev => Math.min(examQuestions.length - 1, prev + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>Suivant</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Simulation d'Examen PMP</h1>
          <p className="text-muted-foreground">Sélectionnez l'examen que vous souhaitez passer.</p>
        </div>

        {savedState && (
          <Card className="border-primary bg-primary/5 p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold">Session en cours détectée</h3>
              <p className="text-sm text-muted-foreground">Examen: {EXAMS.find(e => e.id === savedState.selectedExamId)?.title}</p>
            </div>
            <Button onClick={() => startExam(true)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Reprendre"}
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAMS.map(exam => (
            <Card key={exam.id} className={`hover:ring-2 hover:ring-primary transition-all cursor-pointer ${selectedExamId === exam.id ? 'ring-2 ring-primary bg-primary/5' : ''}`} onClick={() => setSelectedExamId(exam.id)}>
              <CardHeader>
                <CardTitle className="text-lg">{exam.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{exam.desc}</p>
              </CardContent>
              <CardFooter>
                <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full">
                  {selectedExamId === exam.id ? "Sélectionné" : "Choisir"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Button size="lg" className="w-full h-16 text-xl font-bold" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="mr-2 h-6 w-6" />}
          Démarrer l'examen
        </Button>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b space-y-4">
        <div className="flex justify-between items-center">
           <Badge variant="outline" className="text-lg font-mono">Q {currentQuestionIndex + 1} / {examQuestions.length}</Badge>
           <div className="flex items-center gap-2 font-bold text-primary"><Clock className="h-5 w-5" /> {formatTime(timeLeft)}</div>
           <Button 
             variant="destructive" 
             size="sm" 
             disabled={isSubmitting}
             onClick={() => {
               if (window.confirm("Voulez-vous vraiment terminer et soumettre l'examen ?")) {
                 handleFinishExam();
               }
             }}
           >
             {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Soumettre"}
           </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">{q.statement}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {q.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  let newAns;
                  if (q.isMultipleCorrect) {
                    newAns = isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id];
                  } else {
                    newAns = [opt.id];
                  }
                  const updatedAnswers = { ...answers, [q.id]: newAns };
                  setAnswers(updatedAnswers);
                  saveProgress(undefined, updatedAnswers);
                }} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:bg-muted/50'}`}>
                  <div className="font-bold">{String.fromCharCode(65 + idx)}.</div>
                  <div className="flex-1">{opt.text}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-64 right-0 p-6 bg-background border-t">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button variant="outline" className="flex-1" onClick={() => {
            const newIndex = Math.max(0, currentQuestionIndex - 1);
            setCurrentQuestionIndex(newIndex);
            saveProgress(newIndex);
          }} disabled={currentQuestionIndex === 0}>Précédent</Button>
          <Button className="flex-1" onClick={() => {
            const newIndex = Math.min(examQuestions.length - 1, currentQuestionIndex + 1);
            setCurrentQuestionIndex(newIndex);
            saveProgress(newIndex);
          }} disabled={currentQuestionIndex === examQuestions.length - 1}>Suivant</Button>
        </div>
      </div>
    </div>
  );
}
