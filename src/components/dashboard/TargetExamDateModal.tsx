
'use client';

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2, Save } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TargetExamDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: any;
}

export function TargetExamDateModal({ isOpen, onClose, currentDate }: TargetExamDateModalProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Format initial date for input (YYYY-MM-DD)
  const initialValue = currentDate 
    ? (currentDate instanceof Timestamp ? currentDate.toDate() : new Date(currentDate))
        .toISOString().split('T')[0]
    : '';

  const [dateValue, setDateValue] = useState(initialValue);

  const handleSave = async () => {
    if (!user || !dateValue) return;
    
    setIsSubmitting(true);
    try {
      const targetDate = new Date(dateValue);
      await updateDoc(doc(db, 'users', user.uid), {
        targetExamDate: Timestamp.fromDate(targetDate),
        targetExamDateUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast({ 
        title: "Objectif mis à jour", 
        description: "Votre date cible d'examen a été enregistrée." 
      });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder la date." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isSubmitting && !val && onClose()}>
      <DialogContent className="max-w-md rounded-[32px] p-8 border-4 shadow-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-primary flex items-center gap-3">
            <Calendar className="h-6 w-6 text-accent" /> Date Cible PMP®
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 italic text-xs mt-2">
            Définissez la date à laquelle vous prévoyez de passer votre examen final.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-1">Choisir la date</Label>
            <Input 
              type="date" 
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="h-14 rounded-xl border-2 font-black italic text-lg shadow-sm"
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
            Le système calculera automatiquement votre état de préparation en fonction du temps restant.
          </p>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" className="h-14 rounded-xl font-black uppercase flex-1 border-2" onClick={onClose} disabled={isSubmitting}>Annuler</Button>
          <Button disabled={isSubmitting || !dateValue} onClick={handleSave} className="h-14 rounded-xl font-black bg-primary hover:bg-primary/90 flex-1 shadow-xl uppercase">
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="mr-2 h-5 w-5" /> Enregistrer</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
