
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  RotateCcw, 
  Layers, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  Info,
  XCircle,
  Trophy,
  History,
  TrendingUp,
  Clock,
  Calendar,
  Loader2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- DATA STRUCTURE ---

const APPROACH_DATA = {
  predictive: {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: ArrowDown,
    description: "L'approche Prédictive repose sur une planification exhaustive initiale. On définit tout en amont : portée, coûts, délais. Le changement est formellement contrôlé via un CCB.",
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
      { q: "Qui approuve formellement un changement en prédictif ?", a: ["Le client uniquement", "Le CCB", "L'équipe technique"], c: 1, exp: "Le Comité de Contrôle des Changements (CCB) est l'autorité centrale." },
      { q: "Que contient la 'Baseline du Périmètre' ?", a: ["Le planning", "Le WBS, son dictionnaire et l'énoncé du périmètre", "Le budget"], c: 1, exp: "C'est l'ensemble de documents qui définit le travail approuvé." },
      { q: "À quoi sert le chemin critique ?", a: ["Identifier les risques", "Calculer la durée minimale du projet", "Gérer l'équipe"], c: 1, exp: "Il montre la séquence de tâches la plus longue sans marge." },
      { q: "Quand utilise-t-on le 'Waterfall' ?", a: ["Incertitude forte", "Périmètre stable et connu", "Innovation disruptive"], c: 1, exp: "Il est idéal quand les exigences sont claires dès le début." },
    ]
  },
  agile: {
    id: 'agile',
    title: 'Agile',
    icon: RotateCcw,
    description: "L'approche Agile est itérative et adaptative. Le feedback client est continu et le CP agit en tant que Leader Serviteur.",
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
      { q: "Le PM en agile est d'abord un...", a: ["Commandant", "Leader Serviteur", "Secrétaire"], c: 1, exp: "Il sert l'équipe en éliminant les obstacles (impediments)." },
      { q: "Qui définit les priorités dans le Backlog ?", a: ["L'équipe", "Le Scrum Master", "Le Product Owner"], c: 2, exp: "Le PO est le seul responsable de la valeur et des priorités." },
      { q: "Quel est l'objectif du Daily Standup ?", a: ["Rapporter au manager", "Synchroniser l'équipe", "Prendre des décisions techniques"], c: 1, exp: "C'est un moment de synchronisation et d'identification d'obstacles." },
      { q: "Quand livre-t-on de la valeur en Agile ?", a: ["À la fin du projet", "À chaque incrément (fin de sprint)", "Une fois par an"], c: 1, exp: "L'objectif est de livrer un produit fini et utilisable régulièrement." },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    description: "L'approche Hybride combine le meilleur des deux mondes selon le contexte du projet.",
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
      { q: "Que signifie le concept de 'Tailoring' ?", a: ["Coudre des vêtements", "Ajuster la méthode au projet", "Limiter le budget"], c: 1, exp: "Le Tailoring est l'adaptation stratégique des processus." },
      { q: "Dans un projet hybride, où utilise-t-on souvent l'Agile ?", a: ["Construction de ponts", "Développement logiciel innovant", "Comptabilité"], c: 1, exp: "L'Agile est idéal pour les composants à forte incertitude." },
      { q: "Qu'est-ce qu'un MVP ?", a: ["Most Valuable Player", "Minimum Viable Product", "Max Value Plan"], c: 1, exp: "C'est la version minimale du produit qui apporte une valeur réelle." },
      { q: "Comment gère-t-on le budget en Hybride ?", a: ["Fixe uniquement", "Variable uniquement", "Adaptatif selon les phases"], c: 2, exp: "La gouvernance financière s'adapte aux cycles de vie choisis." },
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
        <div className="absolute inset-0 backface-hidden bg-[#1E293B] text-white rounded-[24px] flex flex-col items-center justify-center p-6 shadow-xl">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-center mb-2">{term}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Cliquez pour voir la définition</p>
        </div>
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl">
          <p className="text-center font-bold italic text-sm leading-relaxed">{def}</p>
        </div>
      </div>
    </div>
  );
}

function QuickQuiz({ questions, axisId, userId, db }: { questions: any[], axisId: string, userId: string, db: any }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    setIsAnswered(true);
    if (idx === questions[currentIdx].c) setScore(score + 1);
  };

  const next = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
    } else {
      setIsSaving(true);
      const percent = Math.round((score / questions.length) * 100);
      try {
        await addDoc(collection(db, 'quickQuizAttempts'), {
          userId,
          axisId,
          category: 'approach',
          score: percent,
          correctCount: score,
          totalQuestions: questions.length,
          submittedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error saving quiz:", e);
      } finally {
        setIsSaving(false);
        setShowResult(true);
      }
    }
  };

  if (showResult) {
    return (
      <Card className="rounded-[40px] border-none shadow-2xl bg-white p-12 text-center space-y-8 animate-slide-up">
        <div className="bg-primary/5 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Axe Validé !</h3>
          <p className="text-xl font-bold text-slate-500 italic">Score : {score} / {questions.length}</p>
        </div>
        <Button onClick={() => { setCurrentIdx(0); setShowResult(false); setScore(0); setIsAnswered(false); }} className="h-14 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl">Recommencer</Button>
      </Card>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <Card className="rounded-[40px] shadow-2xl border-none bg-white p-10 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline" className="font-black italic px-4 py-1.5 border-2">Question {currentIdx + 1} / {questions.length}</Badge>
        </div>
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
            <p className="text-slate-700 font-bold italic leading-relaxed">{q.exp}</p>
            <Button onClick={next} disabled={isSaving} className="mt-6 w-full h-12 rounded-xl bg-slate-900 font-black uppercase text-xs tracking-widest shadow-lg">
              {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : (currentIdx < questions.length - 1 ? "Suivant" : "Valider mes acquis")}
            </Button>
          </div>
        )}
      </Card>
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
    return query(
      collection(db, 'quickQuizAttempts'), 
      where('userId', '==', user.uid),
      where('axisId', '==', activeApproach)
    );
  }, [db, user?.uid, activeApproach]);

  const { data: attempts } = useCollection(attemptsQuery);

  const historyData = useMemo(() => {
    if (!attempts) return [];
    const sorted = [...attempts].sort((a, b) => {
      const timeA = a.submittedAt?.seconds || 0;
      const timeB = b.submittedAt?.seconds || 0;
      return timeA - timeB;
    });

    return sorted.map((a, i) => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return {
        id: a.id,
        name: `Q${i + 1}`,
        date: date.toLocaleDateString('fr-FR'),
        hour: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        score: a.score,
        responses: `${a.correctCount || 0} / ${a.totalQuestions || 5}`
      };
    });
  }, [attempts]);

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Maîtrise des Approches PMP</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Comprenez le Mindset, maîtrisez le jargon et validez vos acquis par Quiz.</p>
      </div>

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
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Focus : {data.title}</h2>
          <p className="text-lg font-bold text-slate-500 italic leading-relaxed">{data.description}</p>
        </div>

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
            <Zap className="h-4 w-4" /> Quiz Rapide (5 Questions)
          </Button>
        </div>

        <div className="pt-6">
          {activeTab === 'jargon' ? (
            <div className="space-y-8 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="h-10 w-1 bg-primary rounded-full" />
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Cartes Mentales</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.jargon.map((item, idx) => (
                  <JargonCard key={idx} term={item.term} def={item.def} />
                ))}
              </div>
            </div>
          ) : (
            <QuickQuiz questions={data.quiz} axisId={activeApproach} userId={user?.uid || ''} db={db} />
          )}
        </div>
      </div>

      {historyData.length > 0 && (
        <div className="space-y-8 pt-12 border-t border-dashed animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
              <History className="h-8 w-8 text-primary" /> Historique des quiz : {data.title}
            </h3>
            <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic text-[10px] px-4 py-1 uppercase">Cible : 100%</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="h-14 border-b-2">
                    <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Heure</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Réponses</TableHead>
                    <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.slice().reverse().slice(0, 5).map((a) => (
                    <TableRow key={a.id} className="h-16 hover:bg-slate-50 transition-all border-b last:border-0">
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2 font-bold italic text-sm text-slate-700">
                          <Calendar className="h-3 w-3 text-slate-300" /> {a.date}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold italic text-sm text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-3 w-3 text-slate-300" /> {a.hour}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-black italic text-slate-400 text-sm">{a.responses}</span>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <span className={cn(
                          "text-lg font-black italic",
                          a.score >= 80 ? "text-emerald-500" : a.score >= 60 ? "text-[#f59e0b]" : "text-red-500"
                        )}>{a.score}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <Card className="rounded-[32px] border-none shadow-xl bg-white p-8">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 italic mb-6">
                <TrendingUp className="h-3 w-3" /> Courbe d'avancement
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                      {historyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
