
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <Link className="flex items-center gap-2 mb-8 group" href="/">
        <div className="bg-primary p-2 rounded-xl group-hover:scale-110 transition-transform">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        <span className="font-headline font-bold text-2xl tracking-tight text-primary">INOVEXIO <span className="text-accent">PMP</span></span>
      </Link>
      
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-headline font-bold text-center">Bienvenue</CardTitle>
          <CardDescription className="text-center">
            Accédez à votre espace de simulation PMP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="nom@exemple.com" className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" className="pl-10" required />
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
            <Button type="submit" className="w-full font-bold h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <p className="text-sm text-center text-muted-foreground">
            Pas encore d'accès ? <Link href="#" className="text-primary font-bold hover:underline">Contactez votre formateur</Link>
          </p>
          <div className="grid grid-cols-2 gap-2 w-full">
             <Button variant="outline" size="sm" onClick={() => router.push('/admin/dashboard')}>Demo Admin</Button>
             <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>Demo Participant</Button>
          </div>
        </CardFooter>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-[300px]">
        En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </p>
    </div>
  );
}
