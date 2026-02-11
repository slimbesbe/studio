"use client";

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, ChevronLeft, BarChart3, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function GroupStatsDashboard() {
  const params = useParams();
  const groupId = params.id as string;
  const db = useFirestore();

  const groupRef = useMemoFirebase(() => doc(db, 'coachingGroups', groupId), [db, groupId]);
  const { data: group, isLoading: isGroupLoading } = useDoc(groupRef);

  const usersQuery = useMemoFirebase(() => {
    if (!groupId) return null;
    return query(collection(db, 'users'), where('groupId', '==', groupId));
  }, [db, groupId]);
  const { data: participants, isLoading: isUsersLoading } = useCollection(usersQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!groupId) return null;
    return query(collection(db, 'coachingAttempts'), where('groupId', '==', groupId));
  }, [db, groupId]);
  const { data: allAttempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!participants || !allAttempts) return null;
    const sessionKeys = ['S2', 'S3', 'S4', 'S5', 'S6'];
    const sessionStats: Record<string, { avgScore: number, completion: number }> = {};

    sessionKeys.forEach(sId => {
      const attemptsForSession = allAttempts.filter(a => a.sessionId === sId);
      const uniqueUsers = new Set(attemptsForSession.map(a => a.userId));
      const completion = participants.length > 0 ? Math.round((uniqueUsers.size / participants.length) * 100) : 0;
      const avgScore = attemptsForSession.length > 0 ? Math.round(attemptsForSession.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attemptsForSession.length) : 0;
      sessionStats[sId] = { avgScore, completion };
    });

    return sessionStats;
  }, [participants, allAttempts]);

  if (isGroupLoading || isUsersLoading || isAttemptsLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching/stats"><ChevronLeft /></Link></Button>
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Monitoring : {group?.name}</h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Moyennes des simulations et taux de complétion.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {['S2', 'S3', 'S4', 'S5', 'S6'].map((sId) => (
          <Card key={sId} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group">
            <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
              <span className="font-black text-primary italic uppercase text-xs">{sId}</span>
              <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px]">{stats?.[sId]?.completion}% COMPLÉTÉ</Badge>
            </div>
            <CardContent className="p-6 text-center space-y-1">
              <p className="text-4xl font-black italic tracking-tighter text-slate-800">{stats?.[sId]?.avgScore}%</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">SCORE MOYEN</p>
              <Button asChild variant="ghost" size="sm" className="mt-4 w-full h-10 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 text-indigo-600">
                <Link href={`/admin/coaching/stats/${groupId}/${sId}`}>Analyser Q par Q <ArrowRight className="ml-2 h-3 w-3" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none bg-white overflow-hidden">
        <CardHeader className="p-10 border-b">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-indigo-600" />
            <CardTitle className="text-2xl font-black italic uppercase tracking-tight">Performances Individuelles</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-16 border-b-2">
                <TableHead className="px-10 font-black uppercase text-[10px] tracking-widest">Participant</TableHead>
                {['S2', 'S3', 'S4', 'S5', 'S6'].map(sId => (
                  <TableHead key={sId} className="text-center font-black uppercase text-[10px] tracking-widest">{sId}</TableHead>
                ))}
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Moyenne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants?.map((p) => {
                const userAttempts = allAttempts?.filter(a => a.userId === p.id) || [];
                const scoresList = userAttempts.map(a => a.scorePercent);
                const avg = scoresList.length > 0 ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : null;

                return (
                  <TableRow key={p.id} className="h-20 hover:bg-slate-50 transition-all border-b last:border-0">
                    <TableCell className="px-10 font-black italic uppercase text-slate-800">{p.firstName} {p.lastName}</TableCell>
                    {['S2', 'S3', 'S4', 'S5', 'S6'].map(sId => {
                      const lastAttempt = [...userAttempts].filter(a => a.sessionId === sId).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))[0];
                      return (
                        <TableCell key={sId} className="text-center">
                          {lastAttempt ? (
                            <Badge className={cn("font-black italic rounded-lg", lastAttempt.scorePercent >= 80 ? "bg-emerald-100 text-emerald-600" : lastAttempt.scorePercent >= 70 ? "bg-blue-100 text-blue-600" : lastAttempt.scorePercent >= 60 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600")}>
                              {lastAttempt.scorePercent}%
                            </Badge>
                          ) : <span className="text-slate-200">-</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {avg !== null ? (
                        <span className={cn(
                          "text-xl font-black italic",
                          avg >= 80 ? "text-emerald-600" : avg >= 70 ? "text-blue-600" : avg >= 60 ? "text-amber-600" : "text-red-600"
                        )}>{avg}%</span>
                      ) : <span className="text-slate-200">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
