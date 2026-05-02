
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Settings, Globe, BookOpen, Zap, 
  Trophy, Loader2, ChevronRight, ChevronLeft,
  RotateCcw, CheckCircle2, XCircle, Info, History, TrendingUp
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where } from 'firebase/firestore';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
      }
    }
    load();
  }, [db, activeDomain, user]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'quickQuizAttempts'), 
      where('userId', '==', user.uid),
      where('axisId', '==', activeDomain),
      where('category', '==', 'domain')
    );
  }, [db, user?.uid, activeDomain]);

  const { data: attempts } = useCollection(attemptsQuery);

  const historyData = useMemo(() => {
    if (!attempts) return [];
    return [...attempts]
      .sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0))
      .map((a, i) => {
        const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
        return {
          id: a.id,
          name: `T${i + 1}`,
          date: date.toLocaleDateString('fr-FR'),
          score: a.score,
          responses: `${a.correctCount || 0} / ${a.totalQuestions || 5}`
        };
      });
  }, [attempts]);

  if (isDataLoading) return <div className="min-h-[70vh] w-full flex items-center justify-center bg-white"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  const currentData = domainData || DEFAULT_DOMAIN_DATA[activeDomain];

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-y-auto animate-fade-in p-6 gap-8 bg-background custom-scrollbar">
      <header className="flex-none flex justify-between items-end px-2">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Domaines</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic leading-none mt-2">Les 3 piliers du PMP® en un coup d'œil.</p>
        </div>
      </header>

      <nav className="flex-none grid grid-cols-3 gap-4">
        {(['people', 'process', 'business'] as const).map((id) => {
          const isActive = activeDomain === id;
          const Ico = id === 'people' ? Users : id === 'process' ? Settings : Globe;
          return (
            <button 
              key={id} 
              onClick={() => { setActiveDomain(id); setActiveTab('jargon'); }} 
              className={cn(
                "flex flex-col items-center justify-center p-8 rounded-[32px] border-4 transition-all duration-300 gap-2 bg-white shadow-sm", 
                isActive ? "border-primary bg-primary/5 scale-[1.02] z-10 shadow-xl" : "border-slate-100 hover:border-slate-200"
              )}
            >
              <Ico className={cn("h-8 w-8", isActive ? "text-primary" : "text-slate-300")} />
              <span className={cn("font-black uppercase italic tracking-widest text-sm", isActive ? "text-primary" : "text-slate-400")}>{id.toUpperCase()}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-none flex items-center justify-between bg-white px-6 py-4 rounded-[24px] border border-slate-100 shadow-xl">
        <div className="flex bg-slate-100 p-1 rounded-xl border">
          <Button 
            size="sm"
            onClick={() => setActiveTab('jargon')} 
            className={cn("h-11 px-8 rounded-lg font-black uppercase italic text-xs gap-2 transition-all", activeTab === 'jargon' ? "bg-slate-900 text-white shadow-lg" : "bg-transparent text-slate-500 hover:bg-slate-200")}
          >
            <BookOpen className="h-4 w-4" /> Jargon
          </Button>
          <Button 
            size="sm"
            onClick={() => setActiveTab('quiz')} 
            className={cn("h-11 px-8 rounded-lg font-black uppercase italic text-xs gap-2 transition-all", activeTab === 'quiz' ? "bg-slate-900 text-white shadow-lg" : "bg-transparent text-slate-500 hover:bg-slate-200")}
          >
            <Zap className="h-4 w-4" /> Quiz
          </Button>
        </div>
        <h2 className="text-xl font-black italic uppercase tracking-tight text-slate-400 truncate hidden lg:block">{currentData.title}</h2>
      </div>

      <main className="flex-1 space-y-12">
        {activeTab === 'jargon' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {(currentData.jargon || []).map((item: any, idx: number) => (
              <JargonCard key={idx} term={item.term} def={item.def} />
            ))}
          </div>
        ) : (
          <div className="space-y-12 animate-slide-up">
            <QuickQuiz questions={currentData.quiz || []} axisId={activeDomain} userId={user?.uid || ''} db={db} />
            
            {historyData.length > 0 && (
              <div className="space-y-8 pt-6 border-t-2 border-dashed border-slate-100">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900">Progression individuelle</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="h-14 border-b-2">
                          <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest">Tentative</TableHead>
                          <TableHead className="font-black uppercase text-[10px] tracking-widest text-center">Date</TableHead>
                          <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.slice().reverse().slice(0, 5).map((a) => (
                          <TableRow key={a.id} className="h-16 border-b last:border-0 hover:bg-slate-50 transition-colors group">
                            <TableCell className="px-6">
                              <span className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center font-black text-xs text-primary group-hover:bg-primary group-hover:text-white transition-all">{a.name}</span>
                            </TableCell>
                            <TableCell className="text-center font-bold italic text-sm text-slate-400">{a.date}</TableCell>
                            <TableCell className="px-6 text-right font-black italic text-primary text-lg">{a.score}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>

                  <Card className="rounded-[32px] border-none shadow-xl bg-white p-8 flex flex-col justify-center">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                          <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={35}>
                            {historyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'} />
                            ))}
                          </Bar>
                          <Line type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={4} dot={{ r: 6, fill: '#1d4ed8', strokeWidth: 2, stroke: '#fff' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`.perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
}

function JargonCard({ term, def }: { term: string, def: string }) {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div className="perspective-1000 h-48 w-full cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-all duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        <div className="absolute inset-0 backface-hidden bg-[#f0fdf4] text-[#1e293b] rounded-[24px] flex flex-col items-center justify-center p-6 shadow-md border-2 border-emerald-100 group">
          <h3 className="text-2xl font-black italic uppercase tracking-tight text-center leading-tight break-words px-4 w-full">
            {term}
          </h3>
          <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity"><RotateCcw className="h-4 w-4 text-emerald-300" /></div>
        </div>
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl border-2 border-slate-700">
          <p className="text-center font-bold italic text-sm leading-relaxed">
            {def}
          </p>
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
    <Card className="rounded-[40px] bg-white p-12 text-center space-y-8 shadow-2xl animate-fade-in border-none w-full max-w-xl mx-auto border-4 border-slate-50">
      <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Série terminée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-16 w-full rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-white text-lg italic">REFAIRE LE QUIZ</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const correctIdx = q.c !== undefined ? Number(q.c) : 0;

  return (
    <Card className="rounded-[40px] bg-white p-10 space-y-8 w-full max-w-3xl shadow-2xl animate-slide-up border-none overflow-hidden mx-auto border-4 border-slate-50">
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="font-black italic px-4 py-1.5 rounded-xl border-2 text-slate-400 text-xs">
          QUESTION {currentIdx + 1} / {activeQuestions.length}
        </Badge>
      </div>
      <h3 className="text-2xl font-black italic text-slate-900 leading-tight">
        {q.q}
      </h3>
      <div className="grid gap-4">
        {q.a.map((opt: any, idx: number) => (
          <button 
            key={idx} 
            disabled={isAnswered}
            onClick={() => handleAnswer(idx)} 
            className={cn(
              "p-6 rounded-2xl border-2 transition-all text-left flex items-center gap-4 shadow-sm",
              !isAnswered ? "border-slate-100 bg-white hover:border-primary hover:bg-slate-50" : 
              idx === correctIdx ? "border-emerald-500 bg-emerald-50 text-emerald-900" : 
              idx === selectedIdx ? "border-red-500 bg-red-50 text-red-900" : "opacity-50 border-slate-50"
            )}
          >
            <div className={cn(
              "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2 rounded-full",
              !isAnswered ? "bg-white text-slate-400" : 
              idx === correctIdx ? "bg-emerald-500 text-white" : 
              idx === selectedIdx ? "bg-red-500 text-white" : "bg-white text-slate-200"
            )}>
              {String.fromCharCode(65 + idx)}
            </div>
            <span className="flex-1 text-lg font-black italic">{opt}</span>
          </button>
        ))}
      </div>
      {isAnswered && (
        <div className="bg-slate-50 p-8 rounded-3xl border-l-8 border-l-primary animate-slide-up space-y-6 shadow-inner">
          <div className="flex items-center gap-2"><Info className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase italic text-primary">Le saviez-vous ?</span></div>
          <p className="text-slate-700 font-bold italic text-base leading-relaxed">{q.exp}</p>
          <Button onClick={next} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase italic tracking-widest text-xs shadow-lg">
            {currentIdx < activeQuestions.length - 1 ? "SUIVANTE" : "VOIR LE RÉSULTAT"}
          </Button>
        </div>
      )}
    </Card>
  );
}
