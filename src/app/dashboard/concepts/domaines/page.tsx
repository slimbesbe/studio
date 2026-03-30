
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, LayoutGrid, Briefcase, Info, CheckCircle2, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOMAINS = [
  {
    id: 'people',
    title: 'People (42%)',
    icon: Users,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    description: "Gérer les conflits, diriger l'équipe et soutenir la performance.",
    mindset: "Le Chef de Projet est un Leader Serviteur (Servant Leader) qui enlève les obstacles.",
    keyPoints: ["Intelligence Émotionnelle", "Mentorat / Coaching", "Gestion de conflit"]
  },
  {
    id: 'process',
    title: 'Process (50%)',
    icon: LayoutGrid,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    description: "Gérer le périmètre, le temps, les coûts et la qualité.",
    mindset: "Focus sur la méthodologie, l'analyse d'impact et la clôture propre.",
    keyPoints: ["Planification tactique", "Gestion des risques", "Gouvernance"]
  },
  {
    id: 'business',
    title: 'Business (8%)',
    icon: Briefcase,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    description: "Comprendre l'environnement organisationnel et la valeur métier.",
    mindset: "Le projet doit toujours servir la stratégie de l'entreprise et délivrer de la valeur.",
    keyPoints: ["Analyse de bénéfices", "Conformité", "Changement organisationnel"]
  }
];

export default function VisionDomainesPage() {
  return (
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <div className="bg-purple-500/10 p-4 rounded-3xl">
            <Target className="h-10 w-10 text-purple-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Domaines</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Les 3 piliers du programme officiel PMI (ECO).</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {DOMAINS.map((dom) => (
          <Card key={dom.id} className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <div className={cn("h-2 w-full", dom.bgColor.replace('bg-', 'bg-').replace('50', '500'))} />
            <CardHeader className="p-10 pb-4">
              <div className={cn("h-16 w-16 rounded-[24px] flex items-center justify-center mb-6 shadow-inner", dom.bgColor)}>
                <dom.icon className={cn("h-8 w-8", dom.color)} />
              </div>
              <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{dom.title}</CardTitle>
              <CardDescription className="text-sm font-bold text-slate-500 italic leading-relaxed pt-2">
                {dom.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-6 space-y-8">
              <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-dashed border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-purple-600 mb-3 flex items-center gap-2 italic">
                  <Info className="h-3 w-3" /> Mindset PMP®
                </h4>
                <p className="text-xs font-bold text-slate-700 italic leading-relaxed">
                  "{dom.mindset}"
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-4">Concepts Clés</h4>
                {dom.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", dom.color)} />
                    <span className="text-xs font-bold text-slate-600 italic">{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
