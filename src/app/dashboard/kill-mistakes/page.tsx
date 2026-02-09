
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Filter
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

  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [correction, setCorrection] = useState<any>(null);
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

  const stats = useMemo(() => {
    const byDomain: Record<string, number> = { 'People': 0, 'Process': 0, 'Business': 0 };
    const byApproach: Record<string, number> = { 'Predictive': 0, 'Agile': 0, 'Hybrid': 0 };
    filteredMistakes.forEach(m => {
      if (m.tags?.domain && byDomain[m.tags.domain] !== undefined) byDomain[m.tags.domain]++;
      if (m.tags?.approach && byApproach[m.tags.approach] !== undefined) byApproach[m.tags.approach]++;
    });
    return { total: filteredMistakes.length, byDomain, byApproach };
  }, [filteredMistakes]);

  useEffect(() => {
    async function fetchDetails() {
      if (!selectedMistake) return;
      setIsLoadingDetails(true);
      setSelectedChoice(null);
      setCorrection(null);
      try {
        if (isDemo) {
          const mock = MOCK_QUESTION_DETAILS[selectedMistake.questionId] || MOCK_QUESTION_DETAILS['default'];
          setQuestionDetails({
            ...mock,
            id: selectedMistake.questionId,
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

  // Reset selected question when filters change
  useEffect(() => {
    setSelectedMistake(null);
    setQuestionDetails(null);
  }, [filterDomain, filterApproach]);

  const handleRedoSubmit = async () => {
    if (!selectedChoice || isSubmitting) return;
    
    if (isDemo) {
      const isCorrect = questionDetails.correctOptionIds.includes(selectedChoice);
      setCorrection({ 
        isCorrect, 
        correctOptionIds: questionDetails.correctOptionIds, 
        explanation: questionDetails.explanation 
      });
      if (isCorrect) toast({ title: "Bravo !", description: "Exemple corrigé avec succès." });
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

  const getApproachLabel = (a: string) => {
    if (a === 'Predictive') return 'Waterfall';
    if (a === 'Agile') return 'Agile';
    if (a === 'Hybrid') return 'Hybride';
    return a;
  };

  if (isLoadingMistakes) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-16 w-16 rounded-3xl hover:bg-slate-50 border-2 shadow-sm">
            <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="h-8 w-8" /></Link>
          </Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4 text-primary italic uppercase tracking-tighter">
              {mode === 'analyze' ? (
                <><Search className="h-12 w-12 text-accent" /> Analyse des erreurs</>
              ) : (
                <><BookOpen className="h-12 w-12 text-emerald-500" /> Refaire les questions</>
              )}
            </h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">
              {mode === 'analyze' ? 'Comprenez vos échecs passés' : 'Transformez vos erreurs en points forts'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="h-12 px-6 rounded-2xl border-2 font-black italic uppercase flex items-center gap-2">
            <Target className="h-4 w-4" /> {stats.total} DISPONIBLES
          </Badge>
        </div>
      </div>

      <Card className="rounded-[32px] border-none shadow-lg bg-slate-50 p-6">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic flex items-center gap-2">
              <Layers className="h-3 w-3" /> Filtrer par Domaine
            </Label>
            <Select value={filterDomain} onValueChange={setFilterDomain}>
              <SelectTrigger className="bg-white h-12 rounded-xl font-bold italic border-2">
                <SelectValue placeholder="Tous les domaines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les domaines</SelectItem>
                <SelectItem value="People">People</SelectItem>
                <SelectItem value="Process">Processus</SelectItem>
                <SelectItem value="Business">Business Environment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400 italic flex items-center gap-2">
              <Zap className="h-3 w-3" /> Filtrer par Approche
            </Label>
            <Select value={filterApproach} onValueChange={setFilterApproach}>
              <SelectTrigger className="bg-white h-12 rounded-xl font-bold italic border-2">
                <SelectValue placeholder="Toutes les approches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les approches</SelectItem>
                <SelectItem value="Predictive">Waterfall (Prédictif)</SelectItem>
                <SelectItem value="Agile">Agile</SelectItem>
                <SelectItem value="Hybrid">Hybride</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="bg-white p-2 rounded-xl border-2 text-slate-300">
            <Filter className="h-6 w-6" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="rounded-[32px] shadow-lg border-none overflow-hidden h-full flex flex-col max-h-[700px]">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest italic text-slate-500">
                QUESTIONS FILTRÉES ({filteredMistakes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
              {filteredMistakes.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic font-bold uppercase text-xs">
                  Aucune erreur correspondant aux filtres.
                </div>
              ) : filteredMistakes.map((mistake) => (
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

        <div className="lg:col-span-2">
          {!selectedMistake ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[60px] border-4 border-dashed border-slate-100 shadow-inner">
              <div className="bg-amber-100/50 p-8 rounded-full mb-6">
                <Brain className="h-20 w-20 text-amber-500 opacity-40" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 italic uppercase tracking-tighter">Choisissez une question</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-sm mt-2">
                Cliquez sur une question à gauche pour l'analyser ou la refaire selon le mode choisi.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-slide-up">
              <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
                <CardHeader className="bg-white p-8 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-black text-slate-900 italic tracking-tight">
                      {mode === 'analyze' ? "Détails de l'échec" : "Action Corrective"}
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
                          <Info className="h-4 w-4" /> Énoncé
                        </h4>
                        <p className="text-lg font-bold text-slate-700 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                      </div>

                      {mode === 'analyze' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-3xl border-l-[12px] border-l-red-500 bg-red-50/50 shadow-sm space-y-2">
                              <h5 className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2 italic">
                                <XCircle className="h-4 w-4" /> Votre réponse
                              </h5>
                              <p className="font-bold text-slate-800 italic">Choix {selectedMistake.lastSelectedChoiceId}</p>
                            </div>
                            <div className="p-6 rounded-3xl border-l-[12px] border-l-emerald-500 bg-emerald-50/50 shadow-sm space-y-2">
                              <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 italic">
                                <CheckCircle2 className="h-4 w-4" /> Bonne réponse
                              </h5>
                              <p className="font-bold text-slate-800 italic">Choix {questionDetails.correctOptionIds?.join(', ')}</p>
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
                            <div className="p-6 bg-slate-50 rounded-3xl border-l-8 border-l-primary animate-slide-up shadow-inner">
                              <h4 className="font-black text-primary uppercase italic text-xs mb-3 flex items-center gap-2">
                                <Info className="h-4 w-4" /> Justification du Mindset
                              </h4>
                              <p className="text-sm font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">{correction.explanation}</p>
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
