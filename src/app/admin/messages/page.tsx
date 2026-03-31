
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, getDocs, limit } from 'firebase/firestore';
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
  ExternalLink,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function AdminCommunicationsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('support');
  const [selectedUserChat, setSelectedUserChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Messages de support directs
  const messagesQuery = useMemoFirebase(() => 
    query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'))
  , [db]);
  const { data: messages, isLoading: isMessagesLoading } = useCollection(messagesQuery);

  // Liste des utilisateurs ayant utilisé le chat (basé sur la collection /chats)
  // On récupère la liste des documents de /chats qui correspondent aux userIds
  const chatsQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: allUsers } = useCollection(chatsQuery);

  const deleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await deleteDoc(doc(db, 'supportMessages', id));
      toast({ title: "Message supprimé" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'supportMessages', id), { status: 'read' });
      toast({ title: "Marqué comme lu" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  };

  const openChatLog = async (user: any) => {
    setSelectedUserChat(user);
    setIsLoadingChat(true);
    try {
      const q = query(
        collection(db, 'chats', user.id, 'messages'),
        orderBy('timestamp', 'asc'),
        limit(100)
      );
      const snap = await getDocs(q);
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      toast({ variant: "destructive", title: "Impossible de charger le chat" });
    } finally {
      setIsLoadingChat(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl border-2 shadow-sm">
            <Link href="/admin/dashboard"><ChevronLeft className="h-6 w-6" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-indigo-600" /> Centre de Communications
            </h1>
            <p className="text-muted-foreground mt-1 uppercase tracking-widest text-[10px] font-bold italic">Support direct et historiques des chats IA.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="bg-white p-2 h-16 rounded-[24px] shadow-lg border-2 grid grid-cols-2 max-w-md">
          <TabsTrigger value="support" className="rounded-xl font-black italic uppercase text-xs flex items-center gap-2">
            <Mail className="h-4 w-4" /> Support Direct
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-xl font-black italic uppercase text-xs flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Historiques Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support" className="animate-fade-in m-0">
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
                  {isMessagesLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></TableCell></TableRow>
                  ) : (!messages || messages.length === 0) ? (
                    <TableRow><TableCell colSpan={4} className="h-64 text-center font-black uppercase italic tracking-widest text-slate-300">Aucun message reçu.</TableCell></TableRow>
                  ) : (
                    messages.map((m) => (
                      <TableRow key={m.id} className={cn("h-28 border-b last:border-0", m.status === 'unread' ? "bg-indigo-50/20" : "")}>
                        <TableCell className="px-10">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary italic shrink-0">{m.userName?.[0] || '?'}</div>
                            <div className="space-y-0.5">
                              <p className="font-black text-slate-800 italic uppercase text-sm leading-none">{m.userName}</p>
                              <p className="text-[10px] font-bold text-slate-400 italic lowercase">{m.userEmail}</p>
                              <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-300 uppercase italic mt-1"><Clock className="h-2 w-2" /> {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : '-'}</div>
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
                          <Badge variant={m.status === 'unread' ? 'default' : 'secondary'} className="font-black italic uppercase text-[9px] px-3">{m.status === 'unread' ? 'Nouveau' : 'Lu'}</Badge>
                        </TableCell>
                        <TableCell className="text-right px-10">
                          <div className="flex justify-end gap-2">
                            {m.status === 'unread' && <Button variant="ghost" size="icon" onClick={() => markAsRead(m.id)} className="h-10 w-10 rounded-xl border-2 border-emerald-50 text-emerald-600 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></Button>}
                            <Button variant="ghost" size="icon" onClick={() => deleteMessage(m.id)} className="h-10 w-10 rounded-xl border-2 border-red-50 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="animate-fade-in m-0">
          <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="h-20 border-b-4">
                    <TableHead className="px-10 font-black uppercase tracking-widest text-xs">Élève</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-xs">Groupe</TableHead>
                    <TableHead className="text-right px-10 font-black uppercase tracking-widest text-xs">Historique</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers?.filter(u => u.role === 'user').map((u) => (
                    <TableRow key={u.id} className="h-24 hover:bg-slate-50 border-b last:border-0 group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-black text-indigo-600 italic shrink-0">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                          <div className="space-y-0.5">
                            <p className="font-black text-slate-800 italic uppercase text-sm">{u.firstName} {u.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 italic lowercase">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-slate-500 italic text-sm uppercase">{u.groupId || 'Sans groupe'}</span>
                      </TableCell>
                      <TableCell className="text-right px-10">
                        <Button onClick={() => openChatLog(u)} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">
                          <Search className="mr-2 h-4 w-4" /> Lire les discussions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedUserChat} onOpenChange={(val) => !val && setSelectedUserChat(null)}>
        <DialogContent className="max-w-3xl rounded-[40px] p-0 border-none shadow-3xl overflow-hidden bg-slate-50 h-[80vh] flex flex-col">
          <DialogHeader className="bg-white p-8 border-b shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg"><Sparkles className="h-6 w-6" /></div>
              <div>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Chat Log : {selectedUserChat?.firstName}</DialogTitle>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Conversation complète avec le Coach IA.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedUserChat(null)} className="rounded-full h-10 w-10 border-2"><X /></Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
            {isLoadingChat ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-20 text-slate-300 italic font-black uppercase tracking-widest">Aucune discussion enregistrée.</div>
            ) : (
              chatMessages.map((m, idx) => (
                <div key={idx} className={cn("flex items-start gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-md text-[10px] font-black text-white", m.role === 'user' ? "bg-slate-900" : "bg-indigo-500")}>
                    {m.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={cn("max-w-[80%] p-5 rounded-[24px] text-xs font-bold italic leading-relaxed shadow-sm border-2", m.role === 'user' ? "bg-white text-slate-800 rounded-tr-none border-slate-100" : "bg-indigo-50 text-indigo-900 rounded-tl-none border-indigo-100")}>
                    {m.content}
                    <div className="mt-2 text-[8px] opacity-40 text-right">{m.timestamp?.toDate ? m.timestamp.toDate().toLocaleString() : '-'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
