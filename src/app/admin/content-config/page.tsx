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
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

const CONFIG_SECTIONS = [
  {
    id: 'mindsets',
    title: 'Mindsets PMI®',
    description: 'Configurez les conseils et astuces qui défilent sur le Dashboard élève.',
    icon: Brain,
    href: '/admin/content-config/mindsets',
    color: 'bg-amber-500',
    tag: 'Dashboard'
  },
  {
    id: 'approaches',
    title: 'Vision Approches',
    description: 'Modifiez le focus, le jargon et les quiz rapides (Agile, Waterfall, Hybride).',
    icon: Globe,
    href: '/admin/content-config/approaches',
    color: 'bg-indigo-500',
    tag: 'Concepts'
  },
  {
    id: 'domains',
    title: 'Vision Domaines',
    description: 'Gérez le contenu des 3 piliers : People, Process et Business Environment.',
    icon: Layers,
    href: '/admin/content-config/domains',
    color: 'bg-emerald-500',
    tag: 'Concepts'
  },
  {
    id: 'questions',
    title: 'Banque de Questions',
    description: 'Contrôlez les questions pour la Matrice Magique et la Pratique Libre.',
    icon: BookCopy,
    href: '/admin/questions',
    color: 'bg-primary',
    tag: 'Entraînement'
  }
];

export default function ContentConfigHub() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  if (!isAdmin) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link></Button>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-4">
            <Settings2 className="h-10 w-10 text-accent" /> Configuration Contenu
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Pilotez chaque mot de votre plateforme de coaching.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
              <CardTitle className="text-3xl font-black italic uppercase tracking-tight text-slate-900">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <p className="text-slate-500 font-bold italic text-lg leading-relaxed">
                {section.description}
              </p>
              <Button asChild className={cn("w-full h-16 rounded-[24px] font-black uppercase tracking-widest text-sm italic shadow-xl group-hover:shadow-2xl transition-all", section.id === 'questions' ? 'bg-primary' : 'bg-slate-900')}>
                <Link href={section.href} className="flex items-center justify-center gap-3">
                  Gérer cette section <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-primary/5 p-10 rounded-[40px] border-4 border-dashed border-primary/10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
        <div className="bg-white p-6 rounded-3xl shadow-xl"><Sparkles className="h-12 w-12 text-primary animate-pulse" /></div>
        <div className="flex-1">
          <h3 className="text-2xl font-black italic uppercase text-slate-900 tracking-tight">Le saviez-vous ?</h3>
          <p className="text-slate-500 font-bold italic mt-2">
            Chaque section propose un module d'importation Excel. Utilisez les modèles fournis pour mettre à jour votre contenu en un seul clic sans risquer d'erreurs de format.
          </p>
        </div>
      </div>
    </div>
  );
}