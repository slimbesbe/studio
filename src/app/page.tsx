
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock, Play, ShieldCheck, MailWarning } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SimuLuxLogo } from '@/components/dashboard/Sidebar';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminReset, setShowAdminReset] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const ADMIN_EMAIL = 'slim.besbes@yahoo.fr'.toLowerCase();
  const ADMIN_PASS = '147813';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowAdminReset(false);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      let userCredential;
      
      try {
        userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (signInError: any) {
        const isAuthAdmin = trimmedEmail === ADMIN_EMAIL && password === ADMIN_PASS;
        
        if (isAuthAdmin) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            toast({ title: "Bienvenue", description: "Initialisation de votre accès Super Admin." });
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              setShowAdminReset(true);
              throw new Error("Accès Admin : Le mot de passe 147813 est incorrect pour ce compte existant. Veuillez utiliser votre mot de passe habituel ou le réinitialiser.");
            }
            throw createError;
          }
        } else {
          throw signInError;
        }
      }

      const user = userCredential.user;

      if (trimmedEmail === ADMIN_EMAIL) {
        const now = serverTimestamp();
        await setDoc(doc(db, 'roles_admin', user.uid), { 
          createdAt: now,
          email: ADMIN_EMAIL,
          isSuperAdmin: true
        }, { merge: true });

        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: trimmedEmail,
          firstName: 'Slim',
          lastName: 'Besbes',
          role: 'super_admin',
          status: 'active',
          updatedAt: now
        }, { merge: true });

        router.push('/admin/dashboard');
      } else {
        const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
        if (adminDoc.exists()) router.push('/admin/dashboard');
        else router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Identifiants incorrects."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAdmin = async () => {
    setIsResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, ADMIN_EMAIL);
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail pour réinitialiser votre accès Admin." });
      setShowAdminReset(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'accéder au mode démo." });
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <SimuLuxLogo className="h-12 w-12" />
        <span className="font-headline font-black text-3xl italic tracking-tighter text-primary">
          Simu-lux <span className="text-accent">PMP</span>
        </span>
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl animate-slide-up">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center text-primary">Identification</CardTitle>
          <CardDescription className="text-center">Accédez à votre espace professionnel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="votre@email.com" className="pl-10 h-11" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-11" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full font-bold h-12 text-lg shadow-lg" disabled={isLoading || isDemoLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Vérification...</> : "Se connecter"}
            </Button>
          </form>

          {showAdminReset && (
            <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200 animate-slide-up">
              <p className="text-[10px] font-black text-amber-800 uppercase italic mb-2">Problème d'accès Admin ?</p>
              <Button 
                variant="outline" 
                className="w-full h-10 border-amber-300 text-amber-700 bg-white hover:bg-amber-100 font-black uppercase text-[10px]"
                onClick={handleResetAdmin}
                disabled={isResetLoading}
              >
                {isResetLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <MailWarning className="h-4 w-4 mr-2" />}
                Réinitialiser mon mot de passe
              </Button>
            </div>
          )}

          <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground text-[10px]">Découvrir</span></div></div>

          <Button variant="outline" className="w-full h-11 border-accent text-accent hover:bg-accent/5 font-bold" onClick={handleDemoAccess} disabled={isLoading || isDemoLoading}>
            {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Lancer le mode DÉMO
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-secondary/5">
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Accès sécurisé Simu-lux v2.1</p>
        </CardFooter>
      </Card>
    </div>
  );
}
