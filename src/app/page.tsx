
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, Play, ShieldCheck, ShieldAlert, Globe } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SimuLuxLogo } from '@/components/dashboard/Sidebar';
import { sendSecurityLockEmails } from '@/lib/services/mail-service';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const ADMIN_EMAILS = ['slim.besbes@yahoo.fr', 'contact@inovexio.com', 'jedgrira1@gmail.com'];

  const getDeviceFingerprint = () => {
    if (typeof window === 'undefined') return 'server';
    return `${navigator.userAgent}-${window.screen.width}x${window.screen.height}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const currentFingerprint = getDeviceFingerprint();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        throw new Error("Profil introuvable.");
      }

      const userData = userDocSnap.data();
      const isSA = ADMIN_EMAILS.includes(trimmedEmail);

      if (userData.isLocked === true) {
        await signOut(auth);
        setErrorMessage("ALERTE : Votre compte a été bloqué pour non-respect des règles de sécurité. Veuillez contacter l'administrateur.");
        return;
      }

      if (!isSA && userData.activeSession?.deviceId && userData.activeSession.deviceId !== currentFingerprint) {
        await updateDoc(userDocRef, {
          isLocked: true,
          lockReason: 'multi-device',
          updatedAt: serverTimestamp()
        });
        sendSecurityLockEmails(db, trimmedEmail, `${userData.firstName} ${userData.lastName}`);
        await signOut(auth);
        setErrorMessage("ALERTE : Votre compte a été bloqué pour non-respect des règles de sécurité (multi-appareils).");
        return;
      }

      await updateDoc(userDocRef, {
        activeSession: {
          deviceId: currentFingerprint,
          lastLogin: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      if (isSA || userData.role === 'admin' || userData.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
      toast({ title: "Connexion réussie" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Email ou mot de passe incorrect." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard');
      toast({ title: "Accès Essai Gratuit" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-fade-in">
      {/* HEADER MIRROR UI */}
      <header className="fixed top-0 left-0 w-full h-20 bg-white border-b flex items-center justify-between px-8 z-50">
        <SimuLuxLogo className="h-10 w-40" />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest italic cursor-not-allowed">
            <Globe className="h-4 w-4" /> FR
          </div>
          <Button variant="outline" onClick={handleDemoLogin} className="border-primary text-primary hover:bg-primary/5 h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest italic">
            Essai gratuit
          </Button>
          <Button onClick={() => document.getElementById('email-input')?.focus()} className="bg-primary text-white h-10 px-6 rounded-full font-black uppercase text-[10px] tracking-widest italic">
            Connexion
          </Button>
        </div>
      </header>

      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl overflow-hidden mt-10">
        <CardHeader className="space-y-1 bg-slate-50/50 border-b">
          <CardTitle className="text-2xl font-black text-center text-primary italic uppercase tracking-tight">Espace Membre</CardTitle>
          <CardDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-400">Accès sécurisé Simu-lux</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-red-700 leading-relaxed italic">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Email Professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input id="email-input" type="email" placeholder="votre@email.com" className="pl-10 h-12 rounded-xl font-bold italic border-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input type="password" placeholder="••••••••" className="pl-10 h-12 rounded-xl font-bold italic border-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full font-black h-14 text-lg shadow-xl bg-primary uppercase italic tracking-widest" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4 bg-slate-50/50">
          <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Sécurité Anti-Partage Active
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
