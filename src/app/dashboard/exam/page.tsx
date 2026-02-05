
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
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
  PlayCircle
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
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; total: number } | null>(null);

  // Fetch questions
  const questionsQuery = useMemoFirebase(() => {
    // Les utilisateurs standards ne voient que les questions actives
    return query(
      collection(db, 'questions'),
      where('isActive', '==', true),
      limit(isDemo ? 10 : 180) // Limite démo vs Réel
    );
  }, [db, isDemo]);

  const { data: questions, isLoading: isQuestionsLoading } = useCollection(questionsQuery);

  // Timer logic
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

  const startExam = () => {
    if (!questions || questions.length === 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucune question disponible pour le moment." });
      return;
    }
    setIsExamStarted(true);
    // Simuler 2 minutes par question (standard PMP approx 1.2 min)
    setTimeLeft(questions.length * 120);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setExamResult(null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    const current = answers[questionId] || [];
    if (isMultiple) {
      if (current.includes(optionId)) {
        setAnswers({ ...answers, [questionId]: current.filter(id => id !== optionId) });
      } else {
        setAnswers({ ...answers, [questionId]: [...current, optionId] });
      }
    } else {
      setAnswers({ ...answers, [questionId]: [optionId] });
    }
  };

  const handleFinishExam = () => {
    if (!questions) return;
    setIsSubmitting(true);
    
    let score = 0;
    questions.forEach(q => {
      const userAns = answers[q.id] || [];
      const correctAns = q.correctOptionIds || [];
      
      if (userAns.length === correctAns.length && userAns.every(val => correctAns.includes(val))) {
        score++;
      }
    });

    setExamResult({ score, total: questions.length });
    setIsSubmitting(false);
  };

  if (isUserLoading || isQuestionsLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Chargement de la simulation...</p>
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
            <p className="text-muted-foreground max-w-md mx-auto">
              {isSuccess 
                ? "Félicitations ! Votre performance indique une bonne maîtrise du mindset PMI."
                : "Ne vous découragez pas. Analysez vos erreurs dans la section 'Kill Mistakes' pour progresser."}
            </p>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button asChild variant="outline" className="flex-1 h-12">
              <Link href="/dashboard/history">Voir l'historique</Link>
            </Button>
            <Button onClick={() => setExamResult(null)} className="flex-1 h-12">
              <PlayCircle className="mr-2 h-4 w-4" /> Recommencer
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
          <p className="text-muted-foreground">Préparez-vous aux conditions réelles de l'examen certifiant.</p>
        </div>

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
                <span className="font-bold">{questions?.length || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Temps alloué</span>
                <span className="font-bold">{Math.round((questions?.length || 0) * 2)} min</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Seuil de succès</span>
                <span className="font-bold">70%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" /> Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 space-y-2">
              <p>• Ne rafraîchissez pas la page pendant l'examen.</p>
              <p>• Les résultats sont enregistrés à la soumission.</p>
              <p>• Une fois le temps écoulé, l'examen se termine automatiquement.</p>
              {isDemo && (
                <div className="mt-4 p-2 bg-white rounded border border-amber-300 font-bold text-xs">
                  MODE DÉMO : Session limitée à 10 questions.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Button onClick={startExam} size="lg" className="w-full h-16 text-xl font-bold shadow-xl shadow-primary/20">
          Lancer la simulation <ChevronRight className="ml-2 h-6 w-6" />
        </Button>
      </div>
    );
  }

  const currentQuestion = questions![currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions!.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Exam Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg font-mono px-3 py-1">
              Q {currentQuestionIndex + 1} / {questions?.length}
            </Badge>
            <div className="flex items-center gap-2 text-primary font-bold">
              <Clock className="h-5 w-5" /> {formatTime(timeLeft)}
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={() => { if(confirm("Terminer l'examen maintenant ?")) handleFinishExam() }}>
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
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = answers[currentQuestion.id]?.includes(opt.id);
              
              return (
                <div 
                  key={opt.id}
                  onClick={() => toggleOption(currentQuestion.id, opt.id, currentQuestion.isMultipleCorrect)}
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
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex-1 h-12"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Précédent
          </Button>
          
          {currentQuestionIndex < (questions?.length || 0) - 1 ? (
            <Button 
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
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
