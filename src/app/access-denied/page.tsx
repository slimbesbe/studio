
'use client';

import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, LogOut, ShieldAlert, Clock } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage() {
  const { profile, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  if (isUserLoading) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const isExpired = profile?.status === 'expired';
  const isDisabled = profile?.status === 'disabled';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-t-4 border-t-destructive shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isExpired ? (
              <Clock className="h-16 w-16 text-destructive animate-pulse" />
            ) : (
              <ShieldAlert className="h-16 w-16 text-destructive animate-bounce" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            {isExpired ? 'Accès Expiré' : 'Accès Refusé'}
          </CardTitle>
          <CardDescription>
            {isExpired 
              ? 'Votre période de validité SIMOVEX est terminée.' 
              : 'Votre compte a été désactivé par l\'administrateur.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg text-center">
            <p className="text-sm font-medium text-destructive">
              {isExpired 
                ? `Votre accès a pris fin le ${profile?.expiresAt ? new Date(profile.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}.`
                : profile?.disabledReason || 'Veuillez contacter votre formateur pour plus d\'informations.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
