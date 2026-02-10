
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, doc, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, Loader2, Video, ChevronLeft, ChevronRight, CheckCircle2, Info, Trophy, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function CoachingSessionDetails() {
  const params = useParams();
  const router = useRouter();
  const sessionIndex = parseInt(params.id as string);
  const { profile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      try {
        const sessionId = `S${sessionIndex}`;
        const sDoc = await getDoc(doc(db, 'coachingSessions', sessionId));
        
        let sessionData;
        if (sDoc.exists()) {
          sessionData = sDoc.data();
        } else {
          sessionData = {
            id: sessionId,
            index: sessionIndex,
            type: sessionIndex === 1 ? 'MEET' : 'QUIZ',
            questionStart: (sessionIndex - 1) * 35 + 1,
            questionEnd: sessionIndex * 35,
            meetLink: "https://meet.google.com/pmp-coaching-simovex",
            isPublished: true
          };
        }
        setSession(sessionData);

        if (sessionData.type === 'QUIZ') {
          // Requête réelle pour les questions indexées
          const qRef = collection(db, 'questions');
          const qQuery = query(
            qRef, 
            where('index', '>=', sessionData.questionStart), 
            where('index', '<=', sessionData.questionEnd),
            orderBy('index', 'asc')
          );
          const qSnap = await getDocs(qQuery);
          
          if (!qSnap.empty) {
            setQuestions(qSnap.docs.map(d => ({ ...d.data(), id: d.id })));
          } else {
            // Mock de secours si pas encore de questions indexées en DB
            const mocked = [];
            for(let i=0; i<35; i++) {
              mocked.push({
                id: `MQ${sessionIndex}-${i}`,
                index: sessionData.questionStart + i,
                text: `[DEBUG] Question de Coaching #${sessionData.questionStart + i}: Scénario PMP spécifique sur le Mindset.`,
                choices: ["Action réactive", "Action proactive (PMI Mindset)", "Escalade immédiate", "Ignorer et documenter"],
                correctChoice: "1",
                explanation: "Le Mindset PMI privilégie la proactivité et la résolution de problèmes interne à l'équipe."
              });
            }
            setQuestions(mocked);
          }
        }
      } catch (e) {
        console.error("Error loading session:", e);
        toast({ variant: "destructive", title: "Erreur de chargement" });
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, [db, sessionIndex, toast]);

  const handleStartQuiz = () => {
    setIsQuizStarted(true);
    setStartTime(Date.now());
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctChoice) correct++;
    });

    const percent = Math.round((correct / questions.length) * 100);

    try {
      await addDoc(collection(db, 'coachingAttempts'), {
        userId: profile.id,
        groupId: profile.groupId || null,
        sessionId: session.id,
        scorePercent: percent,
        correctCount: correct,
        totalQuestions: questions.length,
        durationSec: duration,
        submittedAt: serverTimestamp()
      });
      setQuizResult({ score: percent, correct, total: questions.length, duration });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la sauvegarde du score" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (session?.type === 'MEET') {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-10 animate-fade-in">
        <Button variant="ghost" asChild className="mb-4"><Link href="/dashboard/coaching"><ChevronLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>
        <Card className="rounded-[60px] border-none shadow-2xl p-16 text-center space-y-10 bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
          <div className="bg-emerald-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
            <Video className="h-12 w-12 text-emerald-600" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Session Visioconférence</h1>
            <p className="text-xl font-bold text-slate-500 italic max-w-xl mx-auto">
              Rejoignez votre formateur en direct pour analyser les concepts clés et répondre à vos questions sur le Mindset PMP.
            </p>
          </div>
          <Button asChild size="lg" className="h-20 px-16 rounded-[28px] bg-emerald-600 hover:bg-emerald-700 text-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
            <a href={session.meetLink} target="_blank" rel="noopener noreferrer">REJOINDRE LA SÉANCE</a>
          </Button>
        </Card>
      </div>
    );
  }

  if (quizResult) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-10 animate-fade-in px-4">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Session de Coaching Validée</h1>
        <Card className="rounded-[40px] shadow-2xl border-none p-12 space-y-8 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy className="h-32 w-32" /></div>
          <div className="space-y-2">
            <span className="text-8xl font-black italic tracking-tighter text-primary">{quizResult.score}%</span>
            <p className="text-xl font-black text-slate-400 uppercase tracking-widest italic">{quizResult.correct} / {quizResult.total} Correctes</p>
          </div>
          <div className="flex items-center justify-center gap-6 text-slate-500 font-bold italic border-y-2 border-dashed py-6">
            <div className="flex items-center gap-2"><Clock className="h-5 w-5" /> {Math.floor(quizResult.duration / 60)}m {quizResult.duration % 60}s</div>
            <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Session {sessionIndex}</div>
          </div>
          <Button className="w-full h-16 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl text-lg italic" asChild>
            <Link href="/dashboard/coaching">Retour au Programme</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (isQuizStarted) {
    const q = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in py-8 px-4">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-lg border-2">
          <Badge className="bg-primary/10 text-primary border-none font-black italic px-6 py-2 rounded-xl">Q {currentIndex + 1} / {questions.length}</Badge>
          <Progress value={progress} className="w-48 h-3 rounded-full" />
        </div>

        <Card className="rounded-[40px] shadow-2xl border-t-8 border-t-primary bg-white">
          <CardContent className="p-10 space-y-8">
            <p className="text-2xl font-black text-slate-800 italic leading-relaxed">{q?.text}</p>
            <div className="grid gap-4">
              {q?.choices?.map((opt: string, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setAnswers({ ...answers, [q.id]: String(idx) })} 
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-5 shadow-sm",
                    answers[q.id] === String(idx) ? "border-primary bg-primary/5 scale-[1.01]" : "border-slate-100 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2",
                    answers[q.id] === String(idx) ? "bg-primary text-white border-primary" : "bg-white text-slate-400"
                  )}>{String.fromCharCode(65 + idx)}</div>
                  <p className={cn("flex-1 text-lg font-bold italic pt-1", answers[q.id] === String(idx) ? "text-slate-900" : "text-slate-600")}>{opt}</p>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t flex justify-between gap-4">
            <Button variant="outline" className="h-14 px-8 rounded-xl font-black uppercase italic" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Précédent</Button>
            {currentIndex === questions.length - 1 ? (
              <Button onClick={handleFinish} disabled={isSubmitting || !answers[q?.id]} className="h-14 px-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black uppercase tracking-widest shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Soumettre"}
              </Button>
            ) : (
              <Button onClick={() => setCurrentIndex(currentIndex + 1)} disabled={!answers[q?.id]} className="h-14 px-12 bg-primary rounded-xl font-black uppercase tracking-widest shadow-xl">Suivant</Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-10 animate-fade-in">
      <Button variant="ghost" asChild><Link href="/dashboard/coaching"><ChevronLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>
      <Card className="rounded-[60px] border-none shadow-2xl p-16 text-center space-y-10 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
        <div className="bg-indigo-50 h-24 w-24 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
          <FileQuestion className="h-12 w-12 text-indigo-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Quiz de Validation S{sessionIndex}</h1>
          <p className="text-xl font-bold text-slate-500 italic max-w-xl mx-auto">
            Testez votre compréhension sur les points clés abordés lors de cette séance de coaching. 35 questions, focus Mindset.
          </p>
        </div>
        <div className="flex items-center justify-center gap-12 bg-slate-50 p-8 rounded-3xl border-2 border-dashed">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Questions</p>
            <p className="text-3xl font-black italic text-primary">35</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plage d'index</p>
            <p className="text-3xl font-black italic text-primary">{session?.questionStart} - {session?.questionEnd}</p>
          </div>
        </div>
        <Button onClick={handleStartQuiz} size="lg" className="h-20 px-16 rounded-[28px] bg-primary hover:bg-primary/90 text-2xl font-black uppercase tracking-widest shadow-xl scale-105 transition-transform">
          COMMENCER LE QUIZ
        </Button>
      </Card>
    </div>
  );
}
