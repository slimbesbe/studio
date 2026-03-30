
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  History,
  TrendingUp,
  Globe
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';

// --- DATA STRUCTURE ---

const APPROACH_DATA = {
  predictive: {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: ArrowDown,
    description: "L'approche Prédictive repose sur une planification exhaustive initiale. On définit tout en amont : portée, coûts, délais. Le changement est formellement contrôlé via un CCB. Idéal pour les projets dont le périmètre est stable et bien compris dès le départ.",
    mindset: "Planification rigoureuse, Prévisibilité, Contrôle strict des baselines.",
    jargon: [
      { term: 'WBS / OTP', def: 'Décomposition hiérarchique du travail en lots gérables.' },
      { term: 'Chemin Critique', def: 'Séquence de tâches qui détermine la durée minimale du projet.' },
      { term: 'Baselines', def: 'Référence approuvée (Scope, Schedule, Cost) pour mesurer la performance.' },
      { term: 'CCB', def: 'Change Control Board : Groupe formel qui approuve ou rejette les changements.' },
      { term: 'RACI', def: 'Matrice de responsabilités : Responsible, Accountable, Consulted, Informed.' },
      { term: 'EVM', def: 'Earned Value Management : Mesure de la performance via la valeur acquise.' },
    ],
    quiz: [
      { q: "Quelle est la caractéristique principale du prédictif ?", a: ["Flexibilité totale", "Planification en amont", "Pas de documentation"], c: 1, exp: "Le prédictif mise sur une planification détaillée avant l'exécution." },
    ]
  },
  agile: {
    id: 'agile',
    title: 'Agile',
    icon: RotateCcw,
    description: "L'approche Agile est itérative et adaptative. Le périmètre est affiné à chaque itération (Sprint). Le feedback client est continu et le CP agit en tant que Leader Serviteur pour éliminer les obstacles à l'auto-organisation de l'équipe.",
    mindset: "Valeur client, Feedback continu, Auto-organisation, Leadership Serviteur.",
    jargon: [
      { term: 'Backlog', def: 'Liste ordonnée de tout ce qui pourrait être nécessaire dans le produit.' },
      { term: 'Sprint', def: 'Boîte de temps fixe (2-4 semaines) pour créer un incrément fini.' },
      { term: 'Daily Standup', def: 'Réunion de 15 min pour synchroniser l\'équipe et identifier les obstacles.' },
      { term: 'Scrum Master', def: 'Facilitateur et Leader Serviteur qui assure le respect du cadre Agile.' },
      { term: 'User Stories', def: 'Description courte d\'un besoin exprimé du point de vue de l\'utilisateur.' },
      { term: 'Vélocité', def: 'Quantité de travail qu\'une équipe peut abattre par Sprint.' },
    ],
    quiz: [
      { q: "Quelle est la durée idéale d'un Sprint ?", a: ["1 à 4 semaines", "6 mois", "Indéfinie"], c: 0, exp: "Le standard est de 1 à 4 semaines pour maintenir le rythme." },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    description: "L'approche Hybride combine le meilleur des deux mondes. On utilise souvent le prédictif pour la structure globale (ex: infrastructure) et l'agile pour les livrables incertains ou innovants (ex: logiciel).",
    mindset: "Adaptabilité contextuelle, Tailoring (Sur-mesure), Efficacité mixte.",
    jargon: [
      { term: 'Tailoring', def: 'Adaptation de la méthodologie selon la complexité et le contexte du projet.' },
      { term: 'MVP', def: 'Minimum Viable Product : La plus petite version apportant de la valeur.' },
      { term: 'Stage-Gate', def: 'Points de contrôle prédictifs dans un flux de développement agile.' },
      { term: 'Burndown Chart', def: 'Graphique montrant le travail restant par rapport au temps.' },
      { term: 'Incrément', def: 'Livrable partiel fonctionnel ajouté aux livrables précédents.' },
      { term: 'Gouvernance Mixte', def: 'Cadre de décision adaptatif selon les composants du projet.' },
    ],
    quiz: [
      { q: "Pourquoi choisir l'hybride ?", a: ["C'est la mode", "Adapter au contexte", "C'est plus facile"], c: 1, exp: "L'hybride permet d'utiliser l'outil adapté à chaque partie du projet." },
    ]
  }
};

// --- SUB-COMPONENTS ---

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
        <div className="absolute inset-0 backface-hidden bg-[#1E293B] text-white rounded-[24px] flex flex-col items-center justify-center p-6 shadow-xl">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-center mb-2">{term}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Cliquez pour voir la définition</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl">
          <p className="text-center font-bold italic text-sm leading-relaxed">{def}</p>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---

export default function VisionApprochesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeApproach, setActiveApproach] = useState<'predictive' | 'agile' | 'hybrid'>('predictive');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');

  const data = APPROACH_DATA[activeApproach];

  const attemptsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', user.uid));
  }, [db, user?.uid]);

  const { data: attempts } = useCollection(attemptsQuery);

  const historyData = useMemo(() => {
    if (!attempts) return [];
    return attempts
      .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      .slice(-8)
      .map((a, i) => ({
        name: `T${i + 1}`,
        score: a.scorePercent
      }));
  }, [attempts]);

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Maîtrise des Approches PMP</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Choisissez une approche pour voir le jargon ou faire le quiz.</p>
      </div>

      {/* Top Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['predictive', 'agile', 'hybrid'] as const).map((id) => {
          const item = APPROACH_DATA[id];
          const Icon = item.icon;
          const isActive = activeApproach === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveApproach(id); setActiveTab('jargon'); }}
              className={cn(
                "flex flex-col items-center justify-center p-10 rounded-[32px] border-4 transition-all duration-300 gap-4 bg-white",
                isActive ? "border-primary shadow-xl scale-[1.02]" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className={cn("p-4 rounded-2xl", isActive ? "text-primary" : "text-slate-300")}>
                <Icon className="h-10 w-10" />
              </div>
              <span className={cn("font-black uppercase italic tracking-widest text-sm", isActive ? "text-primary" : "text-slate-400")}>
                {item.id === 'predictive' ? 'Prédictif' : item.id === 'agile' ? 'Agile' : 'Hybride'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Focus Section */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Focus : {data.title}</h2>
          <p className="text-lg font-bold text-slate-500 italic leading-relaxed">
            {data.description}
          </p>
        </div>

        {/* Sub-Navigation Buttons */}
        <div className="flex gap-4">
          <Button 
            onClick={() => setActiveTab('jargon')}
            className={cn(
              "h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg",
              activeTab === 'jargon' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            <BookOpen className="h-4 w-4" /> Jargon Clé
          </Button>
          <Button 
            onClick={() => setActiveTab('quiz')}
            className={cn(
              "h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg",
              activeTab === 'quiz' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500"
            )}
          >
            <Zap className="h-4 w-4" /> Quiz Rapide (5/5)
          </Button>
        </div>

        {/* Content Area */}
        <div className="pt-6">
          {activeTab === 'jargon' ? (
            <div className="space-y-8 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1 bg-primary rounded-full" />
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Cartes Mentales : Jargon {activeApproach.toUpperCase()}</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Cliquez sur une carte pour voir l'explication au dos.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.jargon.map((item, idx) => (
                  <JargonCard key={idx} term={item.term} def={item.def} />
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto italic font-bold text-slate-400 text-center py-20">
              Module de quiz en cours de chargement...
            </div>
          )}
        </div>
      </div>

      {/* Performance History Section */}
      <Card className="rounded-[40px] border-none shadow-xl bg-white p-10 space-y-8 mt-12">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <History className="h-8 w-8 text-primary" /> Historique des notes : {data.id.toUpperCase()}
          </h3>
          <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic text-[10px] px-4 py-1 uppercase">Objectif : 75%</Badge>
        </div>
        
        <div className="h-[250px] w-full">
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-4 border-dashed border-slate-50 rounded-[32px]">
              <TrendingUp className="h-12 w-12 opacity-20" />
              <p className="font-black uppercase tracking-widest text-[10px] italic">Aucune donnée de simulation pour cet axe</p>
            </div>
          )}
        </div>
      </Card>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
