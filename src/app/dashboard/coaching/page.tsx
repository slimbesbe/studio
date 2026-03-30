
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowRight, Video, FileQuestion, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function CoachingSelectionPage() {
  const { profile, user, isUserLoading } = useUser();
  const db = useFirestore();

  const isAdminUser = profile?.role === 'super_admin' || profile?.role === 'admin';

  // Requête simplifiée pour éviter les erreurs de permission et d'index
  const sessionsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user || !profile || !db) return null;
    return query(collection(db, 'coachingSessions'), orderBy('index', 'asc'));
  }, [db, user, profile, isUserLoading]);

  const { data: rawSessions, isLoading: isSessionsLoading } = useCollection(sessionsQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (isUserLoading || !user?.uid || !profile || !db) return null;
    // Filtrage strict par userId pour respecter les règles de sécurité
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', user.uid)
    );
  }, [db, user?.uid, profile, isUserLoading]);

  const { data: rawAttempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  if (isUserLoading || isSessionsLoading || isAttemptsLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  // Filtrage côté client pour garantir la fluidité et la sécurité
  const displaySessions = (rawSessions || []).filter(s => isAdminUser || s.isPublished);
  
  const latestAttempts = rawAttempts ? rawAttempts.reduce((acc: any, curr: any) => {
    if (!acc[curr.sessionId] || (curr.submittedAt?.seconds || 0) > (acc[curr.sessionId].submittedAt?.seconds || 0)) {
      acc[curr.sessionId] = curr;
    }
    return acc;
  }, {}) : {};

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-10 animate-fade-in">
      <div className="bg-white p-10 rounded-[40px] shadow-xl border-2 border-slate-100 flex items-center gap-8">
        <div className="bg-primary/5 p-5 rounded-3xl">
          <GraduationCap className="h-12 w-12 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Programme Coaching</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1 italic">Validez vos acquis par micro-simulations ciblées.</p>
        </div>
      </div>

      {displaySessions.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <p className="text-slate-400 font-bold italic">Aucune séance disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displaySessions.map((session) => {
            const attempt = latestAttempts[session.id];
            const isAccessible = session.isPublished || isAdminUser;

            return (
              <Card key={session.id} className={cn(
                "rounded-[40px] border-4 transition-all relative overflow-hidden group",
                !isAccessible ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-white shadow-xl hover:shadow-2xl hover:scale-[1.02]"
              )}>
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner",
                      session.type === 'MEET' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {!isAccessible ? <Lock className="h-6 w-6" /> : session.type === 'MEET' ? <Video className="h-7 w-7" /> : <FileQuestion className="h-7 w-7" />}
                    </div>
                    {attempt && (
                      <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full font-black italic uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" /> Terminé
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black uppercase italic tracking-tight text-slate-800">{session.title || `Session ${session.index}`}</CardTitle>
                  <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1 italic">
                    {session.type === 'MEET' ? 'Live visioconférence' : 'Simulation 35 Questions'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  {attempt ? (
                    <div className="bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200">
                      <p className="text-[9px] font-black uppercase italic text-slate-400 mb-1">Dernier Score</p>
                      <p className="text-3xl font-black italic text-emerald-500">{attempt.scorePercent}%</p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold italic text-slate-500 leading-relaxed">
                      Préparez-vous à valider les concepts clés de cette session.
                    </p>
                  )}
                  
                  <Button 
                    asChild 
                    disabled={!isAccessible}
                    className={cn(
                      "w-full h-14 rounded-2xl mt-8 font-black uppercase tracking-widest text-sm shadow-lg group",
                      !isAccessible ? "bg-slate-200" : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    <Link href={!isAccessible ? "#" : `/dashboard/coaching/session/${session.index}`}>
                      {attempt ? "Refaire la session" : "Démarrer"} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
