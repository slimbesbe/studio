
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  CheckCircle2, 
  XCircle,
  Info,
  Loader2,
  ChevronLeft,
  Search,
  ChevronRight,
  Trophy,
  Zap,
  Play,
  Check
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { submitPracticeAnswer } from '@/lib/services/practice-service';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type KillMistakeSource = 'matrix' | 'practice' | 'exam' | 'all';

function KillMistakesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'analyze';
  const initialTheme = (searchParams.get('theme') as KillMistakeSource) || 'all';

  const [activeTheme, setActiveTheme] = useState<KillMistakeSource>(initialTheme);
  const [filterDomain, setFilterDomain] = useState('all');

  // State Analyse
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // State Session
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string[]>>({});
  const [sessionStep, setStep] = useState<'intro' | 'session' | 'summary'>('intro');
  const [sessionResults, setSessionResults] = useState<{correct: number, total: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Errors
  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakesData, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);
  
  const filteredMistakes = useMemo(() => {
    let list = mistakesData || [];
    if (activeTheme !== 'all') {
      list = list.filter(m => m.sourceType === activeTheme || (!m.sourceType && activeTheme === 'practice'));
    }
    if (filterDomain !== 'all') {
      list = list.filter(m => m.tags?.domain === filterDomain);
    }
    return list;
  }, [mistakesData, activeTheme, filterDomain]);

  // Load Detail Question
  useEffect(() => {
    async function fetchDetails() {
      const target = (mode === 'session' ? filteredMistakes[currentSessionIdx] : selectedMistake);
      if (!target) {
        setQuestionDetails(null);
        return;
      }
      setIsLoadingDetails(true);
      try {
        const qDoc = await getDoc(doc(db, 'questions', target.questionId));
        if (qDoc.exists()) setQuestionDetails({ ...qDoc.data(), id: qDoc.id });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, currentSessionIdx, mode, db, filteredMistakes]);

  // --- ACTIONS ---
  const startSession = () => {
    if (filteredMistakes.length === 0) return;
    setStep('session');
    setCurrentSessionIdx(0);
  };

  const handleSessionAnswer = (choiceId: string, isMultiple: boolean) => {
    const qId = filteredMistakes[currentSessionIdx].questionId;
    const current = sessionAnswers[qId] || [];
    if (isMultiple) {
      setSessionAnswers({ ...sessionAnswers, [qId]: current.includes(choiceId) ? current.filter(id => id !== choiceId) : [...current, choiceId] });
    } else {
      setSessionAnswers({ ...sessionAnswers, [qId]: [choiceId] });
    }
  };

  const nextOrFinish = async () => {
    if (currentSessionIdx < filteredMistakes.length - 1) {
      setCurrentSessionIdx(currentSessionIdx + 1);
    } else {
      setIsSubmitting(true);
      try {
        let correct = 0;
        for (const m of filteredMistakes) {
          const userChoices = sessionAnswers[m.questionId] || [];
          const res = await submitPracticeAnswer(db, user!.uid, m.questionId, userChoices);
          if (res.isCorrect) correct++;
        }
        setSessionResults({ correct, total: filteredMistakes.length });
        setStep('summary');
      } catch (e) {
        toast({ variant: "destructive", title: "Erreur" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoadingMistakes) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  // --- RENDU MODE ACTION (PURGE) ---
  if (mode === 'session') {
    if (sessionStep === 'intro') {
      return (
        <div className="max-w-4xl mx-auto py-16 px-4 animate-fade-in">
          <Card className="rounded-[60px] border-none shadow-3xl bg-[#1e3a8a] text-white p-16 text-center space-y-10 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-10"><Zap className="h-40 w-40 fill-white" /></div>
            <div className="bg-white/10 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner relative z-10">
              <Play className="h-12 w-12 fill-white text-white ml-2" />
            </div>
            <div className="space-y-4 relative z-10">
              <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-tight">Session de Remédiation</h1>
              <p className="text-blue-100/70 font-bold italic text-lg max-w-xl mx-auto leading-relaxed">
                Prêt à purger <span className="text-white font-black underline underline-offset-4">{filteredMistakes.length} erreurs</span> du silo {activeTheme.toUpperCase()} ?
              </p>
            </div>
            <div className="flex justify-center gap-4 relative z-10 pt-4">
              <Button size="lg" onClick={startSession} className="h-20 px-16 rounded-[28px] bg-white text-[#1e3a8a] hover:bg-blue-50 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform">DÉMARRER LA PURGE</Button>
            </div>
          </Card>
        </div>
      );
    }
    if (sessionStep === 'summary' && sessionResults) {
      return (
        <div className="max-w-2xl mx-auto py-24 text-center space-y-10 animate-fade-in px-4">
          <Card className="rounded-[40px] shadow-2xl border-none p-16 space-y-10 bg-white">
            <div className="bg-emerald-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="h-12 w-12 text-emerald-600" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Sprint Terminé !</h1>
              <p className="text-6xl font-black text-primary italic">{Math.round((sessionResults.correct / sessionResults.total) * 100)}%</p>
              <p className="text-lg font-bold text-slate-500 italic uppercase tracking-widest">
                {sessionResults.correct} / {sessionResults.total} Corrigées
              </p>
            </div>
            <Button asChild className="h-16 w-full rounded-2xl bg-slate-900 text-white font-black uppercase italic tracking-widest shadow-xl">
              <Link href="/dashboard/kill-mistake-selection">RETOUR AU DASHBOARD</Link>
            </Button>
          </Card>
        </div>
      );
    }
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
          <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic">QUESTION {currentSessionIdx + 1} / {filteredMistakes.length}</Badge>
          <div className="bg-[#1e3a8a] text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase italic">PURGE ACTIVE : {activeTheme.toUpperCase()}</div>
        </div>
        <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-[#1e3a8a] overflow-hidden bg-white">
          <CardContent className="p-10 space-y-10">
            {isLoadingDetails ? <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : (
              <>
                <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{questionDetails?.statement || questionDetails?.text}</p>
                <div className="grid gap-4">
                  {(questionDetails?.choices || questionDetails?.options?.map((o:any)=>o.text) || []).map((optText: string, idx: number) => {
                    const choiceId = String(idx + 1);
                    const isSelected = (sessionAnswers[questionDetails.id] || []).includes(choiceId);
                    return (
                      <button key={idx} onClick={() => handleSessionAnswer(choiceId, questionDetails.isMultipleCorrect)} className={cn("p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-5 shadow-sm", isSelected ? "border-[#1e3a8a] bg-blue-50/30 scale-[1.01]" : "border-slate-100 hover:border-slate-300")}>
                        <div className={cn("h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2 rounded-full", isSelected ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                        <span className="flex-1 text-lg font-bold italic pt-1 text-slate-700">{optText}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="p-8 bg-slate-50 border-t flex justify-end">
            <Button onClick={nextOrFinish} disabled={!sessionAnswers[questionDetails?.id]?.length || isSubmitting} className="h-16 px-12 bg-[#1e3a8a] rounded-2xl font-black uppercase tracking-widest shadow-xl group">
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <>{currentSessionIdx < filteredMistakes.length - 1 ? "SUIVANT" : "TERMINER LA PURGE"} <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" /></>}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- RENDU MODE ANALYSE ---
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header Analyse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-xl border-2 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl hover:bg-slate-50 border-2 shadow-sm">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div className="flex items-center gap-3">
             <Search className="h-8 w-8 text-[#1e3a8a]" />
             <h1 className="text-3xl font-black text-[#1e3a8a] italic uppercase tracking-tighter">ANALYSE DÉTAILLÉE</h1>
          </div>
        </div>

        <Tabs value={activeTheme} onValueChange={(v) => setActiveTheme(v as KillMistakeSource)} className="w-full md:w-auto">
          <TabsList className="bg-slate-50 p-1 rounded-2xl h-14 border-2 grid grid-cols-2 md:flex">
            <TabsTrigger value="all" className="rounded-xl font-black italic uppercase text-[10px] px-6">Tous</TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-xl font-black italic uppercase text-[10px] px-6">Matrice</TabsTrigger>
            <TabsTrigger value="practice" className="rounded-xl font-black italic uppercase text-[10px] px-6">Pratique</TabsTrigger>
            <TabsTrigger value="exam" className="rounded-xl font-black italic uppercase text-[10px] px-6">Examens</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="bg-white h-12 rounded-xl font-bold italic border-2 w-40 text-xs"><SelectValue placeholder="Domaines" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous Domaines</SelectItem>
              <SelectItem value="People">People</SelectItem>
              <SelectItem value="Process">Processus</SelectItem>
              <SelectItem value="Business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Badge className="h-12 px-5 rounded-xl border-2 font-black italic text-sm bg-white text-slate-900">{filteredMistakes.length} Q</Badge>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Liste Gauche */}
        <div className="lg:col-span-4 bg-white rounded-[32px] shadow-lg border-2 overflow-hidden flex flex-col h-full">
           <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredMistakes.map((m) => (
                <Card 
                  key={m.id} 
                  className={cn(
                    "cursor-pointer transition-all border-2 rounded-2xl p-5 group",
                    selectedMistake?.id === m.id ? 'border-[#1e3a8a] bg-blue-50/20 shadow-md' : 'border-slate-100 hover:border-blue-200'
                  )}
                  onClick={() => setSelectedMistake(m)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="destructive" className="font-black italic px-2 py-0.5 text-[9px] uppercase">{m.wrongCount} ÉCHECS</Badge>
                    <span className="text-[9px] font-black uppercase text-slate-400 italic tracking-widest">{m.tags?.approach || 'AGILE'}</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 italic truncate uppercase tracking-tight">ID: {m.questionId.substring(0, 10)}...</p>
                </Card>
              ))}
              {filteredMistakes.length === 0 && (
                <div className="text-center py-20 text-slate-300 font-black uppercase italic text-xs">Aucune erreur trouvée.</div>
              )}
           </div>
        </div>

        {/* Détail Droite */}
        <div className="lg:col-span-8 bg-white rounded-[40px] shadow-2xl border-none overflow-hidden flex flex-col h-full relative">
          {!selectedMistake ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 px-10">
              <Search className="h-20 w-20 mb-6 text-slate-400" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-800">DÉTAILS DE LA QUESTION</h2>
              <p className="text-lg font-bold italic text-slate-400 mt-2">Sélectionnez une question à gauche pour l'analyser.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
               <CardHeader className="p-10 pb-4 shrink-0">
                 <CardTitle className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">VOTRE HISTORIQUE SUR CETTE QUESTION</CardTitle>
               </CardHeader>
               <CardContent className="p-10 pt-0 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                  {isLoadingDetails ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div> : questionDetails && (
                    <>
                      <div className="p-10 bg-slate-50/50 rounded-[40px] border-2 border-slate-100 shadow-inner">
                        <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest ml-2">Tous les choix proposés</h4>
                        <div className="grid gap-3">
                          {(questionDetails.choices || questionDetails.options?.map((o:any)=>o.text) || []).map((optText: string, idx: number) => {
                            const choiceId = String(idx + 1);
                            const isUserChoice = (selectedMistake.lastSelectedChoiceIds || []).includes(choiceId);
                            const isCorrectChoice = (questionDetails.correctOptionIds || [String(questionDetails.correctChoice)]).includes(choiceId);

                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "p-5 rounded-2xl border-2 flex items-start gap-5 transition-all",
                                  isCorrectChoice ? "border-emerald-500 bg-emerald-50 shadow-sm" : 
                                  isUserChoice ? "border-red-500 bg-red-50" : "border-slate-100 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2 rounded-full",
                                  isCorrectChoice ? "bg-emerald-500 text-white border-emerald-500" : 
                                  isUserChoice ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400"
                                )}>
                                  {isCorrectChoice ? <Check className="h-5 w-5" /> : isUserChoice ? <XCircle className="h-5 w-5" /> : String.fromCharCode(65 + idx)}
                                </div>
                                <div className="flex-1">
                                  <p className={cn("text-lg font-bold italic pt-1", isCorrectChoice ? "text-emerald-900" : isUserChoice ? "text-red-900" : "text-slate-500")}>
                                    {optText}
                                  </p>
                                  {isCorrectChoice && <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">BONNE RÉPONSE</span>}
                                  {isUserChoice && !isCorrectChoice && <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">VOTRE DERNIER ÉCHEC</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-10 bg-white rounded-[32px] border-2 border-slate-100 shadow-xl space-y-6 relative overflow-hidden">
                         <div className="absolute top-0 left-0 h-full w-2 bg-indigo-500" />
                         <div className="flex items-center gap-3 text-indigo-600 mb-2">
                            <Info className="h-6 w-6" />
                            <h4 className="font-black uppercase italic tracking-widest text-sm">JUSTIFICATION DU MINDSET PMI®</h4>
                         </div>
                         <p className="text-lg font-bold italic text-slate-600 leading-relaxed whitespace-pre-wrap">{questionDetails.explanation}</p>
                      </div>
                    </>
                  )}
               </CardContent>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KillMistakesPage() {
  return <Suspense fallback={<Loader2 className="animate-spin" />}><KillMistakesContent /></Suspense>;
}
