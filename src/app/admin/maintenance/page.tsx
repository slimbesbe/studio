
"use client";

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, RefreshCw, Loader2, ChevronLeft, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function MaintenancePage() {
  const db = useFirestore();
  const { profile } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const clearCollection = async (collectionName: string, label: string) => {
    if (!confirm(`ATTENTION : Voulez-vous vraiment supprimer TOUS les documents de la collection "${label}" ? Cette action est irréversible.`)) {
      return;
    }

    setLoading(collectionName);
    try {
      const snap = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      
      let count = 0;
      snap.forEach((d) => {
        batch.delete(d.ref);
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      
      toast({ 
        title: "Nettoyage réussi", 
        description: `${count} documents supprimés de ${label}.` 
      });
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Erreur", 
        description: "Impossible de vider la collection. Vérifiez vos permissions." 
      });
    } finally {
      setLoading(null);
    }
  };

  const resetAll = async () => {
    if (!confirm("ACTION CRITIQUE : Voulez-vous réinitialiser TOUTE la plateforme (Questions, Sessions, Résultats) ?")) {
      return;
    }
    
    setLoading('all');
    try {
      // 1. Questions
      const qSnap = await getDocs(collection(db, 'questions'));
      // 2. Coaching Sessions
      const sSnap = await getDocs(collection(db, 'coachingSessions'));
      // 3. Coaching Attempts
      const aSnap = await getDocs(collection(db, 'coachingAttempts'));

      const batch = writeBatch(db);
      qSnap.forEach(d => batch.delete(d.ref));
      sSnap.forEach(d => batch.delete(d.ref));
      aSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      
      toast({ 
        title: "Réinitialisation complète", 
        description: "La plateforme a été vidée de ses contenus et résultats." 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors du reset complet" });
    } finally {
      setLoading(null);
    }
  };

  if (!isAdmin && profile) {
    return <div className="p-20 text-center font-bold text-destructive">ACCÈS REFUSÉ</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-destructive flex items-center gap-3">
            <Database className="h-8 w-8" /> Maintenance Système
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic text-destructive">Zone de danger : Actions irréversibles sur la base de données.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Section Questions */}
        <Card className="border-2 border-destructive/20 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-destructive/5 border-b p-6">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 p-2 rounded-lg"><Trash2 className="h-5 w-5 text-destructive" /></div>
              <div>
                <CardTitle className="text-xl font-black uppercase italic">Banque de Questions</CardTitle>
                <CardDescription className="text-xs font-bold italic">Supprimer l'intégralité des questions stockées.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 font-medium max-w-md">
              Cette action videra la collection "questions". Vous devrez ré-importer vos fichiers Excel après cette opération.
            </p>
            <Button 
              variant="destructive" 
              className="h-14 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg min-w-[200px]"
              onClick={() => clearCollection('questions', 'Questions')}
              disabled={!!loading}
            >
              {loading === 'questions' ? <Loader2 className="animate-spin h-5 w-5" /> : "Vider la Banque"}
            </Button>
          </CardContent>
        </Card>

        {/* Section Coaching */}
        <Card className="border-2 border-orange-200 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-orange-50 border-b p-6">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg"><RefreshCw className="h-5 w-5 text-orange-600" /></div>
              <div>
                <CardTitle className="text-xl font-black uppercase italic">Sessions & Résultats</CardTitle>
                <CardDescription className="text-xs font-bold italic">Remettre à zéro le module coaching.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500 font-medium max-w-md">
                Supprime toutes les tentatives de coaching des utilisateurs.
              </p>
              <Button 
                variant="outline" 
                className="h-14 px-8 rounded-xl font-black uppercase tracking-widest border-2 border-orange-200 text-orange-600 hover:bg-orange-50 min-w-[200px]"
                onClick={() => clearCollection('coachingAttempts', 'Tentatives Coaching')}
                disabled={!!loading}
              >
                {loading === 'coachingAttempts' ? <Loader2 className="animate-spin h-5 w-5" /> : "Effacer Scores"}
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-dashed">
              <p className="text-sm text-slate-500 font-medium max-w-md">
                Supprime les configurations de sessions (S1-S6).
              </p>
              <Button 
                variant="outline" 
                className="h-14 px-8 rounded-xl font-black uppercase tracking-widest border-2 border-orange-200 text-orange-600 hover:bg-orange-50 min-w-[200px]"
                onClick={() => clearCollection('coachingSessions', 'Sessions Coaching')}
                disabled={!!loading}
              >
                {loading === 'coachingSessions' ? <Loader2 className="animate-spin h-5 w-5" /> : "Supprimer Sessions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global Reset */}
        <div className="pt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-destructive font-black uppercase text-xs animate-pulse">
            <AlertTriangle className="h-4 w-4" /> Attention : Action irréversible
          </div>
          <Button 
            variant="destructive" 
            size="lg"
            className="h-16 px-12 rounded-2xl font-black uppercase tracking-tighter text-xl shadow-2xl"
            onClick={resetAll}
            disabled={!!loading}
          >
            {loading === 'all' ? <Loader2 className="animate-spin h-6 w-6" /> : "RÉINITIALISATION TOTALE"}
          </Button>
        </div>
      </div>
    </div>
  );
}
