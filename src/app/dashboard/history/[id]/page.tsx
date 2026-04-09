"use client";

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Info, 
  LayoutGrid, 
  ListOrdered,
  Trophy,
  History,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { fetchQuestionsByIds } from '@/lib/services/practice-service';

type ReviewView = 'grid' | 'linear';

export default function SimulationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.id as string;
  const db = useFirestore();
  const { user } = useUser();

  const [view, setView] = useState<ReviewView>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [enrichedResponses, setEnrichedResponses] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [stats, setStats] = useState({ correct: 0, total: 0, percent: 0 });

  const attemptRef = useMemoFirebase(() => doc(db, 'coachingAttempts', attemptId), [db, attemptId]);
  const { data: attempt, isLoading: isLoadingAttempt } = useDoc(attemptRef);

  useEffect(() => {
    async function enrich() {
      if (!attempt?.responses || attempt.responses.length === 0) {
        setIsLoadingQuestions(false);
        return;
      }

      setIsLoadingQuestions(true);
      try {
        const questionIds = attempt.responses.map((r: any) => r.questionId);
        const latestQuestions = await fetchQuestionsByIds(db, questionIds);
        
        let correctCount = 0;
        const enriched = attempt.responses.map((resp: any) => {
          const q = latestQuestions.find(lq => llq.id === resp.questionId);
          if (!q) return { ...resp, missing: true };

          const correctIds = q.correctOptionIds || [String(q.correctChoice || "1")];
          const userChoices = resp.userChoices || (resp.userChoice ? [resp.userChoice] : []);
          const isCorrect = userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id));
          
          if (isCorrect) correctCount++;

          // Détecter si la question a été mise à jour après la tentative
          const isUpdated = q.updatedAt && attempt.submittedAt && 
                           (q.updatedAt.seconds > attempt.submittedAt.seconds);

          return {
            ...resp,
            isCorrect,
            isUpdated,
            text: q.statement || q.text,
            imageUrl: q.imageUrl,
            choices: q.choices || q.options?.map((o:any) => o.text),
            correctOptionIds: correctIds,
            explanation: q.explanation,
            tags: q.tags
          };
        });

        setEnrichedResponses(enriched);
        setStats({ 
          correct: correctCount, 
          total: enriched.length, 
          percent: Math.round((correctCount / enriched.length) * 100) 
        });
      } catch (e) {
        console.error("Error enriching responses", e);
      } finally {
        setIsLoadingQuestions(false);
      }
    }
    enrich();
  }, [attempt, db]);

  const currentQ = useMemo(() => enrichedResponses[currentIndex], [enrichedResponses, currentIndex]);

  if (isLoadingAttempt || isLoadingQuestions) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!attempt) return <div className="p-20 text-center font-black italic text-slate-400">Simulation introuvable.</div>;

  const hasResponses = enrichedResponses.length > 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fade-in pb-24 h-full flex flex-col overflow-hidden">
      {/* Header avec score recalculé dynamiquement */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl border-2"><Link href="/dashboard/history"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
              <History className="h-8 w-8" /> Revue : {attempt.examId?.replace('exam', 'Examen ') || attempt.sessionId || 'Simulation'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 italic">
              Score Actuel : <span className="text-primary">{stats.percent}%</span> • {stats.correct}/{stats.total} correctes
            </p>
          </div>
        </div>
        
        {hasResponses && (
          <div className="flex bg-slate-100 p-1 rounded-2xl border-2">
            <Button 
              variant={view === 'grid' ? 'default' : 'ghost'} 
              onClick={() => setView('grid')}
              className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", view === 'grid' ? "shadow-lg" : "text-slate-500")}
            >
              <LayoutGrid className="h-4 w-4" /> Tableau
            </Button>
            <Button 
              variant={view === 'linear' ? 'default' : 'ghost'} 
              onClick={() => setView('linear')}
              className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", view === 'linear' ? "shadow-lg" : "text-slate-500")}
            >
              <ListOrdered className="h-4 w-4" /> Question
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!hasResponses ? (
          <Card className="rounded-[40px] shadow-2xl border-none p-12 bg-white flex flex-col items-center justify-center text-center space-y-6 h-full border-4 border-dashed border-slate-100">
            <div className="bg-amber-50 p-6 rounded-full"><AlertTriangle className="h-12 w-12 text-amber-500" /></div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase text-slate-800">Détails non disponibles</h3>
              <p className="text-slate-500 font-bold italic max-w-md">Cette simulation n'a pas enregistré le détail des questions ou elles ont été supprimées de la base.</p>
            </div>
            <Button asChild variant="outline" className="h-14 px-8 rounded-2xl border-4 font-black uppercase italic tracking-widest"><Link href="/dashboard/history">Retour à l'historique</Link></Button>
          </Card>
        ) : view === 'grid' ? (
          <Card className="rounded-[40px] shadow-2xl border-none p-10 bg-white h-full overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-3">
              {enrichedResponses.map((res: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setView('linear');
                  }}
                  className={cn(
                    "h-12 w-12 rounded-xl font-black text-sm transition-all flex items-center justify-center relative border-2 hover:scale-110",
                    res.isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-red-50 border-red-200 text-red-600"
                  )}
                >
                  {idx + 1}
                  {res.isUpdated && <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full animate-pulse" />}
                </button>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-8 border-t pt-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-emerald-500 rounded-md" />
                <span className="text-xs font-black uppercase italic text-slate-500">Correcte</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-red-500 rounded-md" />
                <span className="text-xs font-black uppercase italic text-slate-500">Erreur</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full" />
                <span className="text-xs font-black uppercase italic text-slate-500">Mis à jour par Admin</span>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2 shrink-0">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic bg-slate-50">
                  QUESTION {currentIndex + 1} / {enrichedResponses.length}
                </Badge>
                {currentQ?.isUpdated && (
                  <Badge className="bg-blue-100 text-blue-600 border-none font-black italic uppercase text-[10px] py-1 px-4 flex items-center gap-2">
                    <RefreshCw className="h-3 w-3" /> Explication mise à jour
                  </Badge>
                )}
              </div>
              <Badge className={cn(
                "font-black italic px-6 py-2 rounded-xl text-white shadow-lg",
                currentQ?.isCorrect ? "bg-emerald-500" : "bg-red-500"
              )}>
                {currentQ?.isCorrect ? "CORRECT" : "ERREUR"}
              </Badge>
            </div>

            <Card className={cn(
              "rounded-[40px] shadow-2xl border-t-8 overflow-hidden bg-white animate-slide-up flex-1 flex flex-col min-h-0",
              currentQ?.isCorrect ? "border-emerald-500" : "border-red-500"
            )}>
              <CardContent className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black italic uppercase text-[8px]">{currentQ?.tags?.domain || 'People'}</Badge>
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black italic uppercase text-[8px]">{currentQ?.tags?.approach || 'Agile'}</Badge>
                  </div>
                  <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{currentQ?.text}</p>
                  {currentQ?.imageUrl && (
                    <div className="rounded-[2vh] overflow-hidden border-2 border-slate-100 bg-white p-[0.5vh] flex justify-center shadow-md">
                      <img 
                        src={currentQ.imageUrl} 
                        alt="Illustration" 
                        className="max-h-[45vh] w-full object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  {currentQ?.choices?.map((opt: string, idx: number) => {
                    const optId = String(idx + 1);
                    const userChoices = currentQ.userChoices || [];
                    const correctOptionIds = currentQ.correctOptionIds || [];
                    
                    const isUserSelection = userChoices.includes(optId);
                    const isCorrectOpt = correctOptionIds.includes(optId);
                    
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-6 rounded-2xl border-2 flex items-start gap-5 transition-all",
                          isCorrectOpt ? "border-emerald-500 bg-emerald-50 shadow-sm" : 
                          isUserSelection ? "border-red-500 bg-red-50" : "border-slate-100 opacity-60"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2",
                          correctOptionIds.length > 1 ? "rounded-xl" : "rounded-full",
                          isCorrectOpt ? "bg-emerald-500 text-white border-emerald-500" : 
                          isUserSelection ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400"
                        )}>{String.fromCharCode(65 + idx)}</div>
                        <p className={cn(
                          "flex-1 text-lg font-bold italic pt-1",
                          isCorrectOpt ? "text-emerald-900" : isUserSelection ? "text-red-900" : "text-slate-500"
                        )}>{opt}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="p-8 bg-slate-50 rounded-[32px] border-l-8 border-l-primary shadow-inner">
                  <h4 className="font-black text-primary uppercase italic text-xs mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Justification Mindset PMI® (Dernière version)
                  </h4>
                  <p className="text-lg font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {currentQ?.explanation || "Aucune justification disponible."}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4 shrink-0">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="mr-2 h-5 w-5" /> Précédent
                </Button>
                <Button 
                  className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest italic shadow-xl" 
                  onClick={() => setCurrentIndex(Math.min(enrichedResponses.length - 1, currentIndex + 1))}
                  disabled={currentIndex === enrichedResponses.length - 1}
                >
                  Suivant <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
