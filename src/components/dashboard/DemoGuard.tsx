'use client';

import { useUser } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * DemoGuard - Système de protection globale pour le mode démo.
 * Intercepte les interactions critiques et affiche une alerte restrictive.
 */
export function DemoGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Le mode démo est actif si l'utilisateur est anonyme
  const isDemo = user?.isAnonymous;

  /**
   * Gestionnaire d'interception centralisé.
   * On utilise la phase de capture (true) pour bloquer l'événement 
   * avant qu'il n'atteigne les composants enfants.
   */
  const handleGlobalIntercept = useCallback((e: MouseEvent) => {
    if (!isDemo) return;

    const target = e.target as HTMLElement;
    
    // On cible les éléments interactifs déclencheurs d'actions
    // On exclut les liens (<a>) pour permettre la navigation et la visualisation
    const interactiveTarget = target.closest('button, input[type="submit"], input[type="button"], [role="button"], [type="radio"], [type="checkbox"]');

    if (interactiveTarget) {
      // Sécurité : On ne bloque pas les interactions à l'intérieur de la modale d'alerte elle-même
      if (interactiveTarget.closest('[role="dialog"]')) return;

      // Neutralisation totale de l'action
      e.preventDefault();
      e.stopPropagation();

      // Déclenchement de l'alerte visuelle
      setShowModal(true);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      // Ajout de l'écouteur en phase de capture pour une priorité maximale
      window.addEventListener('click', handleGlobalIntercept, true);
      return () => window.removeEventListener('click', handleGlobalIntercept, true);
    }
  }, [isDemo, handleGlobalIntercept]);

  // Si pas en mode démo, on rend les enfants normalement sans logique d'interception
  if (!isDemo) return <>{children}</>;

  return (
    <>
      {children}
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="rounded-[40px] p-0 border-none shadow-3xl bg-white overflow-hidden max-w-md animate-in fade-in zoom-in duration-300">
          {/* Bandeau d'alerte rouge très visible */}
          <div className="bg-destructive h-4 w-full" />
          
          <div className="p-10 text-center space-y-8">
            <div className="bg-destructive/10 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-4">
              <DialogTitle className="text-3xl font-black text-destructive uppercase italic tracking-tighter leading-tight px-4">
                ALERTE : Fonctionnalité restreinte
              </DialogTitle>
              <DialogDescription className="text-lg font-bold text-slate-600 italic">
                Veuillez contacter l'administrateur.
              </DialogDescription>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-100">
              <div className="flex items-center gap-3 text-slate-400 mb-2 justify-center">
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Accès limité (Mode Démo)</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                Pour enregistrer vos scores, accéder au coaching personnalisé et passer les examens officiels, veuillez vous identifier avec vos accès professionnels.
              </p>
            </div>

            <Button 
              onClick={() => setShowModal(false)}
              className="h-16 w-full rounded-[24px] bg-destructive hover:bg-red-700 text-white font-black uppercase tracking-widest text-lg shadow-2xl transition-all active:scale-95"
            >
              J'AI COMPRIS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
