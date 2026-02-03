"use client";

import { useState, useEffect } from 'react';
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
  Users as UsersIcon,
  Loader2,
  Brain,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useUser } from '@/firebase';
import { generateDemoQuestions, type DemoQuestionsOutput } from '@/ai/flows/generate-demo-questions';

const FILTER_CATEGORIES = [
  { id: 'people', name: 'People', icon: UsersIcon, count: 450 },
  { id: 'process', name: 'Process', icon: Layers, count: 1200 },
  { id: 'business', name: 'Business Environment', icon: Globe, count: 350 },
];

export default function PracticePage() {
  const { user } = useUser();
  const isDemo = user?.isAnonymous;
  const [questionCount, setQuestionCount] = useState([20]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [demoQuestions, setDemoQuestions] = useState<DemoQuestionsOutput['questions'] | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (isDemo && !demoQuestions && !isGenerating) {
      handleStartDemo();
    }
  }, [isDemo]);

  const handleStartDemo = async () => {
    setIsGenerating(true);
    try {
      const result = await generateDemoQuestions();
      setDemoQuestions(result.questions);
      setActiveQuestionIndex(0);
    } catch (error) {
      console.error("Erreur lors de la génération des questions", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (showExplanation) return;
    setSelectedAnswer(choice);
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (demoQuestions && activeQuestionIndex !== null && activeQuestionIndex < demoQuestions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  if (isDemo && (isGenerating || activeQuestionIndex !== null)) {
    const currentQuestion = demoQuestions?.[activeQuestionIndex!];

    return (
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
              <Zap className="h-8 w-8 text-amber-500" />
              Session DÉMO
            </h1>
            <p className="text-muted-foreground mt-1">10 questions générées par Gemini pour tester vos connaissances.</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-1 border-amber-200 bg-amber-50 text-amber-700">
            Question {activeQuestionIndex! + 1} / 10
          </Badge>
        </div>

        {isGenerating ? (
          <Card className="p-12 text-center flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-bold">Génération des questions par l'IA...</h2>
            <p className="text-muted-foreground">Gemini prépare une session personnalisée pour vous.</p>
          </Card>
        ) : currentQuestion ? (
          <Card className="shadow-xl border-t-4 border-t-amber-500">
            <CardHeader>
              <div className="flex justify-between items-start mb-4">
                <Badge variant="secondary">{currentQuestion.domain}</Badge>
              </div>
              <CardTitle className="text-xl leading-relaxed">
                {currentQuestion.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { key: 'A', text: currentQuestion.choiceA },
                  { key: 'B', text: currentQuestion.choiceB },
                  { key: 'C', text: currentQuestion.choiceC },
                  { key: 'D', text: currentQuestion.choiceD },
                ].map((choice) => {
                  const isCorrect = choice.key === currentQuestion.correctAnswer;
                  const isSelected = choice.key === selectedAnswer;
                  
                  let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
                  if (showExplanation) {
                    if (isCorrect) variant = "default"; // Correct style is emerald in fact but shadcn default is primary
                    else if (isSelected) variant = "destructive";
                  }

                  return (
                    <Button 
                      key={choice.key}
                      variant={variant}
                      className={cn(
                        "h-auto py-4 px-6 justify-start text-left whitespace-normal text-sm font-medium",
                        showExplanation && isCorrect && "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600",
                        showExplanation && isSelected && !isCorrect && "bg-destructive text-white border-destructive"
                      )}
                      onClick={() => handleAnswerSelect(choice.key as any)}
                    >
                      <span className="font-bold mr-4">{choice.key}.</span>
                      {choice.text}
                    </Button>
                  );
                })}
              </div>

              {showExplanation && (
                <div className="mt-8 p-6 bg-secondary/30 rounded-xl border-l-4 border-l-primary animate-slide-up">
                  <h4 className="font-bold flex items-center gap-2 mb-3 text-primary">
                    <Info className="h-5 w-5" /> Explication & Mindset PMI
                  </h4>
                  <p className="text-sm leading-relaxed mb-6">
                    {currentQuestion.explanation}
                  </p>
                  
                  {activeQuestionIndex! < 9 ? (
                    <Button onClick={handleNextQuestion} className="w-full">
                      Question Suivante <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-emerald-700 font-bold">Session terminée !</p>
                      <p className="text-sm text-emerald-600 mt-1">Bravo, vous avez terminé les 10 questions de démo.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
