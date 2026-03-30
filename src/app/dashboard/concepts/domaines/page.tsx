
"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  LayoutGrid, 
  Briefcase, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  XCircle,
  Trophy,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- DATA STRUCTURE ---

const DOMAIN_DATA = {
  people: {
    id: 'people',
    title: 'People (42%)',
    icon: Users,
    color: 'text-emerald-500',
    description: "Le domaine People se concentre sur les compétences humaines. Le Chef de Projet agit comme un Leader Serviteur qui gère les conflits, soutient l'équipe et élimine les obstacles à la performance.",
    mindset: "Leader Serviteur, Intelligence Émotionnelle, Mentorat.",
    jargon: [
      { term: 'Intelligence Émotionnelle', def: 'Capacité à identifier et gérer ses émotions et celles des autres.' },
      { term: 'Leader Serviteur', def: 'Style de leadership qui privilégie le soutien à l\'équipe plutôt que le commandement.' },
      { term: 'Gestion de Conflit', def: 'Techniques pour résoudre les désaccords (Collaboration, Compromis, etc.).' },
      { term: 'Mentorat', def: 'Accompagnement à long terme d\'un membre de l\'équipe pour développer ses compétences.' },
      { term: 'Théorie de Tuckman', def: 'Phases de développement d\'une équipe : Forming, Storming, Norming, Performing, Adjourning.' },
      { term: 'Contrat d\'Équipe', def: 'Document créé par l\'équipe définissant les règles de vie et de communication.' },
    ],
    quiz: [
      { q: "Quel est le rôle principal d'un Leader Serviteur ?", a: ["Prendre les décisions techniques", "Éliminer les obstacles", "Contrôler les horaires"], c: 1, exp: "Il facilite le travail de l'équipe en supprimant ce qui la bloque." },
      { q: "La phase 'Storming' de Tuckman est marquée par...", a: ["La productivité maximale", "Les conflits de rôles", "La dissolution de l'équipe"], c: 1, exp: "Le Storming est la phase de confrontation et de positionnement." },
      { q: "Quelle technique de conflit cherche une solution 'Gagnant-Gagnant' ?", a: ["Smoothing", "Forcing", "Collaborating"], c: 2, exp: "La collaboration (Problem Solving) vise un consensus durable." },
      { q: "L'intelligence émotionnelle commence par...", a: ["L'empathie", "La conscience de soi", "La gestion sociale"], c: 1, exp: "La conscience de soi est le socle de l'intelligence émotionnelle." },
      { q: "Un contrat d'équipe doit être écrit par...", a: ["Le Sponsor", "Le Chef de Projet", "L'Équipe elle-même"], c: 2, exp: "L'auto-organisation exige que l'équipe définisse ses propres règles." },
    ]
  },
  process: {
    id: 'process',
    title: 'Process (50%)',
    icon: LayoutGrid,
    color: 'text-indigo-500',
    description: "Le domaine Process couvre la méthodologie technique du projet. Il s'agit de gérer le périmètre, le budget, les risques et la qualité de manière rigoureuse et structurée.",
    mindset: "Analyse d'impact, Rigueur méthodologique, Clôture formelle.",
    jargon: [
      { term: 'Registre des Risques', def: 'Document listant les risques identifiés, leur impact, probabilité et réponses.' },
      { term: 'Plan de Gestion du Périmètre', def: 'Définit comment le périmètre sera défini, validé et contrôlé.' },
      { term: 'Gestion de la Valeur Acquise', def: 'EVM : Mesure la performance du projet en comparant travail prévu et réel.' },
      { term: 'Analyse d\'Impact', def: 'Évaluation obligatoire des conséquences d\'un changement avant toute action.' },
      { term: 'Gouvernance', def: 'Cadre définissant les règles de décision et les niveaux d\'autorité.' },
      { term: 'Qualité vs Grade', def: 'La qualité est la conformité aux exigences ; le grade est la catégorie de luxe.' },
    ],
    quiz: [
      { q: "Que faire en premier face à une demande de changement ?", a: ["Soumettre au CCB", "Analyser l'impact", "Mettre à jour le planning"], c: 1, exp: "L'analyse d'impact est toujours la première étape proactive." },
      { q: "Un SPI de 0.8 signifie que le projet est...", a: ["En avance", "En retard", "Dans les temps"], c: 1, exp: "Un indicateur inférieur à 1 indique une performance moindre que prévue." },
      { q: "Le registre des risques doit être mis à jour...", a: ["Une fois par mois", "À la clôture uniquement", "Continuellement"], c: 2, exp: "La gestion des risques est un processus itératif et continu." },
      { q: "La différence entre Audit et Inspection ?", a: ["L'audit est sur le processus", "L'inspection est sur le processus", "C'est la même chose"], c: 0, exp: "Audit = Processus / Inspection = Produit (Livrable)." },
      { q: "La clôture d'un projet nécessite...", a: ["Le chèque final", "L'acceptation formelle", "Le licenciement de l'équipe"], c: 1, exp: "L'acceptation formelle du client est cruciale pour clôturer." },
    ]
  },
  business: {
    id: 'business',
    title: 'Business (8%)',
    icon: Briefcase,
    color: 'text-purple-500',
    description: "Le domaine Business Environment lie le projet à la stratégie de l'organisation. Il s'agit de garantir la conformité et de délivrer une valeur réelle pour l'entreprise.",
    mindset: "Valeur stratégique, Conformité, Soutien au changement.",
    jargon: [
      { term: 'Analyse de Valeur', def: 'Processus visant à maximiser les bénéfices tout en optimisant les coûts.' },
      { term: 'Conformité (Compliance)', def: 'Respect des lois, normes et régulations en vigueur.' },
      { term: 'Changement Organisationnel', def: 'Impact du projet sur la culture et les processus de l\'entreprise.' },
      { term: 'Cas d\'Affaire (Business Case)', def: 'Document justifiant l\'investissement dans le projet.' },
      { term: 'Réalisation des Bénéfices', def: 'Suivi de la valeur réelle produite après la fin du projet.' },
      { term: 'Culture d\'Entreprise', def: 'Normes invisibles qui influencent la manière dont le projet est mené.' },
    ],
    quiz: [
      { q: "Pourquoi un projet existe-t-il ?", a: ["Pour occuper l'équipe", "Pour créer de la valeur", "Pour dépenser le budget"], c: 1, exp: "La raison d'être d'un projet est de générer de la valeur métier." },
      { q: "Si une nouvelle loi passe durant le projet, vous devez...", a: ["Attendre la fin", "Évaluer la conformité", "Ignorer si le budget est fixe"], c: 1, exp: "La conformité aux régulations est prioritaire et non négociable." },
      { q: "Le Business Case appartient au...", a: ["Chef de Projet", "Sponsor", "Scrum Master"], c: 1, exp: "Le Sponsor est responsable de la justification économique du projet." },
      { q: "Un MVP (Produit Minimum Viable) aide à...", a: ["Vendre plus cher", "Valider la valeur tôt", "Remplacer le contrat"], c: 1, exp: "Le MVP permet de tester la valeur métier avec un minimum d'effort." },
      { q: "Le changement organisationnel est réussi si...", a: ["Le projet finit tôt", "Les gens adoptent la solution", "Le budget est respecté"], c: 1, exp: "L'adoption par les utilisateurs définit le succès stratégique." },
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
        <div className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-[24px] flex flex-col items-center justify-center p-6 shadow-xl border-4 border-slate-800">
          <h3 className="text-xl font-black italic uppercase tracking-tighter text-center mb-2">{term}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Cliquer pour découvrir</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl border-4 border-indigo-400/20">
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
        <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
          <Trophy className="h-10 w-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Domaine Validé !</h3>
          <p className="text-xl font-bold text-slate-500 italic">Score de Maîtrise : {score} / {questions.length}</p>
        </div>
        <Button onClick={reset} className="h-14 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl">Recommencer le test</Button>
      </Card>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
        <Badge variant="outline" className="font-black italic">Challenge {currentIdx + 1} / {questions.length}</Badge>
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
              <span className="font-black text-primary uppercase text-[10px] block mb-1">Rationnel PMP :</span>
              {q.exp}
            </p>
            <Button onClick={next} className="mt-6 w-full h-12 rounded-xl bg-slate-900 font-black uppercase text-xs tracking-widest shadow-lg">
              {currentIdx < questions.length - 1 ? "Question Suivante" : "Terminer et voir mon score"} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// --- MAIN PAGE ---

export default function VisionDomainesPage() {
  const [activeDomain, setActiveDomain] = useState<'people' | 'process' | 'business'>('people');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');

  const data = DOMAIN_DATA[activeDomain];

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      {/* Header & Tabs */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[40px] shadow-xl border-2">
          <div className="flex items-center gap-6">
            <div className="bg-primary/5 p-4 rounded-3xl">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Domaines</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Maîtrisez les 3 piliers du programme officiel PMI®.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(['people', 'process', 'business'] as const).map((id) => {
            const item = DOMAIN_DATA[id];
            const Icon = item.icon;
            const isActive = activeDomain === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveDomain(id); setActiveTab('jargon'); }}
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-[32px] border-4 transition-all duration-300 gap-4",
                  isActive ? "border-primary bg-primary/5 shadow-inner scale-[1.02]" : "border-slate-50 bg-white hover:border-slate-200"
                )}
              >
                <div className={cn("p-4 rounded-2xl", isActive ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                  <Icon className="h-8 w-8" />
                </div>
                <span className={cn("font-black uppercase italic tracking-widest text-xs", isActive ? "text-primary" : "text-slate-400")}>
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
            <h2 className={cn("text-3xl font-black italic uppercase tracking-tighter", data.color)}>Focus : {data.id.toUpperCase()}</h2>
            <div className="flex bg-slate-100 p-1 rounded-2xl border-2">
              <Button 
                variant={activeTab === 'jargon' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('jargon')}
                className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-[10px] gap-2", activeTab === 'jargon' ? "shadow-lg" : "text-slate-500")}
              >
                <BookOpen className="h-4 w-4" /> Concept & Jargon
              </Button>
              <Button 
                variant={activeTab === 'quiz' ? 'default' : 'ghost'} 
                onClick={() => setActiveTab('quiz')}
                className={cn("h-12 px-6 rounded-xl font-black uppercase italic text-[10px] gap-2", activeTab === 'quiz' ? "shadow-lg" : "text-slate-500")}
              >
                <Zap className="h-4 w-4" /> Challenge (5/5)
              </Button>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-500 italic leading-relaxed max-w-4xl">
            {data.description}
          </p>
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 w-fit">
            <Info className="h-5 w-5 text-primary" />
            <span className="text-sm font-black italic text-primary">Mindset PMI® : {data.mindset}</span>
          </div>
        </div>

        {activeTab === 'jargon' ? (
          <div className="space-y-8 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="h-1 bg-slate-900 w-12 rounded-full" />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Cartes Mentales : {data.title}</h3>
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

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
