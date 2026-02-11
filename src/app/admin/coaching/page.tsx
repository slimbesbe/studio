
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, Settings, ArrowRight, BarChart3, ChevronLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function AdminCoachingHome() {
  return (
    <div className="space-y-8 animate-fade-in p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/dashboard"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
            <GraduationCap className="h-10 w-10" /> Gestion du Module Coaching
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Pilotez les cohortes, les séances et analysez les performances.</p>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        {/* 1/ Configuration Groupes */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="h-2 bg-indigo-500 w-full" />
          <CardHeader className="p-8 pb-4">
            <div className="bg-indigo-500/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="h-7 w-7 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">1/ Config Groupes</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-sm leading-relaxed">
              Créez vos cohortes et ajoutez des participants directement (Nom, Email, MDP).
            </p>
            <Button asChild className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest shadow-lg">
              <Link href="/admin/coaching/config-groups">Gérer les groupes <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* 2/ Configuration Sessions */}
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
              Configurez les liens Meet par groupe (S1) et les plages de questions (S2-S6).
            </p>
            <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-lg">
              <Link href="/admin/coaching/sessions">Gérer les séances <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* 3/ Groupes & Statistiques */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="h-2 bg-accent w-full" />
          <CardHeader className="p-8 pb-4">
            <div className="bg-accent/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-accent" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">3/ Stats & Suivi</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-sm leading-relaxed">
              Suivi d'avancement, moyennes par groupe et analyse question par question.
            </p>
            <Button asChild className="w-full h-14 rounded-2xl bg-accent hover:bg-accent/90 font-black uppercase tracking-widest shadow-lg">
              <Link href="/admin/coaching/stats">Voir les stats <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
