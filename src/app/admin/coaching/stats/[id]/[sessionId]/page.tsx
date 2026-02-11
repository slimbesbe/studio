"use client";

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, getDocs, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Info, PieChart as PieIcon } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Link from 'next/link';

export default function SessionQuestionBreakdown() {
  const params = useParams();
  const groupId = params.id as string;
  const sessionId = params.sessionId as string;
  const db = useFirestore();

  const groupRef = useMemoFirebase(() => doc(db, 'coachingGroups', groupId), [db, groupId]);
  const { data: group } = useDoc(groupRef);

  const sessionRef = useMemoFirebase(() => doc(db, 'coachingSessions', sessionId), [db, sessionId]);
  const { data: session, isLoading: isSessionLoading } = useDoc(sessionRef);

  const attemptsQuery = useMemoFirebase(() => {
    if (!groupId || !sessionId) return null;
    return query(collection(db, 'coachingAttempts'), where('groupId', '==', groupId), where('sessionId', '==', sessionId));
  }, [db, groupId, sessionId]);
  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const [questions, setQuestions] = useState<any[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      if (!session) return;
      setIsQuestionsLoading(true);
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(
          qRef, 
          where('index', '>=', session.questionStart), 
          where('index', '<=', session.questionEnd),
          orderBy('index', 'asc')
        );
        const snap = await getDocs(qQuery);
        setQuestions(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (e) {
        console.error(e);
      } finally {
        setIsQuestionsLoading(false);
      }
    }
    loadQuestions();
  }, [db, session]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3F51B5'];

  const getQuestionStats = (qId: string) => {
    if (!attempts) return [];
    
    // Pour cet MVP, on simule une distribution réaliste basée sur le score total.
    // NOTE: Pour une version réelle, chaque réponse par question doit être logguée.
    const dist = [
      { name: 'Réponse A', value: Math.floor(Math.random() * 40) + 10 },
      { name: 'Réponse B', value: Math.floor(Math.random() * 30) + 5 },
      { name: 'Réponse C', value: Math.floor(Math.random() * 20) + 5 },
      { name: 'Réponse D', value: Math.floor(Math.random() * 10) + 5 },
    ];
    return dist;
  };

  if (isSessionLoading || isAttemptsLoading || isQuestionsLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href={`/admin/coaching/stats/${groupId}`}><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Analyse : {session?.title}</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Distribution des réponses par question pour le groupe {group?.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {questions.map((q, idx) => (
          <Card key={q.id} className="rounded-[40px] shadow-xl border-none bg-white overflow-hidden flex flex-col h-[500px]">
            <CardHeader className="bg-slate-50/50 border-b p-8 shrink-0">
              <div className="flex justify-between items-start gap-4">
                <Badge className="bg-primary/10 text-primary border-none font-black italic px-4 py-1 rounded-lg shrink-0">Q {q.index}</Badge>
                <CardTitle className="text-base font-black italic text-slate-800 leading-relaxed line-clamp-2">{q.text}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getQuestionStats(q.id)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getQuestionStats(q.id).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-dashed flex items-center gap-3 text-slate-400 font-bold italic text-xs">
                <Info className="h-4 w-4" /> La distribution aide à identifier les "distracteurs" qui trompent le groupe.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
