
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
  Tags,
  ChevronLeft,
  Target,
  Layers,
  Zap,
  BookOpen,
  Search,
  Filter,
  Play,
  ChevronRight,
  Trophy,
  LayoutGrid
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

// 8 Mock Mistakes for Demo Mode
const MOCK_MISTAKES = [
  { id: 'm1', questionId: 'demo-q1', tags: { domain: 'People', approach: 'Agile', difficulty: 'Hard' }, status: 'wrong', wrongCount: 2, lastSelectedChoiceId: 'A' },
  { id: 'm2', questionId: 'demo-q2', tags: { domain: 'People', approach: 'Hybrid', difficulty: 'Medium' }, status: 'wrong', wrongCount: 1, lastSelectedChoiceId: 'C' },
  { id: 'm3', questionId: 'demo-q3', tags: { domain: 'Process', approach: 'Predictive', difficulty: 'Easy' }, status: 'wrong', wrongCount: 3, lastSelectedChoiceId: 'D' },
  { id: 'm4', questionId: 'demo-q4', tags: { domain: 'Process', approach: 'Predictive', difficulty: 'Medium' }, status: 'wrong', wrongCount: 1, lastSelectedChoiceId: 'B' },
  { id: 'm5', questionId: 'demo-q5', tags: { domain: 'Process', approach: 'Agile', difficulty: 'Hard' }, status: 'wrong', wrongCount: 2, lastSelectedChoiceId: 'A' },
  { id: 'm6', questionId: 'demo-q6', tags: { domain: 'Business', approach: 'Hybrid', difficulty: 'Medium' }, status: 'wrong', wrongCount: 1, lastSelectedChoiceId: 'C' },
  { id: 'm7', questionId: 'demo-q7', tags: { domain: 'Process', approach: 'Agile', difficulty: 'Medium' }, status: 'wrong', wrongCount: 4, lastSelectedChoiceId: 'D' },
  { id: 'm8', questionId: 'demo-q8', tags: { domain: 'People', approach: 'Predictive', difficulty: 'Hard' }, status: 'wrong', wrongCount: 1, lastSelectedChoiceId: 'B' },
];

const MOCK_QUESTION_DETAILS: Record<string, any> = {
  'demo-q1': {
    statement: "Une équipe agile rencontre des difficultés à s'auto-organiser. Le Scrum Master remarque que deux membres attendent systématiquement des instructions. Que doit faire le Scrum Master ?",
    options: [
      { id: 'A', text: 'Assigner des tâches spécifiques à ces membres pour maintenir la vélocité.' },
      { id: 'B', text: 'Faciliter une discussion lors de la rétrospective pour encourager l\'auto-organisation.' },
      { id: 'C', text: 'Demander au Product Owner de définir les priorités individuelles.' },
      { id: 'D', text: 'Remplacer les membres par des profils plus expérimentés.' }
    ],
    correctOptionIds: ['B'],
    explanation: "Le Mindset Agile privilégie la facilitation plutôt que l'attribution de tâches. Le Scrum Master doit aider l'équipe à trouver ses propres solutions via des cérémonies comme la rétrospective.",
  },
  'demo-q2': {
    statement: "Dans un projet hybride, un changement majeur est demandé sur la partie prédictive. Le budget est fixe. Quelle est la première action ?",
    options: [
      { id: 'A', text: 'Refuser le changement immédiatement.' },
      { id: 'B', text: 'Mettre à jour le registre des risques.' },
      { id: 'C', text: 'Analyser l\'impact du changement sur les objectifs du projet.' },
      { id: 'D', text: 'Soumettre directement au CCB (Change Control Board).' }
    ],
    correctOptionIds: ['C'],
    explanation: "Avant toute action (soumission au CCB ou mise à jour de documents), le chef de projet doit évaluer l'impact sur le périmètre, le temps et le coût.",
  },
  'demo-q3': {
    statement: "Le registre des parties prenantes n'est pas à jour. Une partie prenante influente se plaint de ne pas être informée. Que faites-vous ?",
    options: [
      { id: 'A', text: 'L\'ignorer car elle n\'était pas dans le plan initial.' },
      { id: 'B', text: 'Lui envoyer tous les rapports passés.' },
      { id: 'C', text: 'Rencontrer la partie prenante pour comprendre ses besoins en information.' },
      { id: 'D', text: 'Mettre à jour le plan de communication sans la consulter.' }
    ],
    correctOptionIds: ['C'],
    explanation: "La gestion des parties prenantes repose sur l'engagement proactif. Il faut d'abord comprendre leurs attentes avant de modifier les plans.",
  },
  'default': {
    statement: "Ceci est une question de démonstration PMP®. Analysez la situation et choisissez la réponse conforme au mindset PMI.",
    options: [
      { id: 'A', text: 'Option réactive (non recommandée).' },
      { id: 'B', text: 'Option proactive et collaborative (Bonne réponse).' },
      { id: 'C', text: 'Escalade immédiate au sponsor.' },
      { id: 'D', text: 'Ignorer le problème.' }
    ],
    correctOptionIds: ['B'],
    explanation: "Le chef de projet PMP est un leader serviteur qui privilégie la résolution de problèmes et la collaboration.",
  }
};

function KillMistakesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;
  
  const mode = searchParams.get('mode') || 'analyze';
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterApproach, setFilterApproach] = useState('all');

  // Common State
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Redo Interactive Browser State
  const [interactiveSelectedChoice, setInteractiveSelectedChoice] = useState<string | null>(null);
  const [interactiveResult, setInteractiveResult] = useState<any | null>(null);

  // Linear Session State
  const [isSessionActive, setIsSessionActive] = useState(mode === 'session');
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, string>>({});
  const [sessionStep, setStep] = useState<'intro' | 'session' | 'summary' | 'review'>(mode === 'session' ? 'intro' : 'intro');
  const [sessionResults, setSessionResults] = useState<{correct: number, total: number, history: any[]} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mistakesQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user, isDemo]);

  const { data: mistakesData, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);
  
  const filteredMistakes = useMemo(() => {
    let list = isDemo ? MOCK_MISTAKES : (mistakesData || []);
    if (filterDomain !== 'all') {
      list = list.filter(m => m.tags?.domain === filterDomain);
    }
    if (filterApproach !== 'all') {
      list = list.filter(m => m.tags?.approach === filterApproach);
    }
    return list;
  }, [mistakesData, isDemo, filterDomain, filterApproach]);

  // Load Question Details
  useEffect(() => {
    async function fetchDetails() {
      let targetMistake = null;
      if (sessionStep === 'session' || sessionStep === 'review') {
        targetMistake = filteredMistakes[currentSessionIdx];
      } else {
        targetMistake = selectedMistake;
      }

      if (!targetMistake) {
        setQuestionDetails(null);
        return;
      }

      setIsLoadingDetails(true);
      try {
        if (isDemo) {
          const mock = MOCK_QUESTION_DETAILS[targetMistake.questionId] || MOCK_QUESTION_DETAILS['default'];
          setQuestionDetails({ ...mock, id: targetMistake.questionId, tags: targetMistake.tags });
        } else {
          const qDoc = await getDoc(doc(db, 'questions', targetMistake.questionId));
          if (qDoc.exists()) setQuestionDetails(qDoc.data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, currentSessionIdx, sessionStep, db, isDemo, filteredMistakes]);

  // Reset logic
  useEffect(() => {
    setSelectedMistake(null);
    setInteractiveSelectedChoice(null);
    setInteractiveResult(null);
  }, [filterDomain, filterApproach, mode]);

  const startSession = () => {
    if (filteredMistakes.length === 0) return;
    setSessionAnswers({});
    setCurrentSessionIdx(0);
    setStep('session');
    setIsSessionActive(true);
  };

  const handleInteractiveAnswer = async (choiceId: string) => {
    if (interactiveResult || isSubmitting) return;
    setInteractiveSelectedChoice(choiceId);
    setIsSubmitting(true);
    try {
      let res;
      if (isDemo) {
        const mock = MOCK_QUESTION_DETAILS[selectedMistake.questionId] || MOCK_QUESTION_DETAILS['default'];
        res = { 
          isCorrect: mock.correctOptionIds.includes(choiceId), 
          explanation: mock.explanation, 
          correctOptionIds: mock.correctOptionIds 
        };
      } else {
        res = await submitPracticeAnswer(db, user!.uid, selectedMistake.questionId, choiceId);
      }
      setInteractiveResult(res);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
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
          const userChoice = sessionAnswers[m.questionId];
          let res;
          if (isDemo) {
            const mock = MOCK_QUESTION_DETAILS[m.questionId] || MOCK_QUESTION_DETAILS['default'];
            res = { isCorrect: mock.correctOptionIds.includes(userChoice), explanation: mock.explanation, correctOptionIds: mock.correctOptionIds };
          } else {
            res = await submitPracticeAnswer(db, user!.uid, m.questionId, userChoice);
          }
          if (res.isCorrect) correct++;
          history.push({ mistake: m, userChoice, correction: res });
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

  // --- 1. SESSION MODE (LINEAR) ---
  if (mode === 'session') {
    if (sessionStep === 'intro') {
      return (
        <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
          <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px] h-8">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="mr-2 h-3 w-3" /> Retour</Link>
          </Button>
          <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 text-center space-y-8 overflow-hidden relative">
            <div className="absolute -top-10 -right-10 bg-primary/10 h-40 w-40 rounded-full" />
            <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
              <Zap className="h-12 w-12 text-primary fill-primary ml-1" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Session d'Entraînement</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Parcours de réussite linéaire</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex-1 space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Domaine</Label>
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
                <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic">Approche</Label>
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
              Vous allez traiter <span className="text-primary font-black">{filteredMistakes.length} questions</span>. Les résultats sont différés à la fin de la session.
            </p>
            <Button size="lg" onClick={startSession} disabled={filteredMistakes.length === 0} className="h-20 px-16 rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-2xl scale-105 transition-transform">
              DÉMARRER LA SESSION
            </Button>
          </Card>
        </div>
      );
    }

    if (sessionStep === 'session') {
      const q = filteredMistakes[currentSessionIdx];
      const selectedChoice = sessionAnswers[q?.questionId];
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8 px-4">
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic">QUESTION {currentSessionIdx + 1} / {filteredMistakes.length}</Badge>
            <Button variant="ghost" onClick={() => { if(confirm("Abandonner ?")) setStep('intro'); }} className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Abandonner</Button>
          </div>
          <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-primary overflow-hidden bg-white">
            <CardContent className="p-10 space-y-8">
              {isLoadingDetails ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
              ) : questionDetails && (
                <>
                  <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                  <div className="grid gap-4">
                    {questionDetails.options?.map((opt: any, idx: number) => (
                      <div key={opt.id} onClick={() => setSessionAnswers({ ...sessionAnswers, [q.questionId]: opt.id })} className={cn("p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-5 shadow-sm", selectedChoice === opt.id ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300")}>
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2", selectedChoice === opt.id ? "bg-primary text-white border-primary" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                        <p className={cn("flex-1 text-lg font-bold italic pt-1", selectedChoice === opt.id ? "text-slate-900" : "text-slate-600")}>{opt.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-end">
              <Button onClick={handleSessionNext} disabled={!selectedChoice || isSubmitting} className="h-16 px-12 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-xl text-lg group">
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
              <Button variant="outline" className="w-full h-16 rounded-2xl border-4 font-black uppercase tracking-widest text-lg italic" onClick={() => setStep('intro')}>Nouvelle Session</Button>
            </div>
          </Card>
        </div>
      );
    }

    if (sessionStep === 'review') {
      const entry = sessionResults!.history[currentSessionIdx];
      const { userChoice, correction: corr } = entry;
      const isUserCorrect = corr.isCorrect;
      return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8 px-4">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
            <Button variant="ghost" className="font-black italic uppercase tracking-widest" onClick={() => setStep('summary')}><ChevronLeft className="mr-2 h-4 w-4" /> Score</Button>
            <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1">REVUE {currentSessionIdx + 1} / {sessionResults!.history.length}</Badge>
            <Badge className={isUserCorrect ? "bg-emerald-500" : "bg-red-500"}>{isUserCorrect ? "CORRECT" : "ERREUR"}</Badge>
          </div>
          <Card className={cn("shadow-2xl border-t-8 rounded-[32px] overflow-hidden bg-white", isUserCorrect ? "border-t-emerald-500" : "border-t-red-500")}>
            <CardContent className="p-10 space-y-8">
              {isLoadingDetails ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
              ) : (
                <>
                  <p className="text-xl font-black text-slate-800 italic leading-relaxed">{questionDetails?.statement || questionDetails?.text}</p>
                  <div className="grid gap-3">
                    {questionDetails?.options?.map((opt: any, idx: number) => {
                      const isSelected = userChoice === opt.id;
                      const isCorrect = corr.correctOptionIds?.includes(opt.id);
                      return (
                        <div key={opt.id} className={cn("p-5 rounded-2xl border-2 flex items-start gap-4 shadow-sm", isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "border-slate-100")}>
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2", isCorrect ? "bg-emerald-500 text-white border-emerald-500" : isSelected ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400")}>{String.fromCharCode(65 + idx)}</div>
                          <p className={cn("flex-1 text-sm font-bold italic pt-1", isCorrect ? "text-emerald-900" : isSelected ? "text-red-900" : "text-slate-600")}>{opt.text}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary shadow-inner">
                    <h4 className="font-black text-primary uppercase italic text-xs mb-4 flex items-center gap-2"><Info className="h-4 w-4" /> Justification du Mindset</h4>
                    <p className="text-lg font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">{corr.explanation}</p>
                  </div>
                </>
              )}
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

  // --- 2. BROWSER MODE (ANALYZE OR REDO INTERACTIVE) ---
  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto py-4 px-4 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-xl border-2 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl hover:bg-slate-50 border-2 shadow-sm">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-primary italic uppercase tracking-tighter">
              {mode === 'analyze' ? (
                <><Search className="h-10 w-10 text-accent" /> Analyse des erreurs</>
              ) : (
                <><LayoutGrid className="h-10 w-10 text-emerald-500" /> Refaire les questions</>
              )}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] italic mt-0.5">
              {mode === 'analyze' ? 'Comprenez vos échecs passés' : 'Transformez vos erreurs en points forts (Mode Libre)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-50 p-2 px-4 rounded-2xl border-2">
            <div className="space-y-0.5">
              <Label className="font-black uppercase text-[8px] tracking-widest text-slate-400 italic">Domaine</Label>
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="bg-white h-8 rounded-lg font-bold italic border-2 text-[10px] w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="People">People</SelectItem>
                  <SelectItem value="Process">Processus</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="font-black uppercase text-[8px] tracking-widest text-slate-400 italic">Approche</Label>
              <Select value={filterApproach} onValueChange={setFilterApproach}>
                <SelectTrigger className="bg-white h-8 rounded-lg font-bold italic border-2 text-[10px] w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="Predictive">Waterfall</SelectItem>
                  <SelectItem value="Agile">Agile</SelectItem>
                  <SelectItem value="Hybrid">Hybride</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Badge variant="outline" className="h-12 px-6 rounded-2xl border-2 font-black italic uppercase flex items-center gap-2 bg-white shadow-sm">
            <Target className="h-4 w-4" /> {filteredMistakes.length} DISPONIBLES
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Sidebar List */}
        <Card className="lg:col-span-1 rounded-[32px] shadow-lg border-none overflow-hidden h-full flex flex-col">
          <CardHeader className="bg-muted/30 border-b p-4">
            <CardTitle className="text-[9px] font-black uppercase tracking-widest italic text-slate-500">
              QUESTIONS FILTRÉES ({filteredMistakes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
            {filteredMistakes.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic font-bold uppercase text-[10px]">Aucune erreur.</div>
            ) : filteredMistakes.map((mistake) => (
              <Card 
                key={mistake.id} 
                className={cn(
                  "cursor-pointer transition-all border-2 rounded-xl hover:border-primary/40 p-3",
                  selectedMistake?.id === mistake.id ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-slate-100'
                )}
                onClick={() => {
                  setSelectedMistake(mistake);
                  setInteractiveResult(null);
                  setInteractiveSelectedChoice(null);
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <Badge variant="destructive" className="font-black italic px-1.5 py-0 text-[8px]">
                    {mistake.wrongCount} ÉCHECS
                  </Badge>
                  <span className="text-[8px] font-black uppercase text-slate-400">{getApproachLabel(mistake.tags?.approach || '')}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 line-clamp-1 italic">Q-{mistake.questionId.substring(0, 12)}</p>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card className="lg:col-span-2 rounded-[32px] shadow-2xl border-none overflow-hidden h-full flex flex-col bg-white">
          {!selectedMistake ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[60px] border-4 border-dashed border-slate-100 shadow-inner">
              <div className="bg-amber-100/50 p-6 rounded-full mb-4">
                <Brain className="h-12 w-12 text-amber-500 opacity-40" />
              </div>
              <h3 className="text-xl font-black text-slate-400 italic uppercase tracking-tighter">Choisissez une question</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">Sélectionnez un échec à gauche.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden animate-slide-up">
              <CardHeader className="p-6 pb-2 border-b shrink-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-black text-slate-900 italic tracking-tight">
                    {mode === 'analyze' ? "Détails de l'échec" : "Action Corrective"}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic mt-0.5">
                    {mode === 'analyze' ? "Étudiez la logique corrective." : "Ancrer le mindset PMI pour transformer cet échec en réussite."}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full border-2 h-10 w-10" onClick={() => { setInteractiveResult(null); setInteractiveSelectedChoice(null); }}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                {isLoadingDetails ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                ) : questionDetails && (
                  <>
                    <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 shadow-inner space-y-2">
                      <h4 className="font-black flex items-center gap-2 text-slate-900 uppercase text-[9px] tracking-widest italic">
                        <Info className="h-3 w-3" /> ÉNONCÉ
                      </h4>
                      <p className="text-lg font-bold text-slate-700 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                    </div>

                    {mode === 'analyze' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl border-l-8 border-l-red-500 bg-red-50/50 shadow-sm space-y-1">
                            <h5 className="text-[8px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1 italic"><XCircle className="h-3 w-3" /> Votre réponse</h5>
                            <p className="font-bold text-sm text-slate-800 italic">Choix {selectedMistake.lastSelectedChoiceId}</p>
                          </div>
                          <div className="p-4 rounded-2xl border-l-8 border-l-emerald-500 bg-emerald-50/50 shadow-sm space-y-1">
                            <h5 className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 italic"><CheckCircle2 className="h-3 w-3" /> Bonne réponse</h5>
                            <p className="font-bold text-sm text-slate-800 italic">Choix {questionDetails.correctOptionIds?.join(', ')}</p>
                          </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t-2 border-slate-50">
                          <h4 className="font-black flex items-center gap-2 text-primary uppercase text-[10px] tracking-widest italic">
                            <Brain className="h-5 w-5 text-accent" /> Mindset PMI & Justification
                          </h4>
                          <div className="bg-slate-50 p-6 rounded-[24px] border-2 border-slate-100 shadow-inner italic font-bold text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                            {questionDetails.explanation?.correctRationale || questionDetails.explanation}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-3">
                          {questionDetails.options?.map((opt: any, idx: number) => {
                            const isSelected = interactiveSelectedChoice === opt.id;
                            const isCorrect = interactiveResult?.correctOptionIds?.includes(opt.id);
                            return (
                              <div 
                                key={opt.id} 
                                onClick={() => handleInteractiveAnswer(opt.id)}
                                className={cn(
                                  "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 shadow-sm",
                                  interactiveResult ? (
                                    isCorrect ? "border-emerald-500 bg-emerald-50" : isSelected ? "border-red-500 bg-red-50" : "border-slate-100 opacity-50"
                                  ) : (
                                    isSelected ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300"
                                  )
                                )}
                              >
                                <div className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 border-2",
                                  interactiveResult ? (
                                    isCorrect ? "bg-emerald-500 text-white border-emerald-500" : isSelected ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400"
                                  ) : (
                                    isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400"
                                  )
                                )}>{String.fromCharCode(65 + idx)}</div>
                                <p className={cn("flex-1 text-sm font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>{opt.text}</p>
                              </div>
                            );
                          })}
                        </div>

                        {interactiveResult && (
                          <div className="p-6 bg-slate-50 rounded-[24px] border-l-8 border-l-primary shadow-inner animate-slide-up">
                            <h4 className="font-black text-primary uppercase italic text-[10px] mb-3 flex items-center gap-2">
                              <Info className="h-4 w-4" /> Justification du Mindset
                            </h4>
                            <p className="text-sm font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {interactiveResult.explanation}
                            </p>
                          </div>
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
  return (
    <Suspense fallback={<div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <KillMistakesContent />
    </Suspense>
  );
}
