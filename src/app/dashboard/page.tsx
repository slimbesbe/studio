
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  Loader2,
  Clock,
  Calendar,
  History,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { useUser } from '@/firebase';
import Link from 'next/link';

interface CircularStatProps {
  value: string | number;
  label: string;
  sublabel: string;
  percent: number;
  color?: string;
}

const CircularStat = ({ value, label, sublabel, percent, color = "hsl(var(--primary))" }: CircularStatProps) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <h3 className="text-[10px] font-black text-muted-foreground mb-4 h-8 flex items-center justify-center uppercase tracking-widest leading-tight">{label}</h3>
      <div className="relative h-40 w-40 flex items-center justify-center">
        <svg className="absolute h-full w-full transform -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/10" />
          <circle
            cx="80" cy="80" r={radius} stroke={color} strokeWidth="8" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 px-4">
          <span className="text-3xl font-black text-foreground">{value}</span>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 text-center leading-tight">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, profile, isUserLoading } = useUser();
  const isDemo = user?.isAnonymous;

  if (isUserLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const simulationsCount = profile?.simulationsCount || 0;
  const averageScore = profile?.averageScore || 0;
  const totalSeconds = profile?.totalTimeSpent || 0;
  
  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '---';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary italic uppercase tracking-tight">Tableau de bord personnel</h1>
          <p className="text-muted-foreground mt-1">
            {isDemo ? "Mode DEMO actif." : `Suivi en temps réel de vos performances, ${profile?.firstName || 'Participant'}.`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full px-6 font-bold" asChild disabled={isDemo}>
            <Link href="/dashboard/history">
              <History className="mr-2 h-4 w-4" /> Historique
            </Link>
          </Button>
          <Button className="rounded-full px-8 shadow-xl uppercase font-black" asChild>
            <Link href="/dashboard/exam"><PlayCircle className="mr-2 h-4 w-4" /> Nouvelle Simulation</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Statistiques en direct
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
              <CircularStat 
                label="Simulations" 
                value={simulationsCount} 
                sublabel="Réalisées" 
                percent={Math.min(100, (simulationsCount / 10) * 100)} 
                color="hsl(var(--primary))" 
              />
              <CircularStat 
                label="Moyenne" 
                value={`${averageScore}%`} 
                sublabel="Cible : 80%+" 
                percent={averageScore} 
                color="#10b981" 
              />
              <CircularStat 
                label="Progression" 
                value={`${Math.min(100, Math.round((simulationsCount / 5) * 100))}%`} 
                sublabel="Objectif hebdo" 
                percent={Math.min(100, (simulationsCount / 5) * 100)} 
                color="#f59e0b" 
              />
              <CircularStat 
                label="Temps d'étude" 
                value={formatTotalTime(totalSeconds)} 
                sublabel="Total cumulé" 
                percent={Math.min(100, (totalSeconds / (3600 * 50)) * 100)} 
                color="#8b5cf6" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Award className="h-4 w-4" /> Informations Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Calendar className="h-3 w-3 text-primary" /> Première connexion
              </div>
              <p className="text-sm font-bold bg-muted/30 p-3 rounded-xl border border-dashed truncate">{formatDate(profile?.firstLoginAt)}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                <Clock className="h-3 w-3 text-primary" /> Dernière connexion
              </div>
              <p className="text-sm font-bold bg-muted/30 p-3 rounded-xl border border-dashed truncate">{formatDate(profile?.lastLoginAt)}</p>
            </div>

            <div className="pt-6">
              <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 text-center">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-3">Statut du compte</p>
                <div className="flex justify-center">
                   <div className="bg-emerald-500 text-white px-4 py-1 rounded-full uppercase text-[10px] font-black shadow-sm">Actif</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
