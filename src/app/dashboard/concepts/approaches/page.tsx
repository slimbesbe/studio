"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, RotateCcw, Layers, BookOpen, Zap, 
  CheckCircle2, Info, Trophy, Loader2, ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const DEFAULT_APPROACH_DATA: Record<string, any> = {
  predictive: {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: ArrowDown,
    description: "L'approche prédictive repose sur une planification détaillée en amont.",
    jargon: [
      { term: 'Chemin Critique', def: 'Séquence de tâches minimale pour finir le projet.' }
    ],
    quiz: [
      { q: "Quand utiliser le prédictif ?", a: ["Besoins stables", "Projet inconnu"], c: 0, exp: "Le prédictif excelle quand les besoins sont clairs dès le début." },
    ]
  },
  agile: {
    id: 'agile',
    title: 'Agile',
    icon: RotateCcw,
    description: "L'agilité privilégie l'itération et le feedback continu.",
    jargon: [
      { term: 'Sprint', def: 'Bloc de temps fixe (2-4 sem) pour livrer un incrément.' }
    ],
    quiz: [
      { q: "Qui définit les priorités ?", a: ["Scrum Master", "Product Owner"], c: 1, exp: "Le PO est responsable du ROI et des priorités du backlog." },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    description: "Mélange le meilleur des deux mondes pour s'adapter au contexte.",
    jargon: [
      { term: 'Approche Hybride', def: 'Utilisation simultanée du prédictif et de l\'agile.' }
    ],
    quiz: [
      { q: "Pourquoi l'hybride ?", a: ["Rigidité", "Adaptabilité ciblée"], c: 1, exp: "Permet de garder du contrôle sur le budget tout en étant flexible sur le produit." },
    ]
  }
};

export default function VisionApprochesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeApproach, setActiveApproach] = useState<'predictive' | 'agile' | 'hybrid'>('predictive');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');
  const [approachData, setApproachData] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 6;

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsDataLoading(true);
      try {
        const snap = await getDoc(doc(db, 'concepts_approaches', activeApproach));
        if (snap.exists()) {
          setApproachData(snap.data());
        } else {
          setApproachData(DEFAULT_APPROACH_DATA[activeApproach]);
        }
      } catch (e) {
        setApproachData(DEFAULT_APPROACH_DATA[activeApproach]);
      } finally {
        setIsDataLoading(false);
        setCurrentPage(0);
      }
    }
    load();
  }, [db, activeApproach, user]);

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const data = approachData || DEFAULT_APPROACH_DATA[activeApproach];
  const jargonList = data.jargon || [];
  const paginatedJargon = jargonList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(jargonList.length / pageSize);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in space-y-4 h-full">
      <div className="shrink-0 space-y-1">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Approches</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] italic">Maîtrisez le cycle de vie de vos projets.</p>
      </div>

      <div className="shrink-0 grid grid-cols-3 gap-4 h-24">
        {(['predictive', 'agile', 'hybrid'] as const).map((id) => {
          const item = DEFAULT_APPROACH_DATA[id];
          const Ico = item.icon;
          const isActive = activeApproach === id;
          return (
            <button 
              key={id} 
              onClick={() => { setActiveApproach(id); setActiveTab('jargon'); }} 
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 gap-1 bg-white shadow-sm", 
                isActive ? "border-primary scale-[1.02]" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <Ico className={cn("h-6 w-6", isActive ? "text-primary" : "text-slate-300")} />
              <span className={cn("font-black uppercase italic tracking-widest text-[10px]", isActive ? "text-primary" : "text-slate-400")}>{item.title}</span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black italic uppercase tracking-tight text-slate-900">Focus : {data.title}</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border">
            <Button 
              size="sm"
              onClick={() => setActiveTab('jargon')} 
              className={cn("h-8 px-4 rounded-lg font-black uppercase italic text-[10px] gap-2", activeTab === 'jargon' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <BookOpen className="h-3 w-3" /> Jargon Clé
            </Button>
            <Button 
              size="sm"
              onClick={() => setActiveTab('quiz')} 
              className={cn("h-8 px-4 rounded-lg font-black uppercase italic text-[10px] gap-2", activeTab === 'quiz' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <Zap className="h-3 w-3" /> Quiz Rapide
            </Button>
          </div>
        </div>

        {activeTab === 'jargon' && totalPages > 1 && (
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full border-2 shadow-sm bg-white"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[10px] font-black italic text-slate-400 uppercase tracking-widest">PAGE {currentPage + 1} / {totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 rounded-full border-2 shadow-sm bg-white"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden pb-2">
        {activeTab === 'jargon' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-full animate-slide-up">
            {paginatedJargon.map((item: any, idx: number) => (
              <JargonCard key={idx} term={item.term} def={item.def} />
            ))}
            {paginatedJargon.length < 6 && Array.from({ length: 6 - paginatedJargon.length }).map((_, i) => (
              <div key={`filler-${i}`} className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[24px]" />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center overflow-hidden">
            <QuickQuiz questions={data.quiz || []} axisId={activeApproach} userId={user?.uid || ''} db={db} />
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

function JargonCard({ term, def }: { term: string, def: string }) {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div className="perspective-1000 h-full w-full cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-transform duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        {/* RECTO : Vert très clair et doux */}
        <div className="absolute inset-0 backface-hidden bg-[#f0fdf4] text-emerald-900 rounded-[32px] flex flex-col items-center justify-center p-6 shadow-xl border-2 border-emerald-100">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-center leading-tight">{term}</h3>
        </div>
        {/* VERSO : Gris Anthracite profond */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] text-white rounded-[32px] flex items-center justify-center p-8 shadow-2xl border-2 border-slate-700">
          <p className="text-center font-bold italic text-sm leading-relaxed">{def}</p>
        </div>
      </div>
    </div>
  );
}

function QuickQuiz({ questions, axisId, userId, db }: any) {
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (questions && questions.length > 0) {
      const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, 5);
      setActiveQuestions(shuffled);
    }
  }, [questions]);

  const handleAnswer = (idx: number) => { 
    if (isAnswered) return; 
    setSelectedIdx(idx); 
    setIsAnswered(true); 
    const q = activeQuestions[currentIdx];
    const correctIdx = q.c !== undefined ? Number(q.c) : 0;
    if (idx === correctIdx) setScore(score + 1); 
  };

  const next = async () => { 
    if (currentIdx < activeQuestions.length - 1) { 
      setCurrentIdx(currentIdx + 1); 
      setSelectedIdx(null); 
      setIsAnswered(false); 
    } else { 
      const percent = Math.round((score / activeQuestions.length) * 100);
      try {
        await addDoc(collection(db, 'quickQuizAttempts'), { 
          userId, 
          axisId, 
          category: 'approach', 
          score: percent, 
          correctCount: score, 
          totalQuestions: activeQuestions.length, 
          submittedAt: serverTimestamp() 
        });
      } catch (e) {}
      setShowResult(true); 
    }
  };

  if (showResult) return (
    <Card className="rounded-[40px] bg-white p-12 text-center space-y-6 shadow-2xl animate-fade-in border-none w-full max-w-xl">
      <div className="bg-primary/5 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] italic">Session validée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl scale-105 transition-transform text-white">REFAIRE</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const rawChoices = Array.isArray(q.a) ? q.a : (Array.isArray(q.choices) ? q.choices : []);
  const correctIdx = q.c !== undefined ? Number(q.c) : 0;

  return (
    <Card className="rounded-[40px] bg-white p-8 space-y-6 w-full max-w-2xl shadow-2xl animate-slide-up border-none overflow-hidden">
      <Badge variant="outline" className="font-black italic px-4 py-1 rounded-lg border-2 text-slate-400 text-[10px]">
        Question {currentIdx + 1} / {activeQuestions.length}
      </Badge>
      <h3 className="text-xl font-black italic text-slate-900 leading-tight">
        {q.q || q.text}
      </h3>
      <div className="grid gap-3">
        {rawChoices.map((opt: any, idx: number) => (
          <button 
            key={idx} 
            disabled={isAnswered}
            onClick={() => handleAnswer(idx)} 
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left flex items-start gap-4",
              !isAnswered ? "border-slate-100 bg-white hover:border-primary" : 
              idx === correctIdx ? "border-emerald-500 bg-emerald-50" : 
              idx === selectedIdx ? "border-red-500 bg-red-50" : "border-slate-50 opacity-40"
            )}
          >
            <div className={cn(
              "h-8 w-8 flex items-center justify-center font-black text-xs shrink-0 border-2 rounded-full",
              !isAnswered ? "bg-white text-slate-400" : 
              idx === correctIdx ? "bg-emerald-500 text-white" : 
              idx === selectedIdx ? "bg-red-500 text-white" : "bg-white text-slate-200"
            )}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="flex-1 text-base font-black italic pt-0.5">{opt}</span>
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="bg-slate-50 p-6 rounded-[24px] border-l-4 border-l-primary animate-slide-up space-y-3">
          <p className="text-black font-bold italic text-sm leading-relaxed">{q.exp || q.explanation}</p>
          <Button onClick={next} className="w-full h-10 rounded-xl bg-slate-900 text-white font-black uppercase italic tracking-widest text-[10px]">
            {currentIdx < activeQuestions.length - 1 ? "SUIVANT" : "RÉSULTAT"}
          </Button>
        </div>
      )}
    </Card>
  );
}
