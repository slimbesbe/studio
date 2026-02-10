
"use client";

import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, ChevronLeft, Clock, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminGroupStats() {
  const params = useParams();
  const groupId = params.id as string;
  const { profile, user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_UIDS = ['GPgreBe1JzZYbEHQGn3xIdcQGQs1', 'vwyrAnNtQkSojYSEEK2qkRB5feh2'];

  // Sécurité renforcée : Confirmation du rôle admin avant tout listing
  const isAdmin = profile?.role === 'super_admin' || 
                  profile?.role === 'admin' || 
                  user?.email === 'slim.besbes@yahoo.fr' ||
                  (user?.uid && ADMIN_UIDS.includes(user.uid));

  const groupRef = useMemoFirebase(() => doc(db, 'coachingGroups', groupId), [db, groupId]);
  const { data: group, isLoading: isGroupLoading } = useDoc(groupRef);

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin || !groupId) return null;
    return query(collection(db, 'users'), where('groupId', '==', groupId));
  }, [db, groupId, isAdmin]);
  const { data: participants, isLoading: isUsersLoading } = useCollection(usersQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!isAdmin || !groupId) return null;
    return query(collection(db, 'coachingAttempts'), where('groupId', '==', groupId));
  }, [db, groupId, isAdmin]);
  const { data: allAttempts, isLoading: isAttemptsLoading } = useCollection(attemptsQuery);

  const stats = useMemo(() => {
    if (!participants || !allAttempts) return null;

    const sessionKeys = ['S2', 'S3', 'S4', 'S5', 'S6'];
    const sessionStats: Record<string, { completion: number, avgScore: number, avgTime: number }> = {};

    sessionKeys.forEach(sId => {
      const attemptsForSession = allAttempts.filter(a => a.sessionId === sId);
      const uniqueUsers = new Set(attemptsForSession.map(a => a.userId));
      
      const completion = participants.length > 0 ? Math.round((uniqueUsers.size / participants.length) * 100) : 0;
      const avgScore = attemptsForSession.length > 0 ? Math.round(attemptsForSession.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / attemptsForSession.length) : 0;
      const avgTime = attemptsForSession.length > 0 ? Math.round(attemptsForSession.reduce((acc, a) => acc + (a.durationSec || 0), 0) / attemptsForSession.length) : 0;

      sessionStats[sId] = { completion, avgScore, avgTime };
    });

    return sessionStats;
  }, [participants, allAttempts]);

  const filteredParticipants = useMemo(() => {
    if (!participants) return [];
    return participants.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [participants, searchTerm]);

  const getParticipantSessions = (userId: string) => {
    const userAttempts = allAttempts?.filter(a => a.userId === userId) || [];
    const results: Record<string, number | null> = {};
    ['S2', 'S3', 'S4', 'S5', 'S6'].forEach(sId => {
      const last = [...userAttempts].filter(a => a.sessionId === sId).sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))[0];
      results[sId] = last ? last.scorePercent : null;
    });
    return results;
  };

  if (!isAdmin && profile) {
    return <div className="h-screen flex items-center justify-center p-8 text-center"><p className="font-bold text-destructive italic uppercase">Accès restreint aux administrateurs.</p></div>;
  }

  if (isGroupLoading || isUsersLoading || isAttemptsLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching/groups"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Monitoring : {group?.name}</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Analyse des KPI de complétion et de réussite du groupe.</p>
          </div>
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
              <div className="pt-4 flex items-center justify-center gap-2 text-slate-400 text-[10px] font-bold italic">
                <Clock className="h-3 w-3" /> {Math.floor((stats?.[sId]?.avgTime || 0) / 60)} min
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none bg-white overflow-hidden">
        <CardHeader className="p-10 border-b flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <Users className="h-7 w-7 text-indigo-600" /> Progression Individuelle
            </CardTitle>
            <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mt-1">
              Vue détaillée des scores par participant.
            </CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Rechercher un participant..." 
              className="pl-12 h-14 rounded-2xl font-bold italic border-2"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="h-16 border-b-2">
                <TableHead className="px-10 font-black uppercase text-[10px] tracking-widest">Participant</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">S2</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">S3</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">S4</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">S5</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">S6</TableHead>
                <TableHead className="text-center font-black uppercase text-[10px] tracking-widest">Moyenne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((p) => {
                const userScores = getParticipantSessions(p.id);
                const scoresList = Object.values(userScores).filter(v => v !== null) as number[];
                const avg = scoresList.length > 0 ? Math.round(scoresList.reduce((a, b) => a + b, 0) / scoresList.length) : null;

                return (
                  <TableRow key={p.id} className="h-20 hover:bg-slate-50 transition-all border-b last:border-0">
                    <TableCell className="px-10">
                      <div className="flex flex-col">
                        <span className="font-black italic uppercase text-slate-800">{p.firstName} {p.lastName}</span>
                        <span className="text-[10px] font-bold text-slate-400 lowercase">{p.email}</span>
                      </div>
                    </TableCell>
                    {['S2', 'S3', 'S4', 'S5', 'S6'].map(sId => (
                      <TableCell key={sId} className="text-center">
                        {userScores[sId] !== null ? (
                          <Badge className={cn(
                            "font-black italic rounded-lg px-3 py-1",
                            userScores[sId]! >= 75 ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
                          )}>
                            {userScores[sId]}%
                          </Badge>
                        ) : (
                          <span className="text-slate-200">-</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {avg !== null ? (
                        <span className="text-xl font-black italic text-primary">{avg}%</span>
                      ) : (
                        <span className="text-slate-200">-</span>
                      )}
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
