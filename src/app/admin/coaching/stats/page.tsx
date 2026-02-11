
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2, ChevronLeft, ArrowRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function CoachingStatsGroups() {
  const db = useFirestore();
  
  const groupsQuery = useMemoFirebase(() => query(collection(db, 'coachingGroups'), orderBy('createdAt', 'desc')), [db]);
  const { data: groups, isLoading } = useCollection(groupsQuery);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers } = useCollection(usersQuery);

  const getParticipantsCount = (groupId: string) => {
    return allUsers?.filter(u => u.groupId === groupId).length || 0;
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/admin/coaching"><ChevronLeft /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary">Groupes & Statistiques</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Suivi des performances et moyennes des cohortes.</p>
          </div>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Groupe</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Participants</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Analytiques</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups?.map((g) => (
                <TableRow key={g.id} className="h-24 hover:bg-slate-50 transition-all border-b last:border-0 group">
                  <TableCell className="px-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Users className="h-6 w-6" />
                      </div>
                      <span className="font-black text-xl italic uppercase tracking-tight text-slate-800">{g.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-black text-slate-500 text-lg">
                    {getParticipantsCount(g.id)}
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <Button asChild className="h-12 px-6 rounded-2xl bg-accent hover:bg-accent/90 font-black uppercase tracking-widest shadow-lg">
                      <Link href={`/admin/coaching/stats/${g.id}`}>
                        <BarChart3 className="mr-2 h-5 w-5" /> Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
