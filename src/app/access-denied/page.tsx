
'use client';

import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogOut, ShieldAlert, Clock, Mail, AlertTriangle } from 'lucide-react';
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
  const isLocked = profile?.isLocked === true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md border-t-8 border-t-destructive shadow-3xl rounded-[40px] overflow-hidden bg-white">
        <CardHeader className="text-center p-10">
          <div className="flex justify-center mb-6">
            <div className="bg-red-50 p-6 rounded-[32px] animate-pulse">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-destructive uppercase italic tracking-tighter">
            {isLocked ? 'ACCÈS VERROUILLÉ' : isExpired ? 'ACCÈS EXPIRÉ' : 'ACCÈS REFUSÉ'}
          </CardTitle>
          <CardDescription className="font-bold text-slate-400 mt-2 uppercase tracking-widest text-[10px]">
            {isLocked ? 'Violation des règles de sécurité' : 'Restriction de compte Simu-lux'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10 space-y-8">
          
          <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-destructive font-black uppercase text-[10px] italic">
               <AlertTriangle className="h-4 w-4" /> Message Système
            </div>
            <p className="text-sm font-bold text-red-900 leading-relaxed italic">
              {isLocked 
                ? "ALERTE : Votre compte a été bloqué pour non-respect des règles de sécurité (connexion simultanée ou multi-appareils). Veuillez contacter l'administrateur pour récupérer votre compte."
                : isExpired 
                ? `Votre période de validité est terminée depuis le ${profile?.expiresAt ? new Date(profile.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}.`
                : "Votre compte a été temporairement suspendu par l'équipe pédagogique."
              }
            </p>
          </div>

          {isLocked && (
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed">
              <Mail className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-500 italic">Support Technique</p>
                <p className="text-xs font-bold text-slate-600">contact@simu-lux.com</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleLogout} variant="outline" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs italic border-4">
              <LogOut className="mr-2 h-4 w-4" /> Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
