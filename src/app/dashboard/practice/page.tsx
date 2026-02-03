
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Play, 
  Layers, 
  Settings2,
  BookOpen,
  Zap,
  Globe,
  Users as UsersIcon
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const FILTER_CATEGORIES = [
  { id: 'people', name: 'People', icon: UsersIcon, count: 450 },
  { id: 'process', name: 'Process', icon: Layers, count: 1200 },
  { id: 'business', name: 'Business Environment', icon: Globe, count: 350 },
];

export default function PracticePage() {
  const [questionCount, setQuestionCount] = useState([20]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Pratique Libre
        </h1>
        <p className="text-muted-foreground mt-1">Sélectionnez vos critères pour une session personnalisée.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Critères de sélection
            </CardTitle>
            <CardDescription>Ciblez des domaines spécifiques ou des types de questions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FILTER_CATEGORIES.map((cat) => (
                <div 
                  key={cat.id} 
                  className="p-4 rounded-xl border-2 border-transparent bg-secondary/50 hover:bg-secondary hover:border-primary/20 transition-all cursor-pointer group"
                >
                  <cat.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-sm">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cat.count} questions dispos</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Approche</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les approches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="predictive">Prédictive (Waterfalls)</SelectItem>
                    <SelectItem value="agile">Agile</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Difficulté</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Moyen</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label>Nombre de questions</Label>
                <Badge variant="secondary" className="font-bold">{questionCount[0]}</Badge>
              </div>
              <Slider 
                value={questionCount} 
                onValueChange={setQuestionCount} 
                max={180} 
                step={5} 
                min={5}
              />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode Apprentissage</Label>
                  <p className="text-xs text-muted-foreground">Affiche l'explication après chaque question.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit lg:sticky lg:top-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Résumé de la session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Domaines</span>
                <span className="font-medium">Tous sélectionnés</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Approche</span>
                <span className="font-medium">Mélange</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Temps estimé</span>
                <span className="font-medium">{Math.floor(questionCount[0] * 1.2)} minutes</span>
              </div>
            </div>
            <div className="pt-4 border-t space-y-3">
              <Button className="w-full h-12 shadow-lg shadow-primary/20" size="lg">
                <Play className="mr-2 h-4 w-4" /> Démarrer la session
              </Button>
              <Button variant="outline" className="w-full">
                <Settings2 className="mr-2 h-4 w-4" /> Paramètres Avancés
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
