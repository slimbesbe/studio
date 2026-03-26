
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, Settings, ArrowRight, BarChart3, ChevronLeft, UserPlus, ShieldCheck, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';

export default function AdminCoachingHome() {
  const { profile } = useUser();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  const isPartner = profile?.role === 'partner';
  const isCoach = profile?.role === 'coach';

  return (
    <div className="space-y-8 animate-fade-in p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
            <GraduationCap className="h-10 w-10" /> Espace Coaching & Groupes
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">
            {isPartner ? "Gestion de votre périmètre B2B." : isCoach ? "Suivi de vos cohortes assignées." : "Pilotage central des cohortes et performances."}
          </p>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        {/* 1/ Gestion Groupes */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="h-2 bg-indigo-500 w-full" />
          <CardHeader className="p-8 pb-4">
            <div className="bg-indigo-500/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">1/ Groupes & Cohortes</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-sm leading-relaxed">
              {isAdmin ? "Créez vos cohortes, assignez des coachs et des partenaires B2B." : "Gérez vos groupes et l'affectation des licences."}
            </p>
            <Button asChild className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest shadow-lg">
              <Link href="/admin/coaching/config-groups">Gérer les groupes <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2/ Configuration Pédagogique (Admin only) */}
        {(isAdmin) && (
          <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="p-8 pb-4">
              <div className="bg-primary/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
                <Settings className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black uppercase italic tracking-tight">2/ Config Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <p className="text-slate-500 font-bold italic text-sm leading-relaxed">
                Configurez les liens Meet par groupe et les plages de questions pour les séances S1-S6.
              </p>
              <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-lg">
                <Link href="/admin/coaching/sessions">Gérer les séances <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 3/ Statistiques & Suivi */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="h-2 bg-accent w-full" />
          <CardHeader className="p-8 pb-4">
            <div className="bg-accent/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">3/ Dashboard Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-sm leading-relaxed">
              Suivi d'avancement, moyennes par groupe et analyse des erreurs fréquentes du périmètre.
            </p>
            <Button asChild className="w-full h-14 rounded-2xl bg-accent hover:bg-accent/90 font-black uppercase tracking-widest shadow-lg">
              <Link href="/admin/coaching/stats">Voir les stats <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Partner specific info */}
      {isPartner && (
        <div className="bg-amber-50 p-8 rounded-[32px] border-4 border-dashed border-amber-200 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-amber-100 p-4 rounded-3xl"><Building2 className="h-8 w-8 text-amber-600" /></div>
            <div>
              <h3 className="text-xl font-black uppercase italic text-amber-900 tracking-tight">Espace Partenaire B2B</h3>
              <p className="text-xs font-bold text-amber-700/70 uppercase tracking-widest italic">Vous pouvez créer des utilisateurs et les affecter à vos groupes dans la limite de vos licences.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase border-2 border-amber-300 text-amber-700 hover:bg-amber-100">
            <Link href="/admin/users">Gérer vos licences <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      )}
    </div>
  );
}
