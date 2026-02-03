
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
      
      if (adminDoc.exists()) {
        toast({ title: "Connexion réussie", description: "Bienvenue, Super Admin." });
        router.push('/admin/dashboard');
      } else {
        toast({ title: "Connexion réussie", description: "Content de vous revoir." });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupSuperAdmin = async () => {
    setIsInitializing(true);
    const adminEmail = "slim.besbes@yahoo.fr";
    const adminPass = "147813";

    try {
      let user;
      try {
        const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        user = cred.user;
      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
          user = cred.user;
        } else {
          throw e;
        }
      }

      if (user) {
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: adminEmail,
          firstName: "Slim",
          lastName: "Besbes",
          roleId: "super_admin",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, 'roles_admin', user.uid), {
          id: user.uid,
          grantedAt: serverTimestamp()
        }, { merge: true });

        toast({
          title: "Succès",
          description: "Le compte Super Admin a été configuré avec succès."
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur d'initialisation",
        description: error.message
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-8 group">
        <div className="bg-primary p-2 rounded-xl">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <span className="font-headline font-bold text-2xl tracking-tight text-primary">
          INOVEXIO <span className="text-accent">PMP</span>
        </span>
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-xl animate-slide-up">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center text-primary">Identification</CardTitle>
          <CardDescription className="text-center">
            Espace de simulation PMP professionnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nom@exemple.com" 
                  className="pl-10 h-11" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10 h-11" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Se souvenir de moi
              </label>
            </div>
            <Button type="submit" className="w-full font-bold h-12 text-lg shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Accéder à la plateforme"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-secondary/5">
          <div className="text-center text-sm text-muted-foreground w-full space-y-4">
            <p>Accès restreint aux consultants INOVEXIO</p>
            
            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
                onClick={setupSuperAdmin}
                disabled={isInitializing}
              >
                {isInitializing ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <ShieldCheck className="h-3 w-3 mr-1" />
                )}
                Configuration initiale
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
