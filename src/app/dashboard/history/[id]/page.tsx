
"use client";

import { useState, useMemo } from 'react';
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
  History
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type ReviewView = 'grid' | 'linear';

export default function SimulationReviewPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.id as string;
  const db = useFirestore();
  const { user } = useUser();

  const [view, setView] = useState<ReviewView>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);

  const attemptRef = useMemoFirebase(() => doc(db, 'coachingAttempts', attemptId), [db, attemptId]);
  const { data: attempt, isLoading } = useDoc(attemptRef);

  const responses = useMemo(() => attempt?.responses || [], [attempt]);
  const currentQ = useMemo(() => responses[currentIndex], [responses, currentIndex]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!attempt) return <div className="p-20 text-center font-black italic text-slate-400">Simulation introuvable.</div>;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl border-2"><Link href="/dashboard/history"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
              <History className="h-8 w-8" /> Revue : {attempt.examId?.replace('exam', 'Examen ') || attempt.sessionId || 'Simulation'}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 italic">
              Score : {attempt.scorePercent}% • {attempt.correctCount}/{attempt.totalQuestions} correctes
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl border-2">
          <Button 
            variant={view === 'grid' ? 'default' : 'ghost'} 
            onClick={() => setView('grid')}
            className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", view === 'grid' ? "shadow-lg" : "text-slate-500")}
          >
            <LayoutGrid className="h-4 w-4" /> Tableau Récap
          </Button>
          <Button 
            variant={view === 'linear' ? 'default' : 'ghost'} 
            onClick={() => setView('linear')}
            className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", view === 'linear' ? "shadow-lg" : "text-slate-500")}
          >
            <ListOrdered className="h-4 w-4" /> Question par Question
          </Button>
        </div>
      </div>

      {view === 'grid' ? (
        <Card className="rounded-[40px] shadow-2xl border-none p-10 bg-white">
          <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-20 gap-3">
            {responses.map((res: any, idx: number) => (
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
              </button>
            ))}
          </div>
          <div className="mt-12 flex justify-center gap-8 border-t pt-8">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-emerald-500 rounded-md" />
              <span className="text-xs font-black uppercase italic text-slate-500">Correcte</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-red-500 rounded-md" />
              <span className="text-xs font-black uppercase italic text-slate-500">Erreur</span>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
            <Badge variant="outline" className="h-10 px-6 rounded-xl border-2 font-black italic">
              QUESTION {currentIndex + 1} / {responses.length}
            </Badge>
            <Badge className={cn(
              "font-black italic px-6 py-2 rounded-xl text-white shadow-lg",
              currentQ.isCorrect ? "bg-emerald-500" : "bg-red-500"
            )}>
              {currentQ.isCorrect ? "CORRECT" : "ERREUR"}
            </Badge>
          </div>

          <Card className={cn(
            "rounded-[40px] shadow-2xl border-t-8 overflow-hidden bg-white animate-slide-up",
            currentQ.isCorrect ? "border-emerald-500" : "border-red-500"
          )}>
            <CardContent className="p-10 space-y-10">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black italic uppercase text-[8px]">{currentQ.tags?.domain || 'People'}</Badge>
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-none font-black italic uppercase text-[8px]">{currentQ.tags?.approach || 'Agile'}</Badge>
                  {currentQ.correctOptionIds && currentQ.correctOptionIds.length > 1 && (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-black italic uppercase text-[8px]">Multi-réponses</Badge>
                  )}
                </div>
                <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{currentQ.text}</p>
              </div>

              <div className="grid gap-4">
                {currentQ.choices?.map((opt: string, idx: number) => {
                  const optId = String(idx + 1);
                  const userChoices = currentQ.userChoices || (currentQ.userChoice ? [currentQ.userChoice] : []);
                  const correctOptionIds = currentQ.correctOptionIds || (currentQ.correctChoice ? [currentQ.correctChoice] : []);
                  
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
                  <Info className="h-4 w-4" /> Justification Mindset PMI®
                </h4>
                <p className="text-lg font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {currentQ.explanation || "Aucune justification disponible pour cette question."}
                </p>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
              <Button 
                variant="outline" 
                className="h-14 px-8 rounded-2xl border-4 font-black uppercase tracking-widest italic" 
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-2 h-5 w-5" /> Précédent
              </Button>
              <Button 
                className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest italic shadow-xl" 
                onClick={() => setCurrentIndex(Math.min(responses.length - 1, currentIndex + 1))}
                disabled={currentIndex === responses.length - 1}
              >
                Suivant <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
