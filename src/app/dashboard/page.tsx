
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
  AlertTriangle
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

// Mock data for domain performance
const performanceData = [
  { name: 'People', score: 78, full: 100, color: 'hsl(var(--primary))' },
  { name: 'Process', score: 65, full: 100, color: 'hsl(var(--accent))' },
  { name: 'Business', score: 85, full: 100, color: '#10b981' },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Tableau de Bord</h1>
          <p className="text-muted-foreground mt-1">Bonjour Jean, prêt pour une session de révision ?</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Télécharger Rapport PDF</Button>
          <Button size="sm" className="shadow-lg">
            <PlayCircle className="mr-2 h-4 w-4" /> Simulation d'Examen
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progression Globale</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <Progress value={68} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-emerald-500 font-medium inline-flex items-center">
                +12% <ArrowUpRight className="h-3 w-3" />
              </span> par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72.5%</div>
            <p className="text-xs text-muted-foreground mt-1">Cible PMP : 80%+</p>
            <div className="flex gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 3 ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kill Mistakes</CardTitle>
            <BrainCircuit className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">Questions à revoir aujourd'hui</p>
            <Badge variant="secondary" className="mt-3 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Spaced Repetition Actif</Badge>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps d'étude</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42h 15m</div>
            <p className="text-xs text-muted-foreground mt-1">Total depuis le début</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[10px] font-bold">
                    D{i}
                  </div>
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">+5 badges obtenus</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-7">
        {/* Domain Performance Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Performance par Domaine</CardTitle>
            <CardDescription>Visualisation de votre niveau actuel par rapport aux exigences de l'examen.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} layout="vertical" margin={{ left: -20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={32}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="lg:col-span-3 border-accent/20 bg-accent/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-accent" />
              <CardTitle>Next Best Practice</CardTitle>
            </div>
            <CardDescription>Recommandations personnalisées par IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-accent/10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <h4 className="font-bold text-primary mb-1">Point de vigilance : Domaine Process</h4>
              <p className="text-sm text-muted-foreground">Vous avez échoué à 3 questions consécutives sur la gestion des risques (Risk Management). Nous vous suggérons une session de pratique dédiée.</p>
              <Button size="sm" variant="accent" className="mt-3 w-full">Lancer session Risk</Button>
            </div>
            <div className="p-4 bg-white rounded-xl border border-accent/10 shadow-sm">
              <h4 className="font-bold text-primary mb-1">Mindset Agile</h4>
              <p className="text-sm text-muted-foreground">Votre score en Agile est excellent (92%). Continuez ainsi et concentrez-vous maintenant sur l'approche Hybride.</p>
              <Button size="sm" variant="outline" className="mt-3 w-full">Voir ressources Hybride</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Examens Récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: '12 Mars 2024', mode: 'Simulation Complète', score: 76, time: '3h 15m', status: 'Above Target' },
              { date: '10 Mars 2024', mode: 'Practice: Agile', score: 88, time: '25m', status: 'Mastery' },
              { date: '08 Mars 2024', mode: 'Practice: People', score: 62, time: '40m', status: 'Below Target' },
            ].map((exam, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors border">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${exam.score >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                    {exam.score}%
                  </div>
                  <div>
                    <p className="font-bold">{exam.mode}</p>
                    <p className="text-xs text-muted-foreground">{exam.date} • {exam.time}</p>
                  </div>
                </div>
                <Badge variant={exam.score >= 70 ? 'default' : 'outline'}>{exam.status}</Badge>
              </div>
            ))}
          </div>
          <Button variant="link" className="mt-4 w-full text-primary font-bold">Voir tout l'historique</Button>
        </CardContent>
      </Card>
    </div>
  );
}
