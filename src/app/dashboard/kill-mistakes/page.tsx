
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Calendar, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock mistakes data
const MOCK_MISTAKES = [
  {
    id: '1',
    question: "Un membre de l'équipe ne respecte pas les délais de ses tâches. Que doit faire le chef de projet en premier ?",
    yourAnswer: "Dénoncer le membre au sponsor de projet",
    correctAnswer: "Rencontrer le membre en privé pour comprendre la cause",
    domain: "People",
    approach: "Predictive",
    missedCount: 3,
    nextReview: "Aujourd'hui",
    status: 'critical'
  },
  {
    id: '2',
    question: "Pendant une itération, le Product Owner souhaite ajouter une nouvelle fonctionnalité critique. L'équipe doit :",
    yourAnswer: "Arrêter l'itération en cours",
    correctAnswer: "Ajouter la fonctionnalité au Product Backlog pour la prochaine planification",
    domain: "Process",
    approach: "Agile",
    missedCount: 1,
    nextReview: "Dans 2 jours",
    status: 'moderate'
  }
];

export default function KillMistakesPage() {
  const [selectedMistake, setSelectedMistake] = useState<typeof MOCK_MISTAKES[0] | null>(null);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <Brain className="h-8 w-8 text-amber-500" />
            Kill Mistakes
          </h1>
          <p className="text-muted-foreground mt-1">Système de répétition espacée (Spaced Repetition) pour éliminer vos lacunes.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1">
            <CheckCircle2 className="mr-1 h-3 w-3" /> 145 Erreurs Corrigées
          </Badge>
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1">
            <AlertCircle className="mr-1 h-3 w-3" /> 14 En Attente
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="all">Tout</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-4 space-y-4">
              {MOCK_MISTAKES.map((mistake) => (
                <Card 
                  key={mistake.id} 
                  className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 ${selectedMistake?.id === mistake.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedMistake(mistake)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <Badge variant={mistake.status === 'critical' ? 'destructive' : 'secondary'}>
                        {mistake.missedCount}x Échecs
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center">
                        <Calendar className="mr-1 h-3 w-3" /> {mistake.nextReview}
                      </span>
                    </div>
                    <p className="text-sm font-bold line-clamp-2 leading-tight">
                      {mistake.question}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] py-0">{mistake.domain}</Badge>
                      <Badge variant="outline" className="text-[10px] py-0">{mistake.approach}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          {selectedMistake ? (
            <Card className="h-full border-t-4 border-t-amber-500 shadow-xl animate-slide-up">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Analyse de l'Erreur</CardTitle>
                    <CardDescription>Comprendre pourquoi vous avez échoué et ancrer le mindset PMI.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMistake(null)}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Énoncé de la question
                  </h4>
                  <p className="text-sm italic">{selectedMistake.question}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border-l-4 border-l-destructive bg-destructive/5 rounded-r-lg">
                    <h5 className="text-xs font-bold text-destructive uppercase mb-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Votre réponse
                    </h5>
                    <p className="text-sm font-medium">{selectedMistake.yourAnswer}</p>
                  </div>
                  <div className="p-4 border-l-4 border-l-emerald-500 bg-emerald-50 rounded-r-lg">
                    <h5 className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Bonne réponse
                    </h5>
                    <p className="text-sm font-medium">{selectedMistake.correctAnswer}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-bold flex items-center gap-2 text-primary">
                    <Brain className="h-5 w-5 text-accent" /> Mindset PMI & Explication
                  </h4>
                  <div className="text-sm space-y-3 leading-relaxed text-muted-foreground">
                    <p>Le mindset PMI privilégie toujours l'action proactive et directe avec les parties prenantes avant toute escalade. Dénoncer un membre au sponsor sans avoir discuté avec lui au préalable va à l'encontre des principes de leadership du serviteur.</p>
                    <p><strong>Action recommandée :</strong> Privilégier la communication en face à face pour identifier les bloqueurs ou le manque de compétences.</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    J'ai compris ! <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Reprendre demain
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
              <Brain className="h-16 w-16 text-muted mb-4" />
              <h3 className="text-xl font-bold text-muted-foreground">Sélectionnez une erreur pour commencer la révision</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">Cliquez sur une des cartes à gauche pour voir l'explication détaillée générée par notre IA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
