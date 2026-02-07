
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, deleteDoc, serverTimestamp, getDocs, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronRight, ChevronLeft, Loader2, PlayCircle, Info, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PERFORMANCE_ZONES = [
  { label: "Needs Improvement", color: "bg-[#F44336]", range: [0, 50], width: '50%' },
  { label: "Below Target", color: "bg-[#FFC107]", range: [50, 65], width: '15%' },
  { label: "Target", color: "bg-[#4CAF50]", range: [65, 80], width: '15%' },
  { label: "Above Target", color: "bg-[#009688]", range: [80, 101], width: '20%' },
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
        toast({ variant: "destructive", title: "Erreur", description: "Pas de questions." });
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
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let score = 0;
      examQuestions.forEach(q => {
        const uAns = answers[q.id] || [];
        const cAns = q.correctOptionIds || [];
        if (uAns.length === cAns.length && uAns.every(v => cAns.includes(v))) score++;
      });
      const percentage = Math.round((score / examQuestions.length) * 100);
      setExamResult({ score, total: examQuestions.length });
      if (!isDemo && user) {
        const newCount = (profile?.simulationsCount || 0) + 1;
        const newTotal = (profile?.totalScore || 0) + percentage;
        await setDoc(doc(db, 'users', user.uid), {
          simulationsCount: newCount,
          totalScore: newTotal,
          averageScore: Math.round(newTotal / newCount),
          totalTimeSpent: increment(initialTime - timeLeft),
          updatedAt: serverTimestamp()
        }, { merge: true });
        await addDoc(collection(db, 'users', user.uid, 'exam_results'), {
          examId: selectedExamId, score, total: examQuestions.length, percentage, timeSpent: initialTime - timeLeft, completedAt: serverTimestamp()
        });
        if (examStateRef) await deleteDoc(examStateRef);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur de sauvegarde" });
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

  if (isStateLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (showPauseScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl bg-white">
          <CardHeader className="text-center py-12 bg-muted/20">
            <h1 className="text-7xl font-light text-slate-800 tracking-[0.2em] uppercase">Pause</h1>
            <p className="text-xl text-slate-500 mt-4">Simulation PMP® suspendue</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-16">
            <Button className="h-16 text-xl font-bold bg-[#635BFF] rounded-xl uppercase tracking-widest" onClick={() => setShowPauseScreen(false)}>CONTINUER</Button>
            <Button variant="outline" className="h-16 text-xl font-bold text-[#635BFF] border-[#635BFF] rounded-xl uppercase tracking-widest" onClick={() => { saveProgress(); setIsExamStarted(false); setShowPauseScreen(false); }}>ARRETER ET SAUVEGARDER</Button>
            <Button variant="outline" className="h-16 text-xl font-bold text-red-500 border-red-500 rounded-xl uppercase tracking-widest" onClick={() => { if(confirm("Arrêter ?")) { setIsExamStarted(false); setSelectedExamId(null); setShowPauseScreen(false); } }}>ARRETER ET ANNULER</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    const appreciation = PERFORMANCE_ZONES.find(z => percentage >= z.range[0] && percentage < z.range[1]) || PERFORMANCE_ZONES[0];
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-8 animate-fade-in">
        <Card className="shadow-2xl overflow-hidden bg-white border-none">
          <CardHeader className="border-b bg-muted/30"><CardTitle className="text-center font-bold">Rapport de Performance PMP®</CardTitle></CardHeader>
          <CardContent className="py-24">
            <div className="relative w-full max-w-3xl mx-auto px-4 mt-20">
              <div className="flex w-full text-[12px] font-black text-slate-400 uppercase mb-4 tracking-widest">
                <div className="w-[65%] text-center">Falling</div>
                <div className="w-[35%] text-center border-l-2">Passing</div>
              </div>
              <div className="relative flex w-full h-20 rounded-lg overflow-hidden border shadow-inner bg-slate-100">
                {PERFORMANCE_ZONES.map((zone, idx) => (
                  <div key={idx} className={`${zone.color} border-r border-white/20 flex items-center justify-center`} style={{ width: zone.width }}>
                    <span className="text-[10px] font-black text-white uppercase text-center px-1 leading-tight">{zone.label}</span>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 bottom-0 transition-all duration-1000 z-20" style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}>
                 <div className="absolute -top-16 flex flex-col items-center w-32 left-1/2 -translate-x-1/2">
                    <span className="text-[14px] font-black text-black mb-1">YOU</span>
                    <div className="w-[2px] h-12 bg-black" />
                 </div>
                 <div className="absolute -bottom-24 flex flex-col items-center w-64 left-1/2 -translate-x-1/2">
                    <div className="w-[2px] h-12 bg-black mb-2" />
                    <span className="text-[22px] font-black text-[#006699] uppercase tracking-tight text-center">{appreciation.label}</span>
                 </div>
              </div>
            </div>
            <div className="text-center space-y-4 pt-48">
              <p className="text-7xl font-black text-primary tracking-tighter">{percentage}%</p>
              <p className="text-xl font-bold text-muted-foreground">{examResult.score} / {examResult.total} points</p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4 p-8 border-t">
            <Button variant="outline" className="flex-1 font-bold h-14" onClick={() => { setIsReviewMode(true); setCurrentQuestionIndex(0); }}>REVOIR MES ERREURS</Button>
            <Button className="flex-1 font-bold h-14 bg-primary text-white" onClick={() => { setExamResult(null); setIsExamStarted(false); setSelectedExamId(null); }}>QUITTER</Button>
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
      <div className="max-w-4xl mx-auto space-y-6 py-10">
        <Button variant="ghost" onClick={() => setIsReviewMode(false)} className="font-bold text-primary"><ChevronLeft className="mr-2" /> Retour</Button>
        <Card className={`border-t-8 ${isCorrect ? 'border-t-emerald-500' : 'border-t-red-500 shadow-xl'}`}>
          <CardHeader>
            <div className="flex justify-between mb-4">
              <Badge variant={isCorrect ? "default" : "destructive"}>{isCorrect ? "CORRECT" : "ERREUR"}</Badge>
              <span className="text-xs font-black text-muted-foreground">{currentQuestionIndex + 1} / {examQuestions.length}</span>
            </div>
            <CardTitle className="text-2xl">{q.statement}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              {q.options.map((opt: any, idx: number) => {
                const isSelected = uAns.includes(opt.id);
                const isCorrectOpt = q.correctOptionIds?.includes(opt.id);
                return (
                  <div key={opt.id} className={`p-5 rounded-2xl border-2 flex items-center gap-5 ${isCorrectOpt ? 'border-emerald-500 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-muted'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${isCorrectOpt ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>{String.fromCharCode(65 + idx)}</div>
                    <div className="flex-1 font-medium">{opt.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="p-8 bg-primary/5 rounded-2xl border-l-8 border-l-primary mt-10">
              <h4 className="font-bold mb-4 text-primary flex items-center gap-2"><Info className="h-5 w-5" /> EXPLICATION PMI</h4>
              <p className="whitespace-pre-wrap">{q.explanation || "Non disponible."}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-between p-8 border-t">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>PRÉCÉDENT</Button>
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(p => Math.min(examQuestions.length - 1, p + 1))} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!isExamStarted) {
    const EXAMS = [
      { id: 'exam1', title: 'Examen 1', desc: 'Simulation 180 questions' },
      { id: 'exam2', title: 'Examen 2', desc: 'Simulation 180 questions' },
      { id: 'exam3', title: 'Examen 3', desc: 'Simulation 180 questions' },
      { id: 'exam4', title: 'Examen 4', desc: 'Simulation 180 questions' },
      { id: 'exam5', title: 'Examen 5', desc: 'Simulation 180 questions' },
    ];
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-12">
        <h1 className="text-5xl font-black text-primary text-center uppercase italic">Simulateur PMP®</h1>
        <div className="grid md:grid-cols-3 gap-8">
          {EXAMS.map(exam => (
            <Card key={exam.id} className={`cursor-pointer border-t-8 transition-all ${selectedExamId === exam.id ? 'border-t-primary bg-primary/5 shadow-xl' : 'border-t-muted'}`} onClick={() => setSelectedExamId(exam.id)}>
              <CardHeader><CardTitle>{exam.title}</CardTitle><p className="text-muted-foreground mt-2">{exam.desc}</p></CardHeader>
              <CardFooter><Button variant={selectedExamId === exam.id ? "default" : "outline"} className="w-full">SÉLECTIONNER</Button></CardFooter>
            </Card>
          ))}
        </div>
        {savedState && (
          <Button variant="outline" className="w-full h-20 border-2 border-primary text-primary font-black text-xl rounded-2xl" onClick={() => startExam(true)}>REPRENDRE LA SESSION EN COURS</Button>
        )}
        <div className="flex justify-center">
          <Button size="lg" className="w-full max-w-2xl h-24 text-3xl font-black bg-primary text-white uppercase shadow-2xl" disabled={!selectedExamId || isSubmitting} onClick={() => startExam(false)}>
            {isSubmitting ? <Loader2 className="animate-spin mr-4" /> : <PlayCircle className="mr-4 h-10 w-10" />} LANCER
          </Button>
        </div>
      </div>
    );
  }

  const q = examQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / examQuestions.length) * 100;
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 py-10">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md py-6 border-b px-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-2xl font-mono px-6 py-2 bg-white">Q-{currentQuestionIndex + 1} / {examQuestions.length}</Badge>
            <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setShowPauseScreen(true)}><Pause /></Button>
          </div>
          <div className="text-2xl font-black text-primary bg-primary/5 px-8 py-2 rounded-2xl">{formatTime(timeLeft)}</div>
          <Button variant="destructive" size="lg" className="font-black h-12 px-12 uppercase shadow-lg" onClick={() => { if(confirm("Soumettre ?")) finishExam(); }}>SOUMETTRE</Button>
        </div>
        <Progress value={progress} className="h-4" />
      </div>
      <Card className="shadow-2xl border-t-8 border-t-primary bg-white p-10 min-h-[400px]">
        <CardHeader className="pb-12"><CardTitle className="text-2xl leading-relaxed">{q?.statement}</CardTitle></CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-6">
            {q?.options.map((opt: any, idx: number) => {
              const isSelected = answers[q.id]?.includes(opt.id);
              return (
                <div key={opt.id} onClick={() => {
                  const current = answers[q.id] || [];
                  const newAns = q.isMultipleCorrect ? (isSelected ? current.filter(id => id !== opt.id) : [...current, opt.id]) : [opt.id];
                  const updated = { ...answers, [q.id]: newAns };
                  setAnswers(updated);
                  saveProgress(undefined, updated);
                }} className={`p-7 rounded-3xl border-2 cursor-pointer transition-all flex items-start gap-6 ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-muted hover:border-primary/30'}`}>
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-secondary text-primary'}`}>{String.fromCharCode(65 + idx)}</div>
                  <div className={`flex-1 text-xl pt-1 ${isSelected ? 'font-bold' : ''}`}>{opt.text}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="fixed bottom-0 left-0 right-0 p-10 bg-white/95 backdrop-blur-xl border-t z-40">
        <div className="max-w-4xl mx-auto flex justify-between gap-8">
          <Button variant="outline" className="flex-1 h-16 font-black text-xl rounded-2xl uppercase border-2" onClick={() => { const i = Math.max(0, currentQuestionIndex - 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === 0}><ChevronLeft className="mr-3" /> PRÉCÉDENT</Button>
          <Button className="flex-1 h-16 font-black text-xl rounded-2xl shadow-xl uppercase bg-primary text-white" onClick={() => { const i = Math.min(examQuestions.length - 1, currentQuestionIndex + 1); setCurrentQuestionIndex(i); saveProgress(i); }} disabled={currentQuestionIndex === examQuestions.length - 1}>SUIVANT <ChevronRight className="ml-3" /></Button>
        </div>
      </div>
    </div>
  );
}
