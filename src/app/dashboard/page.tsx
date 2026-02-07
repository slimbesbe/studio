
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  Loader2,
  Clock,
  Calendar,
  History
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
      <h3 className="text-sm font-semibold text-muted-foreground mb-6 min-h-[40px] flex items-center">{label}</h3>
      <div className="relative h-40 w-40 flex items-center justify-center">
        <svg className="absolute h-full w-full transform -rotate-90">
          <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-muted/20" />
          <circle
            cx="80" cy="80" r={radius} stroke={color} strokeWidth="10" fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 px-4">
          <span className="text-3xl font-black text-foreground">{value}</span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1 text-center leading-tight">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { user, profile, isUserLoading } = useUser();
  const isDemo = user?.isAnonymous;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isUserLoading) {
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
    if (!ts) return 'N/A';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary italic uppercase">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            {isDemo ? "Mode DEMO actif." : `Bonjour ${profile?.firstName || 'Jean'}, prêt pour une session ?`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full px-6" asChild disabled={isDemo}>
            <Link href="/dashboard/history">
              <History className="mr-2 h-4 w-4" /> Historique
            </Link>
          </Button>
          <Button className="rounded-full px-6 shadow-xl uppercase font-bold" asChild>
            <Link href="/dashboard/exam"><PlayCircle className="mr-2 h-4 w-4" /> Simulation</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Statistiques de performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <CircularStat 
                label="Simulations réalisées" 
                value={simulationsCount} 
                sublabel="Total" 
                percent={Math.min(100, (simulationsCount / 20) * 100)} 
                color="#6366f1" 
              />
              <CircularStat 
                label="Moyenne Générale" 
                value={`${averageScore}%`} 
                sublabel="Cible : 80%+" 
                percent={averageScore} 
                color="#10b981" 
              />
              <CircularStat 
                label="Temps passé" 
                value={formatTotalTime(totalSeconds)} 
                sublabel="Etude Active" 
                percent={Math.min(100, (totalSeconds / 360000) * 100)} 
                color="#8b5cf6" 
              />
              <CircularStat 
                label="Progression PMP" 
                value={`${Math.min(100, Math.round((simulationsCount / 10) * 100))}%`} 
                sublabel="Vers Certification" 
                percent={Math.min(100, (simulationsCount / 10) * 100)} 
                color="#f59e0b" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Calendar className="h-3 w-3" /> Première connexion
              </div>
              <p className="text-sm font-medium">{formatDate(profile?.firstLoginAt)}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3 w-3" /> Dernière connexion
              </div>
              <p className="text-sm font-medium">{formatDate(profile?.lastLoginAt)}</p>
            </div>

            <div className="pt-4 border-t">
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <p className="text-xs text-primary font-bold uppercase mb-1">Status du compte</p>
                <Badge className="bg-emerald-500 hover:bg-emerald-500 uppercase text-[10px]">Actif</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
