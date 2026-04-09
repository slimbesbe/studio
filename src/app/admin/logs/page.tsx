"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ClipboardList, 
  Loader2, 
  ChevronLeft, 
  Search,
  User,
  Activity,
  Clock,
  Filter,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function UserLogsPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const logsQuery = useMemoFirebase(() => 
    query(collection(db, 'userLogs'), orderBy('timestamp', 'desc'), limit(500))
  , [db]);
  const { data: logs, isLoading: isLogsLoading } = useCollection(logsQuery);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: users } = useCollection(usersQuery);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const user = users?.find(u => u.id === log.userId);
      const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : 'système';
      const userEmail = user?.email?.toLowerCase() || '';
      
      const matchesSearch = userName.includes(searchTerm.toLowerCase()) || userEmail.includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      
      return matchesSearch && matchesAction;
    });
  }, [logs, users, searchTerm, actionFilter]);

  const getActionBadge = (action: string) => {
    switch(action) {
      case 'login': return <Badge className="bg-emerald-100 text-emerald-600 border-none">CONNEXION</Badge>;
      case 'logout': return <Badge className="bg-slate-100 text-slate-600 border-none">DÉCONNEXION</Badge>;
      case 'exam_started': return <Badge className="bg-indigo-100 text-indigo-600 border-none">EXAM DÉMARRÉ</Badge>;
      case 'exam_completed': return <Badge className="bg-emerald-500 text-white border-none">EXAM TERMINÉ</Badge>;
      case 'practice_started': return <Badge className="bg-blue-100 text-blue-600 border-none">PRATIQUE</Badge>;
      case 'chat_opened': return <Badge className="bg-purple-100 text-purple-600 border-none">CHAT IA</Badge>;
      case 'support_message_sent': return <Badge className="bg-amber-100 text-amber-600 border-none">MESSAGE SUPPORT</Badge>;
      case 'first_login': return <Badge className="bg-amber-500 text-white border-none animate-pulse">PREMIER ACCÈS</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[8px]">{action}</Badge>;
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
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
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Traçabilité complète des actions élèves.</p>
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
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="login">Connexion</SelectItem>
              <SelectItem value="exam_started">Examen</SelectItem>
              <SelectItem value="practice_started">Pratique</SelectItem>
              <SelectItem value="chat_opened">Chat IA</SelectItem>
              <SelectItem value="first_login">Premiers accès</SelectItem>
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
                  const user = users?.find(u => u.id === log.userId);
                  return (
                    <TableRow key={log.id} className="h-20 hover:bg-slate-50 border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-2 text-slate-400 font-bold italic text-xs">
                          <Clock className="h-3 w-3" /> {formatTimestamp(log.timestamp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px]">{user?.firstName?.[0] || '?'}{user?.lastName?.[0] || '?'}</div>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 italic uppercase text-xs">{user ? `${user.firstName} ${user.lastName}` : 'Anonyme'}</span>
                            <span className="text-[9px] font-bold text-slate-400 italic lowercase">{user?.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-right px-10">
                        <span className="text-[10px] font-bold text-slate-400 italic truncate max-w-[200px] inline-block">
                          {log.examId || log.sessionId || log.mode || log.email || '-'}
                        </span>
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
