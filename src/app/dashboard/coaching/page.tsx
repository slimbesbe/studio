
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Video, FileQuestion, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function CoachingSelectionPage() {
  const { profile, user } = useUser();
  const db = useFirestore();

  const sessionsQuery = useMemoFirebase(() => {
    if (!profile || !user) return null;
    const baseRef = collection(db, 'coachingSessions');
    
    // Sécurité renforcée : On ne tente la requête "Admin" que si on est certain du rôle ou de l'email
    const isAdminUser = profile.role === 'admin' || profile.role === 'super_admin' || user.email === 'slim.besbes@yahoo.fr';
    
    if (isAdminUser) {
      return query(baseRef, orderBy('index', 'asc'));
    }
    
    // Les participants standards doivent TOUJOURS avoir le filtre isPublished
    // pour satisfaire les règles Firestore sur les listings.
    return query(
      baseRef, 
      where('isPublished', '==', true),
      orderBy('index', 'asc')
    );
  }, [db, profile, user]);

  const { data: sessions, isLoading: isSessionsLoading } = useCollection(sessionsQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'coachingAttempts'), where('userId', '==', profile.id));
  }, [db, profile]);

  const { data: attempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  if (isSessionsLoading || isAttemptsLoading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  // Fallback data if no sessions exist yet (initial setup)
  const defaultSessions = [
    { id: 'S1', index: 1, title: 'Séance 1', type: 'MEET', isPublished: true },
    { id: 'S2', index: 2, title: 'Séance 2', type: 'QUIZ', isPublished: true },
    { id: 'S3', index: 3, title: 'Séance 3', type: 'QUIZ', isPublished: true },
    { id: 'S4', index: 4, title: 'Séance 4', type: 'QUIZ', isPublished: true },
    { id: 'S5', index: 5, title: 'Séance 5', type: 'QUIZ', isPublished: true },
    { id: 'S6', index: 6, title: 'Séance 6', type: 'QUIZ', isPublished: true },
  ];

  const displaySessions = sessions && sessions.length > 0 ? sessions : defaultSessions;

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-10 animate-fade-in">
      <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-primary/5 flex items-center gap-8">
        <div className="bg-primary/10 p-5 rounded-3xl">
          <GraduationCap className="h-12 w-12 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Programme Coaching PMP®</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Accédez à vos séances en direct et validez vos acquis par simulation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displaySessions.map((session) => {
          const attempt = attempts?.find(a => a.sessionId === session.id);
          const isLocked = !session.isPublished;

          return (
            <Card key={session.id} className={cn(
              "rounded-[40px] border-4 transition-all relative overflow-hidden group",
              isLocked ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-white shadow-xl hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
            )}>
              <CardHeader className="p-8 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner",
                    session.type === 'MEET' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                  )}>
                    {isLocked ? <Lock className="h-6 w-6" /> : session.type === 'MEET' ? <Video className="h-7 w-7" /> : <FileQuestion className="h-7 w-7" />}
                  </div>
                  {attempt && (
                    <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" /> Terminé
                    </div>
                  )}
                </div>
                <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Session {session.index}</CardTitle>
                <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mt-1">
                  {session.type === 'MEET' ? 'Visioconférence en direct' : 'Validation par simulation (35 Q)'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                {attempt ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200">
                    <p className="text-xs font-black uppercase italic text-slate-400 mb-1">Dernier Score</p>
                    <p className="text-3xl font-black italic text-emerald-500">{attempt.scorePercent}%</p>
                  </div>
                ) : (
                  <p className="text-sm font-bold italic text-slate-500 leading-relaxed">
                    {session.type === 'MEET' ? "Rejoignez votre formateur pour une session interactive sur le Mindset PMI." : "Plongez dans 35 questions d'entraînement pour ancrer vos réflexes."}
                  </p>
                )}
                
                <Button 
                  asChild 
                  disabled={isLocked && profile?.role !== 'admin' && profile?.role !== 'super_admin' && user?.email !== 'slim.besbes@yahoo.fr'}
                  className={cn(
                    "w-full h-14 rounded-2xl mt-8 font-black uppercase tracking-widest text-sm shadow-lg group",
                    (isLocked && profile?.role !== 'admin' && profile?.role !== 'super_admin' && user?.email !== 'slim.besbes@yahoo.fr') ? "bg-slate-200" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  <Link href={(isLocked && profile?.role !== 'admin' && profile?.role !== 'super_admin' && user?.email !== 'slim.besbes@yahoo.fr') ? "#" : `/dashboard/coaching/session/${session.index}`}>
                    {isLocked && profile?.role !== 'admin' && profile?.role !== 'super_admin' && user?.email !== 'slim.besbes@yahoo.fr' ? "À venir" : attempt ? "Refaire la session" : "Démarrer"} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
