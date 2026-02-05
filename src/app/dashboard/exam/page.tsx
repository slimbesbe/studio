
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  Info
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ExamPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  const [isExamStarted, setIsExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);
  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // State persistence ref
  const examStateRef = useMemoFirebase(() => {
    return user && !user.isAnonymous ? doc(db, 'users', user.uid, 'exam_state', 'current') : null;
  }, [db, user]);

  const { data: savedState, isLoading: isStateLoading } = useDoc(examStateRef);

  // Fetch all questions for pool
  const questionsQuery = useMemoFirebase(() => {
    return query(
      collection(db, 'questions'),
      where('isActive', '==', true)
    );
  }, [db]);

  const { data: allQuestions, isLoading: isQuestionsLoading } = useCollection(questionsQuery);

  // Filtered questions based on session IDs
  const activeQuestions = useMemo(() => {
    if (!allQuestions || sessionQuestionIds.length === 0) return [];
    return sessionQuestionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as any[];
  }, [allQuestions, sessionQuestionIds]);

  // Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && timeLeft > 0 && !examResult) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime % 30 === 0 && !isDemo && examStateRef) {
             setDoc(examStateRef, { timeLeft: newTime }, { merge: true });
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && isExamStarted && !examResult) {
      handleFinishExam();
    }
    return () => clearInterval(timer);
  }, [isExamStarted, timeLeft, examResult, isDemo, examStateRef]);

  // Sync state to Firestore on change
  const saveProgress = useCallback((updatedIndex?: number, updatedAnswers?: any) => {
    if (isDemo || !examStateRef || !isExamStarted) return;
    
    setDoc(examStateRef, {
      currentQuestionIndex: updatedIndex !== undefined ? updatedIndex : currentQuestionIndex,
      answers: updatedAnswers !== undefined ? updatedAnswers : answers,
      timeLeft: timeLeft,
      questionIds: sessionQuestionIds,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }, [isDemo, examStateRef, isExamStarted, currentQuestionIndex, answers, timeLeft, sessionQuestionIds]);

  const startExam = (resume: boolean = false) => {
    if (!allQuestions || allQuestions.length === 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucune question disponible." });
      return;
    }

    if (resume && savedState) {
      setSessionQuestionIds(savedState.questionIds || []);
      setAnswers(savedState.answers || {});
      setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
      setTimeLeft(savedState.timeLeft || 0);
      setIsExamStarted(true);
      setIsReviewMode(false);
      return;
    }

    const pool = [...allQuestions].sort(() => 0.5 - Math.random());
    const selected = pool.slice(0, isDemo ? 10 : 180);
    const ids = selected.map(q => q.id);
    
    setSessionQuestionIds(ids);
    setTimeLeft(ids.length * 120);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setExamResult(null);
    setIsExamStarted(true);
    setIsReviewMode(false);

    if (!isDemo && examStateRef) {
      setDoc(examStateRef, {
        questionIds: ids,
        currentQuestionIndex: 0,
        answers: {},
        timeLeft: ids.length * 120,
        updatedAt: serverTimestamp()
      });
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    if (isReviewMode) return;
    const current = answers[questionId] || [];
    let newAnswers;
    if (isMultiple) {
      if (current.includes(optionId)) {
        newAnswers = { ...answers, [questionId]: current.filter(id => id !== optionId) };
      } else {
        newAnswers = { ...answers, [questionId]: [...current, optionId] };
      }
    } else {
      newAnswers = { ...answers, [questionId]: [optionId] };
    }
    setAnswers(newAnswers);
    saveProgress(undefined, newAnswers);
  };

  const handleFinishExam = async () => {
    if (activeQuestions.length === 0) return;
    setIsSubmitting(true);
    
    let score = 0;
    activeQuestions.forEach(q => {
      const userAns = answers[q.id] || [];
      const correctAns = q.correctOptionIds || [];
      
      if (userAns.length === correctAns.length && userAns.every(val => correctAns.includes(val))) {
        score++;
      }
    });

    setExamResult({ score, total: activeQuestions.length });
    setIsSubmitting(false);

    if (!isDemo && examStateRef) {
      await deleteDoc(examStateRef);
    }
  };

  if (isUserLoading || isQuestionsLoading || isStateLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Chargement de votre session...</p>
      </div>
    );
  }

  // UI Mode Révision
  if (isReviewMode && examResult) {
    const currentQuestion = activeQuestions[currentQuestionIndex];
    const userAns = answers[currentQuestion.id] || [];
    const correctAns = currentQuestion.correctOptionIds || [];
    const isCorrect = userAns.length === correctAns.length && userAns.every(val => correctAns.includes(val));

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setIsReviewMode(false)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Retour au score
            </Button>
            <h2 className="text-2xl font-bold">Révision des questions</h2>
          </div>
          <Badge variant="outline" className="text-lg font-mono">
            {currentQuestionIndex + 1} / {activeQuestions.length}
          </Badge>
        </div>

        <Card className={`shadow-xl border-t-4 ${isCorrect ? 'border-t-emerald-500' : 'border-t-destructive'}`}>
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
              <Badge variant={isCorrect ? "default" : "destructive"} className={isCorrect ? "bg-emerald-500" : ""}>
                {isCorrect ? "Correct" : "Incorrect"}
              </Badge>
              <Badge variant="secondary">{currentQuestion.category || 'PMP Knowledge'}</Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl leading-relaxed">
              {currentQuestion.statement}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              {currentQuestion.options.map((opt: any, idx: number) => {
                const isSelected = userAns.includes(opt.id);
                const isOptionCorrect = correctAns.includes(opt.id);
                
                let borderColor = 'border-transparent bg-secondary/30';
                if (isOptionCorrect) borderColor = 'border-emerald-500 bg-emerald-50';
                else if (isSelected && !isOptionCorrect) borderColor = 'border-destructive bg-destructive/5';

                return (
                  <div 
                    key={opt.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${borderColor}`}
                  >
                    <div className="pt-1">
                      {isOptionCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : isSelected ? <XCircle className="h-5 w-5 text-destructive" /> : <div className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-sm md:text-base">
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 bg-muted/50 rounded-xl border-l-4 border-l-primary space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-primary">
                <Info className="h-5 w-5" /> Explication & Mindset PMI
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {currentQuestion.explanation || "Aucune explication fournie pour cette question."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Précédent
            </Button>
            <Button 
              onClick={() => setCurrentQuestionIndex(Math.min(activeQuestions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === activeQuestions.length - 1}
            >
              Suivant
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const isSuccess = percentage >= 70;

    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-12">
        <Card className="text-center shadow-2xl border-t-8 border-t-primary">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className={`p-6 rounded-full ${isSuccess ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <Trophy className={`h-20 w-20 ${isSuccess ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold">Résultat de l'Examen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-6xl font-black text-primary">
              {percentage}%
            </div>
            <div className="space-y-2">
              <p className="text-xl font-medium">
                {examResult.score} bonnes réponses sur {examResult.total}
              </p>
              <Badge variant={isSuccess ? "default" : "destructive"} className="text-lg px-6 py-1">
                {isSuccess ? "Target Achieved" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }} variant="outline" className="flex-1 h-12">
              <BookOpen className="mr-2 h-4 w-4" /> Explications
            </Button>
            <Button onClick={() => setExamResult(null)} className="flex-1 h-12">
              <PlayCircle className="mr-2 h-4 w-4" /> Nouvelle Simulation
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <PlayCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Simulation d'Examen PMP</h1>
          <p className="text-muted-foreground">Reprenez votre progression ou lancez une nouvelle session.</p>
        </div>

        {savedState && (
          <Card className="border-primary bg-primary/5 shadow-lg animate-pulse hover:animate-none">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <HistoryIcon className="h-10 w-10 text-primary" />
                <div>
                  <h3 className="font-bold text-lg">Examen en cours détecté</h3>
                  <p className="text-sm text-muted-foreground">
                    Question {savedState.currentQuestionIndex + 1} • {formatTime(savedState.timeLeft)} restants
                  </p>
                </div>
              </div>
              <Button onClick={() => startExam(true)} size="lg" className="bg-primary hover:bg-primary/90">
                Reprendre <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-bold">{isDemo ? 10 : 180}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Temps estimé</span>
                <span className="font-bold">{isDemo ? '20' : '230'} min</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" /> Persistence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900">
              Votre progression est sauvegardée automatiquement à chaque réponse. Vous pouvez quitter et revenir plus tard pour finir votre session.
            </CardContent>
          </Card>
        </div>

        <Button 
          onClick={() => startExam(false)} 
          size="lg" 
          variant={savedState ? "outline" : "default"}
          className="w-full h-16 text-xl font-bold"
        >
          {savedState ? "Démarrer une nouvelle simulation" : "Lancer la simulation"} 
          <ChevronRight className="ml-2 h-6 w-6" />
        </Button>
      </div>
    );
  }

  const currentQuestion = activeQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / activeQuestions.length) * 100;

  if (!currentQuestion) return <div className="text-center p-20"><Loader2 className="animate-spin inline mr-2" /> Préparation des questions...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Exam Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg font-mono px-3 py-1">
              Q {currentQuestionIndex + 1} / {activeQuestions.length}
            </Badge>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => { if(confirm("Terminer et soumettre l'examen ?")) handleFinishExam() }}>
            <Send className="mr-2 h-4 w-4" /> Terminer
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Content */}
      <Card className="shadow-xl border-t-4 border-t-primary min-h-[400px]">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <Badge variant="secondary">{currentQuestion.category || 'PMP Knowledge'}</Badge>
            {currentQuestion.isMultipleCorrect && (
              <Badge variant="outline" className="text-amber-600 border-amber-200">Choix Multiples</Badge>
            )}
          </div>
          <CardTitle className="text-xl md:text-2xl leading-relaxed font-semibold">
            {currentQuestion.statement}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {currentQuestion.options.map((opt: any, idx: number) => {
              const isSelected = answers[currentQuestion.id]?.includes(opt.id);
              
              return (
                <div 
                  key={opt.id}
                  onClick={() => toggleOption(currentQuestion.id, opt.id, !!currentQuestion.isMultipleCorrect)}
                  className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50 ${isSelected ? 'border-primary bg-primary/5 shadow-inner' : 'border-transparent bg-secondary/30'}`}
                >
                  <div className="pt-1">
                    {currentQuestion.isMultipleCorrect ? (
                      <Checkbox checked={isSelected} />
                    ) : (
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-sm md:text-base">
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt.text}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-64 right-0 p-6 bg-background/80 backdrop-blur border-t z-20">
        <div className="max-w-4xl mx-auto flex justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={() => {
              const nextIdx = Math.max(0, currentQuestionIndex - 1);
              setCurrentQuestionIndex(nextIdx);
              saveProgress(nextIdx);
            }}
            disabled={currentQuestionIndex === 0}
            className="flex-1 h-12"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          
          {currentQuestionIndex < activeQuestions.length - 1 ? (
            <Button 
              onClick={() => {
                const nextIdx = currentQuestionIndex + 1;
                setCurrentQuestionIndex(nextIdx);
                saveProgress(nextIdx);
              }}
              className="flex-1 h-12 shadow-lg"
            >
              Suivant <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinishExam}
              disabled={isSubmitting}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 shadow-lg"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Soumettre</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
