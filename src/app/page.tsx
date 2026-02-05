
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock, Play, ShieldCheck } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const ADMIN_EMAIL = 'slim.besbes@yahoo.fr';
    const ADMIN_PASS = '147813';

    try {
      let userCredential;
      
      try {
        // Tenter la connexion
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (signInError: any) {
        // Gestion des erreurs de connexion pour le bootstrap admin
        const isAuthAdmin = email === ADMIN_EMAIL && password === ADMIN_PASS;
        const isNotFound = signInError.code === 'auth/user-not-found' || 
                          signInError.code === 'user-not-found' || 
                          signInError.code === 'auth/invalid-credential'; // Nouveau code Firebase unifié

        if (isAuthAdmin && isNotFound) {
          try {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            toast({ title: "Bienvenue", description: "Compte Super Admin initialisé avec succès." });
          } catch (createError: any) {
            // Si l'utilisateur existe déjà mais que le mot de passe était incorrect lors du premier essai
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error("Mot de passe incorrect pour ce compte administrateur.");
            }
            throw createError;
          }
        } else {
          throw signInError;
        }
      }

      const user = userCredential.user;

      // Mise à jour ou création forcée des permissions pour le Super Admin
      if (email === ADMIN_EMAIL) {
        await Promise.all([
          setDoc(doc(db, 'roles_admin', user.uid), { 
            createdAt: serverTimestamp(),
            email: ADMIN_EMAIL,
            isSuperAdmin: true
          }, { merge: true }),
          setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            email: email,
            firstName: 'Slim',
            lastName: 'Besbes',
            role: 'super_admin',
            status: 'active',
            updatedAt: serverTimestamp()
          }, { merge: true })
        ]);

        toast({ title: "Accès Admin", description: "Connexion réussie au panel SIMOVEX." });
        router.push('/admin/dashboard');
      } else {
        // Vérification du rôle pour les autres utilisateurs
        const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
        if (adminDoc.exists()) {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      let message = "Identifiants incorrects.";
      
      if (error.code === 'auth/wrong-password') message = "Mot de passe incorrect.";
      if (error.code === 'auth/too-many-requests') message = "Trop de tentatives. Votre compte est temporairement bloqué.";
      if (error.code === 'auth/user-disabled') message = "Ce compte a été désactivé.";
      if (error.message.includes("Mot de passe incorrect")) message = error.message;
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    try {
      await signInAnonymously(auth);
      toast({ title: "Mode DÉMO", description: "Accès aux fonctionnalités de démonstration." });
      router.push('/dashboard/practice');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'accéder au mode démo."
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-primary p-2 rounded-xl shadow-lg">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <span className="font-headline font-bold text-2xl tracking-tight text-primary">
          SIMOVEX <span className="text-accent">PMP</span>
        </span>
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl animate-slide-up">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center text-primary">Identification</CardTitle>
          <CardDescription className="text-center">
            Accédez à votre espace de simulation professionnel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="votre@email.com" 
                  className="pl-10 h-11" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="pl-10 h-11" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full font-bold h-12 text-lg shadow-lg" disabled={isLoading || isDemoLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Vérification...</>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground text-[10px]">Découvrir</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-11 border-accent text-accent hover:bg-accent/5 font-bold" 
            onClick={handleDemoAccess}
            disabled={isLoading || isDemoLoading}
          >
            {isDemoLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Lancer le mode DÉMO
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-secondary/5">
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> Accès sécurisé SIMOVEX v2.1
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
