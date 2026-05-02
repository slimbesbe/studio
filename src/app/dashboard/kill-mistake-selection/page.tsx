
"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  ChevronLeft,
  Search,
  Play,
  LayoutGrid,
  BookOpen,
  GraduationCap,
  Target,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type SourceType = 'total' | 'matrice' | 'pratique' | 'simulation';

export default function KillMistakeSelectionPage() {
  const [selectedSource, setSelectedSource] = useState<SourceType>('total');

  // Données fictives selon spécifications
  const stats = {
    totalQuestions: 2500,
    totalErrors: 397,
    matrice: 120,
    pratique: 80,
    simulation: 197,
    reduction: 15
  };

  const getSourceLabel = (source: SourceType) => {
    switch(source) {
      case 'matrice': return "la Matrice Magique";
      case 'pratique': return "la Pratique Libre";
      case 'simulation': return "les Simulations d'Examen";
      default: return "l'intégralité de vos bases";
    }
  };

  const sourceName = getSourceLabel(selectedSource);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in py-8 px-4">
      {/* EN-TÊTE */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-4xl font-black text-[#1e3a8a] italic uppercase tracking-tighter">
            KILL MISTAKE STRATEGY
          </h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs pl-1">
          PURGEZ VOS ERREURS PAR THÉMATIQUE
        </p>
      </div>

      {/* SECTION SUPÉRIEURE : SÉLECTION DES SOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        {/* TOTAL ERREURS */}
        <div className="lg:col-span-4">
          <button 
            onClick={() => setSelectedSource('total')}
            className={cn(
              "w-full text-left transition-all duration-300 transform rounded-[32px] p-8 border-4 h-56 flex flex-col justify-between group",
              selectedSource === 'total' 
                ? "bg-white border-primary shadow-2xl scale-[1.02]" 
                : "bg-slate-50/50 border-transparent opacity-60 hover:opacity-100"
            )}
          >
            <div className="flex justify-between items-start">
              <span className="font-black uppercase italic text-xs tracking-widest text-slate-500">TOTAL ERREURS</span>
              <div className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 italic">
                <TrendingDown className="h-3 w-3" /> -{stats.reduction} RÉDUCTION DEPUIS HIER
              </div>
            </div>
            <div>
              <p className="text-7xl font-black italic tracking-tighter text-slate-900 leading-none mb-2">
                {stats.totalErrors}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                SUR UN TOTAL DE {stats.totalQuestions} QUESTIONS
              </p>
            </div>
          </button>
        </div>

        {/* SOURCES D'ERREURS */}
        <div className="lg:col-span-8 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 italic">
            SOURCES D'ERREURS
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SourceCard 
              active={selectedSource === 'matrice'}
              onClick={() => setSelectedSource('matrice')}
              icon={LayoutGrid}
              label="Matrice Magique"
              count={stats.matrice}
              color="bg-emerald-50 text-emerald-600 border-emerald-200"
            />
            <SourceCard 
              active={selectedSource === 'pratique'}
              onClick={() => setSelectedSource('pratique')}
              icon={BookOpen}
              label="Pratique Libre"
              count={stats.pratique}
              color="bg-indigo-50 text-indigo-600 border-indigo-200"
            />
            <SourceCard 
              active={selectedSource === 'simulation'}
              onClick={() => setSelectedSource('simulation')}
              icon={GraduationCap}
              label="Simulations Exam"
              count={stats.simulation}
              color="bg-amber-50 text-amber-600 border-amber-200"
            />
          </div>
        </div>
      </div>

      {/* SECTION INFÉRIEURE : MODES D'ACTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
        {/* MODE ANALYSE */}
        <Card className="rounded-[48px] border-2 border-slate-100 shadow-xl bg-white p-12 space-y-8 group hover:shadow-2xl transition-all duration-300">
          <div className="bg-slate-50 w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <Search className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
              MODE ANALYSE
            </h3>
            <p className="text-slate-500 font-bold italic leading-relaxed text-sm">
              Parcourez vos erreurs pour <span className="text-primary">{sourceName}</span> pour comprendre les justifications du Mindset PMI® et revoir les bonnes réponses.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full h-16 rounded-[24px] border-4 border-primary text-primary font-black uppercase tracking-widest text-sm shadow-lg hover:bg-primary/5 transition-all">
            <Link href={`/dashboard/kill-mistakes?mode=analyze&theme=${selectedSource === 'total' ? 'all' : selectedSource === 'simulation' ? 'exam' : selectedSource}`}>
              EXPLORER LES THÈMES <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>

        {/* MODE ACTION */}
        <Card className="rounded-[48px] border-none shadow-2xl bg-[#1e3a8a] p-12 space-y-8 group hover:scale-[1.01] transition-all duration-300 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Zap className="h-40 w-40 fill-white" />
          </div>
          <div className="bg-white/10 w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
          <div className="space-y-4 relative z-10">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-tight">
              MODE ACTION
            </h3>
            <p className="text-blue-100/70 font-bold italic leading-relaxed text-sm">
              Lancez une session chronométrée pour corriger uniquement les questions erronées de <span className="text-white underline underline-offset-4 decoration-2">{sourceName}</span> et les faire disparaître de la base.
            </p>
          </div>
          <Button asChild className="w-full h-16 rounded-[24px] bg-white text-[#1e3a8a] hover:bg-blue-50 font-black uppercase tracking-widest text-sm shadow-xl relative z-10 transition-all">
            <Link href={`/dashboard/kill-mistakes?mode=session&theme=${selectedSource === 'total' ? 'all' : selectedSource === 'simulation' ? 'exam' : selectedSource}`}>
              LANCER UNE SESSION <Zap className="ml-2 h-4 w-4 fill-current" />
            </Link>
          </Button>
        </Card>
      </div>

      {/* FOOTER RETOUR */}
      <div className="flex justify-center pt-12">
        <Button variant="ghost" asChild className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-transparent hover:text-primary group">
          <Link href="/dashboard">
            <ChevronLeft className="mr-2 h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Retour au Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SourceCard({ active, onClick, icon: Icon, label, count, color }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-[28px] border-4 transition-all duration-300 gap-3 group relative overflow-hidden",
        active 
          ? cn("shadow-xl scale-105 border-primary bg-white") 
          : "bg-slate-50/50 border-transparent opacity-50 hover:opacity-100"
      )}
    >
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", active ? "bg-primary/10 text-primary" : "text-slate-300")}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1 italic", active ? "text-slate-500" : "text-slate-400")}>
          {label}
        </p>
        <p className={cn("text-3xl font-black italic tracking-tighter leading-none", active ? "text-slate-900" : "text-slate-300")}>
          {count}
        </p>
      </div>
    </button>
  );
}
