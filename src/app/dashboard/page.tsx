
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Target, 
  Clock, 
  ArrowUpRight, 
  PlayCircle,
  BrainCircuit,
  AlertTriangle,
  Lock,
  History as HistoryIcon
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock data for domain performance
const performanceData = [
  { name: 'People', score: 78, full: 100, color: 'hsl(var(--primary))' },
  { name: 'Process', score: 65, full: 100, color: 'hsl(var(--accent))' },
  { name: 'Business', score: 85, full: 100, color: '#10b981' },
];

interface CircularStatProps {
  value: string | number;
  label: string;
  sublabel: string;
  percent: number; // 0 to 100 for the ring
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
        {/* Background Circle */}
        <svg className="absolute h-full w-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-muted/20"
          />
          {/* Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex flex-col items-center justify-center z-10">
          <span className="text-4xl font-black text-foreground">{value}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{sublabel}</span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { user, profile } = useUser();
  const { toast } = useToast();
  const isDemo = user?.isAnonymous;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDemoLock = () => {
    if (isDemo) {
      toast({
        variant: "destructive",
        title: "Mode DEMO",
        description: "Non disponible en mode DEMO"
      });
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary italic">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {isDemo 
              ? "Bienvenue en mode DEMO. Explorez la plateforme." 
              : `Bonjour ${profile?.firstName || 'Jean'}, prêt pour une session ?`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full px-6" onClick={handleDemoLock} disabled={isDemo}>
            {isDemo && <Lock className="mr-2 h-4 w-4" />} Rapport PDF
          </Button>
          <Button className="rounded-full px-6 shadow-xl bg-primary hover:bg-primary/90" asChild={!isDemo} onClick={isDemo ? handleDemoLock : undefined}>
            {isDemo ? (
              <span><Lock className="mr-2 h-4 w-4" /> Simulation d'Examen</span>
            ) : (
              <Link href="/dashboard/exam">
                <PlayCircle className="mr-2 h-4 w-4" /> Simulation d'Examen
              </Link>
            )}
          </Button>
        </div>
      </div>

      {isDemo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 animate-slide-up">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">
            Vous utilisez actuellement le <strong>mode DEMO</strong>. Seules certaines fonctionnalités sont activées.
          </p>
        </div>
      )}

      {/* Main Circular Stats Section */}
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
              sublabel="D'étude" 
              percent={isDemo ? 20 : 85} 
              color="#7c3aed"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-7">
        {/* Domain Performance Chart */}
        <Card className={cn("lg:col-span-4 rounded-3xl overflow-hidden border-none shadow-lg", isDemo && "opacity-50 grayscale")}>
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">Performance par Domaine</CardTitle>
            <CardDescription>Votre niveau actuel par rapport aux exigences PMP.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.2} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className={cn("lg:col-span-3 border-none shadow-lg rounded-3xl bg-accent/5", isDemo && "opacity-50 grayscale")}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-accent" />
              <CardTitle className="text-lg">Conseils IA</CardTitle>
            </div>
            <CardDescription>Recommandations personnalisées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-5 bg-white rounded-2xl border border-accent/10 shadow-sm relative group transition-all hover:border-accent/30">
              <h4 className="font-bold text-primary mb-1">Point de vigilance</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Le domaine <strong>Process</strong> montre des lacunes en gestion des risques. Une session ciblée est recommandée.</p>
              <Button size="sm" variant="accent" className="mt-4 w-full rounded-full" disabled={isDemo}>Lancer session Risk</Button>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-accent/10 shadow-sm transition-all hover:border-accent/30">
              <h4 className="font-bold text-primary mb-1">Excellent Score Agile</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">Votre compréhension du mindset Agile est au-dessus de la cible. Concentrez-vous sur l'approche Hybride.</p>
              <Button size="sm" variant="outline" className="mt-4 w-full rounded-full" disabled={isDemo}>Voir ressources Hybride</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent History Preview */}
      <Card className={cn("border-none shadow-lg rounded-3xl overflow-hidden", isDemo && "opacity-50 grayscale")}>
        <CardHeader className="bg-muted/30">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Dernières Simulations</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary font-bold" disabled={isDemo}>Voir tout</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {[
              { date: '12 Mars 2024', mode: 'Simulation Complète', score: 76, time: '3h 15m', status: 'Above Target' },
              { date: '10 Mars 2024', mode: 'Practice: Agile', score: 88, time: '25m', status: 'Target' },
            ].map((exam, i) => (
              <div key={i} className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${exam.score >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {exam.score}%
                  </div>
                  <div>
                    <p className="font-bold text-sm">{exam.mode}</p>
                    <p className="text-xs text-muted-foreground">{exam.date} • {exam.time}</p>
                  </div>
                </div>
                <Badge variant={exam.score >= 80 ? 'default' : 'secondary'} className="rounded-full px-3">
                  {exam.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
