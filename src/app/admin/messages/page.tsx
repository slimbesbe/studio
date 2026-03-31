
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Mail, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  ChevronLeft, 
  MessageSquare,
  User,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function AdminMessagesPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(() => 
    query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'))
  , [db]);

  const { data: messages, isLoading } = useCollection(messagesQuery);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'supportMessages', id), { status: 'read' });
      toast({ title: "Marqué comme lu" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await deleteDoc(doc(db, 'supportMessages', id));
      toast({ title: "Message supprimé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm">
          <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
            <MessageSquare className="h-8 w-8" /> Boîte de réception
          </h1>
          <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Support utilisateurs et demandes pédagogiques.</p>
        </div>
      </div>

      <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="h-20 border-b-4">
                <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Utilisateur</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-xs">Objet / Message</TableHead>
                <TableHead className="text-center font-black uppercase tracking-widest text-xs">Statut</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!messages || messages.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">
                    Aucun message reçu.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((m) => (
                  <TableRow key={m.id} className={cn(
                    "h-28 hover:bg-slate-50 transition-all border-b last:border-0 group",
                    m.status === 'unread' ? "bg-indigo-50/20" : ""
                  )}>
                    <TableCell className="px-10">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary italic shrink-0">
                          {m.userName?.[0] || '?'}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-800 italic uppercase text-sm leading-none">{m.userName}</p>
                          <p className="text-[10px] font-bold text-slate-400 italic lowercase">{m.userEmail}</p>
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-300 uppercase italic mt-1">
                            <Clock className="h-2 w-2" /> {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : '-'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md space-y-1">
                        <p className="font-black text-slate-900 italic text-sm">{m.subject}</p>
                        <p className="text-xs font-bold text-slate-500 italic line-clamp-2 leading-relaxed">{m.message}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={m.status === 'unread' ? 'default' : 'secondary'} className="font-black italic uppercase text-[9px] px-3">
                        {m.status === 'unread' ? 'Nouveau' : 'Lu'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <div className="flex justify-end gap-2">
                        {m.status === 'unread' && (
                          <Button variant="ghost" size="icon" onClick={() => markAsRead(m.id)} title="Marquer comme lu" className="h-10 w-10 rounded-xl border-2 border-emerald-50 text-emerald-600 hover:bg-emerald-50">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteMessage(m.id)} title="Supprimer" className="h-10 w-10 rounded-xl border-2 border-red-50 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
