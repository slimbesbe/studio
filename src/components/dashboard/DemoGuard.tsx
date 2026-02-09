
'use client';

import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * DemoGuard surveille les interactions de l'utilisateur en mode Démo.
 * Affiche un message d'alerte après un certain nombre de clics.
 */
export function DemoGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [clickCount, setClickCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user?.isAnonymous) return;

    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[role="dialog"]')) return;

      setClickCount((prev) => {
        const next = prev + 1;
        // Déclenchement de l'alerte après 15 clics pour permettre une exploration correcte
        if (next >= 15) {
          setShowModal(true);
        }
        return next;
      });
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [user]);

  if (!user?.isAnonymous) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="rounded-[32px] p-8 border-8 border-destructive shadow-2xl bg-white z-[999] max-w-lg animate-in fade-in zoom-in duration-300">
          <DialogHeader className="flex flex-col items-center gap-4">
            <div className="bg-destructive p-4 rounded-full animate-bounce shadow-xl">
              <ShieldAlert className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-1 text-center">
              <DialogTitle className="text-5xl font-black text-destructive uppercase italic tracking-tighter leading-none">
                ATTENTION !
              </DialogTitle>
              <p className="text-[10px] font-black text-destructive/60 uppercase tracking-[0.4em]">ACCÈS RESTREINT</p>
            </div>
            <div className="h-1 w-32 bg-destructive/20 rounded-full" />
            <DialogDescription className="text-xl font-black text-slate-900 text-center leading-relaxed uppercase tracking-tight pt-2 italic">
              Vous êtes en mode <span className="text-destructive underline underline-offset-4">DÉMO</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mt-4">
            <p className="text-sm font-bold text-center text-slate-600 px-6 leading-relaxed uppercase">
              Veuillez contacter l'administrateur pour un <span className="text-primary">accès complet</span> (Login et Mot de passe).
            </p>
          </div>

          <DialogFooter className="mt-8 justify-center sm:justify-center">
            <Button 
              onClick={() => {
                setShowModal(false);
                setClickCount(0);
              }}
              className="h-14 w-full rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-lg shadow-lg transition-all active:scale-95"
            >
              J'AI COMPRIS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
