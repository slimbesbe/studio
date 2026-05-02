"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ClipboardList, 
  Loader2, 
  ChevronLeft, 
  Search,
  Clock,
  History as HistoryIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { isValid } from 'date-fns';

export default function UserLogsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const ADMIN_EMAILS = ['slim.besbes@yahoo.fr', 'contact@inovexio.com', 'jedgrira1@gmail.com'];
  const isAuthorizedAdmin = user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const logsQuery = useMemoFirebase(() => {
    if (!isAuthorizedAdmin) return null;
    return query(collection(db, 'userLogs'), orderBy('timestamp', 'desc'), limit(500));
  }, [db, isAuthorizedAdmin]);
  const { data: logs, isLoading: isLogsLoading } = useCollection(logsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!isAuthorizedAdmin) return null;
    return collection(db, 'users');
  }, [db, isAuthorizedAdmin]);
  const { data: users } = useCollection(usersQuery);

  const attemptsQuery = useMemoFirebase(() => {
    if (!isAuthorizedAdmin) return null;
    return collection(db, 'coachingAttempts');
  }, [db, isAuthorizedAdmin]);
  const { data: attempts } = useCollection(attemptsQuery);

  const quickQuizQuery = useMemoFirebase(() => {
    if (!isAuthorizedAdmin) return null;
    return collection(db, 'quickQuizAttempts');
  }, [db, isAuthorizedAdmin]);
  const { data: quickQuizzes } = useCollection(quickQuizQuery);

  const supportQuery = useMemoFirebase(() => {
    if (!isAuthorizedAdmin) return null;
    return collection(db, 'supportMessages');
  }, [db, isAuthorizedAdmin]);
  const { data: supportMsgs } = useCollection(supportQuery);

  const safeGetTime = (ts: any) => {
    if (!ts) return 0;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return isValid(date) ? date.getTime() : 0;
  };

  const allMergedLogs = useMemo(() => {
    if (!users || !isAuthorizedAdmin) return [];

    const reconstructed: any[] = [];
    if (logs) logs.forEach(l => reconstructed.push({ ...l, source: 'userLogs' }));

    users.forEach(u => {
      if (u.createdAt) reconstructed.push({ id: `backfill-create-${u.id}`, userId: u.id, action: 'account_created', timestamp: u.createdAt, source: 'users' });
      if (u.firstLoginAt) reconstructed.push({ id: `backfill-first-${u.id}`, userId: u.id, action: 'first_login', timestamp: u.firstLoginAt, source: 'users' });
    });

    attempts?.forEach(a => {
      let action = 'simulation_completed';
      let detail = a.examId ? a.examId.replace('exam', 'Examen ') : a.sessionId ? `Coaching ${a.sessionId}` : 'Sprint';
      reconstructed.push({ id: `backfill-attempt-${a.id}`, userId: a.userId, action: a.examId ? 'exam_completed' : 'simulation_completed', timestamp: a.submittedAt, source: 'coachingAttempts', score: a.scorePercent, detail });
    });

    quickQuizzes?.forEach(q => reconstructed.push({ id: `backfill-quiz-${q.id}`, userId: q.userId, action: 'quick_quiz_completed', timestamp: q.submittedAt, source: 'quickQuizAttempts', score: q.score, detail: `${q.axisId}` }));
    supportMsgs?.forEach(s => reconstructed.push({ id: `backfill-support-${s.id}`, userId: s.userId, action: 'support_message_sent', timestamp: s.createdAt, source: 'supportMessages', detail: s.subject }));

    return reconstructed.sort((a, b) => safeGetTime(b.timestamp) - safeGetTime(a.timestamp));
  }, [logs, users, attempts, quickQuizzes, supportMsgs, isAuthorizedAdmin]);

  const filteredLogs = useMemo(() => {
    return allMergedLogs.filter(log => {
      const userDoc = users?.find(u => u.id === log.userId);
      const userName = userDoc ? `${userDoc.firstName} ${userDoc.lastName}`.toLowerCase() : 'système';
      const userEmail = userDoc?.email?.toLowerCase() || '';
      const matchesSearch = userName.includes(searchTerm.toLowerCase()) || userEmail.includes(searchTerm.toLowerCase());
      
      if (actionFilter === 'all') return matchesSearch;
      if (actionFilter === 'login') return matchesSearch && (log.action === 'login' || log.action === 'first_login');
      if (actionFilter === 'exam') return matchesSearch && (log.action === 'exam_completed' || log.action === 'exam_started');
      if (actionFilter === 'practice') return matchesSearch && (log.action === 'practice_started' || log.action === 'matrix_sprint_completed' || log.action === 'quick_quiz_completed');
      return matchesSearch;
    });
  }, [allMergedLogs, users, searchTerm, actionFilter]);

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return isValid(date) ? date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Récemment';
  };

  if (!isAuthorizedAdmin) return <div className="h-screen flex items-center justify-center p-8 bg-white text-center"><p className="font-black text-destructive uppercase text-2xl italic">Accès Refusé</p></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm"><Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link></Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3"><ClipboardList className="h-8 w-8 text-indigo-600" /> Logs Utilisateurs</h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Traçabilité complète et historique reconstitué.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nom ou Email..." className="pl-10 h-12 rounded-xl border-2 italic font-bold" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48 h-12 rounded-xl border-2 font-black italic text-[10px] uppercase"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="login">Connexion</SelectItem>
              <SelectItem value="exam">Examens</SelectItem>
              <SelectItem value="practice">Entraînement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-16 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Date</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Utilisateur</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Action</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLogsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">Aucun log trouvé.</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const userDoc = users?.find(u => u.id === log.userId);
                  return (
                    <TableRow key={log.id} className="h-20 hover:bg-slate-50 border-b last:border-0">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-2 text-slate-400 font-bold italic text-xs"><Clock className="h-3 w-3" /> {formatTimestamp(log.timestamp)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 italic uppercase text-xs">{userDoc ? `${userDoc.firstName} ${userDoc.lastName}` : 'Utilisateur'}</span>
                          <span className="text-[9px] font-bold text-slate-400 italic lowercase">{userDoc?.email || log.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="uppercase text-[8px] font-black italic">{log.action.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-right px-10">
                        <span className="text-[10px] font-bold text-slate-500 italic">{log.detail || log.examId || '-'} {log.score !== undefined ? `(${log.score}%)` : ''}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
