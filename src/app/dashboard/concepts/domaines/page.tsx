
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Settings, 
  Globe, 
  BookOpen, 
  Zap, 
  CheckCircle2, 
  Info,
  XCircle,
  Trophy,
  TrendingUp,
  History,
  Clock,
  Calendar,
  Loader2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- DATA STRUCTURE ---

const DOMAIN_DATA = {
  people: {
    id: 'people',
    title: 'People',
    icon: Users,
    description: "Le domaine People concerne tout ce qui touche à l'humain dans le projet : leadership, communication, gestion des conflits, engagement des parties prenantes.",
    mindset: "Leader Serviteur, Intelligence Émotionnelle, Mentorat.",
    jargon: [
      { term: 'Servant Leadership', def: 'Style de leadership qui privilégie le soutien à l\'équipe plutôt que le commandement.' },
      { term: 'Register des Parties Prenantes', def: 'Document listant les attentes et l\'influence de chaque acteur du projet.' },
      { term: 'Résolution de Conflits', def: 'Techniques pour gérer les désaccords (Collaboration, Compromis, etc.).' },
      { term: 'Théorie de Maslow', def: 'Hiérarchie des besoins humains pour motiver les membres de l\'équipe.' },
      { term: 'Intelligence Émotionnelle', def: 'Capacité à identifier et gérer ses émotions et celles des autres.' },
      { term: 'Matrice Pouvoir/Intérêt', def: 'Outil de catégorisation pour prioriser l\'engagement des stakeholders.' },
    ],
    quiz: [
      { q: "Quel est le rôle principal d'un Leader Serviteur ?", a: ["Prendre les décisions techniques", "Éliminer les obstacles", "Contrôler les horaires"], c: 1, exp: "Il facilite le travail de l'équipe en supprimant ce qui la bloque." },
      { q: "Quelle technique de conflit cherche une solution 'Gagnant-Gagnant' ?", a: ["Smoothing", "Forcing", "Collaborating"], c: 2, exp: "La collaboration (Problem Solving) vise un consensus durable." },
      { q: "Qu'est-ce que l'intelligence émotionnelle ?", a: ["Être très intelligent", "Gérer ses propres émotions et celles des autres", "Savoir lire le PMBOK"], c: 1, exp: "C'est la clé de la gestion d'équipe et des stakeholders." },
      { q: "À quel stade de Tuckman l'équipe est-elle la plus performante ?", a: ["Storming", "Norming", "Performing"], c: 2, exp: "C'est l'étape où l'équipe est autonome et productive." },
      { q: "Quelle est la base de la pyramide de Maslow ?", a: ["Estime", "Besoins physiologiques", "Sécurité"], c: 1, exp: "Les besoins de base doivent être satisfaits avant toute autre motivation." },
    ]
  },
  process: {
    id: 'process',
    title: 'Process',
    icon: Settings,
    description: "Le domaine Process couvre la méthodologie technique avancée pour livrer la valeur attendue.",
    mindset: "Analyse d'impact, Rigueur méthodologique, Clôture formelle.",
    jargon: [
      { term: 'Chemin Critique', def: 'Séquence de tâches qui détermine la durée minimale du projet.' },
      { term: 'WBS / OTP', def: 'Work Breakdown Structure : Décomposition hiérarchique du travail.' },
      { term: 'EVM (Valeur Acquise)', def: 'Mesure de performance comparant le travail prévu et le travail réalisé.' },
      { term: 'CCB (Comité de Changement)', def: 'Groupe formel qui approuve ou rejette les demandes de modification.' },
      { term: 'Plan de Communication', def: 'Définit qui reçoit quelle information, quand et comment.' },
      { term: 'Registre des Risques', def: 'Document central pour identifier, analyser et suivre les risques.' },
    ],
    quiz: [
      { q: "Que faire en premier face à une demande de changement ?", a: ["Soumettre au CCB", "Analyser l'impact", "Mettre à jour le planning"], c: 1, exp: "L'analyse d'impact est toujours la première étape proactive." },
      { q: "Quel document décompose le travail en lots gérables ?", a: ["Charte projet", "WBS (OTP)", "Registre des risques"], c: 1, exp: "Le WBS est la base de la planification du périmètre." },
      { q: "Si le SPI est à 0.8, le projet est...", a: ["En avance", "En retard", "Dans les temps"], c: 1, exp: "Un SPI < 1 indique un retard par rapport au planning." },
      { q: "Que faire d'un risque à impact fort mais probabilité faible ?", a: ["L'ignorer", "Le surveiller (Watchlist)", "Changer de projet"], c: 1, exp: "Ces risques sont placés dans une liste de surveillance." },
      { q: "Quelle est la dernière étape d'un projet ?", a: ["Livrer le produit", "Libérer l'équipe", "Obtenir l'acceptation formelle et archiver"], c: 2, exp: "La clôture administrative et formelle est cruciale." },
    ]
  },
  business: {
    id: 'business',
    title: 'Business Environment',
    icon: Globe,
    description: "Le domaine Business Environment lie le projet à la stratégie de l'organisation.",
    mindset: "Valeur stratégique, Conformité, Soutien au changement.",
    jargon: [
      { term: 'Analyse de Valeur', def: 'Processus visant à maximiser les bénéfices tout en optimisant les coûts.' },
      { term: 'Compliance (Conformité)', def: 'Respect des lois, normes et régulations en vigueur.' },
      { term: 'Business Case', def: 'Justification économique et stratégique du projet.' },
      { term: 'MVP (Produit Minimum Viable)', def: 'Plus petite version du produit apportant de la valeur métier.' },
      { term: 'Analyse des Bénéfices', def: 'Suivi de la valeur réelle produite après la fin du projet.' },
      { term: 'Alignement Stratégique', def: 'Vérification que le projet sert les objectifs de l\'entreprise.' },
    ],
    quiz: [
      { q: "Si une nouvelle loi passe durant le projet, vous devez...", a: ["Attendre la fin", "Évaluer la conformité", "Ignorer si le budget est fixe"], c: 1, exp: "La conformité aux régulations est prioritaire et non négociable." },
      { q: "Quel document justifie l'investissement dans le projet ?", a: ["Rapport de performance", "Business Case", "Plan de gestion"], c: 1, exp: "Le Business Case explique le 'Pourquoi' économique et stratégique." },
      { q: "Qui est responsable des bénéfices post-projet ?", a: ["Le CP", "Le Sponsor ou le Bénéfice Owner", "L'équipe"], c: 1, exp: "Le CP livre le produit, le propriétaire des bénéfices suit la valeur." },
      { q: "Qu'est-ce que l'alignement stratégique ?", a: ["Suivre le planning", "S'assurer que le projet sert les buts de l'entreprise", "Avoir un gros budget"], c: 1, exp: "Un projet qui ne sert pas la stratégie est un gaspillage de ressources." },
      { q: "Comment soutenir le changement organisationnel ?", a: ["Forcer les gens", "Communiquer la vision et former les utilisateurs", "Ne rien faire"], c: 1, exp: "La gestion du changement passe par l'adhésion et la préparation des utilisateurs." },
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
          category: 'domain',
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
          <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Domaine Validé !</h3>
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

export default function VisionDomainesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeDomain, setActiveDomain] = useState<'people' | 'process' | 'business'>('people');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');

  const data = DOMAIN_DATA[activeDomain];

  const attemptsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'quickQuizAttempts'), 
      where('userId', '==', user.uid),
      where('axisId', '==', activeDomain)
    );
  }, [db, user?.uid, activeDomain]);

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
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Maîtrise des Domaines PMP</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Explorez les 3 piliers de l'examen PMP® et testez votre compréhension.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['people', 'process', 'business'] as const).map((id) => {
          const item = DOMAIN_DATA[id];
          const Icon = item.icon;
          const isActive = activeDomain === id;
          return (
            <button
              key={id}
              onClick={() => { setActiveDomain(id); setActiveTab('jargon'); }}
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
            <QuickQuiz questions={data.quiz} axisId={activeDomain} userId={user?.uid || ''} db={db} />
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
                          a.score >= 80 ? "text-emerald-500" : a.score >= 60 ? "text-indigo-500" : "text-red-500"
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
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
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
