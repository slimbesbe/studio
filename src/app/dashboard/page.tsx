
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlayCircle,
  BrainCircuit,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
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
          <Button variant="outline" className="rounded-full px-6" disabled={isDemo}>Rapport PDF</Button>
          <Button className="rounded-full px-6 shadow-xl uppercase font-bold" asChild>
            <Link href="/dashboard/exam"><PlayCircle className="mr-2 h-4 w-4" /> Simulation</Link>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <CircularStat 
              label="Simulations réalisées" 
              value={isDemo ? 1 : 14} 
              sublabel="Total" 
              percent={isDemo ? 10 : 65} 
              color="#6366f1" 
            />
            <CircularStat 
              label="Questions répondues" 
              value={isDemo ? 10 : 842} 
              sublabel="Total" 
              percent={isDemo ? 5 : 78} 
              color="#8b5cf6" 
            />
            <CircularStat 
              label="Temps passé" 
              value={isDemo ? "15m" : "24h"} 
              sublabel="Étude" 
              percent={isDemo ? 20 : 85} 
              color="#7c3aed" 
            />
            <CircularStat 
              label="Score Moyen" 
              value={isDemo ? "68%" : "72.5%"} 
              sublabel="Cible : 80%+" 
              percent={isDemo ? 68 : 72.5} 
              color="#10b981" 
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Reste du contenu omis pour la brièveté... */}
    </div>
  );
}
