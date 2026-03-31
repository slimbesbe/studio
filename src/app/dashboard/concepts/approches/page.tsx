
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, RotateCcw, Layers, BookOpen, Zap, 
  CheckCircle2, Info, XCircle, Trophy, History, 
  TrendingUp, Clock, Calendar, Loader2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- STRUCTURE DE DONNÉES À REMPLIR ---
const APPROACH_DATA = {
  predictive: {
    id: 'predictive',
    title: 'Prédictif (Waterfall)',
    icon: ArrowDown,
    description: "Insérez ici votre texte de focus pour l'approche prédictive.",
    jargon: [
      { term: 'Terme 1', def: 'Définition du terme 1.' },
      { term: 'Terme 2', def: 'Définition du terme 2.' },
    ],
    quiz: [
      { q: "Question de test ?", a: ["Option A", "Option B", "Option C"], c: 1, exp: "Explication du mindset." },
    ]
  },
  agile: {
    id: 'agile',
    title: 'Agile',
    icon: RotateCcw,
    description: "Insérez ici votre texte de focus pour l'approche agile.",
    jargon: [
      { term: 'Terme Agile 1', def: 'Définition.' },
    ],
    quiz: [
      { q: "Question Agile ?", a: ["A", "B", "C"], c: 0, exp: "Explication." },
    ]
  },
  hybrid: {
    id: 'hybrid',
    title: 'Hybride',
    icon: Layers,
    description: "Insérez ici votre texte de focus pour l'approche hybride.",
    jargon: [
      { term: 'Terme Hybride 1', def: 'Définition.' },
    ],
    quiz: [
      { q: "Question Hybride ?", a: ["A", "B", "C"], c: 2, exp: "Explication." },
    ]
  }
};

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

  return (
    <div className="space-y-10 animate-fade-in pb-20 max-w-6xl mx-auto px-4">
      <div className="space-y-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Vision Approches</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Maîtrisez le cycle de vie de vos projets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['predictive', 'agile', 'hybrid'] as const).map((id) => {
          const item = APPROACH_DATA[id];
          const Icon = item.icon;
          const isActive = activeApproach === id;
          return (
            <button key={id} onClick={() => { setActiveApproach(id); setActiveTab('jargon'); }} className={cn("flex flex-col items-center justify-center p-10 rounded-[32px] border-4 transition-all duration-300 gap-4 bg-white", isActive ? "border-primary shadow-xl scale-[1.02]" : "border-slate-100 hover:border-slate-200")}>
              <div className={cn("p-4 rounded-2xl", isActive ? "text-primary" : "text-slate-300")}><Icon className="h-10 w-10" /></div>
              <span className={cn("font-black uppercase italic tracking-widest text-sm", isActive ? "text-primary" : "text-slate-400")}>{item.title}</span>
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
          <Button onClick={() => setActiveTab('jargon')} className={cn("h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg", activeTab === 'jargon' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500")}><BookOpen className="h-4 w-4" /> Jargon Clé</Button>
          <Button onClick={() => setActiveTab('quiz')} className={cn("h-14 px-8 rounded-2xl font-black uppercase italic text-xs gap-3 shadow-lg", activeTab === 'quiz' ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-500")}><Zap className="h-4 w-4" /> Quiz Rapide</Button>
        </div>

        <div className="pt-6">
          {activeTab === 'jargon' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
              {data.jargon.map((item, idx) => (
                <JargonCard key={idx} term={item.term} def={item.def} />
              ))}
            </div>
          ) : (
            <QuickQuiz questions={data.quiz} axisId={activeApproach} userId={user?.uid || ''} db={db} />
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
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const handleAnswer = (idx: number) => { if (isAnswered) return; setSelectedIdx(idx); setIsAnswered(true); if (idx === questions[currentIdx].c) setScore(score + 1); };
  const next = async () => { if (currentIdx < questions.length - 1) { setCurrentIdx(currentIdx + 1); setSelectedIdx(null); setIsAnswered(false); } else { 
    const percent = Math.round((score / questions.length) * 100);
    await addDoc(collection(db, 'quickQuizAttempts'), { userId, axisId, category: 'approach', score: percent, correctCount: score, totalQuestions: questions.length, submittedAt: serverTimestamp() });
    setShowResult(true); 
  }};
  if (showResult) return <Card className="rounded-[40px] bg-white p-12 text-center space-y-8"><Trophy className="h-12 w-12 text-primary mx-auto" /><h3 className="text-3xl font-black italic uppercase">Score : {score} / {questions.length}</h3><Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl bg-primary font-black uppercase">Terminer</Button></Card>;
  const q = questions[currentIdx];
  return (
    <Card className="rounded-[40px] bg-white p-10 space-y-8 max-w-3xl mx-auto shadow-2xl">
      <Badge variant="outline" className="font-black italic px-4 py-1">Question {currentIdx + 1} / {questions.length}</Badge>
      <h3 className="text-2xl font-black italic text-slate-800">{q.q}</h3>
      <div className="grid gap-4">{q.a.map((opt: any, idx: number) => (
        <button key={idx} onClick={() => handleAnswer(idx)} className={cn("p-6 rounded-2xl border-2 transition-all text-left font-bold italic flex items-center justify-between", !isAnswered ? "border-slate-100 hover:border-primary" : idx === q.c ? "border-emerald-500 bg-emerald-50" : idx === selectedIdx ? "border-red-500 bg-red-50" : "opacity-50")}><span>{opt}</span>{isAnswered && idx === q.c && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}</button>
      ))}</div>
      {isAnswered && <div className="bg-slate-50 p-6 rounded-3xl border-l-8 border-l-primary animate-slide-up"><p className="text-slate-700 font-bold italic">{q.exp}</p><Button onClick={next} className="mt-6 w-full h-12 rounded-xl bg-slate-900 font-black uppercase text-xs">Suivant</Button></div>}
    </Card>
  );
}
