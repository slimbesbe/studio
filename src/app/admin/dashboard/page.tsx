
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BookCopy, 
  Loader2,
  ShieldAlert,
  ArrowRight,
  LayoutGrid,
  BarChart3,
  GraduationCap,
  ShieldCheck,
  Database
} from 'lucide-react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { profile, isUserLoading } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isUserLoading) {
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        setIsAdmin(true);
      } else {
        router.push('/dashboard');
      }
    }
  }, [profile, isUserLoading, router]);

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
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            Panneau d'administration SIMOVEX
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Gestion centrale de la plateforme et des contenus.</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* 1/ Module Coaching */}
        <Card className="hover:shadow-2xl transition-all border-t-8 border-t-indigo-600 rounded-[32px] overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl font-black italic uppercase tracking-tight">Module Coaching</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-bold text-slate-500 italic leading-relaxed">
              Pilotez les 6 séances, gérez les liens Meet par groupe et analysez les scores détaillés.
            </p>
            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/admin/coaching">
                Gérer le programme <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2/ Banque de Questions */}
        <Card className="hover:shadow-2xl transition-all border-t-8 border-t-primary rounded-[32px] overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <BookCopy className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-black italic uppercase tracking-tight">Banque Questions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-bold text-slate-500 italic leading-relaxed">
              Gérez le contenu pédagogique global. Créez des questions avec choix variables et justifications.
            </p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/admin/questions">
                Modifier la banque <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 3/ Gestion des Utilisateurs */}
        <Card className="hover:shadow-2xl transition-all border-t-8 border-t-accent rounded-[32px] overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="bg-accent/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-xl font-black italic uppercase tracking-tight">Gestion Comptes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-bold text-slate-500 italic leading-relaxed">
              Administrez les comptes participants. Gérez les rôles, les accès et les dates de validité.
            </p>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/admin/users">
                Voir les comptes <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 4/ Maintenance */}
        <Card className="hover:shadow-2xl transition-all border-t-8 border-t-destructive rounded-[32px] overflow-hidden group">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <Database className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl font-black italic uppercase tracking-tight">Maintenance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-xs font-bold text-slate-500 italic leading-relaxed">
              Vider les banques de questions et réinitialiser les scores pour un nouveau départ.
            </p>
            <Button asChild variant="destructive" className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]">
              <Link href="/admin/maintenance">
                Zone de Danger <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white/50 backdrop-blur-sm rounded-[32px] p-8 border-4 border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="bg-primary p-4 rounded-3xl shadow-xl">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tight">Accès Administrateur Sécurisé</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Toutes vos actions sont tracées et protégées par SIMOVEX v2.1</p>
          </div>
        </div>
        <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-primary hover:bg-primary/5 border-2 border-primary/10" asChild>
          <Link href="/dashboard">
            Basculer vers Dashboard Participant <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
