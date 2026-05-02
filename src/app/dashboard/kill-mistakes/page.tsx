"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Info,
  Loader2,
  ChevronLeft,
  Target,
  Zap,
  Search,
  ChevronRight,
  Trophy,
  LayoutGrid,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { submitPracticeAnswer } from '@/lib/services/practice-service';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type KillMistakeSource = 'matrix' | 'practice' | 'exam' | 'all';

function KillMistakesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'analyze';
  const [activeTheme, setActiveTheme] = useState<KillMistakeSource>('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterApproach, setFilterApproach] = useState('all');

  // Common State
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Redo Interactive Browser State
  const [interactiveSelectedChoices, setInteractiveSelectedChoices] = useState<string[]>([]);
  const [interactiveResult, setInteractiveResult] = useState<any | null>(null);

  // Linear Session State
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string[]>>({});
  const [sessionStep, setStep] = useState<'intro' | 'session' | 'summary' | 'review'>('intro');
  const [sessionResults, setSessionResults] = useState<{correct: number, total: number, history: any[]} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakesData, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);
  
  const filteredMistakes = useMemo(() => {
    let list = mistakesData || [];
    
    // Filtrage par Thème (idem historique)
    if (activeTheme !== 'all') {
      list = list.filter(m => m.sourceType === activeTheme || (!m.sourceType && activeTheme === 'practice'));
    }

    // Filtrage par Axe PMP
    if (filterDomain !== 'all') {
      list = list.filter(m => m.tags?.domain === filterDomain);
    }
    if (filterApproach !== 'all') {
      list = list.filter(m => m.tags?.approach === filterApproach);
    }
    return list;
  }, [mistakesData, activeTheme, filterDomain, filterApproach]);

  // Load Question Details
  useEffect(() => {
    async function fetchDetails() {
      let targetMistake = (sessionStep === 'session' || sessionStep === 'review') 
        ? filteredMistakes[currentSessionIdx] 
        : selectedMistake;

      if (!targetMistake) {
        setQuestionDetails(null);
        return;
      }

      setIsLoadingDetails(true);
      try {
        const qDoc = await getDoc(doc(db, 'questions', targetMistake.questionId));
        if (qDoc.exists()) setQuestionDetails({ ...qDoc.data(), id: qDoc.id });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, currentSessionIdx, sessionStep, db, filteredMistakes]);

  // Reset UI states on filter change
  useEffect(() => {
    setSelectedMistake(null);
    setInteractiveSelectedChoices([]);
    setInteractiveResult(null);
  }, [activeTheme, filterDomain, filterApproach, mode]);

  const startSession = () => {
    if (filteredMistakes.length === 0) return;
    setSessionAnswers({});
    setCurrentSessionIdx(0);
    setStep('session');
  };

  const handleInteractiveToggle = (choiceId: string, isMultiple: boolean) => {
    if (interactiveResult) return;
    if (isMultiple) {
      if (interactiveSelectedChoices.includes(choiceId)) {
        setInteractiveSelectedChoices(interactiveSelectedChoices.filter(id => id !== choiceId));
      } else {
        setInteractiveSelectedChoices([...interactiveSelectedChoices, choiceId]);
      }
    } else {
      setInteractiveSelectedChoices([choiceId]);
    }
  };

  const handleInteractiveAnswerSubmit = async () => {
    if (interactiveSelectedChoices.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await submitPracticeAnswer(db, user!.uid, selectedMistake.questionId, interactiveSelectedChoices);
      setInteractiveResult(res);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSessionToggle = (mistakeId: string, choiceId: string, isMultiple: boolean) => {
    const current = sessionAnswers[mistakeId] || [];
    if (isMultiple) {
      if (current.includes(choiceId)) {
        setSessionAnswers({ ...sessionAnswers, [mistakeId]: current.filter(id => id !== choiceId) });
      } else {
        setSessionAnswers({ ...sessionAnswers, [mistakeId]: [...current, choiceId] });
      }
    } else {
      setSessionAnswers({ ...sessionAnswers, [mistakeId]: [choiceId] });
    }
  };

  const handleSessionNext = async () => {
    if (currentSessionIdx < filteredMistakes.length - 1) {
      setCurrentSessionIdx(currentSessionIdx + 1);
    } else {
      setIsSubmitting(true);
      try {
        let correct = 0;
        const history = [];
        for (const m of filteredMistakes) {
          const userChoices = sessionAnswers[m.questionId] || [];
          const res = await submitPracticeAnswer(db, user!.uid, m.questionId, userChoices);
          if (res.isCorrect) correct++;
          history.push({ mistake: m, userChoices, correction: res });
        }
        setSessionResults({ correct, total: filteredMistakes.length, history });
        setStep('summary');
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur validation" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getApproachLabel = (a: string) => {
    if (a === 'Predictive') return 'Waterfall';
    if (a === 'Agile') return 'Agile';
    if (a === 'Hybrid') return 'Hybride';
    return a;
  };

  if (isLoadingMistakes) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  // --- SESSION MODE ---
  if (mode === 'session') {
    if (sessionStep === 'intro') {
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-fade-in pb-32">
          <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="mr-2 h-3 w-3" /> Retour</Link>
          </Button>
          <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 text-center space-y-8 overflow-hidden relative">
            <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
              <Zap className="h-12 w-12 text-primary fill-primary ml-1" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Session de Remédiation</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Ciblez vos erreurs par thématique</p>
            </div>
            
            <Tabs value={activeTheme} onValueChange={(v) => setActiveTheme(v as KillMistakeSource)} className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 border-2 grid grid-cols-2 md:grid-cols-4 mb-6">
                <TabsTrigger value="all" className="rounded-xl font-black italic uppercase text-[9px] gap-2">Tous</TabsTrigger>
                <TabsTrigger value="matrix" className="rounded-xl font-black italic uppercase text-[9px] gap-2"><LayoutGrid className="h-3 w-3" /> Matrice</TabsTrigger>
                <TabsTrigger value="practice" className="rounded-xl font-black italic uppercase text-[9px] gap-2"><BookOpen className="h-3 w-3" /> Pratique</TabsTrigger>
                <TabsTrigger value="exam" className="rounded-xl font-black italic uppercase text-[9px] gap-2"><GraduationCap className="h-3 w-3" /> Examens</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex-1 space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Domaine PMP</Label>
                <Select value={filterDomain} onValueChange={setFilterDomain}>
                  <SelectTrigger className="bg-white h-12 rounded-xl font-bold italic border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les domaines</SelectItem>
                    <SelectItem value="People">People</SelectItem>
                    <SelectItem value="Process">Processus</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Approche Projet</Label>
                <Select value={filterApproach} onValueChange={setFilterApproach}>
                  <SelectTrigger className="bg-white h-12 rounded-xl font-bold italic border-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les approches</SelectItem>
                    <SelectItem value="Predictive">Waterfall</SelectItem>
                    <SelectItem value="Agile">Agile</SelectItem>
                    <SelectItem value="Hybrid">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-slate-600 font-bold italic text-sm leading-relaxed max-w-md mx-auto">
              Vous allez traiter <span className="text-primary font-black">{filteredMistakes.length} questions</span>. Les résultats sont enregistrés pour nettoyer votre base Kill Mistake.
            </p>
            <Button size="lg" onClick={startSession} disabled={filteredMistakes.length === 0} className="h-20 w-full rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform">
              DÉMARRER LA SESSION
            </Button>
          </Card>
        </div>
      );
    }

    if (sessionStep === 'session') {
      const q = filteredMistakes[currentSessionIdx];
      const selectedChoices = sessionAnswers[q?.questionId] || [];
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8 px-4">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
            <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic">QUESTION {currentSessionIdx + 1} / {filteredMistakes.length}</Badge>
            <Button variant="ghost" onClick={() => { if(confirm("Abandonner la session ?")) setStep('intro'); }} className="text-muted-foreground font-black uppercase tracking-widest text-[9px] hover:text-red-500">Abandonner</Button>
          </div>
          <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-primary overflow-hidden bg-white">
            <CardContent className="p-10 space-y-8">
              {isLoadingDetails ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
              ) : questionDetails && (
                <>
                  <div className="space-y-6">
                    {questionDetails.isMultipleCorrect && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-black italic uppercase text-[10px] tracking-widest py-1 px-4">Multi-choix</Badge>
                    )}
                    <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                    {questionDetails.imageUrl && (
                      <div className="rounded-[2vh] overflow-hidden border-2 border-slate-100 bg-white p-1 flex justify-center shadow-md">
                        <img src={questionDetails.imageUrl} alt="Case illustration" className="max-h-[45vh] w-full object-contain rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {questionDetails.options?.map((opt: any, idx: number) => {
                      const isSelected = selectedChoices.includes(opt.id);
                      return (
                        <div key={opt.id} onClick={() => handleSessionToggle(q.questionId, opt.id, questionDetails.isMultipleCorrect)} className={cn("p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-5 shadow-sm", isSelected ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300")}>
                          <div className={cn("h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2", questionDetails.isMultipleCorrect ? "rounded-xl" : "rounded-full", isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                          <p className={cn("flex-1 text-lg font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>{opt.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-end">
              <Button onClick={handleSessionNext} disabled={selectedChoices.length === 0 || isSubmitting} className="h-16 px-12 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-xl text-lg group">
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <>{currentSessionIdx < filteredMistakes.length - 1 ? "Suivant" : "Terminer"} <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" /></>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    if (sessionStep === 'summary') {
      const score = Math.round((sessionResults!.correct / sessionResults!.total) * 100);
      return (
        <div className="max-w-2xl mx-auto py-16 text-center space-y-10 animate-fade-in px-4">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Révisions Terminées</h1>
          <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
            <div className="space-y-2">
              <span className="text-8xl font-black italic tracking-tighter text-primary">{score}%</span>
              <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic">{sessionResults!.correct} / {sessionResults!.total} Questions corrigées</p>
            </div>
            <div className="flex flex-col gap-4">
              <Button className="w-full h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" onClick={() => { setStep('review'); setCurrentSessionIdx(0); }}><Info className="mr-2 h-6 w-6" /> Revoir les justifications</Button>
              <Button variant="outline" className="w-full h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic hover:bg-slate-50 transition-colors" onClick={() => setStep('intro')}>Nouvelle Session</Button>
            </div>
          </Card>
        </div>
      );
    }

    if (sessionStep === 'review') {
      const entry = sessionResults!.history[currentSessionIdx];
      const isUserCorrect = entry.correction.isCorrect;
      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
            <Button variant="ghost" className="font-black italic uppercase tracking-widest text-xs" onClick={() => setStep('summary')}><ChevronLeft className="mr-2 h-4 w-4" /> Score</Button>
            <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1">REVUE {currentSessionIdx + 1} / {sessionResults!.history.length}</Badge>
            <Badge className={cn("text-white font-black italic", isUserCorrect ? "bg-emerald-500" : "bg-red-500")}>{isUserCorrect ? "CORRECT" : "ERREUR"}</Badge>
          </div>
          <Card className={cn("shadow-2xl border-t-8 rounded-[32px] overflow-hidden bg-white", isUserCorrect ? "border-t-emerald-500" : "border-t-red-500")}>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-6">
                <p className="text-xl font-black text-slate-800 italic leading-relaxed">{questionDetails?.statement || questionDetails?.text}</p>
              </div>
              <div className="grid gap-3">
                {questionDetails?.options?.map((opt: any, idx: number) => {
                  const isSelected = entry.userChoices.includes(opt.id);
                  const isCorrect = entry.correction.correctOptionIds?.includes(opt.id);
                  return (
                    <div key={opt.id} className={cn("p-5 rounded-2xl border-2 flex items-start gap-4 shadow-sm", isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "border-slate-100")}>
                      <div className={cn("h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 border-2", (entry.correction.correctOptionIds?.length || 0) > 1 ? "rounded-xl" : "rounded-full", isCorrect ? "bg-emerald-500 text-white border-emerald-500" : isSelected ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                      <p className={cn("flex-1 text-sm font-bold italic pt-1", isCorrect ? "text-emerald-900" : isSelected ? "text-red-900" : "text-slate-600")}>{opt.text}</p>
                    </div>
                  );
                })}
              </div>
              <div className="p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary shadow-inner">
                <h4 className="font-black text-primary uppercase italic text-xs mb-4 flex items-center gap-2"><Info className="h-4 w-4" /> Justification du Mindset</h4>
                <p className="text-lg font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.correction.explanation}</p>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
              <Button variant="outline" className="flex-1 h-14 rounded-xl border-2 font-black uppercase tracking-widest text-xs" onClick={() => setCurrentSessionIdx(Math.max(0, currentSessionIdx - 1))} disabled={currentSessionIdx === 0}>Précédent</Button>
              <Button className="flex-1 h-14 rounded-xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl" onClick={() => setCurrentSessionIdx(Math.min(sessionResults!.history.length - 1, currentSessionIdx + 1))} disabled={currentSessionIdx === sessionResults!.history.length - 1}>Suivant</Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
  }

  // --- BROWSER MODE (ANALYZE OR REDO INTERACTIVE) ---
  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto py-4 px-4 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-xl border-2 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl hover:bg-slate-50 border-2 shadow-sm">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <h1 className="text-3xl font-black flex items-center gap-3 text-primary italic uppercase tracking-tighter">
            {mode === 'analyze' ? <><Search className="h-10 w-10 text-accent" /> Analyse</> : <><LayoutGrid className="h-10 w-10 text-emerald-500" /> Mode Libre</>}
          </h1>
        </div>
        
        <Tabs value={activeTheme} onValueChange={(v) => setActiveTheme(v as KillMistakeSource)} className="w-full md:w-auto">
          <TabsList className="bg-slate-50 p-1 rounded-2xl h-14 border-2 grid grid-cols-2 md:flex">
            <TabsTrigger value="all" className="rounded-xl font-black italic uppercase text-[9px] px-6">Tous</TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-xl font-black italic uppercase text-[9px] px-6">Matrice</TabsTrigger>
            <TabsTrigger value="practice" className="rounded-xl font-black italic uppercase text-[9px] px-6">Pratique</TabsTrigger>
            <TabsTrigger value="exam" className="rounded-xl font-black italic uppercase text-[9px] px-6">Examens</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="bg-white h-10 rounded-xl font-bold italic border-2 text-[10px] w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Domaines</SelectItem>
              <SelectItem value="People">People</SelectItem>
              <SelectItem value="Process">Processus</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="h-10 px-4 rounded-xl border-2 font-black italic text-[10px] bg-white">{filteredMistakes.length} Q</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        <Card className="lg:col-span-1 rounded-[32px] shadow-lg border-none overflow-hidden h-full flex flex-col bg-white">
          <div className="p-3 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredMistakes.map((m) => (
              <Card 
                key={m.id} 
                className={cn(
                  "cursor-pointer transition-all border-2 rounded-xl p-3",
                  selectedMistake?.id === m.id ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-slate-100 hover:border-primary/20'
                )}
                onClick={() => setSelectedMistake(m)}
              >
                <div className="flex justify-between items-center mb-1">
                  <Badge variant="destructive" className="font-black italic px-1.5 py-0 text-[8px]">{m.wrongCount} ÉCHECS</Badge>
                  <span className="text-[8px] font-black uppercase text-slate-400">{getApproachLabel(m.tags?.approach || '')}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-700 italic">ID: {m.questionId.substring(0, 15)}...</p>
              </Card>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-[32px] shadow-2xl border-none overflow-hidden h-full flex flex-col bg-white p-6">
          {!selectedMistake ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <Brain className="h-16 w-16 mb-4" />
              <p className="font-black uppercase italic text-xs">Sélectionnez une erreur à gauche</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden space-y-6">
              <CardHeader className="p-0 shrink-0">
                <CardTitle className="text-2xl font-black text-slate-900 italic uppercase">Détails de la Question</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-4">
                {isLoadingDetails ? <Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /> : questionDetails && (
                  <>
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 shadow-inner">
                      <p className="text-lg font-bold italic text-slate-700 leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                    </div>
                    {mode === 'analyze' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border-l-8 border-red-500 bg-red-50 italic font-bold">Votre choix : {Array.isArray(selectedMistake.lastSelectedChoiceIds) ? selectedMistake.lastSelectedChoiceIds.join(', ') : selectedMistake.lastSelectedChoiceId}</div>
                          <div className="p-4 rounded-xl border-l-8 border-emerald-500 bg-emerald-50 italic font-bold">Bonne réponse : {questionDetails.correctOptionIds?.join(', ')}</div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 italic font-bold text-slate-700 text-sm whitespace-pre-wrap">{questionDetails.explanation}</div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {questionDetails.options?.map((opt: any, idx: number) => {
                          const isSelected = interactiveSelectedChoices.includes(opt.id);
                          const isCorrect = interactiveResult?.correctOptionIds?.includes(opt.id);
                          return (
                            <div key={opt.id} onClick={() => handleInteractiveToggle(opt.id, questionDetails.isMultipleCorrect)} className={cn("p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4", interactiveResult ? (isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "opacity-50") : (isSelected ? "border-primary bg-primary/5 shadow-sm" : ""))}>
                              <div className={cn("h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 border-2 rounded-full", isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "")}>{String.fromCharCode(65 + idx)}</div>
                              <p className="flex-1 text-sm font-bold italic pt-1">{opt.text}</p>
                            </div>
                          );
                        })}
                        {!interactiveResult ? (
                          <Button onClick={handleInteractiveAnswerSubmit} disabled={interactiveSelectedChoices.length === 0} className="h-14 rounded-xl bg-primary font-black uppercase text-xs">VÉRIFIER</Button>
                        ) : (
                          <div className="p-6 bg-slate-50 rounded-2xl border-l-8 border-primary italic font-bold text-slate-700 text-sm whitespace-pre-wrap">{interactiveResult.explanation}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function KillMistakesPage() {
  return <Suspense fallback={<Loader2 className="animate-spin" />}><KillMistakesContent /></Suspense>;
}
