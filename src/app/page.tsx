
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock, Play } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

  const handleDemoAccess = async () => {
    setIsDemoLoading(true);
    try {
      await signInAnonymously(auth);
      toast({ title: "Mode DÉMO activé", description: "Vous accédez à la plateforme avec des fonctionnalités limitées." });
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-8 group">
        <div className="bg-primary p-2 rounded-xl">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <span className="font-headline font-bold text-2xl tracking-tight text-primary">
          INOVEX <span className="text-accent">PMP</span>
        </span>
      </div>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-xl animate-slide-up">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center text-primary">Identification</CardTitle>
          <CardDescription className="text-center">
            Espace de simulation PMP professionnel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Button type="submit" className="w-full font-bold h-12 text-lg shadow-lg shadow-primary/20" disabled={isLoading || isDemoLoading}>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou tester sans compte</span>
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
            Lancer le mode DEMO
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6 bg-secondary/5">
          <div className="text-center text-sm text-muted-foreground w-full">
            <p>Accès restreint aux consultants INOVEX</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
