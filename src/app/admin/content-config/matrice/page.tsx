
"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDocs, collection, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  Save, 
  Loader2, 
  LayoutGrid, 
  Target, 
  Zap, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';

export default function ManageMatriceConfig() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');

  const [config, setConfig] = useState({
    successThreshold: 80,
    questionsPerSprint: 5,
    lastUpdate: null
  });

  const configRef = useMemoFirebase(() => doc(db, 'config', 'matrice'), [db]);
  const { data: remoteConfig, isLoading: isConfigLoading } = useDoc(configRef);

  useEffect(() => {
    if (remoteConfig) {
      setConfig({
        successThreshold: remoteConfig.successThreshold || 80,
        questionsPerSprint: remoteConfig.questionsPerSprint || 5,
        lastUpdate: remoteConfig.updatedAt
      });
    }
    setIsLoading(isConfigLoading);
  }, [remoteConfig, isConfigLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'matrice'), {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast({ title: "Configuration mise à jour" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur sauvegarde" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenReset = () => {
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    setSecurityCode(code);
    setUserInputCode('');
    setIsResetModalOpen(true);
  };

  const performReset = async () => {
    if (userInputCode !== securityCode) return;
    setIsResetting(true);
    try {
      const snap = await getDocs(collection(db, 'coachingAttempts'));
      const batch = writeBatch(db);
      
      // On filtre uniquement les tentatives de type matrice pour être précis
      snap.docs.forEach(d => {
        if (d.data().context === 'matrix_sprint') {
          batch.delete(d.ref);
        }
      });
      
      await batch.commit();
      toast({ title: "Matrice réinitialisée pour tous les utilisateurs." });
      setIsResetModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur réinitialisation" });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/content-config"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
              <LayoutGrid className="h-8 w-8 text-indigo-600" /> Configuration Matrice
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Paramétrez l'algorithme des 9 cellules.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl">
          {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />} Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Paramètres de réussite */}
        <Card className="rounded-[40px] shadow-2xl border-none p-10 bg-white space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl"><Target className="h-6 w-6 text-indigo-600" /></div>
              <h3 className="text-xl font-black uppercase italic tracking-tight">Objectif Réussite</h3>
            </div>
            
            <div className="space-y-8 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="font-black uppercase text-[10px] text-slate-400 italic">Seuil de succès (Case verte)</Label>
                  <span className="text-3xl font-black italic text-primary">{config.successThreshold}%</span>
                </div>
                <Slider 
                  value={[config.successThreshold]} 
                  onValueChange={(val) => setConfig({...config, successThreshold: val[0]})} 
                  max={100} 
                  min={50} 
                  step={5} 
                  className="py-4"
                />
                <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
                  Définit à partir de quel score moyen une cellule de la matrice passe au vert.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed">
                <Label className="font-black uppercase text-[10px] text-slate-400 italic">Volume par Sprint</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number" 
                    value={config.questionsPerSprint} 
                    onChange={(e) => setConfig({...config, questionsPerSprint: parseInt(e.target.value) || 1})}
                    className="h-14 rounded-xl border-2 font-black italic text-2xl text-center w-32"
                  />
                  <div className="space-y-0.5">
                    <p className="font-black uppercase italic text-xs text-slate-700">Questions par session</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Recommandé : 5 questions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Maintenance */}
        <Card className="rounded-[40px] shadow-xl border-none p-10 bg-slate-900 text-white flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl"><RotateCcw className="h-6 w-6 text-indigo-400" /></div>
              <h3 className="text-xl font-black uppercase italic tracking-tight">Zone de Danger</h3>
            </div>
            <p className="text-slate-400 font-bold italic text-sm leading-relaxed">
              La réinitialisation supprimera les scores de la matrice pour **tous les utilisateurs**. Cette action est utile lors d'un changement majeur de banque de questions.
            </p>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-400 shrink-0" />
              <p className="text-[10px] font-bold text-slate-300 italic uppercase leading-relaxed">
                Les tentatives d'examen blanc et de pratique libre ne sont pas affectées par cette action.
              </p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleOpenReset}
            className="h-16 rounded-2xl font-black uppercase italic tracking-widest mt-8 shadow-2xl"
          >
            <AlertTriangle className="mr-2 h-5 w-5" /> Réinitialiser les scores
          </Button>
        </Card>
      </div>

      {/* Modal de réinitialisation */}
      <Dialog open={isResetModalOpen} onOpenChange={(val) => !isResetting && setIsResetModalOpen(val)}>
        <DialogContent className="rounded-[40px] p-12 border-8 border-destructive shadow-3xl max-w-xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className="bg-destructive p-4 rounded-full shadow-lg"><AlertTriangle className="h-12 w-12 text-white" /></div>
            <DialogTitle className="text-4xl font-black uppercase italic text-destructive tracking-tighter">Action Critique</DialogTitle>
            <DialogDescription className="text-lg font-bold text-slate-600 leading-relaxed uppercase italic">Voulez-vous vider la Matrice Magique de TOUS les élèves ?</DialogDescription>
          </DialogHeader>
          <div className="py-10 space-y-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-4 border-dashed text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Code de sécurité</p>
              <p className="text-6xl font-black tracking-widest text-primary tabular-nums">{securityCode}</p>
            </div>
            <div className="space-y-3">
              <Label className="font-black uppercase text-[10px] text-slate-400 italic ml-2">Confirmez par le code</Label>
              <Input value={userInputCode} onChange={(e) => setUserInputCode(e.target.value)} maxLength={8} className="h-16 rounded-2xl border-4 font-black text-center text-3xl italic tracking-widest" />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="outline" className="h-16 rounded-2xl font-black uppercase flex-1 border-4" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>Annuler</Button>
            <Button variant="destructive" disabled={userInputCode !== securityCode || isResetting} onClick={performReset} className="h-16 rounded-2xl font-black uppercase flex-1 shadow-2xl text-lg italic">
              {isResetting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> CONFIRMER</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
