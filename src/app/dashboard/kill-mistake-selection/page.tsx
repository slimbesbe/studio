
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Play, 
  Search, 
  ChevronLeft,
  Target,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function KillMistakeSelectionPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-8 px-4">
      {/* Header avec bouton retour */}
      <div className="space-y-4">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-bold uppercase tracking-widest text-xs">
          <Link href="/dashboard/practice"><ChevronLeft className="mr-2 h-4 w-4" /> Retour à la pratique</Link>
        </Button>
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl">
            <Brain className="h-10 w-10 text-amber-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter">Méthode Kill Mistake</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Excellence par la répétition espacée</p>
          </div>
        </div>
      </div>

      {/* Section "Blabla" de qualité */}
      <Card className="rounded-[40px] border-none shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
        <CardContent className="p-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" /> Pourquoi le Kill Mistake ?
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed italic text-lg">
              <p>
                La réussite au PMP® ne dépend pas de la quantité de questions traitées, mais de votre capacité à ne jamais commettre deux fois la même erreur.
              </p>
              <p>
                Le système <span className="text-primary font-black">Kill Mistake</span> isole vos échecs passés pour cibler vos failles de compréhension du <span className="text-primary font-black">Mindset PMI®</span>. 
                C'est l'outil le plus puissant pour transformer vos points faibles en automatismes de succès avant le jour J.
              </p>
            </div>
            <div className="flex gap-6 pt-4 border-t border-dashed border-slate-200">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Précision chirurgicale</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ancrage mémoriel</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-72 aspect-square bg-primary/5 rounded-[60px] flex items-center justify-center relative overflow-hidden">
             <Brain className="h-32 w-32 text-primary/20 absolute" />
             <div className="z-10 text-center p-6">
                <span className="text-5xl font-black text-primary italic">90%</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Taux de rétention après correction</p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Les deux options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Option 1: Analyser */}
        <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-4 border-slate-100 hover:border-primary/20 rounded-[48px] overflow-hidden bg-white">
          <Link href="/dashboard/kill-mistakes" className="h-full flex flex-col">
            <CardHeader className="p-10 pb-0">
              <div className="bg-slate-50 w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                <Search className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
                1/ Analyser mes erreurs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6 flex-1">
              <p className="text-slate-500 font-bold italic leading-relaxed text-base">
                Plongez dans l'analyse théorique. Examinez chaque question ratée, comparez vos choix aux bonnes réponses et imprégnez-vous des justifications détaillées du mindset officiel.
              </p>
              <div className="flex items-center text-primary font-black uppercase tracking-widest text-sm pt-4">
                Démarrer l'analyse <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Option 2: Re-répondre */}
        <Card className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-4 border-primary/10 hover:border-primary rounded-[48px] overflow-hidden bg-primary text-white">
          <Link href="/dashboard/practice?mode=kill_mistake" className="h-full flex flex-col">
            <CardHeader className="p-10 pb-0">
              <div className="bg-white/10 w-20 h-20 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                <Play className="h-10 w-10 fill-white" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tighter">
                2/ Re-répondre aux questions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-6 flex-1">
              <p className="text-primary-foreground/80 font-bold italic leading-relaxed text-base">
                Mettez-vous en situation réelle d'examen sur vos erreurs passées. Testez si vous avez réellement acquis les concepts ou si vos lacunes persistent.
              </p>
              <div className="flex items-center text-white font-black uppercase tracking-widest text-sm pt-4">
                Lancer l'entraînement <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
