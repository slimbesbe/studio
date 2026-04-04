"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Settings, 
  Globe, 
  BookOpen, 
  Zap, 
  Trophy,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const DEFAULT_DOMAIN_DATA: Record<string, any> = {
  people: {
    id: 'people',
    title: 'People',
    icon: Users,
    description: "Le domaine People concerne tout ce qui touche à l'humain.",
    jargon: [{ term: 'Servant Leadership', def: 'Style de leadership qui privilégie le soutien.' }],
    quiz: [{ q: "Rôle du Leader Serviteur ?", a: ["Éliminer les obstacles", "Contrôler"], c: 0, exp: "Il facilite le travail." }]
  },
  process: {
    id: 'process',
    title: 'Process',
    icon: Settings,
    description: "Le domaine Processus couvre les méthodes de gestion technique.",
    jargon: [{ term: 'Critical Path', def: 'Le chemin le plus long d\'un projet.' }],
    quiz: [{ q: "Qu'est-ce que le chemin critique ?", a: ["Le plus court", "Le plus long"], c: 1, exp: "Il détermine la durée totale." }]
  },
  business: {
    id: 'business',
    title: 'Business',
    icon: Globe,
    description: "Le domaine Business Environment lie le projet à la stratégie.",
    jargon: [{ term: 'Compliance', def: 'Conformité aux règles et lois.' }],
    quiz: [{ q: "Qui gère la conformité ?", a: ["L'équipe", "Le chef de projet"], c: 1, exp: "Le CP assure le respect des normes." }]
  }
};

export default function VisionDomainesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [activeDomain, setActiveDomain] = useState<'people' | 'process' | 'business'>('people');
  const [activeTab, setActiveTab] = useState<'jargon' | 'quiz'>('jargon');
  const [domainData, setDomainData] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 6;

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsDataLoading(true);
      try {
        const snap = await getDoc(doc(db, 'concepts_domains', activeDomain));
        if (snap.exists()) {
          setDomainData(snap.data());
        } else {
          setDomainData(DEFAULT_DOMAIN_DATA[activeDomain]);
        }
      } catch (e) {
        setDomainData(DEFAULT_DOMAIN_DATA[activeDomain]);
      } finally {
        setIsDataLoading(false);
        setCurrentPage(0);
      }
    }
    load();
  }, [db, activeDomain, user]);

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const currentData = domainData || DEFAULT_DOMAIN_DATA[activeDomain];
  const jargonList = currentData.jargon || [];
  const paginatedJargon = jargonList.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const totalPages = Math.ceil(jargonList.length / pageSize);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-100px)] overflow-hidden animate-fade-in space-y-3 p-2 md:p-4 box-border">
      {/* HEADER ULTRA COMPACT */}
      <div className="shrink-0 flex justify-between items-end px-1">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Domaines</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] md:text-[9px] italic">Les 3 piliers du PMP® en un coup d'œil.</p>
        </div>
      </div>

      {/* SELECTEUR DE DOMAINE COMPACT */}
      <div className="shrink-0 grid grid-cols-3 gap-2 md:gap-3 h-14 md:h-16">
        {(['people', 'process', 'business'] as const).map((id) => {
          const isActive = activeDomain === id;
          const Ico = id === 'people' ? Users : id === 'process' ? Settings : Globe;
          return (
            <button 
              key={id} 
              onClick={() => { setActiveDomain(id); setActiveTab('jargon'); }} 
              className={cn(
                "flex flex-col items-center justify-center rounded-xl md:rounded-2xl border-2 transition-all duration-300 gap-0.5 md:gap-1 bg-white shadow-sm", 
                isActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <Ico className={cn("h-4 w-4 md:h-5 md:w-5", isActive ? "text-primary" : "text-slate-300")} />
              <span className={cn("font-black uppercase italic tracking-widest text-[7px] md:text-[9px]", isActive ? "text-primary" : "text-slate-400")}>{id.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* CONTROLES ET TABS - UNE SEULE LIGNE */}
      <div className="shrink-0 flex items-center justify-between bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm h-12 md:h-14">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <h2 className="text-[10px] md:text-xs font-black italic uppercase tracking-tight text-slate-900 ml-1 md:ml-2 truncate hidden sm:block">{currentData.title}</h2>
          <div className="flex bg-slate-100 p-0.5 md:p-1 rounded-lg border">
            <Button 
              size="sm"
              onClick={() => setActiveTab('jargon')} 
              className={cn("h-7 md:h-8 px-2 md:px-4 rounded-md font-black uppercase italic text-[8px] md:text-[9px] gap-1 md:gap-2", activeTab === 'jargon' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <BookOpen className="h-3 w-3" /> Jargon
            </Button>
            <Button 
              size="sm"
              onClick={() => setActiveTab('quiz')} 
              className={cn("h-7 md:h-8 px-2 md:px-4 rounded-md font-black uppercase italic text-[8px] md:text-[9px] gap-1 md:gap-2", activeTab === 'quiz' ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-500 hover:bg-slate-200")}
            >
              <Zap className="h-3 w-3" /> Quiz
            </Button>
          </div>
        </div>

        {activeTab === 'jargon' && totalPages > 1 && (
          <div className="flex items-center gap-2 md:gap-3 mr-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 md:h-8 md:w-8 rounded-full border shadow-sm bg-white hover:bg-slate-50"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
            <span className="text-[8px] md:text-[10px] font-black italic text-slate-400 uppercase tracking-widest">{currentPage + 1}/{totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 md:h-8 md:w-8 rounded-full border shadow-sm bg-white hover:bg-slate-50"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* GRILLE DYNAMIQUE 3X2 (Desktop) ou 1x6 (Mobile) - OCCUPE TOUT LE RESTE DE L'ECRAN */}
      <div className="flex-1 min-h-0">
        {activeTab === 'jargon' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-6 md:grid-rows-2 gap-2 md:gap-3 h-full animate-slide-up box-border">
            {paginatedJargon.map((item: any, idx: number) => (
              <JargonCard key={idx} term={item.term} def={item.def} />
            ))}
            {paginatedJargon.length < 6 && Array.from({ length: 6 - paginatedJargon.length }).map((_, i) => (
              <div key={`filler-${i}`} className="bg-slate-50/20 border-2 border-dashed border-slate-100 rounded-xl md:rounded-[24px] h-full" />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center py-2 md:py-4 min-h-0">
            <QuickQuiz questions={currentData.quiz || []} axisId={activeDomain} userId={user?.uid || ''} db={db} />
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
    <div className="perspective-1000 h-full w-full cursor-pointer group box-border min-h-0" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-transform duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        {/* RECTO : Vert très clair et doux */}
        <div className="absolute inset-0 backface-hidden bg-[#f0fdf4] text-[#1e293b] rounded-xl md:rounded-[24px] flex flex-col items-center justify-center p-3 md:p-4 shadow-md border-2 border-emerald-100 overflow-hidden">
          <h3 className="text-xs md:text-lg font-black italic uppercase tracking-tight text-center leading-tight">{term}</h3>
        </div>
        {/* VERSO : Gris Anthracite profond */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] text-white rounded-xl md:rounded-[24px] flex items-center justify-center p-3 md:p-4 shadow-xl border-2 border-slate-700 overflow-y-auto custom-scrollbar">
          <p className="text-center font-bold italic text-[8px] md:text-xs leading-relaxed">{def}</p>
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
          category: 'domain', 
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
    <Card className="rounded-[32px] md:rounded-[40px] bg-white p-6 md:p-10 text-center space-y-4 md:space-y-6 shadow-2xl animate-fade-in border-none w-full max-w-xs md:max-w-sm">
      <div className="bg-primary/5 w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-6 w-6 md:h-8 md:w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px] italic">Session validée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-12 md:h-14 px-8 md:px-10 rounded-xl md:rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-white text-[10px] md:text-xs">REFAIRE LE QUIZ</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const rawChoices = Array.isArray(q.a) ? q.a : (Array.isArray(q.choices) ? q.choices : []);
  const correctIdx = q.c !== undefined ? Number(q.c) : 0;

  return (
    <Card className="rounded-[32px] md:rounded-[40px] bg-white p-4 md:p-6 space-y-3 md:space-y-4 w-full max-w-2xl shadow-2xl animate-slide-up border-none overflow-y-auto max-h-full custom-scrollbar box-border">
      <Badge variant="outline" className="font-black italic px-3 md:px-4 py-0.5 md:py-1 rounded-lg md:rounded-xl border-2 text-slate-400 text-[8px] md:text-[10px]">
        QUESTION {currentIdx + 1} / {activeQuestions.length}
      </Badge>
      <h3 className="text-sm md:text-xl font-black italic text-slate-900 leading-tight">
        {q.q || q.text}
      </h3>
      <div className="grid gap-1.5 md:gap-2 p-0.5">
        {rawChoices.map((opt: any, idx: number) => (
          <button 
            key={idx} 
            disabled={isAnswered}
            onClick={() => handleAnswer(idx)} 
            className={cn(
              "p-2.5 md:p-4 rounded-lg md:rounded-xl border-2 transition-all text-left flex items-start gap-3 md:gap-4 shadow-sm min-h-0",
              !isAnswered ? "border-slate-100 bg-white hover:border-primary" : 
              idx === correctIdx ? "border-emerald-500 bg-emerald-50" : 
              idx === selectedIdx ? "border-red-500 bg-red-50" : "border-slate-50 opacity-40"
            )}
          >
            <div className={cn(
              "h-5 w-5 md:h-8 md:w-8 flex items-center justify-center font-black text-[8px] md:text-[10px] shrink-0 border-2 rounded-full",
              !isAnswered ? "bg-white text-slate-400" : 
              idx === correctIdx ? "bg-emerald-500 text-white" : 
              idx === selectedIdx ? "bg-red-500 text-white" : "bg-white text-slate-200"
            )}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="flex-1 text-[10px] md:text-sm font-black italic pt-0.5">{opt}</span>
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border-l-4 md:border-l-8 border-l-primary animate-slide-up space-y-2 md:space-y-3">
          <p className="text-black font-bold italic text-[9px] md:text-xs leading-relaxed">{q.exp || q.explanation}</p>
          <Button onClick={next} className="w-full h-8 md:h-10 rounded-lg md:rounded-xl bg-slate-900 text-white font-black uppercase italic tracking-widest text-[8px] md:text-[9px]">
            {currentIdx < activeQuestions.length - 1 ? "PASSER À LA SUIVANTE" : "VOIR MON RÉSULTAT"}
          </Button>
        </div>
      )}
    </Card>
  );
}
