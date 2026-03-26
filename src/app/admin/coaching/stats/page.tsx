"use client";

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, ChevronLeft, ArrowRight, BarChart3, Target, Clock, TrendingUp, Filter } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CoachingStatsGroups() {
  const { profile } = useUser();
  const db = useFirestore();
  const [filterPartner, setFilterPartner] = useState('all');
  
  const isSA = profile?.role === 'super_admin';
  const isAdmin = isSA || profile?.role === 'admin';
  const isCoach = profile?.role === 'coach';
  const isPartner = profile?.role === 'partner';

  const groupsQuery = useMemoFirebase(() => {
    if (!isAdmin && !isCoach && !isPartner) return null;
    const base = collection(db, 'coachingGroups');
    if (isSA) return query(base, orderBy('createdAt', 'desc'));
    if (isCoach) return query(base, where('coachId', '==', profile?.id));
    if (isPartner) return query(base, where('partnerId', '==', profile?.id));
    return null;
  }, [db, isSA, isAdmin, isCoach, isPartner, profile?.id]);

  const { data: groups, isLoading } = useCollection(groupsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin && !isCoach && !isPartner) return null;
    return collection(db, 'users');
  }, [db, isAdmin, isCoach, isPartner]);
  const { data: allUsers } = useCollection(usersQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!isAdmin && !isCoach && !isPartner) return null;
    return collection(db, 'coachingAttempts');
  }, [db, isAdmin, isCoach, isPartner]);
  const { data: allAttempts } = useCollection(attemptsQuery);

  const partners = useMemo(() => allUsers?.filter(u => u.role === 'partner') || [], [allUsers]);

  const groupStats = useMemo(() => {
    if (!groups || !allUsers || !allAttempts) return [];

    return groups.map(g => {
      const groupUsers = allUsers.filter(u => u.groupId === g.id);
      const groupAttempts = allAttempts.filter(a => a.groupId === g.id);
      
      const avgScore = groupAttempts.length > 0 
        ? Math.round(groupAttempts.reduce((acc, a) => acc + (a.scorePercent || 0), 0) / groupAttempts.length) 
        : 0;
      
      const totalTime = groupUsers.reduce((acc, u) => acc + (u.totalTimeSpent || 0), 0);
      const avgTime = groupUsers.length > 0 ? Math.round(totalTime / groupUsers.length / 60) : 0;

      return {
        ...g,
        membersCount: groupUsers.length,
        avgScore,
        avgTimeMinutes: avgTime
      };
    }).filter(g => filterPartner === 'all' || g.partnerId === filterPartner);
  }, [groups, allUsers, allAttempts, filterPartner]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  if (!isAdmin && !isCoach && !isPartner) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2"><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-primary">Monitoring Pédagogique</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-xs font-bold italic">Analyse des performances par groupe et cohorte.</p>
          </div>
        </div>
        {isSA && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filterPartner} onValueChange={setFilterPartner}>
              <SelectTrigger className="w-48 h-10 border-none font-bold italic text-xs uppercase"><SelectValue placeholder="Partenaire" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les partenaires</SelectItem>
                {partners.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-8 grid-cols-1">
        <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="h-20 border-b-4">
                  <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Nom du Groupe</TableHead>
                  <TableHead className="text-center font-black uppercase tracking-widest text-xs">Participants</TableHead>
                  <TableHead className="text-center font-black uppercase tracking-widest text-xs">Score Moyen</TableHead>
                  <TableHead className="text-center font-black uppercase tracking-widest text-xs">Temps / Élève</TableHead>
                  <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Analytiques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupStats.map((g) => (
                  <TableRow key={g.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                    <TableCell className="px-10">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-black text-xl italic uppercase tracking-tight text-slate-800">{g.name}</span>
                          <p className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest">Partenaire : {partners.find(p => p.id === g.partnerId)?.firstName || 'Aucun'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="px-4 py-1.5 rounded-xl border-2 font-black italic text-lg shadow-sm">
                        {g.membersCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          "text-2xl font-black italic tracking-tighter",
                          g.avgScore >= 75 ? "text-emerald-500" : g.avgScore >= 60 ? "text-amber-500" : "text-slate-400"
                        )}>{g.avgScore}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full", g.avgScore >= 75 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${g.avgScore}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500 font-bold italic">
                        <Clock className="h-4 w-4 text-slate-300" /> {g.avgTimeMinutes} min
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <Button asChild className="h-12 px-6 rounded-2xl bg-primary hover:scale-105 transition-transform font-black uppercase tracking-widest shadow-lg">
                        <Link href={`/admin/coaching/stats/${g.id}`}>
                          Détails <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {groupStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                        <BarChart3 className="h-16 w-16 opacity-20" />
                        <p className="font-black uppercase italic tracking-widest text-lg">Aucune donnée statistique disponible</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}