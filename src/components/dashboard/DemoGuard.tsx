'use client';

import { useUser } from '@/firebase';
import { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '@/components/ui/dialog';
import { ShieldAlert, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DemoGuard - Sécurité Zéro Tolérance.
 * Intercepte CHAQUE clic pour les comptes DEMO.
 */
export function DemoGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isUserLoading } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Détection stricte par rôle ou groupe
  const isDemo = !isUserLoading && (
    user?.isAnonymous || 
    profile?.role === 'demo' || 
    profile?.groupId === 'DEMO'
  );

  const handleGlobalIntercept = useCallback((e: MouseEvent) => {
    if (!isDemo) return;

    const target = e.target as HTMLElement;
    
    // On intercepte absolument tous les éléments interactifs
    const interactiveTarget = target.closest('button, a, input, [role="button"], [type="radio"], [type="checkbox"], label');

    if (interactiveTarget) {
      // Ne pas bloquer si on est déjà dans la modale d'alerte
      if (interactiveTarget.closest('[role="dialog"]')) return;

      // Blocage radical immédiat
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      // Capture forcée au niveau global
      window.addEventListener('click', handleGlobalIntercept, true);
      return () => window.removeEventListener('click', handleGlobalIntercept, true);
    }
  }, [isDemo, handleGlobalIntercept]);

  if (isUserLoading) return <>{children}</>;

  return (
    <>
      {children}
      
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="rounded-[40px] p-0 border-none shadow-3xl bg-white overflow-hidden max-w-md z-[9999]">
          <div className="bg-destructive h-4 w-full" />
          
          <div className="p-10 text-center space-y-8">
            <div className="bg-red-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto shadow-inner border-2 border-red-100">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-4">
              <DialogTitle className="text-3xl font-black text-destructive uppercase italic tracking-tighter leading-tight">
                ALERTE SÉCURITÉ
              </DialogTitle>
              <DialogDescription className="text-lg font-bold text-slate-400 italic uppercase tracking-widest text-[10px]">
                ACCÈS GRATUIT LIMITÉ
              </DialogDescription>
            </div>

            <div className="bg-red-50 p-6 rounded-3xl border-4 border-dashed border-red-100">
              <div className="flex items-center gap-3 text-destructive mb-3 justify-center">
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">FONCTIONNALITÉ BLOQUÉE</span>
              </div>
              <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                Ceci est un accès d'essai. Pour accéder aux simulations, aux statistiques et au coaching complet, vous devez souscrire à une licence officielle.
              </p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-center gap-3 p-4 bg-slate-50 rounded-2xl border-2">
                 <Mail className="h-4 w-4 text-slate-400" />
                 <span className="text-xs font-black text-slate-600">contact@simu-lux.com</span>
               </div>
              <Button 
                onClick={() => setShowModal(false)}
                className="h-16 w-full rounded-[24px] bg-destructive hover:bg-red-700 text-white font-black uppercase tracking-widest text-lg shadow-xl"
              >
                J'AI COMPRIS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}