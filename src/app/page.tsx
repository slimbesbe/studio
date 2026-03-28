"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, Play, ShieldCheck, MailWarning, RefreshCw } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SimuLuxLogo } from '@/components/dashboard/Sidebar';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needsSync, setNeedsSync] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const ADMIN_EMAILS = ['slim.besbes@yahoo.fr'];
  const MASTER_PASS = '147813';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsSync(false);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // 1. Tentative de connexion standard
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        const uid = userCredential.user.uid;
        
        // SECURITÉ : Seul l'email de Slim Besbes redirige vers l'admin.
        const isSA = ADMIN_EMAILS.includes(trimmedEmail);
        
        if (isSA) {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
        
        toast({ title: "Connexion réussie", description: "Bienvenue sur Simu-lux." });
      } catch (authError: any) {
        // 2. Détection de désynchronisation
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', trimmedEmail), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          if (userDoc.password === password || (ADMIN_EMAILS.includes(trimmedEmail) && password === MASTER_PASS)) {
            setNeedsSync(true);
            toast({
              variant: "destructive",
              title: "Synchronisation requise",
              description: "L'administration a mis à jour votre accès. Cliquez sur le bouton de synchronisation ci-dessous."
            });
            return;
          }
        }
        throw authError;
      }
    } catch (error: any) {
      console.error("Login error", error);
      toast({
        variant: "destructive",
        title: "Échec d'identification",
        description: "Email ou mot de passe incorrect."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAccess = async () => {
    if (!email) return;
    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      toast({ 
        title: "Email envoyé", 
        description: "Suivez le lien reçu par email pour définir votre nouveau mot de passe." 
      });
      setNeedsSync(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'envoyer l'email." });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleDemoRedirect = () => {
    window.location.href = 'https://www.simu-lux.com/fr/signup';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-fade-in overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <SimuLuxLogo className="h-12 w-12" />
        <span className="font-headline font-black text-3xl italic tracking-tighter text-primary">
          Simu-lux <span className="text-accent">PMP</span>
        </span>
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl overflow-hidden">
        <CardHeader className="space-y-1 bg-slate-50/50 border-b">
          <CardTitle className="text-2xl font-black text-center text-primary italic uppercase tracking-tight">Espace Membre</CardTitle>
          <CardDescription className="text-center font-bold text-[10px] uppercase tracking-widest text-slate-400">Accès sécurisé v2.5</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Email Professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input type="email" placeholder="votre@email.com" className="pl-10 h-12 rounded-xl font-bold italic border-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black uppercase text-[10px] text-slate-400 ml-1 italic">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input type="password" placeholder="••••••••" className="pl-10 h-12 rounded-xl font-bold italic border-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            
            <Button type="submit" className="w-full font-black h-14 text-lg shadow-xl bg-primary hover:scale-[1.02] transition-transform uppercase italic tracking-widest" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Vérification...</> : "Se connecter"}
            </Button>
          </form>

          {needsSync && (
            <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-200 animate-slide-up space-y-4">
              <div className="flex items-center gap-3 text-amber-700">
                <RefreshCw className="h-5 w-5 animate-spin-slow" />
                <p className="text-[11px] font-black uppercase italic leading-tight">Action requise : Synchronisation du compte</p>
              </div>
              <p className="text-[10px] font-bold text-amber-600 leading-relaxed italic">
                L'administrateur a mis à jour vos accès. Pour activer votre compte, vous devez définir votre mot de passe réel via le lien ci-dessous.
              </p>
              <Button 
                variant="outline" 
                className="w-full h-12 border-amber-300 text-amber-700 bg-white hover:bg-amber-100 font-black uppercase text-xs shadow-sm"
                onClick={handleSyncAccess}
                disabled={isResetLoading}
              >
                {isResetLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <MailWarning className="h-4 w-4 mr-2" />}
                Synchroniser via Email
              </Button>
            </div>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-dashed" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-300 font-black italic text-[9px] tracking-widest">OU</span></div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 border-2 border-accent text-accent hover:bg-accent/5 font-black uppercase italic text-xs tracking-widest rounded-xl" 
            onClick={handleDemoRedirect}
          >
            <Play className="mr-2 h-4 w-4 fill-accent" />
            Explorer en mode DÉMO
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t py-4 bg-slate-50/50">
          <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Plateforme Certifiée Simu-lux
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
