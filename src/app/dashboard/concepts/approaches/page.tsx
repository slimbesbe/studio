
"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, RotateCcw, Layers, BookOpen, Zap, 
  Trophy, Loader2, ChevronRight,
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

  if (isDataLoading) return <div className="h-full w-full flex items-center justify-center bg-white"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const data = approachData || DEFAULT_APPROACH_DATA[activeApproach];
  const jargonList = data.jargon || [];
  const paginatedJargon = jargonList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(jargonList.length / pageSize);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden animate-fade-in p-[1vh] gap-[1vh] bg-background">
      {/* Header Compact */}
      <header className="flex-none flex justify-between items-end px-2 h-[5vh]">
        <div className="flex flex-col">
          <h1 className="text-[clamp(1.2rem,3vh,2.5rem)] font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Approches</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[clamp(0.5rem,1.2vh,0.8rem)] italic leading-none mt-1">Le cycle de vie projet en un coup d'œil.</p>
        </div>
      </header>

      {/* Approach Selector */}
      <nav className="flex-none grid grid-cols-3 gap-[1vh] h-[8vh]">
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
                isActive ? "border-primary bg-primary/5 scale-[1.02] z-10" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <Ico className={cn("h-[2.5vh] w-[2.5vh]", isActive ? "text-primary" : "text-slate-300")} />
              <span className={cn("font-black uppercase italic tracking-widest text-[clamp(0.6rem,1.4vh,1rem)]", isActive ? "text-primary" : "text-slate-400")}>{item.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* Tabs & Pagination Navigation */}
      <div className="flex-none flex items-center justify-between bg-white px-4 rounded-2xl border border-slate-100 shadow-sm h-[7vh]">
        <div className="flex items-center gap-[2vw] flex-1">
          <div className="flex bg-slate-100 p-1 rounded-xl border h-[5vh]">
            <Button 
              size="sm"
              onClick={() => setActiveTab('jargon')} 
              className={cn("h-full px-6 rounded-lg font-black uppercase italic text-[clamp(0.6rem,1.4vh,0.9rem)] gap-2 transition-all", activeTab === 'jargon' ? "bg-slate-900 text-white shadow-lg" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <BookOpen className="h-4 w-4" /> Jargon
            </Button>
            <Button 
              size="sm"
              onClick={() => setActiveTab('quiz')} 
              className={cn("h-full px-6 rounded-lg font-black uppercase italic text-[clamp(0.6rem,1.4vh,0.9rem)] gap-2 transition-all", activeTab === 'quiz' ? "bg-slate-900 text-white shadow-lg" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <Zap className="h-4 w-4" /> Quiz
            </Button>
          </div>
          <h2 className="text-[clamp(0.8rem,1.8vh,1.2rem)] font-black italic uppercase tracking-tight text-slate-400 truncate hidden lg:block">{data.title}</h2>
        </div>

        {activeTab === 'jargon' && totalPages > 1 && (
          <div className="flex items-center gap-[1vw]">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-[5vh] w-[5vh] rounded-xl border-2 shadow-sm bg-white hover:bg-slate-50"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[1.4vh] font-black italic text-slate-400 uppercase tracking-widest px-2">{currentPage + 1} / {totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-[5vh] w-[5vh] rounded-xl border-2 shadow-sm bg-white hover:bg-slate-50"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 relative">
        {activeTab === 'jargon' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-6 md:grid-rows-2 gap-[1.5vh] h-full animate-slide-up">
            {paginatedJargon.map((item: any, idx: number) => (
              <JargonCard key={idx} term={item.term} def={item.def} />
            ))}
            {paginatedJargon.length < 6 && Array.from({ length: 6 - paginatedJargon.length }).map((_, i) => (
              <div key={`filler-${i}`} className="bg-slate-50/10 border-2 border-dashed border-slate-100 rounded-2xl h-full" />
            ))}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <QuickQuiz questions={data.quiz || []} axisId={activeApproach} userId={user?.uid || ''} db={db} />
          </div>
        )}
      </main>

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
    <div className="perspective-1000 h-full w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-all duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        {/* RECTO : Vert très clair */}
        <div className="absolute inset-0 backface-hidden bg-[#f0fdf4] text-[#1e293b] rounded-2xl flex flex-col items-center justify-center p-[2vh] shadow-md border-2 border-emerald-100 overflow-hidden group">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <RotateCcw className="h-4 w-4 text-emerald-300" />
          </div>
          <h3 className="text-[clamp(1rem,3.5vh,3rem)] font-black italic uppercase tracking-tight text-center leading-[1.1] break-words hyphens-auto px-[2vh] w-full">
            {term}
          </h3>
        </div>
        {/* VERSO : Gris Anthracite */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] text-white rounded-2xl flex items-center justify-center p-[3vh] shadow-2xl border-2 border-slate-700 overflow-hidden">
          <div className="h-full w-full overflow-y-auto custom-scrollbar flex items-center justify-center">
            <p className="text-center font-bold italic text-[clamp(0.9rem,2.5vh,2rem)] leading-relaxed">
              {def}
            </p>
          </div>
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
    <Card className="rounded-[40px] bg-white p-[6vh] text-center space-y-[4vh] shadow-2xl animate-fade-in border-none w-full max-w-[45vh]">
      <div className="bg-primary/5 w-[12vh] h-[12vh] rounded-[3vh] flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-[6vh] w-[6vh] text-primary" />
      </div>
      <div className="space-y-[1vh]">
        <h3 className="text-[4vh] font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[1.4vh] italic">Session validée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-[8vh] w-full rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-white text-[1.8vh]">REFAIRE LE QUIZ</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const rawChoices = Array.isArray(q.a) ? q.a : (Array.isArray(q.choices) ? q.choices : []);
  const correctIdx = q.c !== undefined ? Number(q.c) : 0;

  return (
    <Card className="rounded-[40px] bg-white p-[4vh] space-y-[3vh] w-full max-w-[90vh] shadow-2xl animate-slide-up border-none overflow-hidden h-full flex flex-col">
      <div className="flex justify-between items-center flex-none">
        <Badge variant="outline" className="font-black italic px-4 py-1.5 rounded-xl border-2 text-slate-400 text-[1.4vh]">
          QUESTION {currentIdx + 1} / {activeQuestions.length}
        </Badge>
      </div>
      <h3 className="text-[clamp(1rem,2.8vh,2rem)] font-black italic text-slate-900 leading-tight flex-none">
        {q.q || q.text}
      </h3>
      <div className="grid gap-[1.5vh] flex-1 overflow-y-auto custom-scrollbar pr-2">
        {rawChoices.map((opt: any, idx: number) => (
          <button 
            key={idx} 
            disabled={isAnswered}
            onClick={() => handleAnswer(idx)} 
            className={cn(
              "p-[2vh] rounded-2xl border-2 transition-all text-left flex items-center gap-[2vh] shadow-sm",
              !isAnswered ? "border-slate-100 bg-white hover:border-primary" : 
              idx === correctIdx ? "border-emerald-500 bg-emerald-50" : 
              idx === selectedIdx ? "border-red-500 bg-red-50" : "border-slate-50 opacity-40"
            )}
          >
            <div className={cn(
              "h-[4vh] w-[4vh] flex items-center justify-center font-black text-[1.8vh] shrink-0 border-2 rounded-full",
              !isAnswered ? "bg-white text-slate-400" : 
              idx === correctIdx ? "bg-emerald-500 text-white" : 
              idx === selectedIdx ? "bg-red-500 text-white" : "bg-white text-slate-200"
            )}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="flex-1 text-[clamp(0.8rem,2vh,1.3rem)] font-black italic">{opt}</span>
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="flex-none bg-slate-50 p-[2.5vh] rounded-2xl border-l-8 border-l-primary animate-slide-up space-y-[2vh]">
          <p className="text-slate-700 font-bold italic text-[1.6vh] leading-relaxed line-clamp-3">{q.exp || q.explanation}</p>
          <Button onClick={next} className="w-full h-[7vh] rounded-xl bg-slate-900 text-white font-black uppercase italic tracking-widest text-[1.8vh]">
            {currentIdx < activeQuestions.length - 1 ? "SUIVANTE" : "VOIR LE RÉSULTAT"}
          </Button>
        </div>
      )}
    </Card>
  );
}
