
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, Settings, ArrowRight, ShieldAlert, ChevronLeft } from 'lucide-react';
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
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Pilotez les sessions de groupe et le contenu pédagogique.</p>
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        {/* Tuile Sessions */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="p-10 pb-4">
            <div className="bg-primary/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-6">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black uppercase italic tracking-tight">Configuration Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-lg leading-relaxed">
              Éditez les liens Meet pour la S1, configurez les plages de questions pour S2-S6 et gérez la publication.
            </p>
            <Button asChild className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-lg text-lg">
              <Link href="/admin/coaching/sessions">Gérer les séances <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Tuile Groupes */}
        <Card className="rounded-[40px] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="h-2 bg-accent w-full" />
          <CardHeader className="p-10 pb-4">
            <div className="bg-accent/10 h-16 w-16 rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-3xl font-black uppercase italic tracking-tight">Groupes & Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="p-10 pt-0 space-y-6">
            <p className="text-slate-500 font-bold italic text-lg leading-relaxed">
              Créez des cohortes, suivez l'assiduité et analysez les scores moyens par séance de coaching.
            </p>
            <Button asChild className="w-full h-16 rounded-2xl bg-accent hover:bg-accent/90 font-black uppercase tracking-widest shadow-lg text-lg">
              <Link href="/admin/coaching/groups">Suivi des cohortes <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
