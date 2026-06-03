"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Check,
  RotateCcw,
  Home
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { startTrainingSession, submitPracticeAnswer } from '@/lib/services/practice-service';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type KillMistakeSource = 'matrix' | 'practice' | 'exams' | 'all';

function KillMistakesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const mode = searchParams.get('mode') || 'analyze';
  const initialTheme = (searchParams.get('theme') as KillMistakeSource) || 'all';
  const initialCount = parseInt(searchParams.get('count') || '10');

  const [activeTheme, setActiveTheme] = useState<KillMistakeSource>(initialTheme);
  const [filterDomain, setFilterDomain] = useState('all');

  // State Analyse
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // State Session
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string[]>>({});
  const [sessionStep, setStep] = useState<'intro' | 'session' | 'summary' | 'review'>('intro');
  const [sessionResults, setSessionResults] = useState<{correct: number, total: number} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Fetch Errors List
  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakesData, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);
  
  const filteredMistakes = useMemo(() => {
    let list = mistakesData || [];
    if (activeTheme !== 'all') {
      list = list.filter(m => {
        if (activeTheme === 'practice') {
          return m.sourceType === 'practice' || m.sourceType === 'training' || !m.sourceType;
        }
        if (activeTheme === 'exams') {
          return m.sourceType === 'exams' || m.sourceType === 'exam';
        }
        return m.sourceType === activeTheme;
      });
    }
    if (filterDomain !== 'all') {
      list = list.filter(m => m.tags?.domain === filterDomain);
    }
    return list;
  }, [mistakesData, activeTheme, filterDomain]);

  // Load Detail Question for ANALYZE mode
  useEffect(() => {
    async function fetchDetails() {
      if (mode !== 'analyze' || !selectedMistake) {
        setQuestionDetails(null);
        return;
      }
      setIsLoadingDetails(true);
      try {
        const qDoc = await getDoc(doc(db, 'questions', selectedMistake.questionId));
        if (qDoc.exists()) setQuestionDetails({ ...qDoc.data(), id: qDoc.id });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, mode, db]);

  // --- ACTIONS SESSION ---
  const startSession = async () => {
    setIsLoadingSession(true);
    try {
      const questions = await startTrainingSession(db, user!.uid, 'kill_mistake', { 
        sourceType: activeTheme,
        domain: filterDomain
      }, initialCount); 
      
      if (!questions || questions.length === 0) {
        toast({ title: "Aucune question trouvée", description: "Toutes les erreurs de ce type ont peut-être été corrigées ou supprimées." });
        setStep('intro');
        return;
      }

      setSessionQuestions(questions);
      setStep('session');
      setCurrentIdx(0);
      setSessionAnswers({});
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleToggleAnswer = (choiceId: string, isMultiple: boolean) => {
    const qId = sessionQuestions[currentIdx]?.id;
    if (!qId) return;
    const current = sessionAnswers[qId] || [];
    if (isMultiple) {
      setSessionAnswers({ 
        ...sessionAnswers, 
        [qId]: current.includes(choiceId) ? current.filter(id => id !== choiceId) : [...current, choiceId] 
      });
    } else {
      setSessionAnswers({ ...sessionAnswers, [qId]: [choiceId] });
    }
  };

  const handleFinishSession = async () => {
    setIsSubmitting(true);
    let correct = 0;
    const batch = writeBatch(db);

    sessionQuestions.forEach(q => {
      const userChoices = sessionAnswers[q.id] || [];
      const correctOptionIds = (q.correctOptionIds || [String(q.correctChoice || "1")]).map(String);
      const isCorrect = userChoices.length === correctOptionIds.length && userChoices.every(id => correctOptionIds.includes(id));

      if (isCorrect) correct++;

      const kmRef = doc(db, 'users', user!.uid, 'killMistakes', q.id);
      if (isCorrect) {
        batch.set(kmRef, { status: 'corrected', lastCorrectAt: serverTimestamp() }, { merge: true });
      } else {
        batch.set(kmRef, { 
          wrongCount: increment(1), 
          lastWrongAt: serverTimestamp(),
          lastSelectedChoiceIds: userChoices 
        }, { merge: true });
      }
    });

    try {
      await batch.commit();
      setSessionResults({ correct, total: sessionQuestions.length });
      setStep('summary');
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMistakes) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  // --- RENDU MODE SESSION (SPRINT) ---
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
              <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-tight">Sprint de Remédiation</h1>
              <p className="text-blue-100/70 font-bold italic text-lg max-w-xl mx-auto leading-relaxed">
                Purger <span className="text-white font-black underline underline-offset-4">{initialCount === 0 ? filteredMistakes.length : Math.min(initialCount, filteredMistakes.length)} questions</span> du silo {activeTheme.toUpperCase()}.
                <br/>Répondez à tout pour obtenir votre note finale.
              </p>
            </div>
            <Button size="lg" onClick={startSession} disabled={isLoadingSession} className="h-20 px-16 rounded-[28px] bg-white text-[#1e3a8a] hover:bg-blue-50 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform relative z-10">
              {isLoadingSession ? <Loader2 className="animate-spin h-8 w-8" /> : "LANCER LA SESSION"}
            </Button>
          </Card>
        </div>
      );
    }
    
    if (sessionStep === 'summary' && sessionResults) {
      const score = Math.round((sessionResults.correct / sessionResults.total) * 100);
      return (
        <div className="max-w-2xl mx-auto py-24 text-center space-y-10 animate-fade-in px-4">
          <Card className="rounded-[40px] shadow-2xl border-none p-16 space-y-10 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Session Terminée</h1>
              <div className="py-8">
                <p className="text-8xl font-black text-primary italic tracking-tighter">{score}%</p>
                <p className="text-lg font-bold text-slate-400 uppercase tracking-widest mt-2 italic">
                  {sessionResults.correct} / {sessionResults.total} QUESTIONS RÉUSSIES
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-16 rounded-2xl border-4 font-black uppercase italic text-xs tracking-widest"><Link href="/dashboard/kill-mistakes?mode=analyze&theme=all">Analyse détaillée</Link></Button>
              <Button asChild className="h-16 rounded-2xl bg-slate-900 text-white font-black uppercase italic tracking-widest shadow-xl"><Link href="/dashboard/kill-mistake-selection">Tableau de bord</Link></Button>
            </div>
          </Card>
        </div>
      );
    }

    const q = sessionQuestions[currentIdx];
    if (!q) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    const progress = ((currentIdx + 1) / sessionQuestions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
          <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic">Q {currentIdx + 1} / {sessionQuestions.length}</Badge>
          <Progress value={progress} className="w-48 h-3 rounded-full" />
          <div className="bg-[#1e3a8a] text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase italic">MODE SPRINT</div>
        </div>

        <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-[#1e3a8a] overflow-hidden bg-white min-h-[400px]">
          <CardContent className="p-10 space-y-10">
            <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{q.statement || q.text}</p>
            
            <div className="grid gap-4">
              {(q.choices || q.options?.map((o:any)=>o.text) || []).map((optText: string, idx: number) => {
                const choiceId = String(idx + 1);
                const isSelected = (sessionAnswers[q.id] || []).includes(choiceId);
                
                return (
                  <button 
                    key={idx} 
                    onClick={() => handleToggleAnswer(choiceId, q.isMultipleCorrect)} 
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all text-left flex items-start gap-5 shadow-sm",
                      isSelected ? "border-[#1e3a8a] bg-blue-50/30 scale-[1.01]" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2",
                      q.isMultipleCorrect ? "rounded-xl" : "rounded-full",
                      isSelected ? "bg-[#1e3a8a] text-white border-[#1e3a8a]" : "bg-white text-slate-400"
                    )}>{String.fromCharCode(65 + idx)}</div>
                    <span className={cn("flex-1 text-lg font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>{optText}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50 border-t flex justify-between gap-4">
            <Button 
              variant="outline" 
              className="h-14 px-8 rounded-xl font-black uppercase italic border-2" 
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
            >
              Précédent
            </Button>
            
            {currentIdx === sessionQuestions.length - 1 ? (
              <Button 
                onClick={handleFinishSession} 
                disabled={isSubmitting || !sessionAnswers[q.id]?.length} 
                className="h-16 px-12 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black uppercase tracking-widest shadow-xl"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "TERMINER ET NOTER"}
              </Button>
            ) : (
              <Button 
                onClick={() => setCurrentIdx(currentIdx + 1)} 
                disabled={!sessionAnswers[q.id]?.length} 
                className="h-16 px-12 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest shadow-xl group"
              >
                Suivant <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // --- RENDU MODE ANALYSE ---
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-6 animate-fade-in max-w-7xl mx-auto">
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
            <TabsTrigger value="exams" className="rounded-xl font-black italic uppercase text-[10px] px-6">Examens</TabsTrigger>
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
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
                            const isUserChoice = (selectedMistake.lastSelectedChoiceIds || []).map(String).includes(choiceId);
                            const isCorrectChoice = (questionDetails.correctOptionIds || [String(questionDetails.correctChoice)]).map(String).includes(choiceId);

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
  return (
    <Suspense fallback={<Loader2 className="animate-spin" />}>
      <KillMistakesContent />
    </Suspense>
  );
}