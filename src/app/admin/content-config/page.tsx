
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings2, 
  Brain, 
  Layers, 
  Globe, 
  BookCopy, 
  ArrowRight, 
  ChevronLeft,
  ShieldCheck,
  LayoutGrid,
  Trophy,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

const CONFIG_SECTIONS = [
  {
    id: 'mindsets',
    title: 'Mindsets PMI®',
    description: 'Gérez les conseils et astuces qui défilent sur le Dashboard élève.',
    icon: Brain,
    href: '/admin/content-config/mindsets',
    color: 'bg-amber-500',
    tag: 'Dashboard'
  },
  {
    id: 'matrice_bank',
    title: 'Banque Matrice Magique',
    description: 'Gérez exclusivement les questions dédiées au sprint 3x3 de la Matrice Magique.',
    icon: LayoutGrid,
    href: '/admin/questions?type=matrix',
    color: 'bg-indigo-600',
    tag: 'Algorithme'
  },
  {
    id: 'practice_all',
    title: 'Banque Pratique Libre',
    description: 'Questions pour l\'entraînement par domaines ou approches. Totalement indépendant de la matrice.',
    icon: BookOpen,
    href: '/admin/questions?type=practice',
    color: 'bg-emerald-600',
    tag: 'Entraînement'
  },
  {
    id: 'exam_questions',
    title: 'Banque Examens Blancs',
    description: 'Configurez les questions exclusives aux 5 examens blancs officiels.',
    icon: Trophy,
    href: '/admin/questions?type=exams',
    color: 'bg-primary',
    tag: 'Certification'
  },
  {
    id: 'approaches',
    title: 'Concepts : Approches',
    description: 'Waterfall, Agile, Hybride : Focus, Jargon et Quiz théoriques par approche.',
    icon: Globe,
    href: '/admin/content-config/approaches',
    color: 'bg-indigo-500',
    tag: 'Théorie'
  },
  {
    id: 'domains',
    title: 'Concepts : Domaines',
    description: 'People, Process et Business : Configuration théorique des 3 piliers.',
    icon: Layers,
    href: '/admin/content-config/domains',
    color: 'bg-indigo-400',
    tag: 'Théorie'
  }
];

export default function ContentConfigHub() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  if (!isAdmin) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4">
            <Settings2 className="h-10 w-10 text-accent" /> Configuration Contenu
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Gestion étanche des banques de questions indépendantes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {CONFIG_SECTIONS.map((section) => (
          <Card key={section.id} className="rounded-[48px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <div className={cn("h-3 w-full", section.color)} />
            <CardHeader className="p-10 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div className={cn("h-16 w-16 rounded-[24px] flex items-center justify-center text-white shadow-lg", section.color)}>
                  <section.icon className="h-8 w-8" />
                </div>
                <span className="bg-slate-100 text-slate-400 px-4 py-1.5 rounded-full font-black italic uppercase text-[10px] tracking-widest">
                  {section.tag}
                </span>
              </div>
              <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-slate-900 leading-tight">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <p className="text-slate-500 font-bold italic text-sm leading-relaxed min-h-[60px]">
                {section.description}
              </p>
              <Button asChild className={cn("w-full h-16 rounded-[24px] font-black uppercase tracking-widest text-xs italic shadow-xl group-hover:shadow-2xl transition-all", section.id.includes('practice') || section.id.includes('exam') || section.id.includes('matrice') ? section.color : 'bg-slate-900')}>
                <Link href={section.href} className="flex items-center justify-center gap-3">
                  Gérer cette section <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-10 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          <h3 className="font-black uppercase italic tracking-widest text-slate-400 text-sm">Silos de Données</h3>
        </div>
        
        <Card className="rounded-[40px] border-4 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
          <CardContent className="p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100">
                <BookCopy className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-xl font-black uppercase italic text-slate-800 tracking-tight">Indépendance Totale</h4>
                <p className="text-sm font-bold text-slate-500 italic max-w-2xl leading-relaxed">
                  Le système garantit désormais une étanchéité parfaite entre la <strong>Matrice</strong>, la <strong>Pratique</strong> et les <strong>Examens</strong>. Une question ne peut appartenir qu'à un seul de ces univers à la fois pour éviter toute redondance lors de l'apprentissage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
