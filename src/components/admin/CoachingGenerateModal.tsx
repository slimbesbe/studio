"use client";

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { generateCoachingSimulation } from '@/ai/flows/generate-coaching-simulation';

interface CoachingGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
}

export function CoachingGenerateModal({ isOpen, onClose, session }: CoachingGenerateModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { firestore: db } = useFirebase();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!session) return;
    setIsGenerating(true);
    try {
      const questions = await generateCoachingSimulation(
        session.title, 
        session.questionStart, 
        session.questionEnd
      );

      if (questions.length === 0) throw new Error("Aucune question générée.");

      const batch = writeBatch(db);
      questions.forEach((q) => {
        const qRef = doc(db, 'questions', `COACHING_Q_${q.index}`);
        batch.set(qRef, {
          ...q,
          id: qRef.id,
          isActive: true,
          updatedAt: serverTimestamp(),
          source: 'ai_generation',
          sessionId: session.id
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Simulation générée", description: `${questions.length} questions créées via IA.` });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur génération", description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isGenerating && !val && onClose()}>
      <DialogContent className="max-w-md rounded-[40px] p-10 border-4 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-amber-500" /> Générer via IA
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic uppercase text-[10px] tracking-widest mt-2">
            Création automatique de {session?.questionEnd - session?.questionStart + 1} questions pour {session?.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="bg-primary/5 p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase text-xs italic">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Attention
            </div>
            <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
              La génération de 35 questions complexes peut prendre jusqu'à 60 secondes. Ne fermez pas cette fenêtre.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-4">
          <Button variant="outline" className="h-14 rounded-xl font-black uppercase flex-1 border-4" onClick={onClose} disabled={isGenerating}>Annuler</Button>
          <Button disabled={isGenerating} onClick={handleGenerate} className="h-14 rounded-xl font-black bg-primary hover:bg-primary/90 flex-1 shadow-2xl uppercase">
            {isGenerating ? <Loader2 className="animate-spin h-5 w-5" /> : "Lancer la Génération"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
