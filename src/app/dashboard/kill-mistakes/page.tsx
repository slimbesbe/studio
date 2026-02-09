
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
  Play,
  Tags,
  ChevronLeft,
  Target,
  Layers,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { submitPracticeAnswer } from '@/lib/services/practice-service';
import { useToast } from '@/hooks/use-toast';

const MOCK_MISTAKES = [
  { id: 'm1', questionId: 'demo1', tags: { domain: 'People', approach: 'Agile', difficulty: 'Medium' }, status: 'wrong', wrongCount: 2, lastSelectedChoiceId: 'B' },
  { id: 'm2', questionId: 'demo2', tags: { domain: 'People', approach: 'Hybrid', difficulty: 'Hard' }, status: 'wrong', wrongCount: 1, lastSelectedChoiceId: 'A' },
  { id: 'm3', questionId: 'demo3', tags: { domain: 'Process', approach: 'Predictive', difficulty: 'Easy' }, status: 'wrong', wrongCount: 3, lastSelectedChoiceId: 'C' },
];

function KillMistakesContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;
  const mode = searchParams.get('mode') || 'analyze'; // 'analyze' or 'redo'

  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Redo mode states
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [correction, setCorrection] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mistakesQuery = useMemoFirebase(() => {
    if (!user || isDemo) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user, isDemo]);

  const { data: mistakesData, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);
  const mistakes = isDemo ? MOCK_MISTAKES : (mistakesData || []);

  const stats = useMemo(() => {
    const byDomain: Record<string, number> = { 'People': 0, 'Process': 0, 'Business': 0 };
    const byApproach: Record<string, number> = { 'Predictive': 0, 'Agile': 0, 'Hybrid': 0 };
    mistakes.forEach(m => {
      if (m.tags?.domain && byDomain[m.tags.domain] !== undefined) byDomain[m.tags.domain]++;
      if (m.tags?.approach && byApproach[m.tags.approach] !== undefined) byApproach[m.tags.approach]++;
    });
    return { total: mistakes.length, byDomain, byApproach };
  }, [mistakes]);

  useEffect(() => {
    async function fetchDetails() {
      if (!selectedMistake) return;
      setIsLoadingDetails(true);
      setSelectedChoice(null);
      setCorrection(null);
      try {
        if (isDemo) {
          // Mock details for demo questions
          setQuestionDetails({
            id: selectedMistake.questionId,
            statement: "Ceci est un exemple de question PMP® pour le mode démo. Comment réagissez-vous face à ce conflit ?",
            options: [
              { id: 'A', text: 'Ignorer le problème.' },
              { id: 'B', text: 'Collaborer pour trouver une solution.' },
              { id: 'C', text: 'Imposer votre décision.' },
              { id: 'D', text: 'Transférer au sponsor.' }
            ],
            correctOptionIds: ['B'],
            explanation: "Le mindset PMI privilégie toujours la collaboration et la résolution directe des problèmes par le chef de projet.",
            tags: selectedMistake.tags
          });
        } else {
          const qDoc = await getDoc(doc(db, 'questions', selectedMistake.questionId));
          if (qDoc.exists()) setQuestionDetails(qDoc.data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, db, isDemo]);

  const handleRedoSubmit = async () => {
    if (!selectedChoice || isSubmitting || isDemo) {
      if (isDemo && selectedChoice) {
        setCorrection({ isCorrect: selectedChoice === 'B', correctOptionIds: ['B'], explanation: questionDetails.explanation });
      }
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitPracticeAnswer(db, user!.uid, selectedMistake.questionId, selectedChoice);
      setCorrection(res);
      if (res.isCorrect) {
        toast({ title: "Bravo !", description: "Erreur corrigée et retirée de la liste." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDomainLabel = (d: string) => d === 'Process' ? 'Processus' : d;
  const getApproachLabel = (a: string) => a === 'Predictive' ? 'Prédictif' : a;

  if (isLoadingMistakes) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto py-8 px-4">
      {/* Navigation & Stats Header */}
      <div className="space-y-6">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
          <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="mr-2 h-4 w-4" /> Retour à la sélection</Link>
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-md bg-white p-4 flex items-center gap-4">
            <div className="bg-primary/10 h-12 w-12 rounded-xl flex items-center justify-center text-primary">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase italic">Total Erreurs</p>
              <p className="text-2xl font-black italic">{stats.total}</p>
            </div>
          </Card>
          <div className="md:col-span-3 grid grid-cols-3 gap-2">
            {Object.entries(stats.byDomain).map(([d, c]) => (
              <Card key={d} className="rounded-2xl border-none shadow-md bg-white p-4 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase italic">{getDomainLabel(d)}</span>
                <Badge variant="secondary" className="font-black bg-emerald-50 text-emerald-700">{c}</Badge>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Question List */}
        <div className="lg:col-span-1">
          <Card className="rounded-[32px] shadow-lg border-none overflow-hidden h-full flex flex-col max-h-[700px]">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest italic text-slate-500">
                {mode === 'analyze' ? 'ANALYSER LES ÉCHECS' : 'RE-RÉPONDRE AUX ÉCHECS'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
              {mistakes.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic font-bold uppercase text-xs">Félicitations ! Aucune erreur.</div>
              ) : mistakes.map((mistake) => (
                <Card 
                  key={mistake.id} 
                  className={cn(
                    "cursor-pointer transition-all border-2 rounded-2xl hover:border-primary/40",
                    selectedMistake?.id === mistake.id ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' : 'border-slate-100'
                  )}
                  onClick={() => setSelectedMistake(mistake)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="destructive" className="font-black italic px-2 py-0.5 text-[10px]">
                        {mistake.wrongCount} ÉCHECS
                      </Badge>
                      <span className="text-[9px] font-black uppercase text-slate-400">{getApproachLabel(mistake.tags?.approach || '')}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 line-clamp-1 italic">Q-{mistake.questionId.substring(0, 8)}</p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {!selectedMistake ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[60px] border-4 border-dashed border-slate-100 shadow-inner">
              <div className="bg-amber-100/50 p-8 rounded-full mb-6">
                <Brain className="h-20 w-20 text-amber-500 opacity-40" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 italic uppercase tracking-tighter">Choisissez une question</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-sm mt-2">Cliquez sur une question à gauche pour {mode === 'analyze' ? 'voir son analyse' : 'tenter de la corriger'}.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-slide-up">
              <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
                <CardHeader className="bg-white p-8 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-black text-slate-900 italic tracking-tight">
                      {mode === 'analyze' ? "Analyse de l'Erreur" : "Action Corrective"}
                    </CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest italic mt-1">Ancrer le mindset PMI pour transformer cet échec en réussite.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full border-2 h-10 w-10" onClick={() => setSelectedMistake(null)}>
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </CardHeader>
                
                <CardContent className="p-8 space-y-8">
                  {isLoadingDetails ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                  ) : questionDetails && (
                    <>
                      <div className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 shadow-inner">
                        <h4 className="font-black mb-3 flex items-center gap-2 text-slate-900 uppercase text-xs tracking-widest italic">
                          <Info className="h-4 w-4 text-primary" /> Énoncé
                        </h4>
                        <p className="text-lg font-bold text-slate-700 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                      </div>

                      {mode === 'analyze' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl border-l-[12px] border-l-red-500 bg-red-50/50 shadow-sm space-y-2">
                              <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 italic">
                                <XCircle className="h-4 w-4" /> Dernier choix
                              </h5>
                              <p className="font-bold text-slate-800 italic">{selectedMistake.lastSelectedChoiceId}</p>
                            </div>
                            <div className="p-6 rounded-3xl border-l-[12px] border-l-emerald-500 bg-emerald-50/50 shadow-sm space-y-2">
                              <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 italic">
                                <CheckCircle2 className="h-4 w-4" /> Bonne réponse
                              </h5>
                              <p className="font-bold text-slate-800 italic">{questionDetails.correctOptionIds?.join(', ')}</p>
                            </div>
                          </div>
                          <div className="space-y-4 pt-6 border-t-2 border-slate-50">
                            <h4 className="font-black flex items-center gap-3 text-primary uppercase text-xs tracking-widest italic">
                              <Brain className="h-6 w-6 text-accent" /> Mindset PMI & Justification
                            </h4>
                            <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 shadow-inner italic font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {questionDetails.explanation?.correctRationale || questionDetails.explanation}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid gap-3">
                            {questionDetails.options?.map((opt: any, idx: number) => {
                              const isSelected = selectedChoice === opt.id;
                              const isCorrect = correction?.correctOptionIds?.includes(opt.id);
                              return (
                                <div 
                                  key={opt.id} 
                                  onClick={() => !correction && setSelectedChoice(opt.id)}
                                  className={cn(
                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 shadow-sm",
                                    isSelected && !correction ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100",
                                    correction && isCorrect ? "border-emerald-500 bg-emerald-50" : "",
                                    correction && isSelected && !isCorrect ? "border-red-500 bg-red-50" : ""
                                  )}
                                >
                                  <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2",
                                    isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400",
                                    correction && isCorrect ? "bg-emerald-500 text-white" : ""
                                  )}>
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <div className={cn("flex-1 text-sm font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>
                                    {opt.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {!correction ? (
                            <Button 
                              onClick={handleRedoSubmit} 
                              disabled={!selectedChoice || isSubmitting} 
                              className="w-full h-14 bg-primary rounded-2xl font-black uppercase tracking-widest shadow-xl"
                            >
                              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Valider la correction"}
                            </Button>
                          ) : (
                            <div className="p-6 bg-slate-50 rounded-3xl border-l-8 border-l-primary animate-slide-up">
                              <h4 className="font-black text-primary uppercase italic text-xs mb-3">Justification</h4>
                              <p className="text-sm font-bold italic text-slate-700 leading-relaxed">{correction.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
