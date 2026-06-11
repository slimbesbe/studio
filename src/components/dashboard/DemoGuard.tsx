
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
import { ShieldAlert, Lock, Contact } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DemoGuard - Sécurité Zéro Tolérance.
 * Intercepte absolument TOUS les clics pour les comptes du groupe DEMO ou rôle demo.
 */
export function DemoGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isUserLoading } = useUser();
  const [showModal, setShowModal] = useState(false);

  const isDemo = !isUserLoading && (
    user?.isAnonymous || 
    profile?.role === 'demo' || 
    profile?.groupId === 'DEMO'
  );

  const handleGlobalIntercept = useCallback((e: MouseEvent) => {
    if (!isDemo) return;

    const target = e.target as HTMLElement;
    const interactiveTarget = target.closest('button, a, input, select, textarea, [role="button"], label');

    if (interactiveTarget) {
      if (interactiveTarget.closest('[role="dialog"]')) return;
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
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
            <div className="bg-red-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto shadow-inner border-2 border-red-100 animate-pulse">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            
            <div className="space-y-4">
              <DialogTitle className="text-3xl font-black text-destructive uppercase italic tracking-tighter leading-tight">
                ACCÈS LIMITÉ
              </DialogTitle>
              <DialogDescription className="text-lg font-bold text-slate-400 italic uppercase tracking-widest text-[10px]">
                FONCTIONNALITÉ RÉSERVÉE • MODE DÉMO
              </DialogDescription>
            </div>

            <div className="bg-red-50 p-6 rounded-3xl border-4 border-dashed border-red-100">
              <div className="flex items-center gap-3 text-destructive mb-3 justify-center">
                <Lock className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">ADHÉSION REQUISE</span>
              </div>
              <p className="text-sm font-bold text-red-900 leading-relaxed italic">
                Ceci est un accès de démonstration. L'utilisation des simulateurs, des outils de coaching et des statistiques est réservée aux membres inscrits.
              </p>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                 <div className="flex items-center justify-center gap-2 text-slate-400 font-black uppercase text-[9px] italic">
                   <Contact className="h-3 w-3" /> Support Simu-lux
                 </div>
                 <span className="text-xs font-black text-slate-700 italic tracking-tight">contact@simu-lux.com</span>
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
