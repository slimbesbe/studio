
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Zap, RotateCcw, Layers, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const APPROACHES = [
  {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: RotateCcw,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: "Le périmètre, le temps et les coûts sont définis au début du projet.",
    mindset: "Focus sur la planification rigoureuse et le contrôle des changements via CCB.",
    keyPoints: ["Cycle de vie en cascade", "Changements coûteux", "Livrable unique en fin de projet"]
  },
  {
    id: 'agile',
    title: 'Agile (Adaptatif)',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    description: "Le périmètre est affiné à chaque itération. Idéal pour l'incertitude.",
    mindset: "Focus sur la valeur client, le leader serviteur et l'auto-organisation.",
    keyPoints: ["Sprints / Itérations", "Feedback continu", "Changements bienvenus"]
  },
  {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    description: "Mélange des deux approches pour maximiser l'efficacité.",
    mindset: "Adapter l'approche selon la nature des livrables et les risques.",
    keyPoints: ["Agilité pour le dev", "Prédictif pour l'infra", "Gouvernance mixte"]
  }
];

export default function VisionApprochesPage() {
  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-500/10 p-4 rounded-3xl">
            <Globe className="h-10 w-10 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-indigo-900 leading-none">Vision Approches</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Comprendre les 3 piliers de la méthodologie PMP.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {APPROACHES.map((app) => (
          <Card key={app.id} className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <div className={cn("h-2 w-full", app.bgColor.replace('bg-', 'bg-').replace('50', '500'))} />
            <CardHeader className="p-10 pb-4">
              <div className={cn("h-16 w-16 rounded-[24px] flex items-center justify-center mb-6 shadow-inner", app.bgColor)}>
                <app.icon className={cn("h-8 w-8", app.color)} />
              </div>
              <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{app.title}</CardTitle>
              <CardDescription className="text-sm font-bold text-slate-500 italic leading-relaxed pt-2">
                {app.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-6 space-y-8">
              <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-indigo-600 mb-3 flex items-center gap-2 italic">
                  <Info className="h-3 w-3" /> Mindset PMP®
                </h4>
                <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                  "{app.mindset}"
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-4">Concepts Clés</h4>
                {app.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-600 italic">{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-amber-50 p-8 rounded-[40px] border-4 border-dashed border-amber-200 flex items-center gap-8">
        <div className="bg-amber-500 p-4 rounded-3xl shadow-lg"><Zap className="h-8 w-8 text-white" /></div>
        <div className="space-y-1">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-amber-900 leading-none">Conseil d'Examen</h3>
          <p className="text-sm font-bold text-amber-800/70 italic leading-relaxed">
            Dans l'examen, si la situation ne mentionne pas explicitement l'approche, cherchez des indices : "CCB" suggère le prédictif, "Backlog" ou "Sprint" suggère l'agile.
          </p>
        </div>
      </div>
    </div>
  );
}
