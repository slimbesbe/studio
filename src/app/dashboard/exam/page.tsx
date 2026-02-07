
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

    // Calcul de la position du curseur interpolée pour qu'il soit dans le bon rectangle de 25%
    const calculateMarkerPosition = (pct: number) => {
      if (pct < 50) return (pct / 50) * 25;
      if (pct < 65) return 25 + ((pct - 50) / 15) * 25;
      if (pct < 80) return 50 + ((pct - 65) / 15) * 25;
      return 75 + ((pct - 80) / 20) * 25;
    };

    const markerPosition = calculateMarkerPosition(percentage);

    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8 animate-fade-in">
        <Card className="shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle>Résultat Simulation - {EXAMS.find(e => e.id === selectedExamId)?.title}</CardTitle>
          </CardHeader>
          <CardContent className="py-12 space-y-16">
            
            {/* Graphique de Performance PMI */}
            <div className="relative mt-12 mb-20 w-full max-w-3xl mx-auto">
              
              {/* Labels Falling / Passing */}
              <div className="absolute top-[-50px] w-full flex text-[11px] font-bold text-slate-500 uppercase">
                 <div className="w-1/2 text-center">Falling</div>
                 <div className="w-1/2 text-center border-l border-sky-300">Passing</div>
              </div>

              {/* Barre de progression avec 4 segments */}
              <div className="flex w-full h-12 rounded-sm overflow-hidden border">
                <div className={`w-1/4 h-full border-r bg-red-500 ${app.index === 0 ? 'opacity-100' : 'opacity-20'}`} />
                <div className={`w-1/4 h-full border-r bg-amber-400 ${app.index === 1 ? 'opacity-100' : 'opacity-20'}`} />
                <div className={`w-1/4 h-full border-r bg-emerald-400 ${app.index === 2 ? 'opacity-100' : 'opacity-20'}`} />
                <div className={`w-1/4 h-full bg-teal-600 ${app.index === 3 ? 'opacity-100' : 'opacity-20'}`} />
              </div>

              {/* Marqueur dynamique YOU */}
              <div 
                className="absolute top-[-35px] transition-all duration-1000 ease-out flex flex-col items-center" 
                style={{ left: `${markerPosition}%`, transform: 'translateX(-50%)' }}
              >
                <span className="text-xs font-black text-black mb-1">YOU</span>
                <div className="w-[2px] h-3 bg-black mb-12" /> {/* Trait du haut */}
                <div className="w-[2px] h-3 bg-black mt-1" /> {/* Trait du bas */}
                <span className="text-xs font-bold text-[#006699] whitespace-nowrap mt-1 uppercase">
                  {app.label}
                </span>
              </div>

              {/* Labels du bas */}
              <div className="w-full flex justify-between mt-3 text-[9px] font-semibold text-slate-400 uppercase">
                <div className="w-1/4 text-center">Needs Improvement</div>
                <div className="w-1/4 text-center">Below Target</div>
                <div className="w-1/4 text-center">Target</div>
                <div className="w-1/4 text-center">Above Target</div>
              </div>
            </div>

            <div className="text-center space-y-4 pt-4">
               <p className="text-5xl font-black text-primary">{percentage}%</p>
               <p className="text-muted-foreground">{examResult.score} / {examResult.total} questions correctes</p>
               
               <div className="max-w-md mx-auto p-4 bg-muted/30 rounded-lg border border-dashed mt-8">
                 <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                   « Les pourcentages affichés sont des estimations pédagogiques. <br/>
                   Le PMI ne communique pas de score chiffré officiel pour l’examen PMP®. »
                 </p>
               </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-6 bg-muted/20 border-t">
            <Button variant="outline" className="flex-1 font-bold h-12" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>
              EXPLICATIONS
            </Button>
            <Button className="flex-1 font-bold h-12" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>
              RETOUR ACCUEIL
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
        <Button variant="ghost" onClick={() => setIsReviewMode(false)}><ChevronLeft className="mr-2" /> Retour aux résultats</Button>
        <Card className={`border-t-4 ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500 shadow-lg'}`}>
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
               <Badge variant={isCorrect ? "default" : "destructive"} className="px-4 py-1">
                 {isCorrect ? "Réponse Correcte" : "Réponse Incorrecte"}
               </Badge>
               <span className="text-xs font-mono font-bold text-muted-foreground">QUESTION {currentQuestionIndex + 1} / {examQuestions.length}</span>
            </div>
            <CardTitle className="text-xl leading-relaxed">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = userAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50/50' : isSelected ? 'border-red-400 bg-red-50/50' : 'border-muted'}`}>
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1 text-sm">{opt.text}</div>
                    {isCorrectOpt && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
            <div className="p-6 bg-primary/5 rounded-xl border-l-4 border-l-primary shadow-sm">
              <h4 className="font-bold mb-3 flex items-center gap-2 text-primary"><Info className="h-5 w-5" /> Mindset PMI & Justification</h4>
              <p className="text-sm leading-relaxed text-slate-700">{q.explanation || "Aucune explication disponible pour cette question."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t pt-6">
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
          <h1 className="text-3xl font-bold text-primary italic">Simulation d'Examen PMP</h1>
          <p className="text-muted-foreground">Sélectionnez le module d'examen pour lancer la simulation professionnelle.</p>
        </div>

        {savedState && (
          <Card className="border-primary bg-primary/5 p-6 flex items-center justify-between border-l-8">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-primary"><AlertCircle className="h-4 w-4" /> Session interrompue détectée</h3>
              <p className="text-sm text-muted-foreground">Module: {EXAMS.find(e => e.id === savedState.selectedExamId)?.title} ({Math.round(((savedState.currentQuestionIndex + 1) / savedState.questionIds.length) * 100)}% complété)</p>
            </div>
            <Button onClick={() => startExam(true)} disabled={isSubmitting} className="shadow-lg">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Reprendre la session"}
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXAMS.map(exam => (
            <Card key={exam.id} className={`group hover:shadow-xl transition-all cursor-pointer border-t-4 ${selectedExamId === exam.id ? 'border-t-primary ring-2 ring-primary/20 bg-primary/5' : 'border-t-muted hover:border-t-primary'}`} onClick={() => setSelectedExamId(exam.id)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                   <Trophy className={`h-4 w-4 ${selectedExamId === exam.id ? 'text-primary' : 'text-muted-foreground'}`} />
                   {exam.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{exam.desc}</p>
              </CardContent>
              <CardFooter>
                <Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full font-bold">
                  {selectedExamId === exam.id ? "Sélectionné" : "Choisir"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Button size="lg" className="w-full h-16 text-xl font-bold shadow-2xl transition-transform hover:scale-[1.01]" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
          {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <PlayCircle className="mr-2 h-6 w-6" />}
          Démarrer la simulation
        </Button>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur py-4 border-b space-y-4">
        <div className="flex justify-between items-center px-2">
           <Badge variant="outline" className="text-lg font-mono bg-white shadow-sm border-primary/20">
             QUESTION {currentQuestionIndex + 1} / {examQuestions.length}
           </Badge>
           <div className="flex items-center gap-2 font-black text-primary bg-primary/5 px-4 py-1 rounded-full border border-primary/10">
             <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
           </div>
           <Button 
             variant="destructive" 
             size="sm" 
             className="font-bold shadow-lg"
             disabled={isSubmitting}
             onClick={() => {
               if (window.confirm("Voulez-vous vraiment terminer et soumettre votre examen maintenant ?")) {
                 handleFinishExam();
               }
             }}
           >
             {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Soumettre"}
           </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary animate-fade-in">
        <CardHeader className="pb-8">
          <CardTitle className="text-xl leading-relaxed font-medium">{q.statement}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {q.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div 
                  key={opt.id} 
                  onClick={() => {
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
                  }} 
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 hover:shadow-md ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted hover:bg-muted/30'}`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <div className="flex-1 text-sm pt-1">{opt.text}</div>
                  {isSelected && <Check className="h-5 w-5 text-primary shrink-0 animate-in zoom-in-50" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-64 right-0 p-6 bg-white/80 backdrop-blur border-t z-30">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => {
            const newIndex = Math.max(0, currentQuestionIndex - 1);
            setCurrentQuestionIndex(newIndex);
            saveProgress(newIndex);
          }} disabled={currentQuestionIndex === 0}>
            <ChevronLeft className="mr-2" /> Précédent
          </Button>
          <Button className="flex-1 h-12 font-bold shadow-lg" onClick={() => {
            const newIndex = Math.min(examQuestions.length - 1, currentQuestionIndex + 1);
            setCurrentQuestionIndex(newIndex);
            saveProgress(newIndex);
          }} disabled={currentQuestionIndex === examQuestions.length - 1}>
            Suivant <ChevronRight className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
