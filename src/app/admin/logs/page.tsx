
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  Filter,
  RefreshCw,
  History as HistoryIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { isValid } from 'date-fns';

export default function UserLogsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // 1. Fetch Real-time Logs
  const logsQuery = useMemoFirebase(() => 
    query(collection(db, 'userLogs'), orderBy('timestamp', 'desc'), limit(500))
  , [db]);
  const { data: logs, isLoading: isLogsLoading } = useCollection(logsQuery);

  // 2. Fetch Source Collections for Backfilling
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: users } = useCollection(usersQuery);

  const attemptsQuery = useMemoFirebase(() => collection(db, 'coachingAttempts'), [db]);
  const { data: attempts } = useCollection(attemptsQuery);

  const quickQuizQuery = useMemoFirebase(() => collection(db, 'quickQuizAttempts'), [db]);
  const { data: quickQuizzes } = useCollection(quickQuizQuery);

  const supportQuery = useMemoFirebase(() => collection(db, 'supportMessages'), [db]);
  const { data: supportMsgs } = useCollection(supportQuery);

  // 3. Merge & Reconstruct History
  const allMergedLogs = useMemo(() => {
    if (!users) return [];

    const reconstructed: any[] = [];

    // A. Add Logs from userLogs collection
    if (logs) {
      logs.forEach(l => reconstructed.push({ ...l, source: 'userLogs' }));
    }

    // B. Backfill from Users (Creation & First Login)
    users.forEach(u => {
      if (u.createdAt) {
        reconstructed.push({
          id: `backfill-create-${u.id}`,
          userId: u.id,
          action: 'account_created',
          timestamp: u.createdAt,
          isBackfilled: true,
          source: 'users'
        });
      }
      if (u.firstLoginAt) {
        reconstructed.push({
          id: `backfill-first-${u.id}`,
          userId: u.id,
          action: 'first_login',
          timestamp: u.firstLoginAt,
          isBackfilled: true,
          source: 'users'
        });
      }
    });

    // C. Backfill from coachingAttempts (Exams, Matrix, Sessions)
    attempts?.forEach(a => {
      let action = 'simulation_completed';
      let detail = '';
      if (a.examId) {
        action = 'exam_completed';
        detail = a.examId.replace('exam', 'Examen ');
      } else if (a.context === 'matrix_sprint') {
        action = 'matrix_sprint_completed';
        detail = 'Sprint Matrice';
      } else if (a.sessionId) {
        action = 'coaching_session_completed';
        detail = `Coaching ${a.sessionId}`;
      }

      reconstructed.push({
        id: `backfill-attempt-${a.id}`,
        userId: a.userId,
        action,
        timestamp: a.submittedAt,
        isBackfilled: true,
        source: 'coachingAttempts',
        score: a.scorePercent,
        detail
      });
    });

    // D. Backfill from quickQuizAttempts
    quickQuizzes?.forEach(q => {
      reconstructed.push({
        id: `backfill-quiz-${q.id}`,
        userId: q.userId,
        action: 'quick_quiz_completed',
        timestamp: q.submittedAt,
        isBackfilled: true,
        source: 'quickQuizAttempts',
        score: q.score,
        detail: `${q.category === 'domain' ? 'Domaine' : 'Approche'} : ${q.axisId}`
      });
    });

    // E. Backfill from supportMessages
    supportMsgs?.forEach(s => {
      reconstructed.push({
        id: `backfill-support-${s.id}`,
        userId: s.userId,
        action: 'support_message_sent',
        timestamp: s.createdAt,
        isBackfilled: true,
        source: 'supportMessages',
        detail: s.subject
      });
    });

    // Remove Duplicates (based on userId, action and approximate timestamp if needed, 
    // but here we primarily sort and filter)
    // For MVP, we'll keep them all and rely on the UI to show the most relevant ones.
    
    return reconstructed.sort((a, b) => {
      const tsA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
      const tsB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
      return tsB.getTime() - tsA.getTime();
    });
  }, [logs, users, attempts, quickQuizzes, supportMsgs]);

  const filteredLogs = useMemo(() => {
    return allMergedLogs.filter(log => {
      const user = users?.find(u => u.id === log.userId);
      const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : 'système';
      const userEmail = user?.email?.toLowerCase() || '';
      
      const matchesSearch = userName.includes(searchTerm.toLowerCase()) || userEmail.includes(searchTerm.toLowerCase());
      
      let matchesAction = actionFilter === 'all';
      if (actionFilter === 'login') matchesAction = log.action === 'login' || log.action === 'first_login';
      if (actionFilter === 'exam') matchesAction = log.action === 'exam_completed' || log.action === 'exam_started';
      if (actionFilter === 'practice') matchesAction = log.action === 'practice_started' || log.action === 'matrix_sprint_completed' || log.action === 'quick_quiz_completed';
      if (actionFilter === 'support') matchesAction = log.action === 'support_message_sent';
      if (actionFilter === 'account') matchesAction = log.action === 'account_created';
      
      return matchesSearch && matchesAction;
    });
  }, [allMergedLogs, users, searchTerm, actionFilter]);

  const getActionBadge = (action: string) => {
    switch(action) {
      case 'login': return <Badge className="bg-emerald-100 text-emerald-600 border-none">CONNEXION</Badge>;
      case 'logout': return <Badge className="bg-slate-100 text-slate-600 border-none">DÉCONNEXION</Badge>;
      case 'exam_started': return <Badge className="bg-indigo-100 text-indigo-600 border-none">EXAM DÉMARRÉ</Badge>;
      case 'exam_completed': return <Badge className="bg-emerald-500 text-white border-none">EXAM TERMINÉ</Badge>;
      case 'matrix_sprint_completed': return <Badge className="bg-blue-100 text-blue-600 border-none">SPRINT MATRICE</Badge>;
      case 'quick_quiz_completed': return <Badge className="bg-amber-100 text-amber-600 border-none">QUIZ RAPIDE</Badge>;
      case 'practice_started': return <Badge className="bg-blue-50 text-blue-400 border-none">PRATIQUE</Badge>;
      case 'chat_opened': return <Badge className="bg-purple-100 text-purple-600 border-none">CHAT IA</Badge>;
      case 'support_message_sent': return <Badge className="bg-amber-500 text-white border-none">MSG SUPPORT</Badge>;
      case 'first_login': return <Badge className="bg-indigo-600 text-white border-none animate-pulse">PREMIER ACCÈS</Badge>;
      case 'account_created': return <Badge className="bg-slate-900 text-white border-none">COMPTE CRÉÉ</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[8px]">{action.replace('_', ' ')}</Badge>;
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (!isValid(date)) return 'Récemment';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-xl border-2">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm">
            <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-indigo-600" /> Logs Utilisateurs
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">
              Traçabilité complète (Temps réel + Historique reconstitué).
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom ou Email..." 
              className="pl-10 h-12 rounded-xl border-2 italic font-bold"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48 h-12 rounded-xl border-2 font-black italic text-[10px] uppercase">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="login">Connexion / Accès</SelectItem>
              <SelectItem value="exam">Simulations Examen</SelectItem>
              <SelectItem value="practice">Entraînement / Quiz</SelectItem>
              <SelectItem value="support">Support / Messages</SelectItem>
              <SelectItem value="account">Gestion Compte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-16 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Date / Heure</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Utilisateur</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Événement</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Détails / Stats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLogsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">Aucun log trouvé.</TableCell></TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const user = users?.find(u => u.id === log.userId);
                  return (
                    <TableRow key={log.id} className="h-20 hover:bg-slate-50 border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-slate-400 font-bold italic text-xs">
                            <Clock className="h-3 w-3" /> {formatTimestamp(log.timestamp)}
                          </div>
                          {log.isBackfilled && (
                            <Badge variant="ghost" className="w-fit h-4 text-[7px] font-black uppercase tracking-tighter opacity-40 px-1 border">
                              <HistoryIcon className="h-2 w-2 mr-1" /> Reconstitué
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] uppercase">
                            {user?.firstName?.[0] || '?'}{user?.lastName?.[0] || '?'}
                          </div>
                          <div className="flex flex-col overflow-hidden max-w-[180px]">
                            <span className="font-black text-slate-800 italic uppercase text-xs truncate">{user ? `${user.firstName} ${user.lastName}` : 'Utilisateur Inconnu'}</span>
                            <span className="text-[9px] font-bold text-slate-400 italic lowercase truncate">{user?.email || log.userId}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-right px-10">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold text-slate-500 italic truncate max-w-[200px]">
                            {log.detail || log.examId || log.sessionId || log.mode || log.subject || '-'}
                          </span>
                          {log.score !== undefined && (
                            <span className={cn(
                              "text-[10px] font-black italic",
                              log.score >= 75 ? "text-emerald-500" : "text-amber-500"
                            )}>
                              Score: {log.score}%
                            </span>
                          )}
                        </div>
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
