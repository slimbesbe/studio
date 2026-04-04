
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
      setIsLoading(true);
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
        setIsLoading(false);
        setCurrentPage(0);
      }
    }
    load();
  }, [db, activeApproach, user]);

  if (isDataLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  const data = approachData || DEFAULT_APPROACH_DATA[activeApproach];
  const jargonList = data.jargon || [];
  const paginatedJargon = jargonList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(jargonList.length / pageSize);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full overflow-hidden animate-fade-in p-[1vh] gap-[1vh]">
      {/* HEADER COMPACT (VH BASED) */}
      <header className="flex-none flex justify-between items-end px-2 h-[4vh]">
        <div className="flex flex-col">
          <h1 className="text-[clamp(1.2rem,2.5vh,2rem)] font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Approches</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[clamp(0.5rem,1vh,0.8rem)] italic leading-none mt-1">Le cycle de vie projet en un clin d'œil.</p>
        </div>
      </header>

      {/* SELECTOR (VH BASED) */}
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
                "flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300 gap-1 bg-white shadow-sm flex-shrink", 
                isActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <Ico className={cn("h-[2.5vh] w-[2.5vh]", isActive ? "text-primary" : "text-slate-300")} />
              <span className={cn("font-black uppercase italic tracking-widest text-[clamp(0.6rem,1.2vh,0.9rem)]", isActive ? "text-primary" : "text-slate-400")}>{item.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* TABS & NAVIGATION (VH BASED) */}
      <div className="flex-none flex items-center justify-between bg-white px-2 rounded-xl border border-slate-100 shadow-sm h-[6vh]">
        <div className="flex items-center gap-[2vw] flex-1 min-w-0">
          <h2 className="text-[clamp(0.7rem,1.5vh,1rem)] font-black italic uppercase tracking-tight text-slate-900 truncate hidden sm:block">{data.title}</h2>
          <div className="flex bg-slate-100 p-1 rounded-lg border h-[4.5vh]">
            <Button 
              size="sm"
              onClick={() => setActiveTab('jargon')} 
              className={cn("h-full px-3 md:px-6 rounded-md font-black uppercase italic text-[clamp(0.6rem,1.2vh,0.8rem)] gap-2", activeTab === 'jargon' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <BookOpen className="h-3 w-3" /> Jargon
            </Button>
            <Button 
              size="sm"
              onClick={() => setActiveTab('quiz')} 
              className={cn("h-full px-3 md:px-6 rounded-md font-black uppercase italic text-[clamp(0.6rem,1.2vh,0.8rem)] gap-2", activeTab === 'quiz' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <Zap className="h-3 w-3" /> Quiz
            </Button>
          </div>
        </div>

        {activeTab === 'jargon' && totalPages > 1 && (
          <div className="flex items-center gap-[1vw]">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-[4vh] w-[4vh] rounded-full border shadow-sm bg-white"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[1.2vh] font-black italic text-slate-400 uppercase">{currentPage + 1}/{totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-[4vh] w-[4vh] rounded-full border shadow-sm bg-white"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* CONTENT AREA (STRICT FLEX-1) */}
      <main className="flex-1 min-h-0 relative">
        {activeTab === 'jargon' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-6 md:grid-rows-2 gap-[1vh] h-full animate-slide-up">
            {paginatedJargon.map((item: any, idx: number) => (
              <JargonCard key={idx} term={item.term} def={item.def} />
            ))}
            {paginatedJargon.length < 6 && Array.from({ length: 6 - paginatedJargon.length }).map((_, i) => (
              <div key={`filler-${i}`} className="bg-slate-50/20 border-2 border-dashed border-slate-100 rounded-xl h-full flex-shrink" />
            ))}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center min-h-0">
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
    <div className="perspective-1000 h-full w-full cursor-pointer flex-shrink min-h-0" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-transform duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        {/* RECTO : Vert très clair */}
        <div className="absolute inset-0 backface-hidden bg-[#f0fdf4] text-[#1e293b] rounded-xl flex flex-col items-center justify-center p-[2vh] shadow-md border-2 border-emerald-100 overflow-hidden">
          <h3 className="text-[clamp(1.2rem,5vh,4rem)] font-black italic uppercase tracking-tight text-center leading-tight">{term}</h3>
        </div>
        {/* VERSO : Gris Anthracite */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] text-white rounded-xl flex items-center justify-center p-[2vh] shadow-xl border-2 border-slate-700 overflow-y-auto custom-scrollbar">
          <p className="text-center font-bold italic text-[clamp(1rem,2.8vh,2.2rem)] leading-relaxed">{def}</p>
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
    <Card className="rounded-3xl bg-white p-[4vh] text-center space-y-[2vh] shadow-2xl animate-fade-in border-none w-full max-w-[35vh]">
      <div className="bg-primary/5 w-[8vh] h-[8vh] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-[4vh] w-[4vh] text-primary" />
      </div>
      <div className="space-y-[0.5vh]">
        <h3 className="text-[3vh] font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[1.2vh] italic">Session validée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-[6vh] w-full rounded-xl bg-primary font-black uppercase tracking-widest shadow-xl text-white text-[1.5vh]">REFAIRE LE QUIZ</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const rawChoices = Array.isArray(q.a) ? q.a : (Array.isArray(q.choices) ? q.choices : []);
  const correctIdx = q.c !== undefined ? Number(q.c) : 0;

  return (
    <Card className="rounded-3xl bg-white p-[2vh] space-y-[1.5vh] w-full max-w-[80vh] shadow-2xl animate-slide-up border-none overflow-y-auto max-h-full custom-scrollbar flex flex-col">
      <Badge variant="outline" className="self-start font-black italic px-3 py-1 rounded-lg border-2 text-slate-400 text-[1.2vh]">
        QUESTION {currentIdx + 1} / {activeQuestions.length}
      </Badge>
      <h3 className="text-[clamp(0.9rem,2.2vh,1.5rem)] font-black italic text-slate-900 leading-tight">
        {q.q || q.text}
      </h3>
      <div className="grid gap-[1vh] flex-1 min-h-0">
        {rawChoices.map((opt: any, idx: number) => (
          <button 
            key={idx} 
            disabled={isAnswered}
            onClick={() => handleAnswer(idx)} 
            className={cn(
              "p-[1.5vh] rounded-xl border-2 transition-all text-left flex items-start gap-[1.5vh] shadow-sm flex-shrink min-h-0",
              !isAnswered ? "border-slate-100 bg-white hover:border-primary" : 
              idx === correctIdx ? "border-emerald-500 bg-emerald-50" : 
              idx === selectedIdx ? "border-red-500 bg-red-50" : "border-slate-50 opacity-40"
            )}
          >
            <div className={cn(
              "h-[3vh] w-[3vh] flex items-center justify-center font-black text-[1.5vh] shrink-0 border-2 rounded-full",
              !isAnswered ? "bg-white text-slate-400" : 
              idx === correctIdx ? "bg-emerald-500 text-white" : 
              idx === selectedIdx ? "bg-red-500 text-white" : "bg-white text-slate-200"
            )}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="flex-1 text-[clamp(0.7rem,1.6vh,1.1rem)] font-black italic pt-0.5">{opt}</span>
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="flex-none bg-slate-50 p-[1.5vh] rounded-xl border-l-4 border-l-primary animate-slide-up space-y-[1vh]">
          <p className="text-black font-bold italic text-[1.4vh] leading-relaxed line-clamp-3">{q.exp || q.explanation}</p>
          <Button onClick={next} className="w-full h-[5vh] rounded-xl bg-slate-900 text-white font-black uppercase italic tracking-widest text-[1.5vh]">
            {currentIdx < activeQuestions.length - 1 ? "SUIVANTE" : "RÉSULTAT"}
          </Button>
        </div>
      )}
    </Card>
  );
}
