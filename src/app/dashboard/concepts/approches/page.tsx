
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  RotateCcw, 
  Layers, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  XCircle,
  Trophy,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- DATA STRUCTURE ---

const APPROACH_DATA = {
  predictive: {
    id: 'predictive',
    title: 'Prédicatif',
    icon: ArrowDown,
    description: "L'approche Prédictive (Waterfall) repose sur une planification exhaustive initiale pour stabiliser le périmètre. On définit tout en amont : portée, coûts, délais. Le changement est formellement contrôlé via un Comité de Contrôle des Changements (CCB).",
    mindset: "Planification rigoureuse, Prévisibilité, Contrôle strict des baselines.",
    jargon: [
      { term: 'WBS', def: 'Work Breakdown Structure : Décomposition hiérarchique du travail en lots gérables.' },
      { term: 'Chemin Critique', def: 'Séquence de tâches qui détermine la durée minimale du projet.' },
      { term: 'Baseline', def: 'Référence approuvée (Périmètre, Temps, Coût) pour mesurer la performance.' },
      { term: 'CCB', def: 'Change Control Board : Groupe formel qui approuve ou rejette les changements.' },
      { term: 'RACI', def: 'Matrice de responsabilités : Responsible, Accountable, Consulted, Informed.' },
      { term: 'EVM', def: 'Earned Value Management : Mesure de la performance via la valeur acquise.' },
    ],
    quiz: [
      { q: "Quelle est la caractéristique principale du prédictif ?", a: ["Flexibilité totale", "Planification en amont", "Pas de documentation"], c: 1, exp: "Le prédictif mise sur une planification détaillée avant l'exécution." },
      { q: "Qui approuve un changement de baseline ?", a: ["Le client seul", "Le CCB", "L'équipe technique"], c: 1, exp: "Le Comité de Contrôle des Changements (CCB) est l'autorité formelle." },
      { q: "Le WBS sert à...", a: ["Calculer le budget", "Décomposer le travail", "Assigner des noms"], c: 1, exp: "Le WBS décompose le projet en livrables exploitables." },
      { q: "La Baseline de coût inclut...", a: ["La marge de gestion", "La réserve de contingence", "Le profit"], c: 1, exp: "La baseline inclut le budget + la réserve de contingence (risques connus)." },
      { q: "Un projet est en retard si...", a: ["SPI > 1", "SPI < 1", "CPI < 1"], c: 1, exp: "SPI (Schedule Performance Index) inférieur à 1 indique un retard." },
    ]
  },
  agile: {
    id: 'agile',
    title: 'Agile',
    icon: RotateCcw,
    description: "L'approche Agile est itérative et adaptative. Le périmètre est affiné à chaque itération (Sprint). Le feedback client est continu. Le Chef de Projet agit en tant que Leader Serviteur pour éliminer les obstacles.",
    mindset: "Valeur client, Feedback continu, Auto-organisation, Leadership Serviteur.",
    jargon: [
      { term: 'Backlog', def: 'Liste ordonnée de tout ce qui pourrait être nécessaire dans le produit.' },
      { term: 'Sprint', def: 'Boîte de temps fixe (2-4 semaines) pour créer un incrément fini.' },
      { term: 'Daily Standup', def: 'Réunion de 15 min pour synchroniser l\'équipe et identifier les obstacles.' },
      { term: 'Scrum Master', def: 'Facilitateur et Leader Serviteur qui assure le respect du cadre Agile.' },
      { term: 'Story Points', def: 'Unité de mesure relative pour estimer l\'effort d\'une User Story.' },
      { term: 'Vélocité', def: 'Quantité de travail qu\'une équipe peut abattre par Sprint.' },
    ],
    quiz: [
      { q: "Quelle est la durée idéale d'un Sprint ?", a: ["1 à 4 semaines", "6 mois", "Indéfinie"], c: 0, exp: "Le standard est de 1 à 4 semaines pour maintenir le rythme." },
      { q: "Qui est responsable de prioriser le Backlog ?", a: ["Scrum Master", "Product Owner", "L'équipe"], c: 1, exp: "Le Product Owner représente la voix du client et priorise la valeur." },
      { q: "Le Daily Standup sert à...", a: ["Rapporter au manager", "Synchroniser l'équipe", "Résoudre les bugs"], c: 1, exp: "C'est une réunion de planification d'équipe, pas de reporting." },
      { q: "En Agile, le changement est...", a: ["Interdit", "Accueilli avec plaisir", "Payant"], c: 1, exp: "L'agilité accueille le changement, même tardif, pour la valeur client." },
      { q: "Un Leader Serviteur...", a: ["Donne des ordres", "Supprime les obstacles", "Prend les décisions seul"], c: 1, exp: "Son rôle est de faciliter le travail de l'équipe et de la protéger." },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    description: "L'approche Hybride combine le meilleur des deux mondes. On utilise souvent le prédictif pour la structure globale (ex: infrastructure) et l'agile pour les livrables incertains (ex: logiciel).",
    mindset: "Adaptabilité contextuelle, Sur-mesure (Tailoring), Efficacité mixte.",
    jargon: [
      { term: 'Tailoring', def: 'Adaptation de la méthodologie selon la complexité et le contexte du projet.' },
      { term: 'MVP', def: 'Minimum Viable Product : La plus petite version du produit apportant de la valeur.' },
      { term: 'Stage-Gate', def: 'Points de contrôle prédictifs dans un flux de développement agile.' },
      { term: 'Burndown Chart', def: 'Graphique montrant le travail restant par rapport au temps.' },
      { term: 'Incrément', def: 'Livrable partiel fonctionnel ajouté aux livrables précédents.' },
      { term: 'Gouvernance', def: 'Cadre de décision qui peut être agile au niveau équipe et prédictif au niveau comité.' },
    ],
    quiz: [
      { q: "Pourquoi choisir l'hybride ?", a: ["C'est la mode", "Adapter au contexte", "C'est plus facile"], c: 1, exp: "L'hybride permet d'utiliser l'outil adapté à chaque partie du projet." },
      { q: "Un MVP sert à...", a: ["Finir vite", "Tester le marché", "Dépenser moins"], c: 1, exp: "Le MVP permet de valider des hypothèses avec un minimum d'effort." },
      { q: "Le 'Tailoring' signifie...", a: ["Couper les coûts", "Adapter les processus", "Changer d'équipe"], c: 1, exp: "C'est l'adaptation sur-mesure de la méthode au projet." },
      { q: "Dans un projet hybride, le matériel peut être...", a: ["Agile", "Prédictif", "Optionnel"], c: 1, exp: "Le matériel a souvent des délais fixes et se prête mieux au prédictif." },
      { q: "La vélocité en hybride...", a: ["Est inutile", "Aide à prévoir l'agile", "Remplace le Gantt"], c: 1, exp: "Elle aide à planifier la partie itérative au sein du planning global." },
    ]
  }
};

// --- COMPONENTS ---

function JargonCard({ term, def }: { term: string, def: string }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="perspective-1000 h-48 w-full cursor-pointer group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={cn(
        "relative w-full h-full transition-transform duration-500 preserve-3d",
        isFlipped ? "rotate-y-180" : ""
      )}>
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-[24px] flex flex-col items-center justify-center p-6 shadow-xl border-4 border-slate-800">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">{term}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60 group-hover:opacity-100 transition-opacity">Cliquez pour voir la définition</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl border-4 border-primary-foreground/20">
          <p className="text-center font-bold italic text-sm leading-relaxed">{def}</p>
        </div>
      </div>
    </div>
  );
}

function QuickQuiz({ questions }: { questions: any[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);
    if (idx === questions[currentIdx].c) setScore(score + 1);
  };

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const reset = () => {
    setCurrentIdx(0);
    setSelectedIdx(null);
    setIsAnswered(false);
    setScore(0);
    setShowResult(false);
  };

  if (showResult) {
    return (
      <Card className="rounded-[40px] border-none shadow-2xl bg-white p-12 text-center space-y-8 animate-slide-up">
        <div className="bg-primary/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Quiz Terminé !</h3>
          <p className="text-xl font-bold text-slate-500 italic">Score : {score} / {questions.length}</p>
        </div>
        <Button onClick={reset} className="h-14 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl">Recommencer</Button>
      </Card>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
        <Badge variant="outline" className="font-black italic">Question {currentIdx + 1} / {questions.length}</Badge>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i === currentIdx ? "bg-primary" : i < currentIdx ? "bg-emerald-400" : "bg-slate-100")} />
          ))}
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10 space-y-8">
        <h3 className="text-2xl font-black italic text-slate-800 leading-tight">{q.q}</h3>
        
        <div className="grid gap-4">
          {q.a.map((opt: string, idx: number) => {
            const isCorrect = idx === q.c;
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={cn(
                  "p-6 rounded-2xl border-2 transition-all text-left font-bold italic text-lg flex items-center justify-between group",
                  !isAnswered ? "border-slate-100 hover:border-primary hover:bg-primary/5" :
                  isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" :
                  isSelected ? "border-red-500 bg-red-50 text-red-900" : "border-slate-50 opacity-50"
                )}
              >
                <span>{opt}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="bg-slate-50 p-6 rounded-3xl border-l-8 border-l-primary animate-slide-up">
            <p className="text-slate-700 font-bold italic leading-relaxed">
              <span className="font-black text-primary uppercase text-xs block mb-1">Justification :</span>
              {q.exp}
            </p>
            <Button onClick={next} className="mt-6 w-full h-12 rounded-xl bg-slate-900 font-black uppercase text-xs tracking-widest shadow-lg">
              {currentIdx < questions.length - 1 ? "Question Suivante" : "Voir mon score"} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// --- MAIN PAGE ---

export default function MaîtriseApprochesPage() {
  const [activeApproach, setActiveApproach] = useState<'predictive' | 'agile' | 'hybrid'>('predictive');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');

  const data = APPROACH_DATA[activeApproach];

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      {/* Header & Tabs */}
      <div className="space-y-8">
        <div className="text-left">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Maîtrise des Approches PMP</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Choisissez une approche pour voir le jargon ou faire le quiz.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['predictive', 'agile', 'hybrid'] as const).map((id) => {
            const item = APPROACH_DATA[id];
            const Icon = item.icon;
            const isActive = activeApproach === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveApproach(id); setActiveTab('jargon'); }}
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-[32px] border-4 transition-all duration-300 gap-4",
                  isActive ? "border-primary bg-primary/5 shadow-inner scale-[1.02]" : "border-slate-50 bg-white hover:border-slate-200"
                )}
              >
                <div className={cn("p-4 rounded-2xl", isActive ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                  <Icon className="h-8 w-8" />
                </div>
                <span className={cn("font-black uppercase italic tracking-widest text-sm", isActive ? "text-primary" : "text-slate-400")}>
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus Section */}
      <div className="space-y-10">
        <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">Focus : {data.title}</h2>
            <div className="flex bg-slate-100 p-1 rounded-2xl border-2">
              <Button 
                variant={activeTab === 'jargon' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('jargon')}
                className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", activeTab === 'jargon' ? "shadow-lg" : "text-slate-500")}
              >
                <BookOpen className="h-4 w-4" /> Jargon Clé
              </Button>
              <Button 
                variant={activeTab === 'quiz' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('quiz')}
                className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-xs gap-2", activeTab === 'quiz' ? "shadow-lg" : "text-slate-500")}
              >
                <Zap className="h-4 w-4" /> Quiz Rapide (5/5)
              </Button>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-500 italic leading-relaxed max-w-4xl">
            {data.description}
          </p>
          <div className="flex items-center gap-3 bg-indigo-50/50 p-4 rounded-2xl border-2 border-dashed border-indigo-100 w-fit">
            <Info className="h-5 w-5 text-primary" />
            <span className="text-sm font-black italic text-primary">Mindset : {data.mindset}</span>
          </div>
        </div>

        {activeTab === 'jargon' ? (
          <div className="space-y-8 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="h-1 bg-slate-900 w-12 rounded-full" />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Cartes Mentales : Jargon {data.title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.jargon.map((item, idx) => (
                <JargonCard key={idx} term={item.term} def={item.def} />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <QuickQuiz questions={data.quiz} />
          </div>
        )}
      </div>

      {/* Global CSS for flip effect */}
      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
