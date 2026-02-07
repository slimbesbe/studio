
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
      <h3 className="text-[12px] font-black text-muted-foreground mb-4 h-8 flex items-center justify-center uppercase tracking-[0.3em] leading-tight group-hover:text-primary transition-colors italic">{label}</h3>
      <div className="relative h-48 w-48 flex items-center justify-center">
        <svg className="absolute h-full w-full transform -rotate-90 filter drop-shadow-md">
          <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted/10" />
          <circle
            cx="96" cy="96" r={radius} stroke={color} strokeWidth="12" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 2.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 px-6">
          <span className="text-5xl font-black text-foreground tracking-tighter italic">{value}</span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-3 text-center leading-tight italic">{sublabel}</span>
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const simulationsCount = profile?.simulationsCount || 0;
  const averageScore = profile?.averageScore || 0;
  const totalSeconds = profile?.totalTimeSpent || 0;
  
  const formatTotalTime = (seconds: number) => {
    const s = seconds || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto pb-24 pt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-12 rounded-[50px] shadow-2xl border-2">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-primary italic uppercase tracking-tighter">Tableau de bord</h1>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-widest italic">
            {isDemo ? "Mode DÉMONSTRATION actif." : `Bienvenue, ${profile?.firstName || 'Participant'}.`}
          </p>
        </div>
        <div className="flex gap-6">
          <Button variant="outline" className="rounded-[24px] h-16 px-10 font-black uppercase tracking-widest border-4 hover:bg-slate-50 transition-all text-lg shadow-lg" asChild disabled={isDemo}>
            <Link href="/dashboard/history">
              <History className="mr-3 h-6 w-6" /> Historique
            </Link>
          </Button>
          <Button className="rounded-[24px] h-16 px-12 shadow-2xl uppercase font-black tracking-widest bg-primary hover:scale-[1.02] transition-transform text-lg italic" asChild>
            <Link href="/dashboard/exam">
              <PlayCircle className="mr-3 h-7 w-7" /> Lancer Simulation
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <Card className="lg:col-span-3 border-none shadow-[0_30px_70px_-20px_rgba(0,0,0,0.15)] bg-white rounded-[60px] overflow-hidden">
          <CardHeader className="border-b-4 bg-muted/10 p-12">
            <CardTitle className="text-sm font-black uppercase tracking-[0.4em] text-primary flex items-center gap-4 italic">
              <TrendingUp className="h-6 w-6" /> Statistiques de Performance Temps Réel
            </CardTitle>
          </CardHeader>
          <CardContent className="py-24 p-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
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

        <Card className="border-none shadow-[0_30px_70px_-20px_rgba(0,0,0,0.15)] bg-white rounded-[60px] overflow-hidden flex flex-col h-full border-l-4">
          <CardHeader className="border-b-4 bg-muted/10 p-12">
            <CardTitle className="text-sm font-black uppercase tracking-[0.4em] text-primary flex items-center gap-4 italic">
              <Award className="h-6 w-6" /> Informations Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-12 space-y-16 flex-1 flex flex-col justify-center">
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-[12px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                <Calendar className="h-5 w-5 text-primary" /> Première connexion
              </div>
              <p className="text-xl font-black bg-muted/20 p-8 rounded-[32px] border-4 border-slate-100 shadow-inner truncate text-center italic">{formatDate(profile?.firstLoginAt)}</p>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-4 text-[12px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                <Clock className="h-5 w-5 text-primary" /> Dernière connexion
              </div>
              <p className="text-xl font-black bg-muted/20 p-8 rounded-[32px] border-4 border-slate-100 shadow-inner truncate text-center italic">{formatDate(profile?.lastLoginAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
