
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, Play, ShieldCheck, ShieldAlert } from 'lucide-react';
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
      // 1. Authentification Firebase
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // 2. Récupération directe du document utilisateur par UID
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        throw new Error("Profil introuvable en base.");
      }

      const userData = userDocSnap.data();
      const isSA = ADMIN_EMAILS.includes(trimmedEmail);

      // BLOCAGE 1 : Compte déjà verrouillé historiquement
      if (userData.isLocked === true) {
        await signOut(auth);
        setErrorMessage("ALERTE : Votre compte a été bloqué pour non-respect des règles de sécurité (connexion simultanée ou multi-appareils). Veuillez contacter l'administrateur.");
        return;
      }

      // BLOCAGE 2 : Détection de connexion simultanée (autre appareil)
      // On vérifie si une session existe ET si l'appareil est différent
      if (!isSA && userData.activeSession && userData.activeSession.deviceId !== currentFingerprint) {
        // Détection de multi-device -> On verrouille le compte immédiatement
        await updateDoc(userDocRef, {
          isLocked: true,
          lockReason: 'multi-device',
          updatedAt: serverTimestamp()
        });

        // Notifications emails pédagogiques
        sendSecurityLockEmails(db, trimmedEmail, `${userData.firstName} ${userData.lastName}`);

        await signOut(auth);
        setErrorMessage("ALERTE : Votre compte a été bloqué pour non-respect des règles de sécurité (connexion simultanée ou multi-appareils). Veuillez contacter l'administrateur.");
        return;
      }

      // 3. Validation de la nouvelle session
      await updateDoc(userDocRef, {
        activeSession: {
          deviceId: currentFingerprint,
          lastLogin: serverTimestamp()
        },
        isLocked: false, // Sécurité : On s'assure qu'il n'est pas verrouillé ici
        updatedAt: serverTimestamp()
      });
      
      if (isSA || userData.role === 'admin' || userData.role === 'super_admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
      
      toast({ title: "Connexion réussie" });
    } catch (error: any) {
      console.error("Login Error:", error);
      let msg = "Email ou mot de passe incorrect.";
      if (error.code === 'auth/user-not-found') msg = "Utilisateur introuvable.";
      if (error.code === 'auth/wrong-password') msg = "Mot de passe incorrect.";
      
      toast({
        variant: "destructive",
        title: "Échec d'identification",
        description: msg
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard');
      toast({ title: "Mode Démo activé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in overflow-y-auto">
      <div className="flex flex-col items-center justify-center mb-8 w-full max-w-sm">
        <SimuLuxLogo className="h-24 w-full" />
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl overflow-hidden">
        <CardHeader className="space-y-1 bg-slate-50/50 border-b">
          <CardTitle className="text-2xl font-black text-center text-primary italic uppercase tracking-tight">Espace Membre</CardTitle>
          <CardDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-400">Accès sécurisé Simu-lux</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          
          {errorMessage && (
            <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <ShieldAlert className="h-6 w-6 shrink-0" />
                <span className="font-black uppercase italic text-xs tracking-tight">Sécurité Compromise</span>
              </div>
              <p className="text-[11px] font-bold text-red-700 leading-relaxed italic">
                {errorMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Email Professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input 
                  type="email" 
                  placeholder="votre@email.com" 
                  className="pl-10 h-12 rounded-xl font-bold italic border-2" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-12 rounded-xl font-bold italic border-2" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full font-black h-14 text-lg shadow-xl bg-primary hover:scale-[1.02] transition-transform uppercase italic tracking-widest" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...</> : "Se connecter"}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-dashed" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-300 font-black italic text-[9px] tracking-widest">OU</span></div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 border-2 border-accent text-accent hover:bg-accent/5 font-black uppercase italic text-xs tracking-widest rounded-xl" 
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            <Play className="mr-2 h-4 w-4 fill-accent" />
            Explorer en mode DÉMO
          </Button>
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
