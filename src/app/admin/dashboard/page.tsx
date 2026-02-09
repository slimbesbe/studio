
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookCopy, 
  PlusCircle,
  Loader2,
  ShieldAlert,
  Settings,
  ArrowRight,
  LayoutGrid,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!isUserLoading) {
        if (user) {
          // Vérifier dans roles_admin pour être sûr
          const adminDoc = await getDoc(doc(db, 'roles_admin', user.uid));
          if (!adminDoc.exists()) {
            console.log("Not an admin, redirecting...");
            router.push('/dashboard');
          } else {
            setIsAdmin(true);
          }
        } else {
          router.push('/');
        }
      }
    }
    checkAdmin();
  }, [user, isUserLoading, db, router]);

  if (isUserLoading || isAdmin === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Panneau d'administration SIMOVEX
          </h1>
          <p className="text-muted-foreground mt-1">Gestion centrale de la plateforme et des contenus.</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Vue d'ensemble */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <LayoutGrid className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle>Vue d'ensemble</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analysez les KPIs globaux, les taux de réussite et l'activité en temps réel des participants.
            </p>
            <Button asChild variant="outline" className="w-full border-emerald-200 hover:bg-emerald-50">
              <Link href="/admin/users">
                <BarChart3 className="mr-2 h-4 w-4 text-emerald-600" /> Voir les statistiques
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Banque de Questions */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BookCopy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Banque de Questions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gérez le contenu pédagogique. Créez des questions avec choix variables et justifications.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/admin/questions">
                  <Settings className="mr-2 h-4 w-4" /> Gérer
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/admin/questions/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gestion des Utilisateurs */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-accent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-2 rounded-lg">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Gestion Utilisateurs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Administrez les comptes participants. Gérez les rôles, les accès et la validité.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1 bg-accent hover:bg-accent/90">
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4" /> Comptes
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 border-accent text-accent hover:bg-accent/5">
                <Link href="/admin/users/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Créer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 rounded-xl p-6 border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-full">
            <ShieldAlert className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold">Accès Sécurisé</h3>
            <p className="text-sm text-muted-foreground">Vos actions sont protégées et tracées par les règles de sécurité Firestore.</p>
          </div>
        </div>
        <Button variant="ghost" className="text-emerald-600 font-bold" asChild>
          <Link href="/dashboard">
            Voir le Dashboard Participant <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
