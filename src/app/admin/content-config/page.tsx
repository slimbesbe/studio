"use client";

import { useState, useMemo } from 'react';
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
  Sparkles,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const db = useFirestore();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  // State pour la réinitialisation
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleOpenReset = () => {
    // Génère un code à 8 chiffres
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSecurityCode(code);
    setUserInputCode('');
    setIsResetModalOpen(true);
  };

  const performReset = async () => {
    if (userInputCode !== securityCode) return;
    
    setIsResetting(true);
    try {
      const collectionsToClear = ['mindsets', 'concepts_approaches', 'concepts_domains', 'questions'];
      
      for (const collName of collectionsToClear) {
        const snap = await getDocs(collection(db, collName));
        const docs = snap.docs;
        
        // Traitement par lots de 500 (limite Firestore)
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      toast({ 
        title: "Contenu réinitialisé", 
        description: "Toutes les données pédagogiques ont été effacées." 
      });
      setIsResetModalOpen(false);
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Erreur critique", 
        description: "La suppression a échoué. Vérifiez vos permissions." 
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in pb-32">
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

      {/* Danger Zone Section */}
      <div className="pt-10 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <h3 className="font-black uppercase italic tracking-widest text-destructive text-sm">Zone de Danger</h3>
        </div>
        
        <Card className="rounded-[40px] border-4 border-dashed border-destructive/20 bg-destructive/5 overflow-hidden">
          <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-xl font-black uppercase italic text-destructive tracking-tight">Réinitialisation Globale</h4>
              <p className="text-sm font-bold text-destructive/60 italic max-w-xl">
                Cette action supprimera instantanément TOUS les mindsets, les contenus de cours (jargon/quiz) et l'intégralité de votre banque de questions.
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleOpenReset}
              className="h-16 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform shrink-0"
            >
              <Trash2 className="mr-3 h-6 w-6" /> Remettre à 0
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation de réinitialisation */}
      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl animate-in zoom-in-95 duration-200">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="bg-destructive p-4 rounded-full shadow-lg">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Action Critique</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase tracking-tight italic">
              Vous allez effacer tout le contenu pédagogique de la plateforme. Cette opération est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed border-slate-200 text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Veuillez recopier le code de sécurité</p>
              <p className="text-6xl font-black tracking-[0.2em] text-primary select-none">{securityCode}</p>
            </div>

            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Confirmez par le code à 8 chiffres</Label>
              <Input 
                value={userInputCode}
                onChange={(e) => setUserInputCode(e.target.value)}
                placeholder="Entrez le code ici..."
                maxLength={8}
                className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest focus-visible:ring-destructive"
              />
            </div>
          </div>

          <DialogFooter className="gap-4 flex flex-col sm:flex-row">
            <Button 
              variant="outline" 
              className="h-16 rounded-2xl font-black uppercase flex-1 border-4" 
              onClick={() => setIsResetModalOpen(false)}
              disabled={isResetting}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              disabled={userInputCode !== securityCode || isResetting}
              onClick={performReset}
              className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl tracking-widest text-lg italic"
            >
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMER</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
