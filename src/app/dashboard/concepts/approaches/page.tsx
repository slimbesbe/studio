
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, RotateCcw, Layers, BookOpen, Zap, 
  CheckCircle2, Info, Trophy, Loader2, ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DEFAULT_APPROACH_DATA: Record<string, any> = {
  predictive: {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: ArrowDown,
    description: "L'approche prédictive repose sur une planification détaillée en amont.",
    jargon: [
      { term: 'Chemin Critique', def: 'Séquence de tâches minimale pour livrer le projet.' }
    ],
    quiz: [
      { q: "Quand utiliser le prédictif ?", a: ["Besoins stables", "Projet inconnu"], c: 0, exp: "Le prédictif excelle quand les besoins sont clairs." },
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

  useEffect(() => {
    async function load() {
      if (!user) return;
      setIsDataLoading(true);
      try {
        const snap = await getDoc(doc(db, 'concepts_approaches', activeApproach));
        if (snap.exists()) {
          setApproachData(snap.data());
        } else {
          setApproachData(null);
        }
      } catch (e) {
        setApproachData(null);
      } finally {
        setIsDataLoading(false);
      }
    }
    load();
  }, [db, activeApproach, user]);

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
    return [...attempts].sort((a, b) => (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0)).map((a, i) => {
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

  if (isDataLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  // Utilisation des données DB ou Mock si vide
  const currentData = approachData || DEFAULT_APPROACH_DATA[activeApproach] || { 
    title: activeApproach.toUpperCase(), 
    description: "Contenu en cours de rédaction.", 
    jargon: [], 
    quiz: [] 
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Approches</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Maîtrisez le cycle de vie de vos projets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['predictive', 'agile', 'hybrid'] as const).map((id) => {
          const isActive = activeApproach === id;
          const Ico = id === 'predictive' ? ArrowDown : id === 'agile' ? RotateCcw : Layers;
          const label = id === 'predictive' ? 'Waterfall' : id === 'agile' ? 'Agile' : 'Hybride';
          return (
            <button key={id} onClick={() => { setActiveApproach(id); setActiveTab('jargon'); }} className={cn("flex flex-col items-center justify-center p-10 rounded-[32px] border-4 transition-all duration-300 gap-4 bg-white", isActive ? "border-primary shadow-xl scale-[1.02]" : "border-slate-100 hover:border-slate-200")}>
              <div className={cn("p-4 rounded-2xl", isActive ? "text-primary" : "text-slate-300")}><Ico className="h-10 w-10" /></div>
              <span className={cn("font-black uppercase italic tracking-widest text-sm", isActive ? "text-primary" : "text-slate-400")}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Focus : {currentData.title}</h2>
          <p className="text-lg font-bold text-slate-500 italic leading-relaxed">{currentData.description}</p>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => setActiveTab('jargon')} className={cn("h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg", activeTab === 'jargon' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500")}><BookOpen className="h-4 w-4" /> Jargon Clé</Button>
          <Button onClick={() => setActiveTab('quiz')} className={cn("h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg", activeTab === 'quiz' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500")}><Zap className="h-4 w-4" /> Quiz Rapide</Button>
        </div>

        <div className="pt-6">
          {activeTab === 'jargon' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {(currentData.jargon || []).map((item:any, idx:number) => (
                <JargonCard key={idx} term={item.term} def={item.def} />
              ))}
            </div>
          ) : (
            <QuickQuiz questions={currentData.quiz || []} axisId={activeApproach} userId={user?.uid || ''} db={db} />
          )}
        </div>
      </div>

      {historyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-12 border-t border-dashed">
          <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
            <Table><TableHeader className="bg-slate-50"><TableRow className="h-14 border-b-2"><TableHead className="px-6 font-black uppercase text-[10px]">Date</TableHead><TableHead className="font-black uppercase text-[10px] text-center">Ratio</TableHead><TableHead className="px-6 font-black uppercase text-[10px] text-right">Score</TableHead></TableRow></TableHeader>
              <TableBody>{historyData.slice().reverse().slice(0, 5).map((a) => (
                <TableRow key={a.id} className="h-16 border-b last:border-0"><TableCell className="px-6 font-bold italic text-sm">{a.date}</TableCell><TableCell className="text-center font-black italic text-slate-400">{a.responses}</TableCell><TableCell className="px-6 text-right font-black italic text-primary">{a.score}%</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </Card>
          <Card className="rounded-[32px] border-none shadow-xl bg-white p-8">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                    {historyData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
      <style jsx global>{`.perspective-1000 { perspective: 1000px; } .preserve-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
}

function JargonCard({ term, def }: { term: string, def: string }) {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div className="perspective-1000 h-48 w-full cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={cn("relative w-full h-full transition-transform duration-500 preserve-3d", isFlipped ? "rotate-y-180" : "")}>
        <div className="absolute inset-0 backface-hidden bg-[#1E293B] text-white rounded-[24px] flex flex-col items-center justify-center p-6 shadow-xl"><h3 className="text-xl font-black italic uppercase tracking-tight text-center">{term}</h3></div>
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary text-white rounded-[24px] flex items-center justify-center p-8 shadow-2xl"><p className="text-center font-bold italic text-sm">{def}</p></div>
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
      } catch (e) {
        console.error("Score saving error", e);
      }
      setShowResult(true); 
    }
  };

  if (showResult) return (
    <Card className="rounded-[40px] bg-white p-16 text-center space-y-8 shadow-2xl animate-fade-in border-none">
      <div className="bg-primary/5 w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Score : {score} / {activeQuestions.length}</h3>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Session validée</p>
      </div>
      <Button onClick={() => window.location.reload()} className="h-16 px-12 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl scale-105 transition-transform text-white">REFAIRE</Button>
    </Card>
  );
  
  const q = activeQuestions[currentIdx];
  if (!q) return null;

  const choices = Array.isArray(q.a) ? q.a : (q.choices || []);
  const correctIdx = q.c !== undefined ? Number(q.c) : 0;
  const explanation = q.exp || q.explanation || "Analysez cette situation selon le mindset PMI.";

  return (
    <Card className="rounded-[40px] bg-white p-12 space-y-10 max-w-3xl mx-auto shadow-2xl animate-slide-up border-none overflow-hidden relative">
      <div className="flex justify-between items-center relative z-10">
        <Badge variant="outline" className="font-black italic px-6 py-2 rounded-xl border-2 text-slate-400">
          Question {currentIdx + 1} / {activeQuestions.length}
        </Badge>
      </div>
      
      <h3 className="text-3xl font-black italic text-slate-900 leading-tight relative z-10">
        {q.q || q.text || "Question sans énoncé"}
      </h3>

      <div className="grid gap-4 relative z-10">
        {choices.map((opt: any, idx: number) => {
          const isCorrect = idx === correctIdx;
          const isSelected = idx === selectedIdx;
          const text = String(opt);
          
          return (
            <button 
              key={idx} 
              disabled={isAnswered}
              onClick={() => handleAnswer(idx)} 
              className={cn(
                "p-6 rounded-2xl border-4 transition-all text-left flex items-start gap-5 group relative",
                !isAnswered 
                  ? "border-slate-50 bg-slate-50 hover:border-primary/20 hover:bg-white" 
                  : isCorrect 
                    ? "border-emerald-500 bg-emerald-50" 
                    : isSelected 
                      ? "border-red-500 bg-red-50" 
                      : "border-slate-50 opacity-40 bg-slate-50"
              )}
            >
              <div className={cn(
                "h-10 w-10 flex items-center justify-center font-black text-sm shrink-0 border-2 rounded-full",
                !isAnswered 
                  ? "bg-white text-slate-300 border-slate-100 group-hover:border-primary group-hover:text-primary" 
                  : isCorrect 
                    ? "bg-emerald-500 text-white border-emerald-500" 
                    : isSelected 
                      ? "bg-red-500 text-white border-red-500" 
                      : "bg-white text-slate-200 border-slate-50"
              )}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className={cn(
                "flex-1 text-lg font-bold italic pt-1 text-slate-900",
                isAnswered && (isCorrect ? "text-emerald-900" : isSelected ? "text-red-900" : "text-slate-400")
              )}>
                {text}
              </span>
              {isAnswered && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-500 absolute right-6 top-8" />}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="bg-[#F8FAFC] p-8 rounded-[32px] border-l-8 border-l-primary animate-slide-up shadow-inner space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase italic text-[10px] tracking-widest">
            <Info className="h-4 w-4" /> Justification Mindset
          </div>
          <p className="text-slate-900 font-bold italic text-lg leading-relaxed whitespace-pre-wrap">
            {explanation}
          </p>
          <Button onClick={next} className="mt-6 w-full h-14 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-black uppercase italic tracking-widest">
            {currentIdx < activeQuestions.length - 1 ? "SUIVANT" : "VOIR LE RÉSULTAT"} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
