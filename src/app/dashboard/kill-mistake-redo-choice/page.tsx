
"use client";

import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft,
  LayoutGrid,
  Zap,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function KillMistakeRedoChoicePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in py-16 px-4 text-center">
      <div className="space-y-4">
        <Button variant="ghost" asChild className="hover:bg-primary/5 -ml-2 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
          <Link href="/dashboard/kill-mistake-selection"><ChevronLeft className="mr-2 h-3 w-3" /> Retour à la sélection</Link>
        </Button>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">REFAIRE LES QUESTIONS</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Choisissez votre méthode d'ancrage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Option 1: Mode Libre */}
        <Card className="rounded-[60px] border-none shadow-2xl bg-white p-12 space-y-8 group hover:scale-[1.02] transition-all">
          <div className="bg-emerald-50 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <LayoutGrid className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
              1/ Mode Libre
            </CardTitle>
            <p className="text-slate-500 font-bold italic leading-relaxed text-sm">
              Naviguez librement dans vos erreurs. Répondez aux questions de votre choix et voyez le résultat immédiatement.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-xl">
            <Link href="/dashboard/kill-mistakes?mode=redo" className="flex items-center gap-2">
              Démarrer <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>

        {/* Option 2: Mode Session */}
        <Card className="rounded-[60px] border-none shadow-2xl bg-primary p-12 space-y-8 group hover:scale-[1.02] transition-all text-white">
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Zap className="h-10 w-10 fill-white" />
          </div>
          <div className="space-y-4">
            <CardTitle className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
              2/ Mode Session
            </CardTitle>
            <p className="text-white/70 font-bold italic leading-relaxed text-sm">
              Session d'entraînement linéaire et chronométrée. Résultats et justifications à la fin de la session uniquement.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-white text-primary hover:bg-slate-50 font-black uppercase tracking-widest shadow-xl">
            <Link href="/dashboard/kill-mistakes?mode=session" className="flex items-center gap-2">
              Lancer la session <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
