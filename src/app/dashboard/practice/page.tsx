
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Layers, Globe, Loader2, 
  Brain, ChevronRight, Info, CheckCircle2,
  BookOpen, Settings2, Trophy, ArrowRight,
  Tags
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore } from '@/firebase';
import { startTrainingSession, submitPracticeAnswer, type PracticeFilters } from '@/lib/services/practice-service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';

const MODES = [
  { id: 'domain', name: 'Par Domaine', icon: Layers, desc: 'Ciblez People, Process ou Business.' },
  { id: 'approach', name: 'Par Approche', icon: Globe, desc: 'Agile, Prédictif ou Hybride.' },
  { id: 'kill_mistake', name: 'Kill Mistake', icon: Brain, desc: 'Uniquement vos erreurs passées.', color: 'text-amber-500' },
];

export default function PracticePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [step, setStep] = useState<'setup' | 'session' | 'summary'>('setup');
  const [mode, setMode] = useState<string>('domain');
  const [filters, setFilters] = useState<PracticeFilters>({});
  const [count, setCount] = useState<number>(10);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionResults, setSessionResults] = useState({ correct: 0, total: 0 });
  
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [correction, setCorrection] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKMDialogOpen, setIsKMDialogOpen] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const data = await startTrainingSession(db, user!.uid, mode, filters, count);
      setQuestions(data);
      setStep('session');
      setCurrentIndex(0);
      setSessionResults({ correct: 0, total: data.length });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedChoice(null);
      setCorrection(null);
    } else {
      setStep('summary');
    }
  };

  const handleRevealCorrection = async () => {
    if (!selectedChoice || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await submitPracticeAnswer(db, user!.uid, questions[currentIndex].id, selectedChoice);
      setCorrection(res);
      if (res.isCorrect) setSessionResults(prev => ({ ...prev, correct: prev.correct + 1 }));
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la correction" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper labels for tags
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

  if (step === 'session') {
    const q = questions[currentIndex];
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-8">
        <div className="flex justify-between items-center">
          <Badge variant="outline" className="text-sm font-black italic border-2 px-4 py-1 bg-white">
            QUESTION {currentIndex + 1} / {questions.length}
          </Badge>
          <div className="flex gap-2">
            <Badge className="bg-primary/10 text-primary border-none font-black italic uppercase tracking-widest text-[10px]">
              {mode.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <Card className="shadow-2xl border-t-8 border-t-primary rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl leading-relaxed font-black italic text-slate-800">
              {q.statement || q.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="grid gap-3">
              {(q.options || q.choices || []).map((opt: any, idx: number) => {
                const optId = opt.id || String.fromCharCode(65 + idx);
                const isSelected = selectedChoice === optId;
                const isCorrect = correction?.correctOptionIds?.includes(optId);
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => !correction && setSelectedChoice(optId)}
                    className={cn(
                      "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 shadow-sm",
                      isSelected && !correction ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300",
                      correction && isCorrect ? "border-emerald-500 bg-emerald-50" : "",
                      correction && isSelected && !isCorrect ? "border-red-500 bg-red-50" : ""
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2",
                      isSelected ? "bg-primary text-white border-primary" : "bg-white text-slate-400",
                      correction && isCorrect ? "bg-emerald-500 text-white border-emerald-500" : "",
                      correction && isSelected && !isCorrect ? "bg-red-500 text-white border-red-500" : ""
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className={cn("flex-1 text-sm font-bold italic pt-1", isSelected ? "text-slate-900" : "text-slate-600")}>
                      {opt.text || opt}
                    </div>
                  </div>
                );
              })}
            </div>

            {correction && (
              <div className="mt-8 p-6 bg-slate-50 rounded-[24px] border-l-8 border-l-primary animate-slide-up shadow-inner">
                {/* PMP Tags display in correction */}
                {q.tags && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                      Approche : {getApproachLabel(q.tags.approach)}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                      Domaine : {getDomainLabel(q.tags.domain)}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1.5 font-bold uppercase text-[9px] py-0.5 bg-white border">
                      Niveau : {getDifficultyLabel(q.tags.difficulty)}
                    </Badge>
                  </div>
                )}

                <h4 className="font-black text-primary flex items-center gap-2 mb-3 uppercase tracking-widest italic text-xs">
                  <Info className="h-4 w-4" /> Mindset Officiel & Justification
                </h4>
                <div className="space-y-4 text-sm font-bold italic text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {correction.explanation?.correctRationale || correction.explanation}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-xl border-2 font-black uppercase tracking-widest text-xs disabled:opacity-30" 
              onClick={handleRevealCorrection}
              disabled={!selectedChoice || !!correction || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Voir correction
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl bg-primary font-black uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] transition-transform" 
              onClick={handleNext}
              disabled={!selectedChoice && !correction}
            >
              Question suivante <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'summary') {
    const score = Math.round((sessionResults.correct / sessionResults.total) * 100);
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-10 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Session Terminée</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm italic">Analyse de vos performances</p>
        </div>
        
        <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Trophy className="h-32 w-32" />
          </div>
          <div className="space-y-2">
            <span className="text-8xl font-black italic tracking-tighter text-primary">{score}%</span>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic">{sessionResults.correct} / {sessionResults.total} Correctes</p>
          </div>
          <Button className="w-full h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" onClick={() => setStep('setup')}>
            Nouvelle Session
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4">
          <BookOpen className="h-10 w-10" /> Pratique Libre
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Entraînement ciblé et correction du mindset</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODES.map((m) => (
              <Card 
                key={m.id} 
                onClick={() => {
                  if (m.id === 'kill_mistake') {
                    setIsKMDialogOpen(true);
                  } else {
                    setMode(m.id);
                  }
                }}
                className={cn(
                  "cursor-pointer transition-all border-4 p-6 rounded-[28px] group hover:shadow-lg",
                  mode === m.id ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <m.icon className={cn("h-10 w-10 mb-4 transition-transform group-hover:scale-110", m.color || "text-primary")} />
                <h3 className="font-black italic uppercase text-sm tracking-tight mb-1">{m.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 leading-tight uppercase italic">{m.desc}</p>
              </Card>
            ))}
          </div>

          <Card className="rounded-[32px] border-none shadow-xl p-8 space-y-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 italic">Nombre de questions</Label>
                <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                  <SelectTrigger className="h-14 rounded-xl border-2 font-black italic shadow-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n} QUESTIONS</SelectItem>)}
                    <SelectItem value="0">TOUT DISPONIBLE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === 'domain' && (
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 italic">Domaine PMP®</Label>
                  <Select onValueChange={(v) => setFilters({ ...filters, domain: v })}>
                    <SelectTrigger className="h-14 rounded-xl border-2 font-black italic shadow-sm bg-white">
                      <SelectValue placeholder="TOUS LES DOMAINES" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="People">PEOPLE</SelectItem>
                      <SelectItem value="Process">PROCESSUS</SelectItem>
                      <SelectItem value="Business">BUSINESS ENVIRONMENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === 'approach' && (
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 italic">Approche Projet</Label>
                  <Select onValueChange={(v) => setFilters({ ...filters, approach: v })}>
                    <SelectTrigger className="h-14 rounded-xl border-2 font-black italic shadow-sm bg-white">
                      <SelectValue placeholder="TOUTES LES APPROCHES" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Predictive">PRÉDICTIVE (WATERFALL)</SelectItem>
                      <SelectItem value="Agile">AGILE</SelectItem>
                      <SelectItem value="Hybrid">HYBRIDE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[32px] bg-primary p-8 text-white shadow-2xl space-y-6 border-none">
            <div className="space-y-2">
              <h3 className="font-black italic uppercase tracking-tighter text-xl">Prêt à pratiquer ?</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60 italic leading-relaxed">
                Mode Apprentissage actif. Les corrections sont affichées à votre demande pour ancrer les concepts.
              </p>
            </div>
            <Button 
              className="w-full h-16 rounded-2xl bg-white text-primary font-black uppercase tracking-widest italic shadow-xl hover:bg-slate-50 transition-all text-lg"
              disabled={isLoading}
              onClick={handleStart}
            >
              {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <><Play className="mr-3 h-6 w-6" /> Lancer</>}
            </Button>
          </Card>
          
          <div className="bg-slate-100/50 p-6 rounded-[24px] border-2 border-dashed space-y-3">
            <div className="flex items-center gap-3 text-slate-400">
              <Settings2 className="h-4 w-4" />
              <span className="font-black uppercase text-[10px] tracking-widest italic">Info Session</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">
              Vos erreurs seront automatiquement ajoutées à votre liste "Kill Mistake" pour une révision ultérieure.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isKMDialogOpen} onOpenChange={setIsKMDialogOpen}>
        <DialogContent className="rounded-[40px] p-8 max-w-lg border-4">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-primary italic uppercase tracking-tighter flex items-center gap-3">
              <Brain className="h-8 w-8 text-amber-500" /> Kill Mistake
            </DialogTitle>
            <DialogDescription className="text-sm font-bold uppercase tracking-widest italic text-slate-500 mt-2">
              Que souhaitez-vous faire avec vos erreurs passées ?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <Button asChild variant="outline" className="h-20 rounded-3xl border-2 hover:bg-slate-50 flex flex-col items-start px-6 gap-1 group">
              <Link href="/dashboard/kill-mistakes" className="w-full">
                <span className="font-black text-slate-900 group-hover:text-primary transition-colors italic uppercase text-sm flex items-center justify-between w-full">
                  1/ Analyser mes erreurs <ArrowRight className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold text-slate-400 italic uppercase">Revue détaillée avec correction et mindset PMI</span>
              </Link>
            </Button>
            <Button 
              onClick={() => { setMode('kill_mistake'); setIsKMDialogOpen(false); }}
              className="h-20 rounded-3xl bg-primary flex flex-col items-start px-6 gap-1 group shadow-xl hover:scale-[1.02] transition-transform"
            >
              <span className="font-black text-white italic uppercase text-sm flex items-center justify-between w-full">
                2/ Re-répondre aux questions <Play className="h-4 w-4 fill-white" />
              </span>
              <span className="text-[10px] font-black text-primary-foreground/60 italic uppercase text-left">Lancer un entraînement uniquement sur les échecs (Pratique & Examens)</span>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsKMDialogOpen(false)} className="font-black uppercase tracking-widest italic text-xs text-slate-400">Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
