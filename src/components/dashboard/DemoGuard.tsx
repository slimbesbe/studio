
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
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DemoGuard - Sécurité Zéro Tolérance pour le mode démo.
 * Intercepte CHAQUE clic pour les utilisateurs ayant le rôle 'demo' ou le groupe 'DEMO'.
 */
export function DemoGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isUserLoading } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Sécurité renforcée : détection par rôle OU par identifiant de groupe
  const isDemo = !isUserLoading && (
    user?.isAnonymous || 
    profile?.role === 'demo' || 
    profile?.groupId === 'DEMO'
  );

  const handleGlobalIntercept = useCallback((e: MouseEvent) => {
    if (!isDemo) return;

    const target = e.target as HTMLElement;
    
    // On intercepte TOUS les éléments interactifs
    const interactiveTarget = target.closest('button, a, input, [role="button"], [type="radio"], [type="checkbox"]');

    if (interactiveTarget) {
      // On ne bloque pas les boutons à l'intérieur de la modale d'alerte elle-même
      if (interactiveTarget.closest('[role="dialog"]')) return;

      // Blocage absolu immédiat
      e.preventDefault();
      e.stopPropagation();

      setShowModal(true);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      // Capture la phase pour intercepter AVANT les autres listeners de l'app
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
            <div className="bg-red-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-4">
              <DialogTitle className="text-3xl font-black text-destructive uppercase italic tracking-tighter leading-tight">
                ALERTE SÉCURITÉ
              </DialogTitle>
              <DialogDescription className="text-lg font-bold text-slate-600 italic">
                ACCÈS GRATUIT LIMITÉ
              </DialogDescription>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-100">
              <div className="flex items-center gap-3 text-slate-400 mb-3 justify-center">
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Restriction de compte DEMO</span>
              </div>
              <p className="text-sm font-bold text-slate-500 leading-relaxed italic">
                Cette fonctionnalité nécessite un accès professionnel complet. Votre compte actuel est limité à la consultation de l'interface.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => setShowModal(false)}
                className="h-16 w-full rounded-[24px] bg-destructive hover:bg-red-700 text-white font-black uppercase tracking-widest text-lg shadow-xl transition-all"
              >
                J'AI COMPRIS
              </Button>
              <p className="text-[9px] font-black text-slate-400 uppercase italic">
                Contactez l'admin pour débloquer vos accès.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
