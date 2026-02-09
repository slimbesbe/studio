
"use client";

import { useState, useEffect } from 'react';
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
  Play,
  Tags,
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function KillMistakesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [selectedMistake, setSelectedMistake] = useState<any>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const mistakesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users', user.uid, 'killMistakes'), where('status', '==', 'wrong'));
  }, [db, user]);

  const { data: mistakes, isLoading: isLoadingMistakes } = useCollection(mistakesQuery);

  useEffect(() => {
    async function fetchDetails() {
      if (!selectedMistake) return;
      setIsLoadingDetails(true);
      try {
        const qDoc = await getDoc(doc(db, 'questions', selectedMistake.questionId));
        if (qDoc.exists()) {
          setQuestionDetails(qDoc.data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDetails(false);
      }
    }
    fetchDetails();
  }, [selectedMistake, db]);

  const getDomainLabel = (d: string) => {
    if (d === 'People') return 'People';
    if (d === 'Process') return 'Processus';
    if (d === 'Business') return 'Business';
    return d;
  };

  const getApproachLabel = (a: string) => {
    if (a === 'Predictive') return 'Prédictif';
    if (a === 'Agile') return 'Agile';
    if (a === 'Hybrid') return 'Hybride';
    return a;
  };

  const getDifficultyLabel = (d: string) => {
    if (d === 'Easy') return 'Facile';
    if (d === 'Medium') return 'Moyen';
    if (d === 'Hard') return 'Difficile';
    return d;
  };

  if (isLoadingMistakes) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto py-8 px-4">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-xs">
          <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="mr-2 h-4 w-4" /> Retour à la sélection</Link>
        </Button>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
          <div>
            <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-4">
              <Brain className="h-12 w-12 text-amber-500" />
              Analyse des échecs
            </h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm italic">Comprenez la cause profonde pour ne plus jamais vous tromper.</p>
          </div>
          <div className="flex gap-4">
            <Badge className="bg-amber-100 text-amber-700 border-2 border-amber-200 px-6 py-2 rounded-2xl font-black italic">
              <Info className="mr-2 h-4 w-4" /> {mistakes?.length || 0} ERREURS À TRAITER
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-[32px] shadow-lg border-none overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-muted/30 border-b p-6">
              <CardTitle className="text-xs font-black uppercase tracking-widest italic text-slate-500">Liste des questions ratées</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-3">
              {mistakes?.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic font-bold uppercase text-xs">Aucune erreur en attente. Félicitations !</div>
              ) : mistakes?.map((mistake) => (
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
                        {mistake.wrongCount}x ÉCHECS
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-slate-700 line-clamp-2 leading-snug italic">
                      Question #{mistake.questionId.substring(0, 8)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
            <div className="p-4 border-t bg-muted/10">
              <Button asChild className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-primary shadow-lg italic">
                <Link href="/dashboard/practice?mode=kill_mistake">
                  <Play className="mr-2 h-4 w-4" /> Re-répondre aux erreurs
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedMistake ? (
            <div className="space-y-6 animate-slide-up">
              <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
                <CardHeader className="bg-white p-8 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-black text-slate-900 italic tracking-tight">Analyse de l'Erreur</CardTitle>
                    <CardDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest italic mt-1">Ancrer le mindset PMI pour transformer cet échec en réussite.</CardDescription>
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
                          <Info className="h-4 w-4 text-primary" /> Énoncé de la question
                        </h4>
                        <p className="text-lg font-bold text-slate-700 italic leading-relaxed">{questionDetails.statement || questionDetails.text}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl border-l-[12px] border-l-red-500 bg-red-50/50 shadow-sm space-y-2">
                          <h5 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <XCircle className="h-4 w-4" /> Votre dernière réponse
                          </h5>
                          <p className="font-bold text-slate-800 italic">
                            {questionDetails.options?.find((o: any) => o.id === selectedMistake.lastSelectedChoiceId)?.text || selectedMistake.lastSelectedChoiceId || "N/A"}
                          </p>
                        </div>
                        <div className="p-6 rounded-3xl border-l-[12px] border-l-emerald-500 bg-emerald-50/50 shadow-sm space-y-2">
                          <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                            <CheckCircle2 className="h-4 w-4" /> Bonne réponse
                          </h5>
                          <p className="font-bold text-slate-800 italic">
                            {questionDetails.options?.find((o: any) => questionDetails.correctOptionIds?.includes(o.id))?.text || questionDetails.correctChoice || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t-2 border-slate-50">
                        {questionDetails.tags && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                              <Tags className="h-3 w-3 text-primary" /> Approche : {getApproachLabel(questionDetails.tags.approach)}
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                              <Tags className="h-3 w-3 text-primary" /> Domaine : {getDomainLabel(questionDetails.tags.domain)}
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                              <Tags className="h-3 w-3 text-primary" /> Niveau : {getDifficultyLabel(questionDetails.tags.difficulty)}
                            </Badge>
                          </div>
                        )}

                        <h4 className="font-black flex items-center gap-3 text-primary uppercase text-sm tracking-widest italic">
                          <Brain className="h-6 w-6 text-accent" /> Mindset PMI & Justification
                        </h4>
                        <div className="bg-slate-50 p-8 rounded-[32px] border-2 border-slate-100 shadow-inner">
                          <div className="text-base font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {questionDetails.explanation?.correctRationale || questionDetails.explanation || "Explication détaillée en cours de chargement..."}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[60px] border-4 border-dashed border-slate-100 shadow-inner">
              <div className="bg-amber-100/50 p-8 rounded-full mb-6">
                <Brain className="h-20 w-20 text-amber-500 opacity-40" />
              </div>
              <h3 className="text-2xl font-black text-slate-400 italic uppercase tracking-tighter">Sélectionnez une erreur</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic max-w-sm mt-2">Cliquez sur une carte à gauche pour ouvrir l'analyse de la question.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
