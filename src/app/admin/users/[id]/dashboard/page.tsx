
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Target,
  ChevronRight,
  Zap,
  Brain,
  Check,
  Clock,
  History,
  Trophy,
  FileQuestion,
  TrendingUp,
  ChevronLeft,
  Activity,
  Edit2,
  ExternalLink,
  Search
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useParams } from 'next/navigation';
import { isValid } from 'date-fns';
import { fetchQuestionsByIds } from '@/lib/services/practice-service';

export default function AdminUserDashboardPage() {
  const params = useParams();
  const userId = params.id as string;
  const { user, profile, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [computedResults, setComputedResults] = useState<any[]>([]);
  const [isComputing, setIsComputing] = useState(true);

  // WHITELIST SÉCURITÉ
  const ADMIN_EMAILS = ['slim.besbes@yahoo.fr', 'contact@inovexio.com'];
  const isAuthorizedAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const isAdmin = isAuthorizedAdmin && (profile?.role === 'super_admin' || profile?.role === 'admin');

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRef = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return doc(db, 'users', userId);
  }, [db, userId, isAdmin]);
  const { data: targetProfile, isLoading: isProfileLoading } = useDoc(userRef);

  const attemptsQuery = useMemoFirebase(() => {
    if (!userId || !db || !isAdmin) return null;
    return query(
      collection(db, 'coachingAttempts'), 
      where('userId', '==', userId),
      limit(100)
    );
  }, [db, userId, isAdmin]);

  const { data: rawAttempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  // Recalcul dynamique des scores pour le dashboard inspecteur admin
  useEffect(() => {
    async function compute() {
      if (!rawAttempts || rawAttempts.length === 0 || !isAdmin) {
        setComputedResults([]);
        setIsComputing(false);
        return;
      }

      setIsComputing(true);
      try {
        const allQuestionIds = Array.from(new Set(rawAttempts.flatMap(r => r.responses?.map((resp: any) => resp.questionId) || [])));
        const latestQuestions = await fetchQuestionsByIds(db, allQuestionIds);
        
        const computed = rawAttempts.map(attempt => {
          let correct = 0;
          const total = attempt.responses?.length || 0;
          
          attempt.responses?.forEach((resp: any) => {
            const q = latestQuestions.find(lq => lq.id === resp.questionId);
            if (!q) return;
            const correctIds = q.correctOptionIds || [String(q.correctChoice || "1")];
            const userChoices = resp.userChoices || (resp.userChoice ? [resp.userChoice] : []);
            if (userChoices.length === correctIds.length && userChoices.every(id => correctIds.includes(id))) {
              correct++;
            }
          });

          return {
            ...attempt,
            scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
            correctCount: correct,
            totalQuestions: total
          };
        }).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));

        setComputedResults(computed);
      } catch (e) {
        console.error("Admin user dashboard compute error", e);
      } finally {
        setIsComputing(false);
      }
    }
    compute();
  }, [rawAttempts, db, isAdmin]);

  const stats = useMemo(() => {
    if (computedResults.length === 0) {
      return {
        readiness: 0,
        lastScore: 0,
        examCount: 0,
        avgScore: 0,
        questionsCount: 0,
        progressionData: [],
        sortedAttempts: []
      };
    }

    const validSorted = computedResults.filter(a => a.submittedAt && isValid(a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt)));
    
    const avgScore = validSorted.length > 0 ? Math.round(validSorted.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / validSorted.length) : 0;
    const lastScore = validSorted[0]?.scorePercent || 0;
    const examCount = validSorted.filter(a => a.examId && a.examId.startsWith('exam')).length;
    const questionsCount = validSorted.reduce((acc, a) => acc + (a.totalQuestions || 0), 0);
    
    const progressionData = [...validSorted].reverse().slice(-7).map((a, i) => {
      const date = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
      return {
        name: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        val: a.scorePercent,
      };
    });

    return {
      readiness: avgScore,
      lastScore,
      examCount,
      avgScore,
      questionsCount,
      progressionData,
      sortedAttempts: validSorted.slice(0, 10)
    };
  }, [computedResults]);

  if (!isAdmin && !isAuthLoading) {
    return <div className="h-screen flex items-center justify-center p-8 bg-white text-center"><div className="space-y-4"><p className="font-black text-destructive uppercase text-2xl tracking-tighter italic">Accès Refusé</p><p className="text-slate-400 font-bold italic text-sm">Cette page est réservée à l'administrateur principal.</p><Button asChild variant="outline"><Link href="/dashboard">Retour au Dashboard</Link></Button></div></div>;
  }

  if (!mounted || isAuthLoading || isProfileLoading || isAttemptsLoading || isComputing) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="h-12 w-12 animate-spin text-[#1d4ed8]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 space-y-8 animate-fade-in pb-20 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-12 w-12 rounded-2xl border-2"><Link href="/admin/users"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Monitoring : {targetProfile?.firstName} {targetProfile?.lastName}</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px] italic">Dashboard en lecture seule • Analyse des performances individuelles.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-100 text-emerald-600 border-none font-black italic uppercase text-xs px-4 py-2">
            Status: {targetProfile?.status || 'Active'}
          </Badge>
          <Button asChild variant="outline" className="rounded-xl font-bold uppercase text-[10px] border-2">
            <Link href={`/admin/users/${userId}/edit`}>Éditer Profil</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard icon={Trophy} label="Ready Score" val={`${stats.readiness}%`} color="text-[#1d4ed8] bg-blue-50" />
        <KPICard icon={History} label="Simulations" val={stats.sortedAttempts.length} color="text-[#22c55e] bg-emerald-50" />
        <KPICard icon={Clock} label="Temps d'étude" val={`${Math.floor((targetProfile?.totalTimeSpent || 0) / 3600)}h ${Math.floor(((targetProfile?.totalTimeSpent || 0) % 3600) / 60)}m`} color="text-indigo-600 bg-indigo-50" />
        <KPICard icon={FileQuestion} label="Questions traitées" val={stats.questionsCount} color="text-amber-600 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 rounded-[40px] shadow-xl border-none bg-white p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" /> Courbe de progression
            </h3>
            <Badge variant="outline" className="font-black italic uppercase text-[10px]">7 Dernières sessions</Badge>
          </div>
          <div className="h-[350px] w-full">
            {stats.progressionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.progressionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="val" stroke="#1d4ed8" strokeWidth={4} fill="url(#colorVal)" fillOpacity={1} />
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold italic">Pas assez de données pour le graphique.</div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-4 rounded-[40px] shadow-xl border-none bg-white p-10 space-y-8">
          <h3 className="text-xl font-black italic uppercase tracking-tight">Paramètres Accès</h3>
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Date cible examen</p>
              <p className="text-lg font-bold text-slate-800 italic">{targetProfile?.targetExamDate?.toDate ? targetProfile.targetExamDate.toDate().toLocaleDateString() : 'Non définie'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Expiration du compte</p>
              <p className={cn("text-lg font-bold italic", targetProfile?.expiresAt && new Date(targetProfile.expiresAt.seconds * 1000) < new Date() ? "text-red-500" : "text-emerald-600")}>
                {targetProfile?.expiresAt?.toDate ? targetProfile.expiresAt.toDate().toLocaleDateString() : 'Illimité'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Type d'accès</p>
              <Badge variant="outline" className="font-black italic uppercase text-[9px] mt-1">{targetProfile?.accessType || 'Standard'}</Badge>
            </div>
            <div className="pt-6 border-t border-dashed">
              <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
                Ce dashboard est une vue miroir. Toute modification doit être effectuée via le bouton "Éditer Profil".
              </p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-12 rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
          <CardHeader className="p-8 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <Activity className="h-6 w-6 text-indigo-600" /> Historique détaillé de l'élève
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-16 border-b-2">
                <TableHead className="px-10 font-black uppercase text-[10px] tracking-widest">Examen / Session</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Date</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Score</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Durée</TableHead>
                <TableHead className="text-right px-10 font-black uppercase text-[10px] tracking-widest">Revue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.sortedAttempts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center font-bold italic text-slate-300">Aucune activité enregistrée.</TableCell></TableRow>
              ) : stats.sortedAttempts.map((a) => (
                <TableRow key={a.id} className="h-20 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><FileQuestion className="h-5 w-5" /></div>
                      <span className="font-black italic uppercase text-slate-800 text-sm">{a.examId ? a.examId.replace('exam', 'Simulation ') : a.sessionId || 'Sprint Libre'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-slate-500 italic">
                    {a.submittedAt?.toDate ? a.submittedAt.toDate().toLocaleString() : 'Récemment'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn("font-black italic rounded-lg px-3 py-1", a.scorePercent >= 75 ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600")}>
                      {a.scorePercent}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs font-bold text-slate-400 italic">
                    {Math.floor((a.durationSec || 0) / 60)} min {a.durationSec % 60}s
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl border-2 hover:bg-indigo-50 text-indigo-600 border-indigo-100">
                      <Link href={`/dashboard/history/${a.id}`} title="Revoir les réponses"><Search className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, val, color }: any) {
  return (
    <Card className="rounded-[32px] border-none shadow-lg p-6 bg-white flex items-center gap-5 group hover:scale-[1.02] transition-all">
      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", color)}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{label}</p>
        <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">{val}</p>
      </div>
    </Card>
  );
}

function KPICardSmall({ label, val, color }: any) {
  return (
    <div className={cn("p-4 rounded-2xl border flex flex-col justify-center gap-1 group hover:shadow-md transition-all", color.split(' ')[1])}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate italic">{label}</p>
      <p className={cn("text-2xl font-black italic tracking-tighter leading-none", color.split(' ')[0])}>{val}</p>
    </div>
  );
}
