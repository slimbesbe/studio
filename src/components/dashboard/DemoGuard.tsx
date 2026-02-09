
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
 * Autorise une exploration plus large (environ 15 clics) pour permettre de tester une question réelle.
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
        // On laisse plus de marge (15 clics) pour permettre de faire au moins une question complète
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
        <DialogContent className="rounded-[40px] p-12 border-[12px] border-destructive shadow-[0_0_100px_rgba(220,38,38,0.5)] bg-white z-[999] max-w-2xl animate-in fade-in zoom-in duration-300">
          <DialogHeader className="flex flex-col items-center gap-6">
            <div className="bg-destructive p-6 rounded-full animate-bounce shadow-2xl">
              <ShieldAlert className="h-20 w-20 text-white" />
            </div>
            <div className="space-y-2 text-center">
              <DialogTitle className="text-7xl font-black text-destructive uppercase italic tracking-tighter leading-none">
                ATTENTION !
              </DialogTitle>
              <p className="text-xs font-black text-destructive/60 uppercase tracking-[0.5em]">ACCÈS RESTREINT</p>
            </div>
            <div className="h-2 w-48 bg-destructive rounded-full" />
            <DialogDescription className="text-2xl font-black text-slate-900 text-center leading-relaxed uppercase tracking-tight pt-4 italic">
              Vous êtes actuellement en mode <span className="text-destructive underline underline-offset-8">DÉMO</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-10 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 mt-6">
            <p className="text-xl font-bold text-center text-slate-600 px-8 leading-relaxed uppercase">
              Veuillez contacter l'administrateur pour obtenir un <span className="text-primary">accès complet</span> avec vos propres identifiants (Login et Mot de passe).
            </p>
          </div>

          <DialogFooter className="mt-10 justify-center sm:justify-center">
            <Button 
              onClick={() => {
                setShowModal(false);
                setClickCount(0);
              }}
              className="h-20 w-full rounded-3xl bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-2xl shadow-[0_10px_40px_rgba(220,38,38,0.4)] transition-all active:scale-95 hover:scale-[1.02]"
            >
              J'AI COMPRIS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
