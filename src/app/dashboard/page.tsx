
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  Loader2,
  Clock,
  Calendar,
  History,
  TrendingUp,
  Award
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
    <div className="flex flex-col items-center text-center animate-fade-in group">
      <h3 className="text-[11px] font-black text-muted-foreground mb-4 h-8 flex items-center justify-center uppercase tracking-[0.2em] leading-tight group-hover:text-primary transition-colors">{label}</h3>
      <div className="relative h-44 w-44 flex items-center justify-center">
        <svg className="absolute h-full w-full transform -rotate-90 filter drop-shadow-sm">
          <circle cx="88" cy="88" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted/10" />
          <circle
            cx="88" cy="88" r={radius} stroke={color} strokeWidth="10" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 px-4">
          <span className="text-4xl font-black text-foreground tracking-tighter">{value}</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 text-center leading-tight">{sublabel}</span>
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
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const simulationsCount = profile?.simulationsCount || 0;
  const averageScore = profile?.averageScore || 0;
  const totalSeconds = profile?.totalTimeSpent || 0;
  
  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}H ${m}M`;
    return `${m}M`;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '---';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit',
      minute: '2-digit'
    }).toUpperCase();
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto pb-16 pt-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[32px] shadow-sm border border-slate-100">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-primary italic uppercase tracking-tighter">Tableau de bord</h1>
          <p className="text-lg text-slate-500 font-medium">
            {isDemo ? "Mode DÉMONSTRATION limité actif." : `Bienvenue dans votre espace, ${profile?.firstName || 'Participant'}.`}
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest border-2 hover:bg-slate-50 transition-all" asChild disabled={isDemo}>
            <Link href="/dashboard/history">
              <History className="mr-3 h-5 w-5" /> Historique
            </Link>
          </Button>
          <Button className="rounded-2xl h-14 px-10 shadow-2xl uppercase font-black tracking-widest bg-primary hover:scale-[1.02] transition-transform" asChild>
            <Link href="/dashboard/exam">
              <PlayCircle className="mr-3 h-6 w-6" /> Lancer Simulation
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 border-none shadow-2xl bg-white rounded-[40px] overflow-hidden">
          <CardHeader className="border-b bg-muted/10 p-10">
            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
              <TrendingUp className="h-5 w-5" /> Statistiques de Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="py-20 p-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16">
              <CircularStat 
                label="Simulations" 
                value={simulationsCount} 
                sublabel="TESTS TERMINÉS" 
                percent={Math.min(100, (simulationsCount / 10) * 100)} 
                color="hsl(var(--primary))" 
              />
              <CircularStat 
                label="Score Moyen" 
                value={`${averageScore}%`} 
                sublabel="CIBLE : 80%+" 
                percent={averageScore} 
                color="#10b981" 
              />
              <CircularStat 
                label="Préparation" 
                value={`${Math.min(100, Math.round((simulationsCount / 5) * 100))}%`} 
                sublabel="ESTIMATION PMP" 
                percent={Math.min(100, (simulationsCount / 5) * 100)} 
                color="#f59e0b" 
              />
              <CircularStat 
                label="Temps d'étude" 
                value={formatTotalTime(totalSeconds)} 
                sublabel="CUMULÉ TOTAL" 
                percent={Math.min(100, (totalSeconds / (3600 * 50)) * 100)} 
                color="#8b5cf6" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl bg-white rounded-[40px] overflow-hidden flex flex-col h-full">
          <CardHeader className="border-b bg-muted/10 p-10">
            <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
              <Award className="h-5 w-5" /> Informations Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-12 flex-1 flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Calendar className="h-4 w-4 text-primary" /> Première connexion
              </div>
              <p className="text-base font-black bg-muted/20 p-5 rounded-[20px] border-2 border-slate-100 shadow-inner truncate text-center">{formatDate(profile?.firstLoginAt)}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                <Clock className="h-4 w-4 text-primary" /> Dernière connexion
              </div>
              <p className="text-base font-black bg-muted/20 p-5 rounded-[20px] border-2 border-slate-100 shadow-inner truncate text-center">{formatDate(profile?.lastLoginAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
